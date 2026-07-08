# Tower Destiny Survive — Android

The **real `tds-web` game wrapped as an Android app** with [Capacitor](https://capacitorjs.com).
The app is a native WebView running the exact `tds-web` HTML/CSS/JS — so it is **100% identical**
to the web version (same movement, same scenes, same everything), just installable as an `.apk`.

## The built APK
`android/app/build/outputs/apk/debug/app-debug.apk` (also copied to the project root and Desktop as
`TowerDestinySurvive.apk`). It's a **debug-signed** APK — fine for installing on your own phone.

## Install on your phone
1. Copy `TowerDestinySurvive.apk` to the phone (USB, email, Google Drive, Telegram, …).
2. On the phone, tap it. Android will ask to allow installs from this source — allow it.
3. Install → open. It locks to portrait, like the game.

Or over USB with the SDK's adb:
```
adb install -r TowerDestinySurvive.apk
```

## Rebuild after changing the game
The web game lives in `www/` (a copy of `tds-web`). After editing the game:
```
# 1) refresh www from tds-web (PowerShell)
Copy-Item ..\tds-web\* .\www -Recurse -Force ; Remove-Item .\www\README.md -ErrorAction SilentlyContinue
# 2) sync into the native project + build
npx cap sync android
cd android
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
$env:ANDROID_SDK_ROOT='C:\Users\Habib Torjmen\AppData\Local\Android\Sdk'
.\gradlew.bat assembleDebug --no-daemon
```

## Build environment used
- Node + Capacitor 6, JDK from Android Studio's bundled JBR (OpenJDK 21), Android SDK
  (`...\AppData\Local\Android\Sdk`, platforms 30–36, build-tools). `android/local.properties`
  points Gradle at the SDK.
- appId `com.TDS.zombietowerdefense`, appName "Tower Destiny Survive".

## Notes / next steps
- This is a **debug** APK. For a Play Store release you'd build a signed **release** AAB/APK
  (`gradlew bundleRelease` with a signing keystore) — ask and I'll set that up.
- App icon is the game's branded cannon-vs-zombie art. Source master lives at `assets/icon.png`
  (1024×1024); the launcher assets under `android/app/src/main/res/mipmap-*` (legacy `ic_launcher`,
  round `ic_launcher_round`, and adaptive `ic_launcher_foreground` + `@color/ic_launcher_background`
  `#44538E`) are generated from it. To re-generate after swapping the art, replace `assets/icon.png`
  and re-run the icon generator (or `npx @capacitor/assets generate --android`).
