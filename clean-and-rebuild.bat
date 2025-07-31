@echo off
echo Cleaning React Native project...

echo Step 1: Cleaning Metro cache...
npx react-native start --reset-cache --quiet > nul 2>&1
timeout /t 2 > nul
taskkill /f /im node.exe > nul 2>&1

echo Step 2: Cleaning Android build...
cd android
call gradlew clean > nul 2>&1
cd ..

echo Step 3: Cleaning npm cache...
npm cache clean --force > nul 2>&1

echo Step 4: Removing node_modules...
if exist node_modules (
    rmdir /s /q node_modules > nul 2>&1
)

echo Step 5: Reinstalling dependencies...
npm install

echo Step 6: Clearing watchman cache (if available)...
watchman watch-del-all > nul 2>&1

echo Step 7: Cleaning React Native cache...
npx react-native clean > nul 2>&1

echo Cleanup complete! Now you can run:
echo npx react-native run-android
echo.
pause
