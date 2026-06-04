/*
 * Copyright (c) 2026 santiago-qoop. All rights reserved.
 */
export const getAirQualityStatus = (eco2) => {
  const value = Number(eco2);
  if (!Number.isFinite(value) || value < 0) {
    return {
      labelKey: 'unknown',
      label: 'Unknown',
      accent: 'neutral',
      colorClass: 'bg-gray-400',
      textClass: 'text-gray-600',
    };
  }

  if (value < 600) {
    return {
      labelKey: 'excellent',
      label: 'Excellent',
      accent: 'green',
      colorClass: 'bg-emerald-500',
      textClass: 'text-emerald-700',
    };
  }

  if (value < 800) {
    return {
      labelKey: 'good',
      label: 'Good',
      accent: 'green',
      colorClass: 'bg-emerald-500',
      textClass: 'text-emerald-700',
    };
  }

  if (value <= 1200) {
    return {
      labelKey: 'moderate',
      label: 'Moderate',
      accent: 'amber',
      colorClass: 'bg-amber-400',
      textClass: 'text-amber-700',
    };
  }

  if (value <= 2000) {
    return {
      labelKey: 'poor',
      label: 'Poor',
      accent: 'red',
      colorClass: 'bg-red-500',
      textClass: 'text-red-700',
    };
  }

  return {
    labelKey: 'critical',
    label: 'Critical',
    accent: 'red',
    colorClass: 'bg-red-600',
    textClass: 'text-red-700',
  };
};

export const getCo2Accent = (eco2) => {
  const value = Number(eco2);
  if (!Number.isFinite(value) || value < 0) return 'neutral';
  if (value < 800) return 'green';
  if (value <= 1200) return 'amber';
  return 'red';
};

export const getWifiSignalStatus = (rssi) => {
  const value = Number(rssi);
  if (!Number.isFinite(value)) {
    return { labelKey: 'unknown', label: 'Unknown', accent: 'neutral' };
  }

  if (value > -60) return { labelKey: 'excellent', label: 'Excellent', accent: 'green' };
  if (value >= -70) return { labelKey: 'good', label: 'Good', accent: 'green' };
  if (value >= -80) return { labelKey: 'fair', label: 'Fair', accent: 'amber' };
  return { labelKey: 'weak', label: 'Weak', accent: 'red' };
};

export const getTrend = (current, previous, unit) => {
  const currentValue = Number(current);
  const previousValue = Number(previous);

  if (
    !Number.isFinite(currentValue) ||
    !Number.isFinite(previousValue) ||
    currentValue < 0 ||
    previousValue < 0
  ) {
    return '--';
  }

  const diff = currentValue - previousValue;
  if (diff === 0) return `0 ${unit}`;

  const direction = diff > 0 ? '↑' : '↓';
  const sign = diff > 0 ? '+' : '';
  return `${direction} ${sign}${diff} ${unit}`;
};
