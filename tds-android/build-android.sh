#!/usr/bin/env bash
# One-command Android build for Tower Destiny Survive.
#
#   ./build-android.sh            # sync web + build debug APK (installable, for testing)
#   ./build-android.sh release    # sync web + build release APK (signed if keystore.properties exists, else unsigned)
#   ./build-android.sh bundle     # sync web + build release AAB  (what you upload to Google Play)
#
# Sets the toolchain this project needs (JDK 17 — Gradle 8.2.1/AGP 8.2.1 don't support JDK 21+),
# and points at the Android SDK. Adjust the two paths below if your machine differs.
set -euo pipefail

# --- toolchain -------------------------------------------------------------
export JAVA_HOME="${JAVA_HOME_17:-/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$JAVA_HOME/bin:$PATH"

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$HERE"

[ -d "$JAVA_HOME" ]    || { echo "❌ JDK 17 not found at $JAVA_HOME (install: brew install openjdk@17)"; exit 1; }
[ -d "$ANDROID_HOME" ] || { echo "❌ Android SDK not found at $ANDROID_HOME"; exit 1; }
echo "▶ JDK: $("$JAVA_HOME/bin/java" -version 2>&1 | head -1)"
echo "▶ SDK: $ANDROID_HOME"

# --- keep the Android build in sync with the source-of-truth web build -----
if [ -d ../tds-web ]; then
  echo "▶ Syncing tds-web → www"
  rsync -a --exclude 'README.md' ../tds-web/ ./www/
fi
echo "▶ Capacitor sync"
npx cap sync android

# --- build -----------------------------------------------------------------
case "${1:-debug}" in
  debug)   TASK="assembleDebug";   OUT="android/app/build/outputs/apk/debug/app-debug.apk" ;;
  release) TASK="assembleRelease"; OUT="android/app/build/outputs/apk/release/" ;;
  bundle)  TASK="bundleRelease";   OUT="android/app/build/outputs/bundle/release/" ;;
  *) echo "usage: $0 [debug|release|bundle]"; exit 1 ;;
esac

echo "▶ gradle $TASK"
( cd android && ./gradlew "$TASK" --no-daemon )
echo "✅ Done → $OUT"
ls -lh $OUT 2>/dev/null || true
