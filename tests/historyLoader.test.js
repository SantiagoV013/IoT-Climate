import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHistoryLoader, REPORT_BATCH_SIZE, REPORT_CACHE_TTL_MS } from '../src/utils/historyLoader.js';
import { buildReportSummary } from '../src/utils/reporting.js';

const baseTime = new Date(2026, 10, 24, 12).getTime();
const makeEntries = (count) => Array.from({ length: count }, (_, index) => {
  const timestamp = baseTime - count + index;
  return [String(timestamp), { timestamp, temperature: index }];
});

function fixture(data, overrides = {}) {
  const calls = [];
  let time = baseTime;
  const reader = async ({ deviceId, beforeKey, limit }) => {
    calls.push({ deviceId, beforeKey, limit });
    return (data[deviceId] ?? [])
      .filter(([key]) => beforeKey === null || key < beforeKey)
      .slice(-limit);
  };
  const loader = createHistoryLoader({ readPage: reader, now: () => time, ...overrides });
  return { loader, calls, reader, setTime: (value) => { time = value; } };
}

test('exports every record across 500-record pages without gaps or duplicates', async () => {
  const entries = makeEntries(1207);
  const { loader, calls } = fixture({ room: entries });
  const result = await loader.loadExport(['room']);
  assert.deepEqual(result.room, entries);
  assert.equal(new Set(result.room.map(([key]) => key)).size, 1207);
  assert.equal(calls.length, 3);
  assert.ok(calls.every((call) => call.limit === 500));
  assert.deepEqual(calls.map((call) => call.beforeKey), [null, entries[707][0], entries[207][0]]);
});

test('handles an empty device and exact page multiples', async () => {
  const entries = makeEntries(1000);
  const { loader, calls } = fixture({ room: entries });
  assert.deepEqual(await loader.loadExport(['room', 'empty']), { room: entries, empty: [] });
  assert.equal(calls.filter((call) => call.deviceId === 'room').length, 3);
});

test('filters inclusive dates after pagination, including legacy keys and timestamp fallback', async () => {
  const entries = [
    ...makeEntries(501),
    ['legacy-a', { timestamp: baseTime - 400 }],
    ['legacy-b', { timestamp: baseTime - 200 }],
    ['legacy-c', { timestamp: baseTime - 100 }],
    ['legacy-invalid', { timestamp: 'invalid' }],
  ];
  delete entries[101][1].timestamp;
  const { loader } = fixture({ room: entries });
  const result = await loader.loadExport(['room'], {
    range: { start: baseTime - 400, end: baseTime - 200 },
  });
  const expected = entries.filter(([key, value]) => {
    const time = Number(value.timestamp ?? key);
    return time >= baseTime - 400 && time <= baseTime - 200;
  });
  assert.deepEqual(result.room, expected);
  assert.equal(result.room.length, 203);
  const openRange = await loader.loadExport(['room'], { range: { start: null, end: baseTime - 400 } });
  assert.equal(openRange.room.length, 103);
});

test('keeps at most two device reads active across simultaneous report and export jobs', async () => {
  let active = 0;
  let peak = 0;
  const entries = makeEntries(1001);
  const { reader } = fixture({ a: entries, b: entries, c: entries, d: entries, e: entries });
  const loader = createHistoryLoader({
    now: () => baseTime,
    readPage: async (request) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 1));
      const page = await reader(request);
      active -= 1;
      return page;
    },
  });
  const [report, csv] = await Promise.all([
    loader.loadReports(['a', 'b', 'c']),
    loader.loadExport(['d', 'e']),
  ]);
  assert.equal(peak, 2);
  assert.equal(report.reports.daily.c.readingCount, 1001);
  assert.equal(csv.e.length, 1001);
});

