import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatChartTime } from '../utils/timestamps.js';

const formatShortTime = (value) => {
  if (!value) return '';
  return formatChartTime(value);
};

const formatTooltipLabel = (value, timestampLabel) => {
  return `${timestampLabel}: ${formatChartTime(value)}`;
};

const SensorChart = ({
  title,
  subtitle,
  data,
  dataKey,
  color = '#111827',
  unit = '',
  type = 'area',
  locale,
  emptyLabel = 'No historical data yet',
  timestampLabel = 'Timestamp',
}) => {
  const hasData = Array.isArray(data) && data.length > 0;
  const Chart = type === 'line' ? LineChart : AreaChart;

  return (
    <section className="glass-card rounded-[24px] p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-gray-950">{title}</h2>
          {subtitle ? <p className="mt-1 text-xs text-gray-500">{subtitle}</p> : null}
        </div>
      </div>

      <div className="h-56 w-full">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <Chart data={data} margin={{ top: 6, right: 8, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id={`${dataKey}-gradient`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.22} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="chartTime"
                tickFormatter={formatShortTime}
                tick={{ fill: '#6b7280', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                minTickGap={28}
              />
              <YAxis
                tick={{ fill: '#6b7280', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={48}
              />
              <Tooltip
                contentStyle={{
                  border: '1px solid rgba(229,231,235,0.9)',
                  borderRadius: 14,
                  boxShadow: '0 18px 45px rgba(15,23,42,0.12)',
                }}
                labelFormatter={(value) => formatTooltipLabel(value, timestampLabel)}
                formatter={(value) => [`${value}${unit ? ` ${unit}` : ''}`, title]}
              />
              {type === 'line' ? (
                <Line
                  type="monotone"
                  dataKey={dataKey}
                  stroke={color}
                  strokeWidth={2.4}
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
              ) : (
                <Area
                  type="monotone"
                  dataKey={dataKey}
                  stroke={color}
                  strokeWidth={2.4}
                  fill={`url(#${dataKey}-gradient)`}
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
              )}
            </Chart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-3xl bg-white/45 text-sm text-gray-500">
            {emptyLabel}
          </div>
        )}
      </div>
    </section>
  );
};

export default SensorChart;
