/* Copyright (c) 2026 santiago-qoop. All rights reserved. */
import { endBefore, get, limitToLast, orderByKey, query, ref } from 'firebase/database';

export const createHistoryPageReader = (database) => async ({ deviceId, beforeKey, limit }) => {
  const snapshot = await get(query(
    ref(database, `/devices/${deviceId}/history`),
    orderByKey(),
    ...(beforeKey === null ? [] : [endBefore(beforeKey)]),
    limitToLast(limit),
  ));
  const entries = [];
  // forEach preserves Firebase's key ordering, unlike Object.entries(val()).
  snapshot.forEach((child) => { entries.push([child.key, child.val()]); });
  return entries;
};
