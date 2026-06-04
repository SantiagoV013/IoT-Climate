/*
 * Copyright (c) 2026 santiago-qoop. All rights reserved.
 */
import { formatTimestamp } from '../utils/timestamps.js';

const iconClasses = {
  neutral: 'bg-gray-100 text-gray-700',
  green: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  blue: 'bg-blue-50 text-blue-600',
};

const AirQualityIcon = ({ name }) => {
  const commonProps = {
    className: 'h-3.5 w-3.5',
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    strokeWidth: 2,
    viewBox: '0 0 24 24',
    'aria-hidden': 'true',
  };

  const icons = {
    air: (
      <svg {...commonProps}>
        <path d="M8 17h8a5 5 0 0 0 .5-9.97A6.5 6.5 0 0 0 4 9.5 4.5 4.5 0 0 0 8 17Z" />
        <path d="M8 21h.01" />
        <path d="M12 21h.01" />
        <path d="M16 21h.01" />
      </svg>
    ),
    co2: (
      <svg {...commonProps}>
        <path d="M8 17h8a5 5 0 0 0 .5-9.97A6.5 6.5 0 0 0 4 9.5 4.5 4.5 0 0 0 8 17Z" />
        <path d="M8 21h.01" />
        <path d="M12 21h.01" />
        <path d="M16 21h.01" />
      </svg>
    ),
    tvoc: (
      <svg {...commonProps}>
        <path d="M12 3v4" />
        <path d="M12 17v4" />
        <path d="M3 12h4" />
        <path d="M17 12h4" />
        <path d="m5.64 5.64 2.83 2.83" />
        <path d="m15.53 15.53 2.83 2.83" />
        <path d="m18.36 5.64-2.83 2.83" />
        <path d="m8.47 15.53-2.83 2.83" />
      </svg>
    ),
    rating: (
      <svg {...commonProps}>
        <path d="M12 3 5 6v5c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z" />
        <path d="M9.5 12.5 11 14l3.5-4" />
      </svg>
    ),
    clock: (
      <svg {...commonProps}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    ),
  };

  return icons[name] ?? null;
};

const AirQualityPanel = ({
  labels,
  eco2,
  tvoc,
  timestamp,
  status,
  co2Trend,
  tvocTrend,
  isLoading = false,
}) => {
  const statusLabel = labels[status.labelKey] ?? status.label;
  const cards = [
    { label: labels.currentCo2, value: eco2 ?? '--', unit: 'ppm', helper: co2Trend, icon: 'co2', accent: 'green' },
    { label: labels.currentTvoc, value: tvoc ?? '--', unit: 'ppb', helper: tvocTrend, icon: 'tvoc', accent: 'blue' },
    { label: labels.airQualityRating, value: statusLabel, unit: '', helper: labels.basedOnCo2, icon: 'rating', accent: 'amber' },
    {
      label: labels.lastUpdated,
      value: timestamp ? formatTimestamp(timestamp) : '--',
      unit: '',
      helper: labels.realtimeDatabase,
      icon: 'clock',
      accent: 'neutral',
    },
  ];

  return (
    <section className="glass-card rounded-[18px] p-2.5 sm:rounded-[24px] sm:p-5">
      <div className="flex items-center justify-between gap-2.5 sm:items-start">
        <div className="flex items-start gap-2.5">
          <span
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 sm:h-8 sm:w-8 sm:rounded-xl"
            aria-hidden="true"
          >
            <AirQualityIcon name="air" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-gray-950 sm:text-lg">{labels.airQualityAnalytics}</h2>
            <p className="mt-1 hidden text-xs text-gray-500 sm:block">{labels.airQualitySubtitle}</p>
          </div>
        </div>
        <span
          className={`liquid-control inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-semibold sm:gap-2 sm:px-3 sm:py-1.5 sm:text-xs ${status.textClass}`}
        >
          <AirQualityIcon name="rating" />
          <span className={`h-1.5 w-1.5 rounded-full sm:h-2 sm:w-2 ${status.colorClass}`} />
          {statusLabel}
        </span>
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-1.5 sm:mt-4 sm:gap-2 md:grid-cols-4 md:gap-3">
        {cards.map(({ label, value, unit, helper, icon, accent }) => (
          <div key={label} className="liquid-surface rounded-xl p-2 sm:rounded-2xl sm:p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="truncate text-[10px] font-semibold text-gray-500 sm:text-xs">{label}</p>
              <span
                className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md sm:h-6 sm:w-6 sm:rounded-lg ${
                  iconClasses[accent] ?? iconClasses.neutral
                }`}
                aria-hidden="true"
              >
                <AirQualityIcon name={icon} />
              </span>
            </div>
            {isLoading ? (
              <div className="mt-3 h-7 w-20 animate-pulse rounded-full bg-white/50" />
            ) : (
              <p className="mt-1 text-sm font-semibold tracking-normal text-gray-950 sm:mt-2 sm:text-xl">
                {value}
                {unit ? <span className="ml-1 text-[10px] font-medium text-gray-500 sm:text-sm">{unit}</span> : null}
              </p>
            )}
            <p className="mt-1.5 hidden text-xs font-medium text-gray-500 sm:block">{helper}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default AirQualityPanel;
