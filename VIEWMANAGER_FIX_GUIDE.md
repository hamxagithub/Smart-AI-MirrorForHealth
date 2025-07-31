# React Native ViewManager Error Fix Guide

The ViewManager error you're experiencing is a common React Native issue that occurs when native dependencies are not properly linked. Here's how to fix it:

## Quick Fix Steps:

### Step 1: Clean Everything
```bash
# Clean Metro cache
npx react-native start --reset-cache
# Stop the process after a few seconds (Ctrl+C)

# Clean Android build
cd android
gradlew clean
cd ..

# Clean npm cache
npm cache clean --force
```

### Step 2: Remove and Reinstall Dependencies
```bash
# Remove node_modules
rmdir /s /q node_modules
# Reinstall
npm install
```

### Step 3: Reset React Native Cache
```bash
npx react-native clean
```

### Step 4: Link Vector Icons (if needed)
```bash
npx react-native unlink react-native-vector-icons
npx react-native link react-native-vector-icons
```

### Step 5: Rebuild the Project
```bash
# Start Metro bundler
npx react-native start --reset-cache

# In a new terminal, build and run
npx react-native run-android
```

## Alternative Method:

If the above doesn't work, try this automated script I created:

1. Run the `clean-and-rebuild.bat` file in your project root
2. After it completes, run: `npx react-native run-android`

## Files I've Updated:

1. **react-native.config.js** - Added manual linking configuration
2. **babel.config.js** - Added react-native-reanimated plugin
3. **proguard-rules.pro** - Added rules to prevent ViewManager obfuscation
4. **MainApplication.kt** - Added fallback package registration
5. **clean-and-rebuild.bat** - Automated cleanup script

## Common Causes of This Error:

1. **Corrupted Metro cache** - Fixed by resetting cache
2. **Android build cache issues** - Fixed by gradle clean
3. **Incorrect autolinking** - Fixed by manual linking configuration
4. **Dependency conflicts** - Fixed by reinstalling node_modules
5. **Proguard obfuscation** - Fixed by proguard rules

## If Error Persists:

1. Check Android SDK and build tools are up to date
2. Ensure you have the correct Java version (11 or 17)
3. Verify Android environment variables are set correctly
4. Try running on a different device/emulator

## Verification:

After fixing, you should see the app start without the red error screen showing ViewManager issues.

## Important Notes:

- Always stop the Metro bundler before cleaning
- Make sure Android emulator/device is running before `run-android`
- The first build after cleaning may take longer than usual
