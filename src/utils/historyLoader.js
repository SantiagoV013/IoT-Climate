/* Copyright (c) 2026 santiago-qoop. All rights reserved. */
import { getTimestampMs } from './timestamps.js';
import { createReportAccumulator, getReportRange, REPORT_PERIODS } from './reporting.js';

export { getReportRange } from './reporting.js';

export const HISTORY_BATCH_SIZE = 500;
export const REPORT_BATCH_SIZE = 2000;
export const HISTORY_CONCURRENCY = 2;
export const REPORT_CACHE_TTL_MS = 5 * 60 * 1000;

// One queue shared by report and CSV jobs, including jobs from an old session
// whose current Firebase get() cannot be interrupted.
let activeJobs = 0;
const pendingJobs = [];

function pumpQueue() {
  while (activeJobs < HISTORY_CONCURRENCY && pendingJobs.length) {
    const { work, signal, resolve, reject } = pendingJobs.shift();
    activeJobs += 1;
    Promise.resolve()
      .then(() => {
        signal.throwIfAborted();
        return work();
      })
      .then(resolve, reject)
      .finally(() => {
        activeJobs -= 1;
        pumpQueue();
      });
  }
}

function schedule(work, signal) {
  return new Promise((resolve, reject) => {
    pendingJobs.push({ work, signal, resolve, reject });
    pumpQueue();
  });
}

async function runBatch(deviceIds, readDevice, signal) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.throwIfAborted();
  signal?.addEventListener('abort', abort, { once: true });
  try {
    return await Promise.all(deviceIds.map((deviceId) => schedule(
      () => readDevice(deviceId, controller.signal), controller.signal,
    )));
  } catch (error) {
    controller.abort();
    throw error;
  } finally {
    signal?.removeEventListener('abort', abort);
  }
}

export function createHistoryLoader({ readPage, now = Date.now }) {
  let reportWindow = null;

  async function* historyPages(deviceId, limit, signal) {
    let beforeKey = null;
    while (true) {
      signal.throwIfAborted();
      const page = await readPage({ deviceId, beforeKey, limit });
      signal.throwIfAborted();
      yield page;
      if (page.length < limit) break;
      const nextKey = page[0][0];
      if (nextKey === beforeKey) throw new Error('History pagination did not advance.');
      beforeKey = nextKey;
    }
  }

  async function readHistory(deviceId, range, signal) {
    const pages = [];
    for await (const page of historyPages(deviceId, HISTORY_BATCH_SIZE, signal)) {
      pages.push(range ? page.filter(([key, value]) => {
        const time = getTimestampMs(value?.timestamp ?? key);
        return time !== null && (range.start == null || time >= range.start)
          && (range.end == null || time <= range.end);
      }) : page);

    }
    return pages.reverse().flat();
  }

  return {
    // CSV always reads fresh data. Filtering the timestamp field after each page
    // preserves support for legacy keys that are not themselves timestamps.
    async loadExport(deviceIds, { range = null, signal } = {}) {
      const entries = await runBatch(deviceIds, async (deviceId, batchSignal) => [
        deviceId, await readHistory(deviceId, range, batchSignal),
      ], signal);
      return Object.fromEntries(entries);
    },

    async loadReports(deviceIds, { force = false, signal, onProgress } = {}) {
      const requestedAt = now();
      if (force || !reportWindow || requestedAt >= reportWindow.expiresAt ||
        reportWindow.ranges.daily.start !== getReportRange('daily', requestedAt).start) {
        reportWindow = {
          ranges: Object.fromEntries(REPORT_PERIODS.map((key) => [key, getReportRange(key, requestedAt)])),
          // Start the TTL after loading; a large first download can take >5 min.
          expiresAt: Infinity,
          devices: new Map(),
        };
      }
      const window = reportWindow;
      // Keep a single fixed interval for all devices in this cached report.
      // The dashboard's live clock must not shift a report's interval or refetch it.
      for (const deviceId of window.devices.keys()) {
        if (!deviceIds.includes(deviceId)) window.devices.delete(deviceId);
      }
      const cached = new Map(window.devices);
      const missingIds = deviceIds.filter((deviceId) => !cached.has(deviceId));
      let scannedReadings = 0;
      let completedDevices = deviceIds.length - missingIds.length;
      const progress = () => onProgress?.({ scannedReadings, completedDevices, totalDevices: deviceIds.length });
      let fetched;
      try {
        progress();
        fetched = await runBatch(missingIds, async (deviceId, batchSignal) => {
          const accumulator = createReportAccumulator(deviceId, window.ranges);
          for await (const page of historyPages(deviceId, REPORT_BATCH_SIZE, batchSignal)) {
            accumulator.addPage(page);
            scannedReadings += page.length;
            progress();
          }
          completedDevices += 1;
          progress();
          return [deviceId, { reports: accumulator.finish(), updatedAt: now() }];
        }, signal);
        signal?.throwIfAborted();
      } catch (error) {
        // A failed or abandoned scan must not leave an incomplete cache window.
        if (reportWindow === window) reportWindow = null;
        throw error;
      }
      for (const [deviceId, result] of fetched) window.devices.set(deviceId, result);
      // A cache hit must not wait behind a long-running CSV download.
      const results = new Map([...cached, ...fetched]);
      const entries = deviceIds.map((id) => [id, results.get(id)]);
      if (window.expiresAt === Infinity) window.expiresAt = now() + REPORT_CACHE_TTL_MS;
      return {
        reports: Object.fromEntries(REPORT_PERIODS.map((period) => [period,
          Object.fromEntries(entries.map(([id, result]) => [id, result.reports[period]])),
        ])),
        ranges: window.ranges,
        updatedAt: entries.length ? Math.min(...entries.map(([, result]) => result.updatedAt)) : null,
      };
    },

    clear() {
      reportWindow = null;
    },
  };
}
