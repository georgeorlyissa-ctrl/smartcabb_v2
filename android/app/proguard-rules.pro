# SmartCabb - ProGuard Rules for Capacitor Android App

# Keep line numbers for crash stack traces
-keepattributes SourceFile,LineNumberTable

# Keep WebView JavaScript interface (required for Capacitor bridge)
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep Capacitor bridge classes
-keep class com.getcapacitor.** { *; }
-keep class com.getcapacitor.plugin.** { *; }
-keep class com.getcapacitor.community.** { *; }
-keep class * extends com.getcapacitor.Plugin { *; }

# Keep Capacitor Cordova plugins
-keep class org.apache.cordova.** { *; }

# Keep AndroidX WebKit classes
-keep class androidx.webkit.** { *; }

# Keep Google Maps-related classes
-keep class com.google.android.gms.maps.** { *; }
-keep class com.google.maps.** { *; }

# Keep Gson serialization
-keep class com.google.gson.** { *; }
-keepattributes Signature
-keepattributes *Annotation*

# Keep your app's plugin classes (com.smartcabb.app)
-keep class com.smartcabb.app.** { *; }
