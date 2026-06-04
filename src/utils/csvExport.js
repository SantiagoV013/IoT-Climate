/*
 * Copyright (c) 2026 santiago-qoop. All rights reserved.
 */
import { formatTimestamp } from './timestamps.js';

const CSV_HEADERS = [
  'deviceId',
  'timestamp',
  'formattedTimestamp',
  'temperature',
  'humidity',
  'lightPercent',
  'motion',
  'eco2',
  'tvoc',
  'rssi',
];

const escapeCsvValue = (value) => {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replaceAll('"', '""')}"`;
  }
  return stringValue;
};

export const downloadReadingsCsv = (readings, filename = 'esp32-readings.csv') => {
  if (!Array.isArray(readings) || readings.length === 0) return;

  const enrichedReadings = readings.map((reading) => ({
    ...reading,
    formattedTimestamp: formatTimestamp(reading.timestamp),
  }));

  const rows = enrichedReadings.map((reading) =>
    CSV_HEADERS.map((header) => escapeCsvValue(reading[header])).join(','),
  );
  const csv = [CSV_HEADERS.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
