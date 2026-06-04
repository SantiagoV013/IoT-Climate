import { formatTimestamp } from '../utils/timestamps.js';

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

  return (
    <section className="glass-card rounded-[24px] p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-950">{labels.airQualityAnalytics}</h2>
          <p className="mt-1 text-xs text-gray-500">{labels.airQualitySubtitle}</p>
        </div>
        <span
          className={`inline-flex w-fit items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold shadow-sm ring-1 ring-gray-200 ${status.textClass}`}
        >
          <span className={`h-2 w-2 rounded-full ${status.colorClass}`} />
          {statusLabel}
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        {[
          [labels.currentCo2, eco2 ?? '--', 'ppm', co2Trend],
          [labels.currentTvoc, tvoc ?? '--', 'ppb', tvocTrend],
          [labels.airQualityRating, statusLabel, '', labels.basedOnCo2],
          [labels.lastUpdated, timestamp ? formatTimestamp(timestamp) : '--', '', labels.realtimeDatabase],
        ].map(([label, value, unit, helper]) => (
          <div key={label} className="rounded-[18px] bg-white/65 p-3 shadow-sm ring-1 ring-gray-200/70">
            <p className="text-xs font-semibold text-gray-500">{label}</p>
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