test('reuses reports by device and period, preserving the original interval and update time', async () => {
  const { loader, calls, setTime } = fixture({ a: makeEntries(3), b: makeEntries(4) });
  const first = await loader.loadReports(['a']);
  setTime(baseTime + 60_000);
  const cached = await loader.loadReports(['a']);
  assert.deepEqual(cached, first);
  assert.equal(calls.length, 1);
  const expanded = await loader.loadReports(['a', 'b']);
  assert.equal(calls.length, 2);
  assert.deepEqual(expanded.ranges.daily, first.ranges.daily);
  assert.equal(expanded.updatedAt, first.updatedAt);
  assert.equal(expanded.reports.weekly.a.readingCount, 3);
  assert.equal(expanded.reports.monthly.b.readingCount, 4);
  await loader.loadReports(['a']);
  assert.equal(calls.length, 2);
});

test('expires the cache after five minutes and supports manual refresh', async () => {
  const data = { room: makeEntries(2) };
  const { loader, calls, setTime } = fixture(data);
  const first = await loader.loadReports(['room']);
  setTime(baseTime + REPORT_CACHE_TTL_MS - 1);
  await loader.loadReports(['room']);
  assert.equal(calls.length, 1);
  setTime(baseTime + REPORT_CACHE_TTL_MS);
  const expired = await loader.loadReports(['room']);
  assert.equal(calls.length, 2);
  assert.notDeepEqual(expired.ranges.daily, first.ranges.daily);
  data.room.push([String(baseTime + REPORT_CACHE_TTL_MS), { timestamp: baseTime + REPORT_CACHE_TTL_MS }]);
  loader.clear();
  const refreshed = await loader.loadReports(['room']);
  assert.equal(calls.length, 3);
  assert.equal(refreshed.reports.daily.room.readingCount, 3);
  await loader.loadReports(['room'], { force: true });
  assert.equal(calls.length, 4);
});

test('a cached report returns immediately while both download slots are occupied', async () => {
  const { reader } = fixture({ room: makeEntries(3), export_a: [], export_b: [] });
  let blockExports = false;
  let release;
  const blocked = new Promise((resolve) => { release = resolve; });
  const loader = createHistoryLoader({
    now: () => baseTime,
    readPage: async (request) => {
      if (blockExports) await blocked;
      return reader(request);
    },
  });
  const original = await loader.loadReports(['room']);
  blockExports = true;
  const exporting = loader.loadExport(['export_a', 'export_b']);
  let completed = false;
  const cached = loader.loadReports(['room']).then((result) => {
    completed = true;
    return result;
  });
  try {
    for (let index = 0; index < 20; index += 1) await Promise.resolve();
    assert.equal(completed, true);
    assert.deepEqual(await cached, original);
  } finally {
    release();
    await exporting;
  }
});

test('invalidates the daily window at midnight even before its TTL expires', async () => {
  const { loader, calls, setTime } = fixture({ room: [] });
  const beforeMidnight = new Date(2026, 10, 24, 23, 59).getTime();
  setTime(beforeMidnight);
  const first = await loader.loadReports(['room']);
  setTime(beforeMidnight + 60_000);
  const next = await loader.loadReports(['room']);
  assert.equal(calls.length, 2);
  assert.notEqual(first.ranges.daily.start, next.ranges.daily.start);
});

test('CSV bypasses report cache and sessions do not share cached data', async () => {
  const data = { room: makeEntries(1) };
  const { loader, calls } = fixture(data);
  await loader.loadReports(['room']);
  data.room = makeEntries(2);
  assert.equal((await loader.loadExport(['room'])).room.length, 2);
  assert.equal((await loader.loadExport(['room'])).room.length, 2);
  assert.equal(calls.length, 3);
  const other = fixture(data);
  assert.equal((await other.loader.loadReports(['room'])).reports.daily.room.readingCount, 2);
  assert.equal(other.calls.length, 1);
  loader.clear();
  assert.equal((await loader.loadReports(['room'])).reports.daily.room.readingCount, 2);
});

