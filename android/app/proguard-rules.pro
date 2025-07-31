# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.react.views.** { *; }
-keep class com.facebook.react.uimanager.** { *; }
-keep class com.facebook.react.viewmanagers.** { *; }

# React Native Vector Icons
-keep class com.oblador.vectoricons.** { *; }

# React Native SVG
-keep class com.horcrux.svg.** { *; }

# React Native Reanimated
-keep class com.swmansion.reanimated.** { *; }

# React Native Gesture Handler
-keep class com.swmansion.gesturehandler.** { *; }

# React Native Linear Gradient
-keep class com.BV.LinearGradient.** { *; }

# Keep ViewManager classes
-keep class **.*ViewManager { *; }
-keep class **.*Manager { *; }
-keep class **.*Package { *; }
