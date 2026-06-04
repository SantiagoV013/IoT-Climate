# ESP32 Environment Monitor

A minimalist Apple-like dashboard for ESP32 environmental telemetry stored in Firebase Realtime Database.

## Features

- Firebase Realtime Database connection through Vite environment variables
- Device selector discovered from `/devices`
- Side menu with Overview and Devices sections
- Realtime listener for `/devices/{deviceId}/latest`
- Historical data listener for `/devices/{deviceId}/history`
- Live metric cards for temperature, humidity, light, motion, CO2, TVOC, WiFi signal, and last update time
- Air quality panel with CCS811 CO2/TVOC rating, trends, and realtime charts
- Per-device Recharts visualizations for temperature, humidity, light percentage, motion events, CO2, and TVOC
- Per-device recent readings table
- Per-device native JavaScript CSV export
- CSV export by selected devices and date range
- Online/offline status for the selected device

## Navigation

- **Overview** shows all discovered devices with connection status and latest temperature, humidity, and light values.
- **Devices** shows the detailed per-device dashboard with live cards, charts, history table, and CSV export.

CSV export can include one or more devices. Date range filtering uses Firebase/Unix millisecond timestamps from each row.
- Loading, empty, and Firebase error states
- Responsive Tailwind CSS layout

## Firebase Data Shape

The dashboard expects readings like this:

```json
{
  "temperature": 24.3,
  "humidity": 48,
  "lightPercent": 51,
  "motion": 0,
  "eco2": 650,
  "tvoc": 12,
  "rssi": -55,
  "timestamp": 1780522800000
}
```

The dashboard treats every `timestamp` value as a Firebase/Unix timestamp in milliseconds and displays it in the user's local timezone.

Paths used by the app:

```text
/devices/{deviceId}/latest
/devices/{deviceId}/history/{timestamp}
```

Example devices:

```text
/devices/esp32_room_01/latest
/devices/esp32_room_02/latest
/devices/greenhouse_01/latest
```

## Setup

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

Fill in your Firebase Web app values:

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_DATABASE_URL=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

## Firebase Notes

Do not commit `.env.local`. Firebase credentials are read by `src/firebase.js` from Vite environment variables and are intentionally not hardcoded.

The device selector reads `/devices` to discover available device IDs. Your rules must allow that list read. Example development rules:

```json
{
  "rules": {
    "devices": {
      ".read": true,
      "$deviceId": {
        "latest": {
          ".write": "newData.child('deviceToken').val() === 'iot_esp32_secret_2026'"
        },
        "history": {
          "$timestamp": {
            ".write": "newData.child('deviceToken').val() === 'iot_esp32_secret_2026'"
          }
        }
      }
    },
    ".read": false,
    ".write": false
  }
}
```

If your database rules require authentication, add Firebase Auth and update the Realtime Database security rules accordingly. For read-only dashboards on trusted networks, ensure rules still restrict writes to your ESP32 or backend process.