test('does not return or cache a partial report when a later page fails', async () => {
  const { reader, calls } = fixture({ room: makeEntries(REPORT_BATCH_SIZE + 1) });
  let fail = true;
  const loader = createHistoryLoader({
    now: () => baseTime,
    readPage: async (request) => {
      if (fail && request.beforeKey !== null) throw new Error('permission_denied');
      return reader(request);
    },
  });
  await assert.rejects(loader.loadReports(['room']), /permission_denied/);
  fail = false;
  const complete = await loader.loadReports(['room']);
  assert.equal(complete.reports.daily.room.readingCount, REPORT_BATCH_SIZE + 1);
  assert.equal(calls.filter((call) => call.beforeKey === null).length, 2);
});

test('cancelling a report stops pagination and queued devices and does not populate cache', async () => {
  const controller = new AbortController();
  const entries = makeEntries(REPORT_BATCH_SIZE + 1);
  const { reader, calls } = fixture({ a: entries, b: entries, c: entries });
  let cancel = true;
  const loader = createHistoryLoader({
    now: () => baseTime,
    readPage: async (request) => {
      const result = await reader(request);
      if (cancel) controller.abort();
      return result;
    },
  });
  await assert.rejects(loader.loadReports(['a', 'b', 'c'], { signal: controller.signal }), {
    name: 'AbortError',
  });
  assert.ok(calls.every((call) => call.beforeKey === null));
  assert.ok(calls.every((call) => call.deviceId !== 'c'));
  cancel = false;
  const report = await loader.loadReports(['a']);
  assert.equal(report.reports.daily.a.readingCount, REPORT_BATCH_SIZE + 1);
  assert.equal(calls.filter((call) => call.deviceId === 'a' && call.beforeKey === null).length, 2);
});

test('a failed device stops other jobs from loading additional pages', async () => {
  const calls = [];
  const loader = createHistoryLoader({
    readPage: async (request) => {
      calls.push(request);
      if (request.deviceId === 'broken') throw new Error('network unavailable');
      await new Promise((resolve) => setTimeout(resolve, 5));
      return makeEntries(500);
    },
  });
  await assert.rejects(loader.loadExport(['broken', 'slow', 'queued']), /network unavailable/);
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.ok(calls.every((call) => call.beforeKey === null));
  assert.ok(calls.every((call) => call.deviceId !== 'queued'));
});

test('one scan builds all periods with inclusive dates, legacy keys, and no future readings', async () => {
  const day = 24 * 60 * 60 * 1000;
  const dailyStart = new Date(2026, 10, 24).getTime();
  const { loader, calls } = fixture({ room: [
    ['a', { timestamp: baseTime - 30 * day - 1, eco2: 9999 }],
    ['b', { timestamp: baseTime - 30 * day, eco2: 300 }],
    ['c', { timestamp: baseTime - 7 * day, eco2: 600 }],
    ['d', { timestamp: dailyStart, eco2: 900, motion: 1 }],
    ['e', { timestamp: baseTime, eco2: 1200, motion: 1 }],
    ['f', { timestamp: baseTime + 1, eco2: 9999 }],
    ['g', { timestamp: 'invalid', eco2: 9999 }],
  ] });
  const { reports } = await loader.loadReports(['room']);
  assert.equal(calls.length, 1);
  assert.equal(reports.daily.room.readingCount, 2);
  assert.equal(reports.weekly.room.readingCount, 3);
  assert.equal(reports.monthly.room.readingCount, 4);
  assert.equal(reports.daily.room.avgCo2, 1050);
  assert.equal(reports.weekly.room.avgCo2, 900);
  assert.equal(reports.monthly.room.avgCo2, 750);
  assert.equal(reports.monthly.room.peakCo2, 1200);
  assert.equal(reports.daily.room.motionByHour[0].count, 1);
  assert.equal(reports.daily.room.motionByHour[12].count, 1);
  assert.equal(reports.daily.room.busiestHour.hour, 0);
});

