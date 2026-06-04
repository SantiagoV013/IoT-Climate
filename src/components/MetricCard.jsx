const MetricCard = ({
  label,
  value,
  unit,
  helper,
  icon,
  accent = 'neutral',
  isLoading = false,
  compact = false,
  badge,
}) => {
  const accentClasses = {
    neutral: 'bg-gray-900',
    blue: 'bg-blue-500',
    green: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
  };
  const iconClasses = {
    neutral: 'bg-gray-100 text-gray-700',
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
  };
  const valueText = String(value ?? '');
  const isLongValue = valueText.length > 12;
  const valueSizeClass = compact
    ? isLongValue
      ? 'text-[11px] leading-snug sm:text-sm'
      : 'text-xs leading-tight sm:text-base'
    : isLongValue
      ? 'text-xs leading-tight sm:text-base'
      : 'text-sm sm:text-xl';

  return (
    <article className="glass-card subtle-ring min-h-[52px] rounded-xl p-1.5 transition duration-300 hover:-translate-y-0.5 hover:shadow-glass sm:min-h-[88px] sm:rounded-2xl sm:p-2.5">
      <div className="flex items-start justify-between gap-1.5 sm:gap-2">
        <div className="min-w-0">
          <p className="truncate text-[9px] font-semibold text-gray-500 sm:text-[11px]">{label}</p>
          {isLoading ? (
            <div className="mt-2 h-5 w-16 animate-pulse rounded-full bg-gray-200" />
          ) : (
            <div className="mt-0.5 flex min-w-0 flex-wrap items-baseline gap-x-0.5 gap-y-0.5 sm:mt-1 sm:gap-x-1">
              <span
                className={`max-w-full break-words font-semibold tracking-normal text-gray-950 ${valueSizeClass}`}
              >
                {value}
              </span>
              {unit ? <span className="text-[9px] font-medium text-gray-500 sm:text-[11px]">{unit}</span> : null}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          {icon ? (
            <span
              className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-md sm:h-6 sm:w-6 sm:rounded-lg ${iconClasses[accent]}`}
              aria-hidden="true"
            >
              <MetricIcon name={icon} />
            </span>
          ) : null}
          <span className={`hidden h-1.5 w-1.5 shrink-0 rounded-full sm:block ${accentClasses[accent]}`} />
        </div>
      </div>
      <div className="hidden flex-wrap items-center gap-1 sm:mt-2 sm:flex">
        {helper ? <p className="line-clamp-2 text-[10px] leading-snug text-gray-500">{helper}</p> : null}
        {badge ? (
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
            {badge}
          </span>
        ) : null}
      </div>
    </article>
  );
};

const MetricIcon = ({ name }) => {
  const commonProps = {
    className: 'h-3 w-3',
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    strokeWidth: 2,
    viewBox: '0 0 24 24',
  };

  const icons = {
    status: (
      <svg {...commonProps}>
        <path d="M4 12h4l2-6 4 12 2-6h4" />
      </svg>
    ),
    temperature: (
      <svg {...commonProps}>
        <path d="M14 14.76V5a4 4 0 0 0-8 0v9.76a6 6 0 1 0 8 0Z" />
        <path d="M10 9v7" />
      </svg>
    ),
    humidity: (
      <svg {...commonProps}>
        <path d="M12 3.5S6 10 6 14a6 6 0 0 0 12 0c0-4-6-10.5-6-10.5Z" />
      </svg>
    ),
    light: (
      <svg {...commonProps}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2" />
        <path d="M12 20v2" />
        <path d="m4.93 4.93 1.41 1.41" />
        <path d="m17.66 17.66 1.41 1.41" />
        <path d="M2 12h2" />
        <path d="M20 12h2" />
        <path d="m6.34 17.66-1.41 1.41" />
        <path d="m19.07 4.93-1.41 1.41" />
      </svg>
    ),
    motion: (
      <svg {...commonProps}>
        <path d="M5 12a7 7 0 0 1 7-7" />
        <path d="M3 12a9 9 0 0 1 9-9" />
        <path d="M12 12h.01" />
        <path d="M12 12l5 5" />
        <path d="M19 17l2 2" />
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
    wifi: (
      <svg {...commonProps}>
        <path d="M5 13a10 10 0 0 1 14 0" />
        <path d="M8.5 16.5a5 5 0 0 1 7 0" />
        <path d="M12 20h.01" />
      </svg>
    ),
  };

  return icons[name] ?? null;
};

export default MetricCard;
