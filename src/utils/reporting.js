/* Copyright (c) 2026 santiago-qoop. All rights reserved. */
import { getTimestampMs } from './timestamps.js';

export const REPORT_PERIODS = ['daily', 'weekly', 'monthly'];

export function getReportRange(period, now = Date.now()) {
  const start = new Date(now);
  if (period === 'daily') start.setHours(0, 0, 0, 0);
  else start.setDate(start.getDate() - (period === 'weekly' ? 7 : 30));
  return { start: start.getTime(), end: now };
}

const metrics = ['temperature', 'humidity', 'lightPercent', 'eco2', 'tvoc'];
const emptyHours = () => Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));
const busiestHour = (hours) => hours.reduce(
  (best, item) => item.count > (best?.count ?? 0) ? item : best, null,
);

// Retain only totals and 24 hour buckets, regardless of the history's size.
// All periods share one download, including legacy records with non-date keys.
export function createReportAccumulator(deviceId, ranges) {
  const periods = Object.entries(ranges).map(([period, range]) => ({
    period,
    range,
    readingCount: 0,
    motionCount: 0,
    motionByHour: emptyHours(),
    metrics: Object.fromEntries(metrics.map((key) => [key, { sum: 0, count: 0, peak: null }])),
  }));

  return {
    addPage(entries) {
      for (const [key, value] of entries) {
        const time = getTimestampMs(value?.timestamp ?? key);
        if (time === null) continue;
        for (const state of periods) {
          if (time < state.range.start || time > state.range.end) continue;
          state.readingCount += 1;
          if (Number(value?.motion) === 1) {
            state.motionCount += 1;
            state.motionByHour[new Date(time).getHours()].count += 1;
          }
          for (const metric of metrics) {
            const raw = value?.[metric];
            if (raw == null || (typeof raw === 'string' && raw.trim() === '')) continue;
            const number = Number(raw);
            if (!Number.isFinite(number) || typeof raw === 'boolean') continue;
            const total = state.metrics[metric];
            total.sum += number;
            total.count += 1;
            if (total.peak === null || number > total.peak) total.peak = number;
          }
        }
      }
    },

    finish() {
      return Object.fromEntries(periods.map((state) => {
        const average = (key) => {
          const { sum, count } = state.metrics[key];
          return count ? sum / count : null;
        };
        return [state.period, {
          deviceId,
          readingCount: state.readingCount,
          motionCount: state.motionCount,
          motionByHour: state.motionByHour,
          busiestHour: busiestHour(state.motionByHour),
          avgTemperature: average('temperature'),
          avgHumidity: average('humidity'),
          avgLight: average('lightPercent'),
          avgCo2: average('eco2'),
          avgTvoc: average('tvoc'),
          peakCo2: state.metrics.eco2.peak,
          peakTvoc: state.metrics.tvoc.peak,
          co2Sum: state.metrics.eco2.sum,
          co2Count: state.metrics.eco2.count,
        }];
      }));
    },
  };
}

export function buildReportSummary(reports) {
  const summary = {
    readingCount: 0,
    activeDeviceCount: 0,
    motionTotal: 0,
    avgCo2: null,
    motionByHour: emptyHours(),
    mostActiveMotionDevice: null,
    quietestDevice: null,
    highestCo2Device: null,
    busiestMotionHour: null,
  };
  let co2Sum = 0;
  let co2Count = 0;
  for (const report of reports) {
    if (!report.readingCount) continue;
    summary.activeDeviceCount += 1;
    summary.readingCount += report.readingCount;
    summary.motionTotal += report.motionCount;
    co2Sum += report.co2Sum;
    co2Count += report.co2Count;
    for (const { hour, count } of report.motionByHour) summary.motionByHour[hour].count += count;
    if (!summary.mostActiveMotionDevice || report.motionCount > summary.mostActiveMotionDevice.motionCount) {
      summary.mostActiveMotionDevice = report;
    }
    if (!summary.quietestDevice || report.motionCount < summary.quietestDevice.motionCount) {
      summary.quietestDevice = report;
    }
    if (Number.isFinite(report.peakCo2) &&
      (!summary.highestCo2Device || report.peakCo2 > summary.highestCo2Device.peakCo2)) {
      summary.highestCo2Device = report;
    }
  }
  summary.avgCo2 = co2Count ? co2Sum / co2Count : null;
  summary.busiestMotionHour = busiestHour(summary.motionByHour);
  return summary;
}
