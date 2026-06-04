import { formatTimestamp } from '../utils/timestamps.js';

const ReadingsTable = ({ readings, labels, deviceId }) => {
  const recentReadings = readings.slice(0, 5);

  return (
    <div className="overflow-hidden rounded-[28px] border border-white/70 bg-white/55">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200/70 text-left text-sm">
          <thead className="bg-white/55 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-5 py-4 font-semibold">{labels.tableTime}</th>
              <th className="px-5 py-4 font-semibold">{labels.device}</th>
              <th className="px-5 py-4 font-semibold">{labels.tableTemp}</th>
              <th className="px-5 py-4 font-semibold">{labels.tableHumidity}</th>
              <th className="px-5 py-4 font-semibold">{labels.tableLight}</th>
              <th className="px-5 py-4 font-semibold">{labels.tableMotion}</th>
              <th className="px-5 py-4 font-semibold">{labels.tableCo2}</th>
              <th className="px-5 py-4 font-semibold">{labels.tableTvoc}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100/80">
            {recentReadings.length > 0 ? (
              recentReadings.map((reading) => (
                <tr key={reading.id} className="transition hover:bg-white/70">
                  <td className="whitespace-nowrap px-5 py-4 text-gray-700">
                    {formatTimestamp(reading.timestamp)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 font-semibold text-gray-950">
                    {reading.deviceId ?? deviceId ?? '--'}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 font-medium text-gray-950">
                    {reading.temperature ?? '--'} C
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-gray-700">
                    {reading.humidity ?? '--'}%
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-gray-700">
                    {reading.lightPercent ?? '--'}%
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
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
                  <td className="whitespace-nowrap px-5 py-4 text-gray-700">
                    {reading.eco2 ?? '--'} ppm
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-gray-700">
                    {reading.tvoc ?? '--'} ppb
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="px-5 py-10 text-center text-gray-500">
                  {labels.noRecentReadings}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReadingsTable;
