import { useEffect, useMemo, useState } from 'react';
import { get, onValue, ref } from 'firebase/database';
import { Line, LineChart, ResponsiveContainer } from 'recharts';
import AirQualityPanel from './components/AirQualityPanel.jsx';
import MetricCard from './components/MetricCard.jsx';
import ReadingsTable from './components/ReadingsTable.jsx';
import SensorChart from './components/SensorChart.jsx';
import { database, firebaseConfigError } from './firebase.js';
import { getAirQualityStatus, getCo2Accent, getTrend, getWifiSignalStatus } from './utils/airQuality.js';
import { downloadReadingsCsv } from './utils/csvExport.js';
import { formatRelativeTime, formatTimestamp, getTimestampMs } from './utils/timestamps.js';

const DEFAULT_DEVICE_ID = 'esp32_room_01';
const DEVICES_PATH = '/devices';
const ONLINE_WINDOW_MS = 60 * 1000;
const LANGUAGE_STORAGE_KEY = 'environment-monitor-language';
const DEVICE_STORAGE_KEY = 'environment-monitor-device';

const translations = {
  en: {
    languageLabel: 'Language',
    english: 'English',
    spanish: 'Español',
    title: 'Environment Monitor',
    subtitle: 'Live ESP32 sensor telemetry',
    overview: 'Overview',
    devices: 'Devices',
    allDevices: 'All devices',
    deviceOverviewSubtitle: 'Connected ESP32 telemetry nodes',
    downloadCsv: 'Download CSV',
    csvExport: 'CSV export',
    exportDevices: 'Devices to include',
    dateFrom: 'From',
    dateTo: 'To',
    allDates: 'All dates',
    syncedDatesOnly: 'Date range filters use Firebase millisecond timestamps.',
    noExportRows: 'No rows match this export filter.',
    preparingCsv: 'Preparing CSV...',
    close: 'Close',
    firebaseErrorTitle: 'Firebase connection error',
    loading: 'Loading Firebase telemetry...',
    noSensorReadings: 'No sensor readings yet',
    noDevices: 'No devices found',
    device: 'Device',
    deviceSelector: 'Device selector',
    deviceDiscoveryError: 'Device discovery is blocked by Firebase rules.',
    status: 'Status',
    online: 'Online',
    offline: 'Offline',
    activeDevice: 'Active device',
    lastSeen: 'Last seen',
    waitingForData: 'Waiting for data at',
    and: 'and',
    temperature: 'Temperature',
    currentRoomAir: 'Current room air',
    humidity: 'Humidity',
    relativeHumidity: 'Relative humidity',
    light: 'Light',
    ambientBrightness: 'Ambient brightness',
    motion: 'Motion',
    motionDetected: 'Detected',
    motionClear: 'Clear',
    pirSensorState: 'PIR sensor state',
    co2: 'CO2',
    co2Subtitle: 'Equivalent carbon dioxide',
    tvoc: 'TVOC',
    tvocSubtitle: 'Total Volatile Organic Compounds',
    wifiSignal: 'WiFi Signal',
    rssiSubtitle: 'RSSI connection quality',
    airQualityAnalytics: 'Air Quality Analytics',
    airQualitySubtitle: 'CCS811 gas sensor telemetry',
    currentCo2: 'Current CO2',
    currentTvoc: 'Current TVOC',
    airQualityRating: 'Air Quality Rating',
    basedOnCo2: 'Based on CO2 level',
    excellent: 'Excellent',
    good: 'Good',
    moderate: 'Moderate',
    poor: 'Poor',
    critical: 'Critical',
    fair: 'Fair',
    weak: 'Weak',
    unknown: 'Unknown',
    co2SubtitleChart: 'Equivalent CO2 concentration over time',
    tvocSubtitleChart: 'Volatile organic compounds over time',
    lastUpdated: 'Last Updated',
    receivedByDashboard: 'Received by dashboard',
    updatedFallback: 'Updated just now',
    noRelativeTime: 'Relative time unavailable',
    realtimeDatabase: 'Realtime database',
    temperatureSubtitle: 'Degrees Celsius over time',
    humiditySubtitle: 'Relative humidity over time',
    lightSubtitle: 'Brightness percentage over time',
    motionEvents: 'Motion Events',
    motionSubtitle: 'Binary motion activity over time',
    noHistoricalData: 'No historical data yet',
    timestamp: 'Timestamp',
    recentReadings: 'Recent Readings',
    latestRecords: 'Latest',
    historicalRecords: 'historical records',
    exportHistory: 'Export history',
    tableTime: 'Time',
    tableTemp: 'Temp',
    tableHumidity: 'Humidity',
    tableLight: 'Light',
    tableMotion: 'Motion',
    tableCo2: 'CO2',
    tableTvoc: 'TVOC',
    noRecentReadings: 'No recent readings available',
  },
  es: {
    languageLabel: 'Idioma',
    english: 'English',
    spanish: 'Español',
    title: 'Monitor Ambiental',
    subtitle: 'Telemetría en vivo del sensor ESP32',
    overview: 'Resumen',
    devices: 'Dispositivos',
    allDevices: 'Todos los dispositivos',
    deviceOverviewSubtitle: 'Nodos ESP32 de telemetría conectados',
    downloadCsv: 'Descargar CSV',
    csvExport: 'Exportar CSV',
    exportDevices: 'Dispositivos a incluir',
    dateFrom: 'Desde',
    dateTo: 'Hasta',
    allDates: 'Todas las fechas',
    syncedDatesOnly: 'El rango de fechas usa timestamps de Firebase en milisegundos.',
    noExportRows: 'No hay filas que coincidan con este filtro.',
    preparingCsv: 'Preparando CSV...',
    close: 'Cerrar',
    firebaseErrorTitle: 'Error de conexión con Firebase',
    loading: 'Cargando telemetría de Firebase...',
    noSensorReadings: 'Aún no hay lecturas del sensor',
    noDevices: 'No se encontraron dispositivos',
    device: 'Dispositivo',
    deviceSelector: 'Selector de dispositivo',
    deviceDiscoveryError: 'Las reglas de Firebase bloquean la detección de dispositivos.',
    status: 'Estado',
    online: 'En línea',
    offline: 'Sin conexión',
    activeDevice: 'Dispositivo activo',
    lastSeen: 'Visto por última vez',
    waitingForData: 'Esperando datos en',
    and: 'y',
    temperature: 'Temperatura',
    currentRoomAir: 'Aire actual de la habitación',
    humidity: 'Humedad',
    relativeHumidity: 'Humedad relativa',
    light: 'Luz',
    ambientBrightness: 'Brillo ambiental',
    motion: 'Movimiento',
    motionDetected: 'Detectado',
    motionClear: 'Sin movimiento',
    pirSensorState: 'Estado del sensor PIR',
    co2: 'CO2',
    co2Subtitle: 'Dioxido de carbono equivalente',
    tvoc: 'TVOC',
    tvocSubtitle: 'Compuestos organicos volatiles totales',
    wifiSignal: 'Senal WiFi',
    rssiSubtitle: 'Calidad de conexion RSSI',
    airQualityAnalytics: 'Analitica de calidad del aire',
    airQualitySubtitle: 'Telemetria del sensor CCS811',
    currentCo2: 'CO2 actual',
    currentTvoc: 'TVOC actual',
    airQualityRating: 'Calificacion del aire',
    basedOnCo2: 'Basado en el nivel de CO2',
    excellent: 'Excelente',
    good: 'Buena',
    moderate: 'Moderada',
    poor: 'Mala',
    critical: 'Critica',
    fair: 'Regular',
    weak: 'Debil',
    unknown: 'Desconocido',
    co2SubtitleChart: 'Concentracion de CO2 equivalente en el tiempo',
    tvocSubtitleChart: 'Compuestos organicos volatiles en el tiempo',
    lastUpdated: 'Última actualización',
    receivedByDashboard: 'Recibido por el panel',
    updatedFallback: 'Actualizado ahora',
    noRelativeTime: 'Tiempo relativo no disponible',
    realtimeDatabase: 'Base de datos en tiempo real',
    temperatureSubtitle: 'Grados Celsius en el tiempo',
    humiditySubtitle: 'Humedad relativa en el tiempo',
    lightSubtitle: 'Porcentaje de brillo en el tiempo',
    motionEvents: 'Eventos de movimiento',
    motionSubtitle: 'Actividad binaria de movimiento en el tiempo',
    noHistoricalData: 'Aún no hay datos históricos',
    timestamp: 'Timestamp',
    recentReadings: 'Lecturas recientes',
    latestRecords: 'Últimos',
    historicalRecords: 'registros históricos',
    exportHistory: 'Exportar historial',
    tableTime: 'Hora',
    tableTemp: 'Temp',
    tableHumidity: 'Humedad',
    tableLight: 'Luz',
    tableMotion: 'Movimiento',
    tableCo2: 'CO2',
    tableTvoc: 'TVOC',
    noRecentReadings: 'No hay lecturas recientes disponibles',
  },
};

