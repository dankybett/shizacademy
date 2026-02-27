Android APK build (Capacitor)

Prereqs

- Node 18+ and npm
- Android Studio (SDK + platform tools) and JDK 17
- USB debugging enabled on your phone (for install on device)

Initial setup (one time)

1) Install web deps and create a production build
- npm ci
- npm run build

2) Install Capacitor packages
- npm i @capacitor/core
- npm i -D @capacitor/cli
- npm i @capacitor/android

3) Add Capacitor platform (after the first build so /dist exists)
- npm run cap:add:android

Build + run

1) Sync latest web build to the native project
- npm run build
- npm run cap:copy

2) Build from Android Studio (recommended)
- npm run cap:open:android
- In Android Studio: Build > Build Bundle(s)/APK(s) > Build APK(s)
- APK output: android/app/build/outputs/apk/debug/app-debug.apk

Or build via CLI

- npm run android:assembleDebug
- APK output: android/app/build/outputs/apk/debug/app-debug.apk

Install on device (ADB)

- adb install -r android/app/build/outputs/apk/debug/app-debug.apk

Notes

- App id/name are set in capacitor.config.json (appId: shiz.academy, appName: Shiz Academy).
- The web build directory is dist (Vite default). Always build before copy.
- If you ever load non-HTTPS content, enable cleartext traffic in AndroidManifest.xml or serve over HTTPS.
- For release builds/signing, use Android Studio’s Build > Generate Signed Bundle / APK and configure a keystore.
