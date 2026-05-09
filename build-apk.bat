@echo off
echo ========================================
echo   Labo Oltiariq - APK Build Script
echo ========================================
echo.

echo [1/4] Fayllarni www papkasiga nusxalash...
copy /Y index.html www\index.html >nul
copy /Y style.css www\style.css >nul
copy /Y app.js www\app.js >nul
copy /Y firebase-config.js www\firebase-config.js >nul
echo     OK

echo.
echo [2/4] Capacitor sinxronlash...
call npx cap sync android >nul 2>&1
echo     OK

echo.
echo [3/4] APK build qilish (biroz vaqt oladi)...
cd android
set ANDROID_HOME=C:\android-sdk
call gradlew.bat assembleDebug --no-daemon 2>&1
cd ..
echo     OK

echo.
echo [4/4] APK ni Desktop ga nusxalash...
copy /Y android\app\build\outputs\apk\debug\app-debug.apk %USERPROFILE%\Desktop\LaboOltiariq.apk >nul
echo     OK

echo.
echo ========================================
echo   APK TAYYOR!
echo   Joyi: Desktop\LaboOltiariq.apk
echo ========================================
echo.
pause