const normalizeReading = (reading, key) => {
  const timestamp = reading?.timestamp ?? key ?? null;
  const time = getTimestampMs(timestamp);

  return {
    id: key ?? String(timestamp ?? Date.now()),
    temperature: reading?.temperature ?? null,
    humidity: reading?.humidity ?? null,
    lightPercent: reading?.lightPercent ?? null,
    motion: Number(reading?.motion ?? 0),
    eco2: reading?.eco2 ?? null,
    tvoc: reading?.tvoc ?? null,
    rssi: reading?.rssi ?? null,
    timestamp,
    time,
  };
};

const getInitialLanguage = () => {
  if (typeof window === 'undefined') return 'en';
  const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (storedLanguage === 'en' || storedLanguage === 'es') return storedLanguage;
  return navigator.language?.toLowerCase().startsWith('es') ? 'es' : 'en';
};

const getInitialDevice = () => {
  if (typeof window === 'undefined') return DEFAULT_DEVICE_ID;
  return window.localStorage.getItem(DEVICE_STORAGE_KEY) || DEFAULT_DEVICE_ID;
};

const getDateInputMs = (value, endOfDay = false) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  if (value.length === 10 && endOfDay) {
    date.setHours(23, 59, 59, 999);
  }

  return date.getTime();
};

