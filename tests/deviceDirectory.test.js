import assert from 'node:assert/strict';
import { test } from 'node:test';
import { watchDeviceDirectory } from '../src/utils/deviceDirectory.js';

const flush = async () => {
  for (let index = 0; index < 10; index += 1) await Promise.resolve();
};

function setup(t, overrides = {}) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const updates = [];
  const errors = [];
  const requests = [];
  let tokenNumber = 0;
  const stop = watchDeviceDirectory({
    databaseUrl: 'https://example.firebaseio.com/',
    user: { getIdToken: async () => `token-${++tokenNumber}` },
    onDevices: (ids) => updates.push(ids),
    onError: (error) => errors.push(error),
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return { ok: true, json: async () => ({ room_b: true, room_a: true }) };
    },
    refreshMs: 100,
    timeoutMs: 1_000,
    ...overrides,
  });
  t.after(stop);
  return { stop, updates, errors, requests };
}

test('discovers only device keys with authentication and a fresh token on refresh', async (t) => {
  const { updates, requests, errors } = setup(t);
  await flush();
  assert.deepEqual(updates, [['room_a', 'room_b']]);
  assert.equal(requests[0].url.pathname, '/devices.json');
  assert.equal(requests[0].url.searchParams.get('shallow'), 'true');
  assert.equal(requests[0].url.searchParams.get('auth'), 'token-1');
  assert.equal(requests[0].options.cache, 'no-store');
  t.mock.timers.tick(100);
  await flush();
  assert.equal(requests[1].url.searchParams.get('auth'), 'token-2');
  assert.deepEqual(errors, []);
});

test('does not overlap slow discovery requests', async (t) => {
  let resolveResponse;
  let calls = 0;
  const { updates } = setup(t, {
    fetchImpl: () => {
      calls += 1;
      return new Promise((resolve) => { resolveResponse = resolve; });
    },
  });
  await flush();
  t.mock.timers.tick(500);
  await flush();
  assert.equal(calls, 1);
  resolveResponse({ ok: true, json: async () => ({ room_a: true }) });
  await flush();
  assert.deepEqual(updates, [['room_a']]);
  t.mock.timers.tick(100);
  await flush();
  assert.equal(calls, 2);
});

test('aborts in-flight work and ignores late data after cleanup', async (t) => {
  let resolveResponse;
  let signal;
  const { stop, updates, errors } = setup(t, {
    fetchImpl: (url, options) => {
      signal = options.signal;
      return new Promise((resolve) => { resolveResponse = resolve; });
    },
  });
  await flush();
  stop();
  assert.equal(signal.aborted, true);
  resolveResponse({ ok: true, json: async () => ({ stale_room: true }) });
  await flush();
  t.mock.timers.tick(10_000);
  assert.deepEqual(updates, []);
  assert.deepEqual(errors, []);
});

test('does not start a fetch if signed out while awaiting the token', async (t) => {
  let resolveToken;
  const { stop, requests } = setup(t, {
    user: { getIdToken: () => new Promise((resolve) => { resolveToken = resolve; }) },
  });
  stop();
  resolveToken('late-token');
  await flush();
  assert.equal(requests.length, 0);
});

test('preserves prior results on an error and discovers additions/removals on retry', async (t) => {
  let calls = 0;
  const { updates, errors } = setup(t, {
    fetchImpl: async () => {
      calls += 1;
      if (calls === 2) return { ok: false, status: 503 };
      return { ok: true, json: async () => calls === 1 ? { room_a: true } : { room_b: true } };
    },
  });
  await flush();
  t.mock.timers.tick(100);
  await flush();
  assert.deepEqual(updates, [['room_a']]);
  assert.match(errors[0].message, /503/);
  t.mock.timers.tick(100);
  await flush();
  assert.deepEqual(updates, [['room_a'], ['room_b']]);
});

test('an empty database produces an empty list', async (t) => {
  const { updates } = setup(t, {
    fetchImpl: async () => ({ ok: true, json: async () => null }),
  });
  await flush();
  assert.deepEqual(updates, [[]]);
});

test('times out a stalled fetch and retries instead of loading forever', async (t) => {
  let calls = 0;
  const { errors } = setup(t, {
    fetchImpl: (url, { signal }) => {
      calls += 1;
      return new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => reject(new Error('Request timed out')), { once: true });
      });
    },
  });
  await flush();
  t.mock.timers.tick(1_000);
  await flush();
  assert.equal(errors.length, 1);
  t.mock.timers.tick(100);
  await flush();
  assert.equal(calls, 2);
});
