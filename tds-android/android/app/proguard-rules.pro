# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# ---- TDS production rules (R8 enabled 2026-07-23) ----
# Readable crash stacks in Play Console / Crashlytics (mapping still deobfuscates fully).
-keepattributes SourceFile,LineNumberTable

# Capacitor discovers plugins by reflection on @CapacitorPlugin classes; its consumer rules
# cover the framework, these keep OUR locally-vendored plugins + the cordova bridge safe.
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keep class com.getcapacitor.** { *; }
-keep class org.apache.cordova.** { *; }
# cordova-plugin-purchase reflects into the billing client
-keep class com.android.billingclient.** { *; }

# Optional Facebook login path in @capacitor-firebase/authentication — SDK intentionally absent.
# Please add these rules to your existing keep rules in order to suppress warnings.
# This is generated automatically by the Android Gradle plugin.
-dontwarn com.facebook.CallbackManager$Factory
-dontwarn com.facebook.CallbackManager
-dontwarn com.facebook.FacebookCallback
-dontwarn com.facebook.login.LoginManager
-dontwarn com.facebook.login.widget.LoginButton