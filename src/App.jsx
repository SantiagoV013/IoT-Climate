import { useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { get, onValue, ref, set, update } from 'firebase/database';
import { Line, LineChart, ResponsiveContainer } from 'recharts';
import AirQualityPanel from './components/AirQualityPanel.jsx';
import MetricCard from './components/MetricCard.jsx';
import ReadingsTable from './components/ReadingsTable.jsx';
import SensorChart from './components/SensorChart.jsx';
import { auth, database, firebaseApiKey, firebaseConfigError } from './firebase.js';
import { getAirQualityStatus, getCo2Accent, getTrend, getWifiSignalStatus } from './utils/airQuality.js';
import { downloadReadingsCsv } from './utils/csvExport.js';
import { formatRelativeTime, formatTimestamp, getTimestampMs } from './utils/timestamps.js';

const DEFAULT_DEVICE_ID = 'esp32_room_01';
const DEVICES_PATH = '/devices';
const ONLINE_WINDOW_MS = 60 * 1000;
const LANGUAGE_STORAGE_KEY = 'environment-monitor-language';
const DEVICE_STORAGE_KEY = 'environment-monitor-device';
const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS ?? '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

const translations = {
  en: {
    languageLabel: 'Language',
    hideSidebar: 'Hide sidebar',
    showSidebar: 'Show sidebar',
    english: 'English',
    spanish: 'Español',
    title: 'Environment Monitor',
    subtitle: 'Live ESP32 sensor telemetry',
    overview: 'Overview',
    devices: 'Devices',
    admin: 'Admin',
    users: 'Users',
    signOut: 'Sign out',
    signedInAs: 'Signed in as',
    loginTitle: 'Sign in',
    registerTitle: 'Create account',
    continueWithGoogle: 'Continue with Google',
    orUseEmail: 'or use email',
    email: 'Email',
    password: 'Password',
    displayName: 'Name',
    role: 'Role',
    viewer: 'Viewer',
    manager: 'Manager',
    createUser: 'Create user',
    inviteUser: 'Invite user',
    inviteUserSubtitle: 'Approve an email for Google access, password access, or both.',
    allowGoogle: 'Google',
    allowPassword: 'Password',
    providerAccess: 'Sign-in methods',
    userManagement: 'User Management',
    userManagementSubtitle: 'Create dashboard users and manage access roles',
    noUsers: 'No users found',
    searchUsers: 'Search users',
    activeUsers: 'Active users',
    invitedUsers: 'Invited users',
    adminUsers: 'Admins',
    access: 'Access',
    accountState: 'Account state',
    lastActivity: 'Last activity',
    invited: 'Invited',
    signedIn: 'Signed in',
    emailPassword: 'Password',
    noProviders: 'No providers',
    accessKey: 'Access key',
    disabled: 'Disabled',
    enabled: 'Enabled',
    save: 'Save',
    allDevices: 'All devices',
    deviceOverviewSubtitle: 'Connected ESP32 telemetry nodes',
    downloadCsv: 'Download CSV',
    csvExport: 'CSV export',
    exportDevices: 'Devices to include',
    dateFrom: 'From',
    dateTo: 'To',
    dateRange: 'Date range',
    clearDates: 'Clear',
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
    hideSidebar: 'Ocultar menu',
    showSidebar: 'Mostrar menu',
    english: 'English',
    spanish: 'Español',
    title: 'Monitor Ambiental',
    subtitle: 'Telemetría en vivo del sensor ESP32',
    overview: 'Resumen',
    devices: 'Dispositivos',
    admin: 'Admin',
    users: 'Usuarios',
    signOut: 'Cerrar sesion',
    signedInAs: 'Sesion iniciada como',
    loginTitle: 'Iniciar sesion',
    registerTitle: 'Crear cuenta',
    continueWithGoogle: 'Continuar con Google',
    orUseEmail: 'o usa correo',
    email: 'Correo',
    password: 'Contrasena',
    displayName: 'Nombre',
    role: 'Rol',
    viewer: 'Visualizador',
    manager: 'Manager',
    createUser: 'Crear usuario',
    inviteUser: 'Invitar usuario',
    inviteUserSubtitle: 'Aprueba un correo para acceso con Google, contrasena o ambos.',
    allowGoogle: 'Google',
    allowPassword: 'Contrasena',
    providerAccess: 'Metodos de acceso',
    userManagement: 'Gestion de usuarios',
    userManagementSubtitle: 'Crea usuarios del panel y administra roles de acceso',
    noUsers: 'No hay usuarios',
    searchUsers: 'Buscar usuarios',
    activeUsers: 'Usuarios activos',
    invitedUsers: 'Invitados',
    adminUsers: 'Admins',
    access: 'Acceso',
    accountState: 'Estado de cuenta',
    lastActivity: 'Ultima actividad',
    invited: 'Invitado',
    signedIn: 'Sesion iniciada',
    emailPassword: 'Contrasena',
    noProviders: 'Sin metodos',
    accessKey: 'Clave de acceso',
    disabled: 'Deshabilitado',
    enabled: 'Habilitado',
    save: 'Guardar',
    allDevices: 'Todos los dispositivos',
    deviceOverviewSubtitle: 'Nodos ESP32 de telemetría conectados',
    downloadCsv: 'Descargar CSV',
    csvExport: 'Exportar CSV',
    exportDevices: 'Dispositivos a incluir',
    dateFrom: 'Desde',
    dateTo: 'Hasta',
    dateRange: 'Rango de fechas',
    clearDates: 'Limpiar',
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

const getEmailKey = (email) => email.toLowerCase().replace(/[.#$/[\]]/g, '_');

const getProviderKey = (providerId) => providerId.replace(/[.#$/[\]]/g, '_');

const mergeAdminUsers = (userRecords = [], allowedRecords = []) => {
  const usersByEmail = new Map();

  userRecords.forEach((user) => {
    const email = user.email?.toLowerCase();
    if (!email) return;
    usersByEmail.set(email, {
      ...user,
      email,
      allowedKey: getEmailKey(email),
    });
  });

  allowedRecords.forEach(([allowedKey, allowedUser]) => {
    const email = allowedUser.email?.toLowerCase();
    if (!email) return;

    const existingUser = usersByEmail.get(email);
    usersByEmail.set(email, {
      ...allowedUser,
      ...existingUser,
      email,
      allowedKey,
      role: existingUser?.role ?? allowedUser.role ?? 'viewer',
      disabled: Boolean(existingUser?.disabled ?? allowedUser.disabled),
      enabled: existingUser?.enabled ?? allowedUser.enabled ?? true,
      displayName: existingUser?.displayName ?? allowedUser.displayName ?? email,
      providers: allowedUser.allowedProviders,
    });
  });

  return [...usersByEmail.values()].sort((a, b) =>
    String(a.email ?? '').localeCompare(String(b.email ?? '')),
  );
};

const isReadingOnline = (reading, now = Date.now()) => {
  if (!reading?.time) return false;
  return now - reading.time <= ONLINE_WINDOW_MS;
};

const formatAuthError = (error) => {
  const code = error?.code ?? '';

  if (code === 'auth/configuration-not-found') {
    return 'Firebase Authentication is not configured for this Firebase project. In Firebase Console, enable Authentication, add the Email/Password sign-in provider, and confirm .env.local uses the same Firebase Web App values.';
  }

  if (code === 'auth/operation-not-allowed') {
    return 'Email/Password sign-in is not enabled in Firebase Authentication.';
  }

  if (code === 'auth/api-key-not-valid' || code === 'auth/invalid-api-key') {
    return 'The Firebase API key in .env.local is invalid or belongs to a different Firebase project.';
  }

  if (code === 'auth/unauthorized-domain') {
    return 'This domain is not authorized for Google sign-in. In Firebase Console > Authentication > Settings > Authorized domains, add your local or Vercel domain.';
  }

  if (code === 'auth/popup-closed-by-user') {
    return 'Google sign-in was closed before it finished.';
  }

  return error?.message ?? 'Authentication failed.';
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

const SidebarIcon = ({ name }) => {
  const commonProps = {
    className: 'h-3.5 w-3.5 shrink-0',
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    strokeWidth: 2,
    viewBox: '0 0 24 24',
    'aria-hidden': 'true',
  };

  const icons = {
    monitor: (
      <svg {...commonProps}>
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 20h8" />
        <path d="M12 16v4" />
      </svg>
    ),
    overview: (
      <svg {...commonProps}>
        <rect x="4" y="4" width="7" height="7" rx="1.5" />
        <rect x="13" y="4" width="7" height="7" rx="1.5" />
        <rect x="4" y="13" width="7" height="7" rx="1.5" />
        <rect x="13" y="13" width="7" height="7" rx="1.5" />
      </svg>
    ),
    devices: (
      <svg {...commonProps}>
        <rect x="6" y="3" width="12" height="18" rx="2" />
        <path d="M9 7h6" />
        <path d="M9 17h6" />
      </svg>
    ),
    device: (
      <svg {...commonProps}>
        <rect x="8" y="3" width="8" height="18" rx="2" />
        <path d="M11 7h2" />
        <path d="M11 17h2" />
      </svg>
    ),
    admin: (
      <svg {...commonProps}>
        <path d="M12 3 5 6v5c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z" />
        <path d="M9.5 12.5 11 14l3.5-4" />
      </svg>
    ),
  };

  return icons[name] ?? null;
};

const AuthScreen = ({ labels, language, onLanguageChange, accessError, onClearAccessError }) => {
  const [mode, setMode] = useState('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const signInWithGoogle = async () => {
    if (!auth) return;

    setError(null);
    onClearAccessError();
    setIsSubmitting(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (authError) {
      setError(formatAuthError(authError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitAuth = async (event) => {
    event.preventDefault();
    if (!auth || !database) return;

    setError(null);
    onClearAccessError();
    setIsSubmitting(true);

    try {
      if (mode === 'register') {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        const normalizedEmail = credential.user.email?.toLowerCase() ?? email.toLowerCase();
        const role = ADMIN_EMAILS.includes(normalizedEmail) ? 'admin' : 'viewer';

        await set(ref(database, `/users/${credential.user.uid}`), {
          uid: credential.user.uid,
          email: normalizedEmail,
          displayName: displayName || normalizedEmail,
          role,
          disabled: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (authError) {
      setError(formatAuthError(authError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <section className="glass-card w-full max-w-md rounded-[28px] p-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {labels.title}
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-gray-950">
              {mode === 'login' ? labels.loginTitle : labels.registerTitle}
            </h1>
          </div>
          <div className="inline-flex rounded-full bg-white/75 p-1 shadow-sm ring-1 ring-gray-200">
            {[
              ['en', labels.english],
              ['es', labels.spanish],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => onLanguageChange(value)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  language === value ? 'bg-gray-950 text-white' : 'text-gray-500'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={isSubmitting}
          className="mb-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-gray-800 shadow-sm ring-1 ring-gray-200 transition hover:bg-gray-50 disabled:text-gray-400"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C4 20.53 7.7 23 12 23Z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84Z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 4 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"
            />
          </svg>
          {labels.continueWithGoogle}
        </button>

        <div className="mb-4 flex items-center gap-3">
          <span className="h-px flex-1 bg-gray-200" />
          <span className="text-xs font-semibold text-gray-400">{labels.orUseEmail}</span>
          <span className="h-px flex-1 bg-gray-200" />
        </div>

        <form className="space-y-4" onSubmit={submitAuth}>
          {mode === 'register' ? (
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase text-gray-500">
                {labels.displayName}
              </span>
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-950 outline-none focus:border-gray-400 focus:ring-4 focus:ring-gray-200"
              />
            </label>
          ) : null}
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase text-gray-500">
              {labels.email}
            </span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-950 outline-none focus:border-gray-400 focus:ring-4 focus:ring-gray-200"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase text-gray-500">
              {labels.password}
            </span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-950 outline-none focus:border-gray-400 focus:ring-4 focus:ring-gray-200"
            />
          </label>

          {accessError ? (
            <p className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-700">{accessError}</p>
          ) : null}
          {error ? <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full bg-gray-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-gray-950/10 transition hover:bg-gray-800 disabled:bg-gray-300"
          >
            {isSubmitting
              ? labels.loading
              : mode === 'login'
                ? labels.loginTitle
                : labels.registerTitle}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode((current) => (current === 'login' ? 'register' : 'login'))}
          className="mt-4 w-full rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-gray-200 transition hover:text-gray-950"
        >
          {mode === 'login' ? labels.registerTitle : labels.loginTitle}
        </button>
      </section>
    </main>
  );
};

const createUserWithRestApi = async ({ email, password }) => {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: false }),
    },
  );
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error?.message ?? 'Unable to create user');
  }

  return payload;
};

const getUserInitials = (user) => {
  const source = user.displayName || user.email || '?';
  return source
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
};

const AdminSummaryCard = ({ label, value, accent = 'gray' }) => {
  const accentClasses = {
    gray: 'bg-gray-100 text-gray-700',
    green: 'bg-emerald-50 text-emerald-700',
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
  };

  return (
    <div className="rounded-xl bg-white/65 p-3 shadow-sm ring-1 ring-gray-200/70">
      <div
        className={`mb-2 inline-flex h-6 w-6 items-center justify-center rounded-lg ${
          accentClasses[accent] ?? accentClasses.gray
        }`}
        aria-hidden="true"
      >
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path d="M20 21a8 8 0 0 0-16 0" />
          <circle cx="12" cy="8" r="4" />
        </svg>
      </div>
      <p className="text-lg font-semibold leading-none text-gray-950">{value}</p>
      <p className="mt-1 text-[11px] font-semibold text-gray-500">{label}</p>
    </div>
  );
};

const ProviderMethodIcon = ({ provider }) => {
  if (provider === 'google') {
    return (
      <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
        />
        <path
          fill="currentColor"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C4 20.53 7.7 23 12 23Z"
        />
        <path
          fill="currentColor"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84Z"
        />
        <path
          fill="currentColor"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 4 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"
        />
      </svg>
    );
  }

  return (
    <svg
      className="h-3 w-3 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle cx="7.5" cy="15.5" r="4.5" />
      <path d="m10.7 12.3 8-8" />
      <path d="m15 6 3 3" />
      <path d="m17 4 3 3" />
    </svg>
  );
};

const ProviderBadge = ({ active, label, provider }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
      active ? 'bg-gray-950 text-white' : 'bg-gray-100 text-gray-400'
    }`}
  >
    <ProviderMethodIcon provider={provider} />
    {label}
  </span>
);

const AdminPanel = ({ labels, users, currentUserProfile }) => {
  const [newUser, setNewUser] = useState({
    displayName: '',
    email: '',
    password: '',
    role: 'viewer',
    allowGoogle: true,
    allowPassword: false,
  });
  const [error, setError] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) return users;

    return users.filter((user) =>
      [user.displayName, user.email, user.role, user.allowedKey]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch)),
    );
  }, [searchTerm, users]);

  const adminStats = useMemo(
    () => ({
      active: users.filter((user) => !user.disabled && user.enabled !== false).length,
      invited: users.filter((user) => !user.uid).length,
      admins: users.filter((user) => user.role === 'admin').length,
    }),
    [users],
  );

  const createDashboardUser = async (event) => {
    event.preventDefault();
    if (!database || currentUserProfile?.role !== 'admin') return;

    setError(null);
    setIsCreating(true);

    try {
      if (newUser.allowPassword && !newUser.password) {
        throw new Error('Password is required when password access is enabled.');
      }

      if (!newUser.allowGoogle && !newUser.allowPassword) {
        throw new Error('Select at least one sign-in method.');
      }

      if (newUser.allowPassword && newUser.password) {
        const createdUser = await createUserWithRestApi({
          email: newUser.email,
          password: newUser.password,
        });

        await set(ref(database, `/users/${createdUser.localId}`), {
          uid: createdUser.localId,
          email: newUser.email.toLowerCase(),
          displayName: newUser.displayName || newUser.email.toLowerCase(),
          role: newUser.role,
          disabled: false,
          enabled: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }

      await set(ref(database, `/allowedUsers/${getEmailKey(newUser.email)}`), {
        email: newUser.email.toLowerCase(),
        role: newUser.role,
        enabled: true,
        disabled: false,
        allowedProviders: {
          password: Boolean(newUser.allowPassword),
          google_com: Boolean(newUser.allowGoogle),
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      setNewUser({
        displayName: '',
        email: '',
        password: '',
        role: 'viewer',
        allowGoogle: true,
        allowPassword: false,
      });
    } catch (userError) {
      setError(formatAuthError(userError));
    } finally {
      setIsCreating(false);
    }
  };

  const updateUserRole = async (user, role) => {
    const updatedAt = Date.now();
    const updates = [];

    if (user.uid) {
      updates.push(update(ref(database, `/users/${user.uid}`), { role, updatedAt }));
    }

    if (user.allowedKey) {
      updates.push(update(ref(database, `/allowedUsers/${user.allowedKey}`), { role, updatedAt }));
    }

    await Promise.all(updates);
  };

  const updateUserDisabled = async (user, disabled) => {
    const updatedAt = Date.now();
    const updates = [];

    if (user.uid) {
      updates.push(update(ref(database, `/users/${user.uid}`), { disabled, updatedAt }));
    }

    if (user.allowedKey) {
      updates.push(update(ref(database, `/allowedUsers/${user.allowedKey}`), { disabled, updatedAt }));
    }

    await Promise.all(updates);
  };

  return (
    <section className="space-y-4">
      <div className="glass-card rounded-[20px] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-950">{labels.userManagement}</h2>
            <p className="mt-0.5 text-xs text-gray-500">{labels.userManagementSubtitle}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[330px]">
            <AdminSummaryCard label={labels.activeUsers} value={adminStats.active} accent="green" />
            <AdminSummaryCard label={labels.invitedUsers} value={adminStats.invited} accent="blue" />
            <AdminSummaryCard label={labels.adminUsers} value={adminStats.admins} accent="amber" />
          </div>
        </div>

        <form className="mt-4 rounded-[18px] bg-white/55 p-3 ring-1 ring-gray-200/70" onSubmit={createDashboardUser}>
          <div className="mb-3 flex flex-col gap-0.5">
            <p className="text-sm font-semibold text-gray-950">{labels.inviteUser}</p>
            <p className="text-xs text-gray-500">{labels.inviteUserSubtitle}</p>
          </div>
          <div className="grid gap-2 lg:grid-cols-[1fr_1fr_140px_120px_auto]">
            <input
              placeholder={labels.displayName}
              value={newUser.displayName}
              onChange={(event) => setNewUser((current) => ({ ...current, displayName: event.target.value }))}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:ring-4 focus:ring-gray-200"
            />
            <input
              type="email"
              placeholder={labels.email}
              value={newUser.email}
              required
              onChange={(event) => setNewUser((current) => ({ ...current, email: event.target.value }))}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:ring-4 focus:ring-gray-200"
            />
            <input
              type="password"
              placeholder={labels.password}
              value={newUser.password}
              minLength={6}
              disabled={!newUser.allowPassword}
              onChange={(event) => setNewUser((current) => ({ ...current, password: event.target.value }))}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold outline-none transition focus:ring-4 focus:ring-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
            />
            <select
              value={newUser.role}
              onChange={(event) => setNewUser((current) => ({ ...current, role: event.target.value }))}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:ring-4 focus:ring-gray-200"
            >
              <option value="viewer">{labels.viewer}</option>
              <option value="manager">{labels.manager}</option>
              <option value="admin">Admin</option>
            </select>
            <button
              type="submit"
              disabled={isCreating}
              className="rounded-full bg-gray-950 px-4 py-2 text-xs font-semibold text-white disabled:bg-gray-300"
            >
              {isCreating ? labels.loading : labels.createUser}
            </button>
            <div className="lg:col-span-5 rounded-xl bg-white/70 p-2.5 ring-1 ring-gray-200/70">
              <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500">
                <svg
                  className="h-3 w-3"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M12 3 5 6v5c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z" />
                  <path d="M9.5 12.5 11 14l3.5-4" />
                </svg>
                {labels.providerAccess}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[
                  ['allowGoogle', labels.allowGoogle, 'google'],
                  ['allowPassword', labels.allowPassword, 'password'],
                ].map(([key, label, provider]) => {
                  const isActive = newUser[key];

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() =>
                        setNewUser((current) => ({
                          ...current,
                          [key]: !current[key],
                          password: key === 'allowPassword' && current.allowPassword ? '' : current.password,
                        }))
                      }
                      className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition ${
                        isActive
                          ? 'bg-gray-950 text-white shadow-sm'
                          : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:text-gray-950'
                      }`}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <ProviderMethodIcon provider={provider} />
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </form>
        {error ? <p className="mt-3 rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      </div>

      <div className="glass-card rounded-[20px] p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-semibold text-gray-950">{labels.users}</h3>
          <label className="relative block sm:w-64">
            <span className="sr-only">{labels.searchUsers}</span>
            <svg
              className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={labels.searchUsers}
              className="w-full rounded-full border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-xs font-semibold text-gray-950 outline-none focus:border-gray-400 focus:ring-4 focus:ring-gray-200"
            />
          </label>
        </div>
        <div className="mt-3 overflow-hidden rounded-[16px] bg-white/55 ring-1 ring-gray-200/70">
          {filteredUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200/70 text-left text-xs">
                <thead className="bg-white/60 text-[10px] uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-2">{labels.displayName}</th>
                    <th className="px-3 py-2">{labels.email}</th>
                    <th className="px-3 py-2">{labels.access}</th>
                    <th className="px-3 py-2">{labels.role}</th>
                    <th className="px-3 py-2">{labels.accountState}</th>
                    <th className="px-3 py-2">{labels.lastActivity}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.map((user) => (
                    <tr key={user.uid ?? user.allowedKey} className="transition hover:bg-white/65">
                      <td className="whitespace-nowrap px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-700">
                            {getUserInitials(user)}
                          </span>
                          <div>
                            <p className="font-semibold text-gray-950">{user.displayName ?? user.email}</p>
                            <p className="text-[10px] text-gray-500">
                              {user.uid ? labels.signedIn : labels.invited}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-gray-600">{user.email}</td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <div className="flex flex-wrap gap-1.5">
                          <ProviderBadge
                            active={user.providers?.google_com === true}
                            label={labels.allowGoogle}
                            provider="google"
                          />
                          <ProviderBadge
                            active={user.providers?.password === true}
                            label={labels.emailPassword}
                            provider="password"
                          />
                        </div>
                        <p className="mt-0.5 max-w-[210px] truncate text-[10px] text-gray-400">
                          {user.allowedKey ? `${labels.accessKey}: ${user.allowedKey}` : labels.noProviders}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <select
                          value={user.role ?? 'viewer'}
                          onChange={(event) => updateUserRole(user, event.target.value)}
                          className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-[11px] font-semibold"
                        >
                          <option value="viewer">{labels.viewer}</option>
                          <option value="manager">{labels.manager}</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <button
                          type="button"
                          onClick={() => updateUserDisabled(user, !user.disabled)}
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm ring-1 transition ${
                            user.disabled
                              ? 'bg-red-50 text-red-700 ring-red-100 hover:bg-red-100'
                              : 'bg-emerald-50 text-emerald-700 ring-emerald-100 hover:bg-emerald-100'
                          }`}
                        >
                          {user.disabled ? labels.disabled : labels.enabled}
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-[11px] font-semibold text-gray-500">
                        {user.updatedAt || user.createdAt ? formatTimestamp(user.updatedAt ?? user.createdAt) : '--'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="p-8 text-center text-sm text-gray-500">{labels.noUsers}</p>
          )}
        </div>
      </div>
    </section>
  );
};

const App = () => {
  const [latestReading, setLatestReading] = useState(null);
  const [history, setHistory] = useState([]);
  const [devices, setDevices] = useState([DEFAULT_DEVICE_ID]);
  const [deviceSummaries, setDeviceSummaries] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(getInitialDevice);
  const [activeSection, setActiveSection] = useState('overview');
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authAccessError, setAuthAccessError] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState({ devices: true, latest: true, history: true });
  const [error, setError] = useState(null);
  const [deviceDiscoveryError, setDeviceDiscoveryError] = useState(null);
  const [language, setLanguage] = useState(getInitialLanguage);
  const [exportDeviceIds, setExportDeviceIds] = useState([getInitialDevice()]);
  const [exportFrom, setExportFrom] = useState('');
  const [exportTo, setExportTo] = useState('');
  const [viewFrom, setViewFrom] = useState('');
  const [viewTo, setViewTo] = useState('');
  const [exportError, setExportError] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
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
    if (!auth) {
      setAuthLoading(false);
      return undefined;
    }

    return onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
      if (!user) {
        setCurrentUserProfile(null);
        setUsers([]);
        setLoading({ devices: false, latest: false, history: false });
      }
    });
  }, []);

  useEffect(() => {
    if (!database || !currentUser) return undefined;

    const userRef = ref(database, `/users/${currentUser.uid}`);
    const unsubscribeUser = onValue(
      userRef,
      async (snapshot) => {
        try {
          const email = currentUser.email?.toLowerCase() ?? '';
          const providerId = currentUser.providerData[0]?.providerId ?? 'password';
          const isBootstrapAdmin = ADMIN_EMAILS.includes(email);
          const allowedSnapshot = await get(ref(database, `/allowedUsers/${getEmailKey(email)}`));
          const allowedUser = allowedSnapshot.exists() ? allowedSnapshot.val() : null;

          if (!isBootstrapAdmin) {
            const providerKey = getProviderKey(providerId);
            const providerAllowed =
              providerId === 'password'
                ? allowedUser?.allowedProviders?.password === true
                : allowedUser?.allowedProviders?.[providerKey] === true;

            if (!allowedUser || allowedUser.enabled !== true || !providerAllowed) {
              setAuthAccessError(
                'This account is not approved for dashboard access. Ask an admin to add your email and provider in Allowed Users.',
              );
              await signOut(auth);
              return;
            }
          }

          const existingProfile = snapshot.exists() ? snapshot.val() : null;
          const role = existingProfile?.role ?? (isBootstrapAdmin ? 'admin' : allowedUser?.role ?? 'viewer');
          const nextProfile = {
            uid: currentUser.uid,
            email,
            displayName: existingProfile?.displayName ?? currentUser.displayName ?? email,
            role,
            disabled: Boolean(existingProfile?.disabled ?? allowedUser?.disabled),
            enabled: isBootstrapAdmin ? true : allowedUser?.enabled === true,
            providerId,
            createdAt: existingProfile?.createdAt ?? Date.now(),
            updatedAt: Date.now(),
          };

          if (isBootstrapAdmin && !allowedUser) {
            await set(ref(database, `/allowedUsers/${getEmailKey(email)}`), {
              email,
              role: 'admin',
              enabled: true,
              disabled: false,
              allowedProviders: {
                password: true,
                google_com: true,
              },
              createdAt: Date.now(),
              updatedAt: Date.now(),
            });
          }

          if (!existingProfile) {
            await set(userRef, nextProfile);
          }

          setCurrentUserProfile({ ...existingProfile, ...nextProfile });

          if (nextProfile.disabled) {
            await signOut(auth);
          }
        } catch (profileError) {
          setAuthAccessError(`Unable to load your user access profile: ${profileError.message}`);
          setCurrentUserProfile(null);
          setLoading({ devices: false, latest: false, history: false });
        }
      },
      (profileError) => {
        setAuthAccessError(`Unable to read your user profile: ${profileError.message}`);
        setCurrentUserProfile(null);
        setLoading({ devices: false, latest: false, history: false });
      },
    );

    return () => unsubscribeUser();
  }, [currentUser]);

  useEffect(() => {
    if (!database || currentUserProfile?.role !== 'admin') {
      setUsers([]);
      return undefined;
    }

    let userRecords = [];
    let allowedRecords = [];

    const updateAdminUsers = () => {
      setUsers(mergeAdminUsers(userRecords, allowedRecords));
    };

    const unsubscribeUsers = onValue(ref(database, '/users'), (snapshot) => {
      userRecords = snapshot.exists() ? Object.values(snapshot.val()) : [];
      updateAdminUsers();
    });

    const unsubscribeAllowedUsers = onValue(ref(database, '/allowedUsers'), (snapshot) => {
      allowedRecords = snapshot.exists() ? Object.entries(snapshot.val()) : [];
      updateAdminUsers();
    });

    return () => {
      unsubscribeUsers();
      unsubscribeAllowedUsers();
    };
  }, [currentUserProfile?.role]);

  useEffect(() => {
    if (!database) {
      setError(firebaseConfigError);
      setLoading({ devices: false, latest: false, history: false });
      return undefined;
    }

    if (!currentUser || !currentUserProfile) {
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
  }, [currentUser, currentUserProfile, selectedDeviceId]);

  useEffect(() => {
    if (!database || !selectedDeviceId || !currentUser || !currentUserProfile) {
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
  }, [currentUser, currentUserProfile, selectedDeviceId]);

  const filteredHistory = useMemo(() => {
    const fromMs = getDateInputMs(viewFrom);
    const toMs = getDateInputMs(viewTo, true);

    if (!fromMs && !toMs) return history;

    return history.filter((reading) => {
      if (!reading.time) return false;
      if (fromMs && reading.time < fromMs) return false;
      if (toMs && reading.time > toMs) return false;
      return true;
    });
  }, [history, viewFrom, viewTo]);

  const chartData = useMemo(
    () =>
      [...filteredHistory].reverse().map((reading) => ({
        ...reading,
        chartTime: new Date(Number(reading.timestamp)),
      })),
    [filteredHistory],
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
    ['overview', t.overview, 'overview'],
    ['devices', t.devices, 'devices'],
    ...(currentUserProfile?.role === 'admin' ? [['admin', t.admin, 'admin']] : []),
  ];

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 text-sm font-semibold text-gray-500">
        {t.loading}
      </main>
    );
  }

  if (!currentUser) {
    return (
      <AuthScreen
        labels={t}
        language={language}
        onLanguageChange={updateLanguage}
        accessError={authAccessError}
        onClearAccessError={() => setAuthAccessError(null)}
      />
    );
  }

  if (!currentUserProfile) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-8">
        <section className="glass-card max-w-lg rounded-[28px] p-6 text-center">
          <h1 className="text-xl font-semibold text-gray-950">{t.title}</h1>
          <p className="mt-3 text-sm text-gray-500">
            {authAccessError ?? 'Loading your user access profile...'}
          </p>
          <button
            type="button"
            onClick={() => signOut(auth)}
            className="mt-5 rounded-full bg-gray-950 px-5 py-2.5 text-sm font-semibold text-white"
          >
            {t.signOut}
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-3 py-4 sm:px-4 lg:px-5">
      <div
        className={`grid w-full gap-4 ${
          isSidebarCollapsed
            ? 'lg:grid-cols-[48px_minmax(0,1fr)]'
            : 'lg:grid-cols-[190px_minmax(0,1fr)]'
        }`}
      >
        <aside className="glass-card h-fit rounded-[22px] p-2 lg:sticky lg:top-4">
          <div
            className={`flex items-center ${
              isSidebarCollapsed ? 'justify-center' : 'justify-between gap-2 px-1.5 py-1.5'
            }`}
          >
            {!isSidebarCollapsed ? (
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-700"
                  aria-hidden="true"
                >
                  <SidebarIcon name="monitor" />
                </span>
                <p className="min-w-0 truncate text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  {t.title}
                </p>
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed((current) => !current)}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/70 text-gray-600 shadow-sm ring-1 ring-gray-200 transition hover:bg-white hover:text-gray-950"
              aria-label={isSidebarCollapsed ? t.showSidebar : t.hideSidebar}
              title={isSidebarCollapsed ? t.showSidebar : t.hideSidebar}
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                {isSidebarCollapsed ? (
                  <>
                    <rect x="4" y="5" width="16" height="14" rx="2" />
                    <path d="M9 5v14" />
                    <path d="m13 9 3 3-3 3" />
                  </>
                ) : (
                  <>
                    <rect x="4" y="5" width="16" height="14" rx="2" />
                    <path d="M9 5v14" />
                    <path d="m16 9-3 3 3 3" />
                  </>
                )}
              </svg>
            </button>
          </div>
          <nav
            className={`mt-1.5 flex gap-1.5 transition duration-150 lg:flex-col ${
              isSidebarCollapsed
                ? 'pointer-events-none h-0 overflow-hidden opacity-0 lg:scale-95'
                : 'opacity-100 lg:scale-100'
            }`}
            aria-hidden={isSidebarCollapsed}
          >
              {navItems.map(([sectionId, label, iconName]) => (
                <div key={sectionId}>
                  <button
                    type="button"
                    onClick={() => setActiveSection(sectionId)}
                    className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-semibold transition ${
                      activeSection === sectionId
                        ? 'bg-gray-950 text-white shadow-sm'
                        : 'bg-white/55 text-gray-600 hover:bg-white hover:text-gray-950'
                    }`}
                  >
                    <SidebarIcon name={iconName} />
                    <span className="truncate">{label}</span>
                  </button>
                  {sectionId === 'devices' ? (
                    <div className="mt-1.5 space-y-1 pl-1">
                      {overviewDevices.map((device) => {
                        const online = isReadingOnline(device.latest, now);
                        const selected = device.id === selectedDeviceId;

                        return (
                          <button
                            key={device.id}
                            type="button"
                            onClick={() => openDevice(device.id)}
                            className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] font-semibold transition ${
                              selected
                                ? 'bg-white text-gray-950 shadow-sm ring-1 ring-gray-200'
                                : 'text-gray-500 hover:bg-white/70 hover:text-gray-950'
                            }`}
                          >
                            <SidebarIcon name="device" />
                            <span
                              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
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
        <header className="mb-5 grid gap-4 xl:grid-cols-[minmax(260px,1fr)_auto] xl:items-start">
          <div className={activeSection === 'admin' ? 'xl:mt-3' : 'xl:mt-12'}>
            <h1
              className={`font-semibold tracking-normal text-gray-950 ${
                activeSection === 'admin' ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl'
              }`}
            >
              {t.title}
            </h1>
          </div>
          <div
            className={`flex flex-col items-stretch gap-2.5 xl:items-end ${
              activeSection === 'admin' ? 'xl:mt-2' : 'xl:mt-12'
            }`}
          >
            <div className="inline-flex items-center justify-end gap-2 rounded-2xl bg-white/75 px-2.5 py-1.5 text-[11px] font-semibold text-gray-500 shadow-sm ring-1 ring-gray-200">
              <span
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[9px] font-bold text-gray-700"
                aria-hidden="true"
              >
                {getUserInitials(currentUserProfile ?? currentUser)}
              </span>
              <div className="min-w-0 text-right">
                <p>{t.signedInAs}</p>
                <p className="mt-0.5 max-w-[200px] truncate text-gray-950">
                  {currentUserProfile?.email ?? currentUser.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => signOut(auth)}
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-gray-500 shadow-sm ring-1 ring-gray-200 transition hover:text-gray-950"
                aria-label={t.signOut}
                title={t.signOut}
              >
                <svg
                  className="h-3 w-3"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <path d="m16 17 5-5-5-5" />
                  <path d="M21 12H9" />
                </svg>
              </button>
            </div>
            <div className="flex flex-col items-stretch gap-2.5 lg:flex-row lg:items-center">
              {activeSection === 'devices' ? (
                <div className="glass-card flex flex-col gap-2 rounded-[18px] p-2.5 sm:flex-row sm:items-end lg:self-center">
                  <div className="flex items-center gap-2 px-1 sm:self-center">
                    <span
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-700"
                      aria-hidden="true"
                    >
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path d="M8 2v4" />
                        <path d="M16 2v4" />
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <path d="M3 10h18" />
                      </svg>
                    </span>
                    <p className="text-xs font-semibold text-gray-500">{t.dateRange}</p>
                  </div>
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-semibold uppercase text-gray-500">
                      {t.dateFrom}
                    </span>
                    <input
                      type="date"
                      value={viewFrom}
                      onChange={(event) => setViewFrom(event.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-950 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-200 sm:w-36"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-semibold uppercase text-gray-500">
                      {t.dateTo}
                    </span>
                    <input
                      type="date"
                      value={viewTo}
                      onChange={(event) => setViewTo(event.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-950 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-200 sm:w-36"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setViewFrom('');
                      setViewTo('');
                    }}
                    className="rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-gray-500 shadow-sm ring-1 ring-gray-200 transition hover:text-gray-950"
                  >
                    {t.clearDates}
                  </button>
                </div>
              ) : null}
              <div className="flex min-w-[244px] flex-col gap-2.5">
                <div
                  className="flex w-full rounded-full bg-white/75 p-1 shadow-sm ring-1 ring-gray-200"
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
                  className={`flex-1 rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
                    language === value
                      ? 'bg-gray-950 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-950'
                  }`}
                  aria-pressed={language === value}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M2 12h20" />
                      <path d="M12 2a15.3 15.3 0 0 1 0 20" />
                      <path d="M12 2a15.3 15.3 0 0 0 0 20" />
                    </svg>
                    {label}
                  </span>
                </button>
                  ))}
                </div>
            <div className="relative w-full">
              <button
                type="button"
                disabled={devices.length === 0}
                onClick={() => setIsExportMenuOpen((current) => !current)}
                className="inline-flex w-full items-center justify-center rounded-full bg-gray-950 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-gray-950/10 transition hover:-translate-y-0.5 hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none"
                aria-expanded={isExportMenuOpen}
              >
                <svg
                  className="mr-2 h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M12 3v12" />
                  <path d="m7 10 5 5 5-5" />
                  <path d="M5 21h14" />
                </svg>
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
          </div>
          </div>
        </header>

        {error ? (
          <section className="mb-8 rounded-[28px] border border-red-200 bg-red-50/80 p-5 text-red-700">
            <h2 className="font-semibold">{t.firebaseErrorTitle}</h2>
            <p className="mt-1 text-sm">{error}</p>
          </section>
        ) : null}

        {activeSection === 'admin' && currentUserProfile?.role === 'admin' ? (
          <AdminPanel labels={t} users={users} currentUserProfile={currentUserProfile} />
        ) : activeSection === 'overview' ? (
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

        <section className="grid gap-2 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-8">
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
                {t.latestRecords} {Math.min(filteredHistory.length, 5)} {t.historicalRecords}
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
          <ReadingsTable readings={filteredHistory} labels={t} deviceId={selectedDeviceId} />
        </section>
          </>
        )}
      </div>
      </div>
    </main>
  );
};

export default App;
