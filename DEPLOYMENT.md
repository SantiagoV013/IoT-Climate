# Deployment

## Recommended Production Setup

Use **Vercel + Firebase Realtime Database** for the first production version.

This dashboard already listens directly to Firebase Realtime Database, so Vercel only needs to host the React app. That is the simplest option because it preserves realtime updates and does not require an extra backend.

MongoDB is a good later addition if you need:

- long-term archival storage
- advanced historical queries
- aggregations and reports
- private backend APIs

Do not connect MongoDB directly from React. MongoDB credentials must stay on the server, so MongoDB requires a backend/API layer such as Vercel Serverless Functions.

## Vercel Deploy

1. Push this project to GitHub.
2. In Vercel, create a new project from the GitHub repository.
3. Vercel should detect the app as Vite. The included `vercel.json` also sets:

```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist"
}
```

4. Add these environment variables in Vercel Project Settings:

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_DATABASE_URL=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_ADMIN_EMAILS=admin@example.com
```

5. Deploy.

## Firebase Database Rules

Enable Firebase Auth providers before deploying the login flow:

- **Firebase Authentication > Sign-in method > Email/Password**
- **Firebase Authentication > Sign-in method > Google**
- **Firebase Authentication > Settings > Authorized domains** must include your Vercel domain.

Realtime Database keys cannot contain dots. In `/allowedUsers/{emailKey}/allowedProviders`, store Google as `google_com: true`, not `google.com: true`.

If the deployed app shows `Firebase: Error (auth/configuration-not-found)`, the Firebase project is missing Auth setup or Vercel has Firebase env vars from the wrong project. Verify `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, and `VITE_FIREBASE_DATABASE_URL` all belong to the same Firebase project.

For the dashboard to list devices and read telemetry, Firebase rules must allow reads on `/devices`. Writes should remain restricted to the ESP32 or a trusted backend.

Example development rules:

```json
{
  "rules": {
    "allowedUsers": {
      ".read": "auth != null",
      ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() === 'admin'"
    },
    "users": {
      ".read": "auth != null && root.child('users').child(auth.uid).child('role').val() === 'admin'",
      "$uid": {
        ".read": "auth != null && (auth.uid === $uid || root.child('users').child(auth.uid).child('role').val() === 'admin')",
        ".write": "auth != null && (auth.uid === $uid || root.child('users').child(auth.uid).child('role').val() === 'admin')"
      }
    },
    "devices": {
      ".read": "auth != null && root.child('users').child(auth.uid).child('enabled').val() === true && root.child('users').child(auth.uid).child('disabled').val() !== true",
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

## MongoDB Option

If you still want MongoDB, use MongoDB Atlas and add Vercel API routes later.

Recommended architecture:

```text
ESP32 -> Firebase Realtime Database -> Dashboard
                         |
                         v
              Optional backend sync job
                         |
                         v
                 MongoDB Atlas archive
```

This keeps Firebase as the realtime source and MongoDB as the historical analytics store.

Required future environment variables:

```bash
MONGODB_URI=
MONGODB_DB=iot_climate
```

Do not expose `MONGODB_URI` with a `VITE_` prefix. `VITE_` variables are bundled into browser code.