test('missing sensors are not zero and the overall average is weighted by valid readings', async () => {
  const { loader } = fixture({
    a: [
      ['legacy-a', { timestamp: baseTime, temperature: null, eco2: 100, tvoc: 0 }],
      ['legacy-b', { timestamp: baseTime, temperature: '', eco2: 200, tvoc: 10 }],
      ['legacy-c', { timestamp: baseTime, temperature: 'invalid', eco2: 300, tvoc: '20' }],
    ],
    b: [
      [String(baseTime), { eco2: 1000 }], // timestamp falls back to the key
      ['missing', { timestamp: baseTime, eco2: null, tvoc: null }],
    ],
    empty: [],
  });
  const { reports } = await loader.loadReports(['a', 'b', 'empty']);
  const summary = buildReportSummary(Object.values(reports.monthly));
  assert.equal(summary.readingCount, 5);
  assert.equal(summary.activeDeviceCount, 2);
  assert.equal(summary.avgCo2, 400);
  assert.equal(summary.highestCo2Device.deviceId, 'b');
  assert.equal(summary.busiestMotionHour, null);
  assert.equal(reports.daily.a.avgTemperature, null);
  assert.equal(reports.daily.a.avgTvoc, 10);
  assert.equal(reports.daily.b.peakTvoc, null);
  assert.equal(buildReportSummary([]).avgCo2, null);
});

test('monthly reports handle 500,000 readings without retaining raw history or overflowing the stack', async () => {
  const total = 500_000;
  const firstTime = baseTime - (total - 1) * 5000;
  let requests = 0;
  const progress = [];
  const loader = createHistoryLoader({
    now: () => baseTime,
    readPage: async ({ beforeKey, limit }) => {
      requests += 1;
      const end = beforeKey === null ? total : (Number(beforeKey) - firstTime) / 5000;
      const start = Math.max(0, end - limit);
      return Array.from({ length: end - start }, (_, offset) => {
        const index = start + offset;
        const timestamp = firstTime + index * 5000;
        return [String(timestamp), { timestamp, eco2: 400 + index % 1000, tvoc: index % 100 }];
      });
    },
  });
  const result = await loader.loadReports(['room'], { onProgress: (value) => progress.push(value) });
  const monthly = result.reports.monthly.room;
  assert.equal(monthly.readingCount, total);
  assert.equal(monthly.avgCo2, 899.5);
  assert.equal(monthly.peakCo2, 1399);
  assert.equal(monthly.peakTvoc, 99);
  assert.equal(requests, Math.floor(total / REPORT_BATCH_SIZE) + 1);
  assert.ok(JSON.stringify(result).length < 6000, 'cache size must not grow with the number of readings');
  assert.deepEqual(progress.at(-1), { scannedReadings: total, completedDevices: 1, totalDevices: 1 });
  const requestsBeforeCacheHit = requests;
  assert.deepEqual(await loader.loadReports(['room']), result);
  assert.equal(requests, requestsBeforeCacheHit);
});

test('a slow initial download receives a full cache TTL after it completes', async () => {
  let time = baseTime;
  let calls = 0;
  const loader = createHistoryLoader({
    now: () => time,
    readPage: async () => {
      calls += 1;
      time += REPORT_CACHE_TTL_MS + 1;
      return makeEntries(2);
    },
  });
  const initial = await loader.loadReports(['room']);
  assert.deepEqual(await loader.loadReports(['room']), initial);
  assert.equal(calls, 1);
  time += REPORT_CACHE_TTL_MS;
  await loader.loadReports(['room']);
  assert.equal(calls, 2);
});

test('report errors discard completed devices too, allowing a consistent fresh retry', async () => {
  let fail = true;
  const { reader, calls } = fixture({ a: makeEntries(2), b: makeEntries(3) });
  const loader = createHistoryLoader({
    now: () => baseTime,
    readPage: async (request) => {
      if (request.deviceId === 'b' && fail) {
        await new Promise((resolve) => setTimeout(resolve, 5));
        throw new Error('offline');
      }
      return reader(request);
    },
  });
  await assert.rejects(loader.loadReports(['a', 'b']), /offline/);
  fail = false;
  const report = await loader.loadReports(['a', 'b']);
  assert.equal(calls.filter((call) => call.deviceId === 'a').length, 2);
  assert.equal(report.reports.monthly.b.readingCount, 3);
});
