# Shiz Academy (React + Vite)

## Development

- `npm ci` to install dependencies
- `npm run dev` to start the Vite dev server
- `npm run build` to produce a production build in `dist/`

## Android APK (Capacitor)

This repo includes a Capacitor config to package the Vite web app as an Android APK.

Quick start:

1) `npm run build`
2) `npm run cap:add:android` (first time only)
3) `npm run cap:copy`
4) `npm run cap:open:android` and build the APK in Android Studio (Build > Build APKs)

More details in `docs/android-apk.md`.