const isReadingOnline = (reading, now = Date.now()) => {
  if (!reading?.time) return false;
  return now - reading.time <= ONLINE_WINDOW_MS;
};

const buildMiniHistory = (history) => {
  if (!history) return [];

  return Object.entries(history)
    .map(([key, value]) => normalizeReading(value, key))
    .sort((a, b) => (a.time ?? 0) - (b.time ?? 0))
    .slice(-24)
    .map((reading) => ({
      ...reading,
      chartTime: new Date(Number(reading.timestamp)),
    }));
};

const MiniDeviceChart = ({ title, data, dataKey, color, unit = '' }) => (
  <div className="rounded-xl bg-white/65 p-2.5 shadow-sm ring-1 ring-gray-200/70">
    <div className="mb-1.5 flex items-center justify-between gap-2">
      <p className="text-xs font-semibold text-gray-500">{title}</p>
      <p className="text-xs font-semibold text-gray-950">
        {data.at(-1)?.[dataKey] ?? '--'}
        {unit}
      </p>
    </div>
    <div className="h-12">
      {data.length > 1 ? (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={1.8}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-full items-center justify-center text-xs text-gray-400">--</div>
      )}
    </div>
  </div>
);

const App = () => {
  const [latestReading, setLatestReading] = useState(null);
  const [history, setHistory] = useState([]);
  const [devices, setDevices] = useState([DEFAULT_DEVICE_ID]);
  const [deviceSummaries, setDeviceSummaries] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(getInitialDevice);
  const [activeSection, setActiveSection] = useState('overview');
  const [loading, setLoading] = useState({ devices: true, latest: true, history: true });
  const [error, setError] = useState(null);
  const [deviceDiscoveryError, setDeviceDiscoveryError] = useState(null);
  const [language, setLanguage] = useState(getInitialLanguage);
  const [exportDeviceIds, setExportDeviceIds] = useState([getInitialDevice()]);
  const [exportFrom, setExportFrom] = useState('');
  const [exportTo, setExportTo] = useState('');
  const [exportError, setExportError] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [now, setNow] = useState(Date.now());

  const t = translations[language];
  const locale = language === 'es' ? 'es-MX' : 'en-US';

  const updateLanguage = (nextLanguage) => {
    setLanguage(nextLanguage);
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
  };

  const updateSelectedDevice = (deviceId) => {
    setSelectedDeviceId(deviceId);
    window.localStorage.setItem(DEVICE_STORAGE_KEY, deviceId);
  };

  const toggleExportDevice = (deviceId) => {
    setExportDeviceIds((current) =>
      current.includes(deviceId)
        ? current.filter((currentDeviceId) => currentDeviceId !== deviceId)
        : [...current, deviceId],
    );
  };

  const exportCsv = async () => {
    if (!database || exportDeviceIds.length === 0) return;

    setIsExporting(true);
    setExportError(null);

    const fromMs = getDateInputMs(exportFrom);
    const toMs = getDateInputMs(exportTo, true);
    const hasDateFilter = Boolean(fromMs || toMs);

    try {
      const deviceRows = await Promise.all(
        exportDeviceIds.map(async (deviceId) => {
          const snapshot = await get(ref(database, `/devices/${deviceId}/history`));
          if (!snapshot.exists()) return [];

          return Object.entries(snapshot.val()).map(([key, value]) => ({
            ...normalizeReading(value, key),
            deviceId,
          }));
        }),
      );

      const rows = deviceRows
        .flat()
        .filter((reading) => {
          if (!hasDateFilter) return true;
          if (!reading.time) return false;
          if (fromMs && reading.time < fromMs) return false;
          if (toMs && reading.time > toMs) return false;
          return true;
        })
        .sort((a, b) => (a.time ?? 0) - (b.time ?? 0));

      if (rows.length === 0) {
        setExportError(t.noExportRows);
        return;
      }

      const devicePart =
        exportDeviceIds.length === 1 ? exportDeviceIds[0] : `${exportDeviceIds.length}-devices`;
      downloadReadingsCsv(rows, `${devicePart}-readings.csv`);
      setIsExportMenuOpen(false);
    } catch (csvError) {
      setExportError(csvError.message);
    } finally {
      setIsExporting(false);
    }
  };

  const openDevice = (deviceId) => {
    updateSelectedDevice(deviceId);
    setActiveSection('devices');
  };

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 15_000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!database) {
      setError(firebaseConfigError);
      setLoading({ devices: false, latest: false, history: false });
      return undefined;
    }

    const devicesRef = ref(database, DEVICES_PATH);

    const unsubscribeDevices = onValue(
      devicesRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setDevices([]);
          setLoading((current) => ({ ...current, devices: false }));
          return;
        }

        const deviceEntries = Object.entries(snapshot.val()).sort(([a], [b]) => a.localeCompare(b));
        const deviceIds = deviceEntries.map(([deviceId]) => deviceId);
        const summaries = deviceEntries.map(([deviceId, deviceData]) => ({
          id: deviceId,
          latest: deviceData?.latest ? normalizeReading(deviceData.latest, 'latest') : null,
          history: buildMiniHistory(deviceData?.history),
        }));

        setDevices(deviceIds);
        setDeviceSummaries(summaries);
        setExportDeviceIds((current) => {
          const existing = current.filter((deviceId) => deviceIds.includes(deviceId));
          return existing.length > 0 ? existing : deviceIds;
        });
        setDeviceDiscoveryError(null);
        setLoading((current) => ({ ...current, devices: false }));

        if (!deviceIds.includes(selectedDeviceId)) {
          updateSelectedDevice(deviceIds[0] ?? DEFAULT_DEVICE_ID);
        }
      },
      (firebaseError) => {
        setDeviceDiscoveryError(firebaseError.message);
        setDevices([selectedDeviceId]);
        setLoading((current) => ({ ...current, devices: false }));
      },
    );

    return () => {
      unsubscribeDevices();
    };
  }, [selectedDeviceId]);

  useEffect(() => {
    if (!database || !selectedDeviceId) {
      return undefined;
    }

    setLatestReading(null);
    setHistory([]);
    setLoading((current) => ({ ...current, latest: true, history: true }));
    setError(null);

    const latestPath = `/devices/${selectedDeviceId}/latest`;
    const historyPath = `/devices/${selectedDeviceId}/history`;
    const latestRef = ref(database, latestPath);
    const historyRef = ref(database, historyPath);

    const unsubscribeLatest = onValue(
      latestRef,
      (snapshot) => {
        const nextLatestReading = snapshot.exists()
          ? normalizeReading(snapshot.val(), 'latest')
          : null;

        setLatestReading(nextLatestReading);
        setDeviceSummaries((current) => {
          const nextSummary = { id: selectedDeviceId, latest: nextLatestReading };
          if (current.some((device) => device.id === selectedDeviceId)) {
            return current.map((device) =>
              device.id === selectedDeviceId ? { ...device, latest: nextLatestReading } : device,
            );
          }
          return [nextSummary, ...current];
        });
        setDevices((current) =>
          current.includes(selectedDeviceId) ? current : [selectedDeviceId, ...current],
        );
        setLoading((current) => ({ ...current, latest: false }));
      },
      (firebaseError) => {
        setError(firebaseError.message);
        setLoading((current) => ({ ...current, latest: false }));
      },
    );

    const unsubscribeHistory = onValue(
      historyRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setHistory([]);
          setLoading((current) => ({ ...current, history: false }));
          return;
        }

        const rows = Object.entries(snapshot.val())
          .map(([key, value]) => normalizeReading(value, key))
          .sort((a, b) => (b.time ?? 0) - (a.time ?? 0));

        setHistory(rows);
        setLoading((current) => ({ ...current, history: false }));
      },
      (firebaseError) => {
        setError(firebaseError.message);
        setLoading((current) => ({ ...current, history: false }));
      },
    );

    return () => {
      unsubscribeLatest();
      unsubscribeHistory();
    };
  }, [selectedDeviceId]);

  const chartData = useMemo(
    () =>
      [...history].reverse().map((reading) => ({
        ...reading,
        chartTime: new Date(Number(reading.timestamp)),
      })),
    [history],
  );
  const isLoading = loading.devices || loading.latest || loading.history;
  const hasHistory = history.length > 0;
  const motionActive = Boolean(latestReading?.motion);
  const lastUpdatedTimestamp = latestReading?.time;
  const isOnline = isReadingOnline(latestReading, now);
  const lastUpdatedValue = latestReading ? formatTimestamp(latestReading.timestamp) : '--';
  const lastUpdatedHelper = formatRelativeTime(lastUpdatedTimestamp) ?? t.noRelativeTime;
  const previousReading = history.find((reading) => reading.timestamp !== latestReading?.timestamp);
  const airQualityStatus = getAirQualityStatus(latestReading?.eco2);
  const wifiSignalStatus = getWifiSignalStatus(latestReading?.rssi);
  const co2Trend = getTrend(latestReading?.eco2, previousReading?.eco2, 'ppm');
  const tvocTrend = getTrend(latestReading?.tvoc, previousReading?.tvoc, 'ppb');
  const latestPath = `/devices/${selectedDeviceId}/latest`;
  const historyPath = `/devices/${selectedDeviceId}/history`;
  const overviewDevices =
    deviceSummaries.length > 0
      ? deviceSummaries
      : devices.map((deviceId) => ({
          id: deviceId,
          latest: deviceId === selectedDeviceId ? latestReading : null,
          history: deviceId === selectedDeviceId ? chartData : [],
        }));
  const navItems = [
    ['overview', t.overview],
    ['devices', t.devices],
  ];

  return (
    <main className="min-h-screen px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-[1500px] gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="glass-card h-fit rounded-[24px] p-3 lg:sticky lg:top-4">
          <div className="px-2 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {t.title}
            </p>
          </div>
          <nav className="mt-2 flex gap-2 lg:flex-col">
            {navItems.map(([sectionId, label]) => (
              <div key={sectionId}>
                <button
                  type="button"
                  onClick={() => setActiveSection(sectionId)}
                  className={`w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                    activeSection === sectionId
                      ? 'bg-gray-950 text-white shadow-sm'
                      : 'bg-white/55 text-gray-600 hover:bg-white hover:text-gray-950'
                  }`}
                >
                  {label}
                </button>
                {sectionId === 'devices' ? (
                  <div className="mt-2 space-y-1 pl-1.5">
                    {overviewDevices.map((device) => {
                      const online = isReadingOnline(device.latest, now);
                      const selected = device.id === selectedDeviceId;

                      return (
                        <button
                          key={device.id}
                          type="button"
                          onClick={() => openDevice(device.id)}
                          className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold transition ${
                            selected
                              ? 'bg-white text-gray-950 shadow-sm ring-1 ring-gray-200'
                              : 'text-gray-500 hover:bg-white/70 hover:text-gray-950'
                          }`}
                        >
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full ${
                              online ? 'bg-emerald-500' : 'bg-gray-400'
                            }`}
                          />
                          <span className="truncate">{device.id}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ))}
          </nav>
        </aside>

        <div className="min-w-0">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-normal text-gray-950 sm:text-4xl">
              {t.title}
            </h1>
          </div>
          <div className="flex flex-col items-stretch gap-2.5 sm:items-end">
            <div
              className="inline-flex rounded-full bg-white/75 p-1 shadow-sm ring-1 ring-gray-200"
              aria-label={t.languageLabel}
            >
              {[
                ['en', t.english],
                ['es', t.spanish],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => updateLanguage(value)}
                  className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
                    language === value
                      ? 'bg-gray-950 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-950'
                  }`}
                  aria-pressed={language === value}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="relative">
              <button
                type="button"
                disabled={devices.length === 0}
                onClick={() => setIsExportMenuOpen((current) => !current)}
                className="inline-flex w-full items-center justify-center rounded-full bg-gray-950 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-gray-950/10 transition hover:-translate-y-0.5 hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none sm:w-auto"
                aria-expanded={isExportMenuOpen}
              >
                {t.downloadCsv}
              </button>

              {isExportMenuOpen ? (
                <div className="glass-card absolute right-0 z-20 mt-3 w-[min(92vw,360px)] rounded-[24px] p-4 text-left">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-950">{t.csvExport}</p>
                      <p className="mt-1 text-xs text-gray-500">{t.syncedDatesOnly}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsExportMenuOpen(false)}
                      className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-gray-500 shadow-sm ring-1 ring-gray-200 hover:text-gray-950"
                    >
                      {t.close}
                    </button>
                  </div>

                  <div className="mt-4">
                    <p className="mb-2 text-xs font-semibold uppercase text-gray-500">
                      {t.exportDevices}
                    </p>
                    <div className="flex max-h-36 flex-col gap-2 overflow-auto pr-1">
                      {devices.map((deviceId) => (
                        <label
                          key={deviceId}
                          className="inline-flex items-center gap-2 rounded-2xl bg-white/70 px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-gray-200"
                        >
                          <input
                            type="checkbox"
                            checked={exportDeviceIds.includes(deviceId)}
                            onChange={() => toggleExportDevice(deviceId)}
                            className="h-4 w-4 accent-gray-950"
                          />
                          <span className="truncate">{deviceId}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-semibold uppercase text-gray-500">
                        {t.dateFrom}
                      </span>
                      <input
                        type="date"
                        value={exportFrom}
                        onChange={(event) => setExportFrom(event.target.value)}
                        className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-950 outline-none focus:border-gray-400 focus:ring-4 focus:ring-gray-200"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-semibold uppercase text-gray-500">
                        {t.dateTo}
                      </span>
                      <input
                        type="date"
                        value={exportTo}
                        onChange={(event) => setExportTo(event.target.value)}
                        className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-950 outline-none focus:border-gray-400 focus:ring-4 focus:ring-gray-200"
                      />
                    </label>
                  </div>

                  {exportError ? <p className="mt-3 text-sm text-red-600">{exportError}</p> : null}

                  <button
                    type="button"
                    disabled={exportDeviceIds.length === 0 || isExporting}
                    onClick={exportCsv}
                    className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-gray-950 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
                  >
                    {isExporting ? t.preparingCsv : t.exportHistory}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        {error ? (
          <section className="mb-8 rounded-[28px] border border-red-200 bg-red-50/80 p-5 text-red-700">
            <h2 className="font-semibold">{t.firebaseErrorTitle}</h2>
            <p className="mt-1 text-sm">{error}</p>
          </section>
        ) : null}

        {activeSection === 'overview' ? (
          <section className="space-y-4">
            <div className="glass-card rounded-[24px] p-4 sm:p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-950">{t.allDevices}</h2>
                  <p className="mt-1 text-xs text-gray-500">{t.deviceOverviewSubtitle}</p>
                </div>
                <div className="rounded-full bg-white/70 px-3 py-1.5 text-xs font-semibold text-gray-600 shadow-sm ring-1 ring-gray-200">
                  {overviewDevices.length} {t.devices}
                </div>
              </div>

              {deviceDiscoveryError ? (
                <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  {t.deviceDiscoveryError} {deviceDiscoveryError}
                </p>
              ) : null}
            </div>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {overviewDevices.length > 0 ? (
                overviewDevices.map((device) => {
                  const latest = device.latest;
                  const online = isReadingOnline(latest, now);
                  const miniData = device.history ?? [];
                  return (
                    <button
                      key={device.id}
                      type="button"
                      onClick={() => openDevice(device.id)}
                      className="glass-card rounded-[22px] p-4 text-left transition duration-300 hover:-translate-y-0.5 hover:shadow-glass"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold text-gray-950">
                            {device.id}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500">{t.activeDevice}</p>
                        </div>
                        <span
                          className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                            online ? 'bg-emerald-500' : 'bg-gray-400'
                          }`}
                        />
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2.5 text-xs">
                        <div>
                          <p className="text-gray-500">{t.status}</p>
                          <p className="mt-1 font-semibold text-gray-950">
                            {online ? t.online : t.offline}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">{t.temperature}</p>
                          <p className="mt-1 font-semibold text-gray-950">
                            {latest?.temperature ?? '--'} C
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">{t.humidity}</p>
                          <p className="mt-1 font-semibold text-gray-950">
                            {latest?.humidity ?? '--'}%
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">{t.light}</p>
                          <p className="mt-1 font-semibold text-gray-950">
                            {latest?.lightPercent ?? '--'}%
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">{t.co2}</p>
                          <p className="mt-1 font-semibold text-gray-950">
                            {latest?.eco2 ?? '--'} ppm
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">{t.tvoc}</p>
                          <p className="mt-1 font-semibold text-gray-950">
                            {latest?.tvoc ?? '--'} ppb
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2.5">
                        <MiniDeviceChart
                          title={t.temperature}
                          data={miniData}
                          dataKey="temperature"
                          color="#2563eb"
                          unit=" C"
                        />
                        <MiniDeviceChart
                          title={t.humidity}
                          data={miniData}
                          dataKey="humidity"
                          color="#059669"
                          unit="%"
                        />
                        <MiniDeviceChart
                          title={t.light}
                          data={miniData}
                          dataKey="lightPercent"
                          color="#d97706"
                          unit="%"
                        />
                        <MiniDeviceChart
                          title={t.motion}
                          data={miniData}
                          dataKey="motion"
                          color="#dc2626"
                        />
                        <MiniDeviceChart
                          title={t.co2}
                          data={miniData}
                          dataKey="eco2"
                          color="#10b981"
                          unit=" ppm"
                        />
                        <MiniDeviceChart
                          title={t.tvoc}
                          data={miniData}
                          dataKey="tvoc"
                          color="#0f766e"
                          unit=" ppb"
                        />
                      </div>

                      <p className="mt-4 text-xs font-medium text-gray-500">
                        {t.lastSeen}:{' '}
                        {latest ? formatTimestamp(latest.timestamp) : '--'}
                      </p>
                    </button>
                  );
                })
              ) : (
                <div className="glass-card rounded-[22px] p-6 text-center text-gray-500 md:col-span-2 xl:col-span-3">
                  {t.noDevices}
                </div>
              )}
            </section>
          </section>
        ) : (
          <>
        <section className="glass-card mb-5 rounded-[24px] p-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_140px_minmax(230px,auto)] md:items-stretch">
            <div className="flex min-h-[72px] items-center gap-3 rounded-xl bg-white/70 px-3.5 py-2.5 shadow-sm ring-1 ring-gray-200">
              <span
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-700"
                aria-hidden="true"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <rect x="7" y="3" width="10" height="18" rx="2" />
                  <path d="M10 7h4" />
                  <path d="M10 17h4" />
                </svg>
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase text-gray-500">{t.device}</p>
                <p className="mt-0.5 truncate text-sm font-semibold text-gray-950 sm:text-base">
                  {selectedDeviceId || t.noDevices}
                </p>
              </div>
              {deviceDiscoveryError ? (
                <p className="mt-2 text-sm text-amber-700">
                  {t.deviceDiscoveryError} {deviceDiscoveryError}
                </p>
              ) : null}
            </div>
            <div className="flex min-h-[72px] flex-col justify-center rounded-xl bg-white/70 px-3.5 py-2.5 shadow-sm ring-1 ring-gray-200">
              <p className="text-xs font-semibold uppercase text-gray-500">{t.status}</p>
              <div className="mt-0.5 flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    isOnline ? 'bg-emerald-500' : 'bg-gray-400'
                  }`}
                />
                <span className="text-sm font-semibold text-gray-950">
                  {isOnline ? t.online : t.offline}
                </span>
              </div>
            </div>
            <div className="flex min-h-[72px] flex-col justify-center rounded-xl bg-white/70 px-3.5 py-2.5 shadow-sm ring-1 ring-gray-200">
              <p className="text-xs font-semibold uppercase text-gray-500">{t.lastUpdated}</p>
              {loading.latest ? (
                <div className="mt-2 h-5 w-36 animate-pulse rounded-full bg-gray-200" />
              ) : (
                <div className="mt-0.5 flex flex-wrap items-center gap-2">
                  <p className="whitespace-nowrap text-xs font-semibold text-gray-950 sm:text-sm">
                    {lastUpdatedValue}
                  </p>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500">
                    {lastUpdatedHelper}
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>

        {isLoading ? (
          <section className="mb-5 rounded-[22px] bg-white/70 p-4 text-sm text-gray-500 shadow-sm">
            {t.loading}
          </section>
        ) : null}

        {!isLoading && !latestReading && !hasHistory ? (
          <section className="mb-5 rounded-[22px] bg-white/70 p-6 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-gray-950">{t.noSensorReadings}</h2>
            <p className="mt-2 text-gray-500">
              {t.waitingForData} <span className="font-medium">{latestPath}</span> {t.and}{' '}
              <span className="font-medium">{historyPath}</span>.
            </p>
          </section>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label={t.status}
            value={isOnline ? t.online : t.offline}
            helper={t.activeDevice}
            icon="status"
            accent={isOnline ? 'green' : 'neutral'}
            isLoading={loading.latest}
            compact
          />
          <MetricCard
            label={t.temperature}
            value={latestReading?.temperature ?? '--'}
            unit="C"
            helper={t.currentRoomAir}
            icon="temperature"
            accent="blue"
            isLoading={loading.latest}
          />
          <MetricCard
            label={t.humidity}
            value={latestReading?.humidity ?? '--'}
            unit="%"
            helper={t.relativeHumidity}
            icon="humidity"
            accent="green"
            isLoading={loading.latest}
          />
          <MetricCard
            label={t.light}
            value={latestReading?.lightPercent ?? '--'}
            unit="%"
            helper={t.ambientBrightness}
            icon="light"
            accent="amber"
            isLoading={loading.latest}
          />
          <MetricCard
            label={t.motion}
            value={motionActive ? t.motionDetected : latestReading ? t.motionClear : '--'}
            helper={t.pirSensorState}
            icon="motion"
            accent={motionActive ? 'red' : 'neutral'}
            isLoading={loading.latest}
            compact
          />
          <MetricCard
            label={t.co2}
            value={latestReading?.eco2 ?? '--'}
            unit="ppm"
            helper={co2Trend}
            icon="co2"
            accent={getCo2Accent(latestReading?.eco2)}
            isLoading={loading.latest}
          />
          <MetricCard
            label={t.tvoc}
            value={latestReading?.tvoc ?? '--'}
            unit="ppb"
            helper={t.tvocSubtitle}
            icon="tvoc"
            accent="blue"
            isLoading={loading.latest}
          />
          <MetricCard
            label={t.wifiSignal}
            value={t[wifiSignalStatus.labelKey] ?? wifiSignalStatus.label}
            helper={latestReading?.rssi ? `${latestReading.rssi} dBm` : t.rssiSubtitle}
            icon="wifi"
            accent={wifiSignalStatus.accent}
            isLoading={loading.latest}
            compact
          />
        </section>

        <section className="mt-5 space-y-4">
          <AirQualityPanel
            labels={t}
            eco2={latestReading?.eco2}
            tvoc={latestReading?.tvoc}
            timestamp={latestReading?.timestamp}
            status={airQualityStatus}
            co2Trend={co2Trend}
            tvocTrend={tvocTrend}
            isLoading={loading.latest}
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <SensorChart
              title={t.co2}
              subtitle={t.co2SubtitleChart}
              data={chartData}
              dataKey="eco2"
              color="#10b981"
              unit="ppm"
              locale={locale}
              emptyLabel={t.noHistoricalData}
              timestampLabel={t.timestamp}
            />
            <SensorChart
              title={t.tvoc}
              subtitle={t.tvocSubtitleChart}
              data={chartData}
              dataKey="tvoc"
              color="#0f766e"
              unit="ppb"
              locale={locale}
              emptyLabel={t.noHistoricalData}
              timestampLabel={t.timestamp}
            />
          </div>
        </section>

        <section className="mt-5 grid gap-4 lg:grid-cols-2">
          <SensorChart
            title={t.temperature}
            subtitle={t.temperatureSubtitle}
            data={chartData}
            dataKey="temperature"
            color="#2563eb"
            unit="C"
            locale={locale}
            emptyLabel={t.noHistoricalData}
            timestampLabel={t.timestamp}
          />
          <SensorChart
            title={t.humidity}
            subtitle={t.humiditySubtitle}
            data={chartData}
            dataKey="humidity"
            color="#059669"
            unit="%"
            locale={locale}
            emptyLabel={t.noHistoricalData}
            timestampLabel={t.timestamp}
          />
          <SensorChart
            title={t.light}
            subtitle={t.lightSubtitle}
            data={chartData}
            dataKey="lightPercent"
            color="#d97706"
            unit="%"
            locale={locale}
            emptyLabel={t.noHistoricalData}
            timestampLabel={t.timestamp}
          />
          <SensorChart
            title={t.motionEvents}
            subtitle={t.motionSubtitle}
            data={chartData}
            dataKey="motion"
            color="#dc2626"
            type="line"
            locale={locale}
            emptyLabel={t.noHistoricalData}
            timestampLabel={t.timestamp}
          />
        </section>

        <section className="glass-card mt-5 rounded-[24px] p-4 sm:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-950">{t.recentReadings}</h2>
              <p className="mt-1 text-xs text-gray-500">
                {t.latestRecords} {Math.min(history.length, 5)} {t.historicalRecords}
              </p>
            </div>
            <button
              type="button"
              disabled={exportDeviceIds.length === 0 || isExporting}
              onClick={exportCsv}
              className="inline-flex items-center justify-center rounded-full bg-white px-3.5 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-gray-200 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"
            >
              {isExporting ? t.preparingCsv : t.exportHistory}
            </button>
          </div>

          <div className="mb-4 rounded-[20px] bg-white/55 p-3.5 ring-1 ring-gray-200/70">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_170px_170px]">
              <div>
                <p className="text-sm font-semibold text-gray-950">{t.csvExport}</p>
                <p className="mt-1 text-xs text-gray-500">{t.syncedDatesOnly}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {devices.map((deviceId) => (
                    <label
                      key={deviceId}
                      className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-gray-200"
                    >
                      <input
                        type="checkbox"
                        checked={exportDeviceIds.includes(deviceId)}
                        onChange={() => toggleExportDevice(deviceId)}
                        className="h-4 w-4 accent-gray-950"
                      />
                      {deviceId}
                    </label>
                  ))}
                </div>
              </div>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase text-gray-500">
                  {t.dateFrom}
                </span>
                <input
                  type="date"
                  value={exportFrom}
                  onChange={(event) => setExportFrom(event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-950 outline-none focus:border-gray-400 focus:ring-4 focus:ring-gray-200"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase text-gray-500">
                  {t.dateTo}
                </span>
                <input
                  type="date"
                  value={exportTo}
                  onChange={(event) => setExportTo(event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-950 outline-none focus:border-gray-400 focus:ring-4 focus:ring-gray-200"
                />
              </label>
            </div>
            {exportError ? <p className="mt-3 text-sm text-red-600">{exportError}</p> : null}
          </div>
          <ReadingsTable readings={history} labels={t} deviceId={selectedDeviceId} />
        </section>
          </>
        )}
      </div>
      </div>
    </main>
  );
};

export default App;
