/* Copyright (c) 2026 santiago-qoop. All rights reserved. */

// Discover keys only. An SDK listener on /devices downloads every history too.
export function watchDeviceDirectory({
  databaseUrl,
  user,
  onDevices,
  onError,
  fetchImpl = fetch,
  refreshMs = 60_000,
  timeoutMs = 15_000,
}) {
  let stopped = false;
  let refreshTimer;
  let controller;

  const refresh = async () => {
    controller = new AbortController();
    const requestController = controller;
    const timeout = setTimeout(() => requestController.abort(), timeoutMs);

    try {
      const token = await user.getIdToken();
      if (stopped) return;
      const url = new URL(`${databaseUrl.replace(/\/$/, '')}/devices.json`);
      url.searchParams.set('shallow', 'true');
      url.searchParams.set('auth', token);
      const response = await fetchImpl(url, {
        signal: requestController.signal,
        cache: 'no-store',
      });
      if (!response.ok) throw new Error(`Device discovery failed (${response.status})`);
      const data = await response.json();
      if (!stopped) onDevices(Object.keys(data ?? {}).sort());
    } catch (error) {
      if (!stopped) onError(error);
    } finally {
      clearTimeout(timeout);
      // Schedule after completion so a slow connection never stacks requests.
      if (!stopped) refreshTimer = setTimeout(refresh, refreshMs);
    }
  };

  void refresh();
  return () => {
    stopped = true;
    clearTimeout(refreshTimer);
    controller?.abort();
  };
}
