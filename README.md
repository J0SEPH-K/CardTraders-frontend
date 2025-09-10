# CardTraders Frontend

Expo React Native app for CardTraders.

## Runtime Config Strategy

Public config is served by the backend at `/config` from Mongo `config.runtime.public` combined with any `EXPO_PUBLIC_*` process envs.

At app startup, we fetch and cache this config before hiding the splash. Use helpers:

- `loadRuntimeConfig()` to load once
- `getConfig(key)` to read a value
- `getAllConfig()` to inspect

Server-only secrets remain in Mongo under `config.runtime.server` and are never sent to clients.

## Building for TestFlight with EAS

Prereqs:
- Apple Developer Program account for the Apple ID used with EAS
- Ensure iOS bundle identifier matches your App Store Connect app

Steps:
1. Install EAS CLI: `npm i -g eas-cli`
2. Log in: `eas login`
3. Configure iOS credentials: `eas credentials` (or let `eas build` handle it)
4. Build for iOS: `eas build -p ios --profile production`
5. Submit to TestFlight: `eas submit -p ios` (or upload the `.ipa` with Transporter)

If you prefer Transporter:
1. Download the `.ipa` from the EAS build page
2. Open Apple Transporter app, sign in, and drag-drop the `.ipa`

Environment vars: set `EXPO_PUBLIC_*` for any client-visible values. Server secrets must be managed on the backend.
