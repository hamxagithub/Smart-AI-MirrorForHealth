@echo off
echo ========================================
echo React Native Complete Cleanup & Rebuild
echo ========================================

echo Step 1: Stopping all Node processes...
taskkill /f /im node.exe > nul 2>&1
taskkill /f /im yarn.exe > nul 2>&1

echo Step 2: Cleaning Metro cache...
npx react-native start --reset-cache --quiet & timeout /t 3 > nul & taskkill /f /im node.exe > nul 2>&1

echo Step 3: Cleaning Android build...
cd android
call gradlew clean > nul 2>&1
cd ..

echo Step 4: Removing autolinking cache...
if exist "android\app\build\generated\autolinking" (
    rmdir /s /q "android\app\build\generated\autolinking" > nul 2>&1
)

echo Step 5: Cleaning npm/yarn cache...
npm cache clean --force > nul 2>&1
yarn cache clean > nul 2>&1

echo Step 6: Removing node_modules...
if exist node_modules (
    rmdir /s /q node_modules > nul 2>&1
)

echo Step 7: Removing package-lock.json and yarn.lock...
if exist package-lock.json (
    del package-lock.json > nul 2>&1
)
if exist yarn.lock (
    del yarn.lock > nul 2>&1
)

echo Step 8: Installing dependencies...
npm install --legacy-peer-deps

echo Step 9: Clearing watchman cache (if available)...
watchman watch-del-all > nul 2>&1

echo Step 10: Clearing React Native cache...
npx react-native clean > nul 2>&1

echo Step 11: Setting up fonts...
if not exist "android\app\src\main\assets\fonts" (
    mkdir "android\app\src\main\assets\fonts"
)

echo Step 12: Copying vector icon fonts...
if exist "node_modules\react-native-vector-icons\Fonts" (
    for %%f in ("node_modules\react-native-vector-icons\Fonts\*") do (
        copy "%%f" "android\app\src\main\assets\fonts\" > nul 2>&1
    )
)

echo ========================================
echo Cleanup complete! 
echo ========================================
echo To build and run:
echo 1. npx react-native start
echo 2. In new terminal: npx react-native run-android
echo ========================================
pause
