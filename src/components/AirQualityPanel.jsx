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
    <section className="glass-card rounded-[24px] p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-2.5">
          <span
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"
            aria-hidden="true"
          >
            <AirQualityIcon name="air" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-gray-950">{labels.airQualityAnalytics}</h2>
            <p className="mt-1 text-xs text-gray-500">{labels.airQualitySubtitle}</p>
          </div>
        </div>
        <span
          className={`inline-flex w-fit items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold shadow-sm ring-1 ring-gray-200 ${status.textClass}`}
        >
          <AirQualityIcon name="rating" />
          <span className={`h-2 w-2 rounded-full ${status.colorClass}`} />
          {statusLabel}
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        {cards.map(({ label, value, unit, helper, icon, accent }) => (
          <div key={label} className="rounded-[18px] bg-white/65 p-3 shadow-sm ring-1 ring-gray-200/70">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-semibold text-gray-500">{label}</p>
              <span
                className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${
                  iconClasses[accent] ?? iconClasses.neutral
                }`}
                aria-hidden="true"
              >
                <AirQualityIcon name={icon} />
              </span>
            </div>
            {isLoading ? (
              <div className="mt-3 h-7 w-20 animate-pulse rounded-full bg-gray-200" />
            ) : (
              <p className="mt-2 text-xl font-semibold tracking-normal text-gray-950">
                {value}
                {unit ? <span className="ml-1 text-sm font-medium text-gray-500">{unit}</span> : null}
              </p>
            )}
            <p className="mt-1.5 text-xs font-medium text-gray-500">{helper}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default AirQualityPanel;
