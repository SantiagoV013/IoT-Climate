/*
 * Copyright (c) 2026 santiago-qoop. All rights reserved.
 */
import { formatTimestamp } from '../utils/timestamps.js';
import { useState, useEffect } from 'react';

const ReadingsTable = ({ readings, labels, deviceId }) => {
  const [page, setPage] = useState(0);
  useEffect(() => { setPage(0); }, [readings, deviceId]);
  const recentReadings = readings.slice(page * 5, (page + 1) * 5);

  return (
    <div className="liquid-surface overflow-hidden rounded-[16px] sm:rounded-[20px]">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200/70 text-left text-xs sm:text-sm">
          <thead className="bg-white/25 text-[10px] uppercase tracking-wide text-gray-500 sm:text-xs">
            <tr>
              <th className="px-2.5 py-2 font-semibold sm:px-3.5 sm:py-3">{labels.tableTime}</th>
              <th className="px-2.5 py-2 font-semibold sm:px-3.5 sm:py-3">{labels.device}</th>
              <th className="px-2.5 py-2 font-semibold sm:px-3.5 sm:py-3">{labels.tableTemp}</th>
              <th className="px-2.5 py-2 font-semibold sm:px-3.5 sm:py-3">{labels.tableHumidity}</th>
              <th className="px-2.5 py-2 font-semibold sm:px-3.5 sm:py-3">{labels.tableLight}</th>
              <th className="px-2.5 py-2 font-semibold sm:px-3.5 sm:py-3">{labels.tableMotion}</th>
              <th className="px-2.5 py-2 font-semibold sm:px-3.5 sm:py-3">{labels.tableCo2}</th>
              <th className="px-2.5 py-2 font-semibold sm:px-3.5 sm:py-3">{labels.tableTvoc}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100/80">
            {recentReadings.length > 0 ? (
              recentReadings.map((reading) => (
                <tr key={reading.id} className="transition hover:bg-white/45">
                  <td className="whitespace-nowrap px-2.5 py-2 text-gray-700 sm:px-3.5 sm:py-3">
                    {formatTimestamp(reading.timestamp)}
                  </td>
                  <td className="whitespace-nowrap px-2.5 py-2 font-semibold text-gray-950 sm:px-3.5 sm:py-3">
                    {reading.deviceId ?? deviceId ?? '--'}
                  </td>
                  <td className="whitespace-nowrap px-2.5 py-2 font-medium text-gray-950 sm:px-3.5 sm:py-3">
                    {reading.temperature ?? '--'} C
                  </td>
                  <td className="whitespace-nowrap px-2.5 py-2 text-gray-700 sm:px-3.5 sm:py-3">
                    {reading.humidity ?? '--'}%
                  </td>
                  <td className="whitespace-nowrap px-2.5 py-2 text-gray-700 sm:px-3.5 sm:py-3">
                    {reading.lightPercent ?? '--'}%
                  </td>
                  <td className="whitespace-nowrap px-2.5 py-2 sm:px-3.5 sm:py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        reading.motion
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {reading.motion ? labels.motionDetected : labels.motionClear}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-2.5 py-2 text-gray-700 sm:px-3.5 sm:py-3">
                    {reading.eco2 ?? '--'} ppm
                  </td>
                  <td className="whitespace-nowrap px-2.5 py-2 text-gray-700 sm:px-3.5 sm:py-3">
                    {reading.tvoc ?? '--'} ppb
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                  {labels.noRecentReadings}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between gap-3 p-3 text-xs">
        <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)} className="disabled:opacity-30" aria-label={labels.newerPage}>←</button>
        <span>{readings.length ? page * 5 + 1 : 0}–{Math.min((page + 1) * 5, readings.length)} / {readings.length}</span>
        <button type="button" disabled={(page + 1) * 5 >= readings.length} onClick={() => setPage(page + 1)} className="disabled:opacity-30" aria-label={labels.olderPage}>→</button>
      </div>
    </div>
  );
};

export default ReadingsTable;
