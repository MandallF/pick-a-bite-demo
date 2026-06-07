@echo off
setlocal enabledelayedexpansion

REM ======================================================================
REM Pick A Bite - Demo Baslatici (LAN modu)
REM Telefon ve PC ayni WiFi'da olmali.
REM   Frontend -> Expo LAN modu (ngrok YOK, IP otomatik)
REM   Backend  -> Cloudflare tunnel (firewall gerekmez)
REM IP ve URL tespiti _lan-ip.ps1 / _cf-url.ps1 helper'lari ile yapilir.
REM ======================================================================

cd /d "%~dp0"
set "ROOT=%~dp0"
set "BACKEND_DIR=%ROOT%pick-a-bite-backend"
set "FRONTEND_DIR=%ROOT%pick-a-bite-main"
set "ENV_FILE=%FRONTEND_DIR%\.env"
set "CF_LOG=%TEMP%\cf_tunnel.log"
set "BE_LOG=%TEMP%\backend.log"

echo.
echo ==========================================================
echo   Pick A Bite - Demo Baslatiliyor (LAN modu)
echo ==========================================================
echo.

REM --- 0) LAN IP tespiti (helper ps1) ---
echo [0/5] LAN IP tespit ediliyor...
set "LAN_IP="
for /f "usebackq delims=" %%a in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%_lan-ip.ps1"`) do set "LAN_IP=%%a"
if not defined LAN_IP set "LAN_IP=localhost"
echo       LAN IP: !LAN_IP!
echo.

REM --- 1) Eski process'leri temizle ---
echo [1/5] Eski servisleri kapatiyor...
taskkill /F /IM cloudflared.exe >nul 2>&1
taskkill /F /IM java.exe >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /R /C:":8080 .* LISTENING"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /R /C:":8081 .* LISTENING"') do taskkill /F /PID %%a >nul 2>&1
timeout /t 3 /nobreak >nul
echo       OK
echo.

REM --- 2) Backend baslat ---
echo [2/5] Backend (Spring Boot) baslatiliyor...
if exist "%BE_LOG%" del "%BE_LOG%" >nul 2>&1
start "Pick A Bite - Backend" /MIN /D "%BACKEND_DIR%" cmd /c "mvnw.cmd spring-boot:run > %BE_LOG% 2>&1"
echo       Backend baslatildi, hazir olmasi bekleniyor...
set /a tries=0
:wait_backend
timeout /t 3 /nobreak >nul
set /a tries+=1
curl -s -o nul -w "%%{http_code}" http://localhost:8080/pick-a-bite/restoranlar >"%TEMP%\hc.txt" 2>nul
set /p HTTP_CODE=<"%TEMP%\hc.txt"
del "%TEMP%\hc.txt" >nul 2>&1
if "!HTTP_CODE!"=="200" goto backend_ready
if !tries! GEQ 80 (
    echo.
    echo       HATA: Backend 240 saniyede hazir olmadi. Log: %BE_LOG%
    powershell -NoProfile -Command "Get-Content '%BE_LOG%' -ErrorAction SilentlyContinue | Select-Object -First 20"
    pause
    exit /b 1
)
<nul set /p ="."
goto wait_backend
:backend_ready
echo.
echo       Backend HAZIR (port 8080)
echo.

REM --- 3) Cloudflare Tunnel baslat ---
echo [3/5] Cloudflare Tunnel baslatiliyor...
set "CF_EXE=%LOCALAPPDATA%\Microsoft\WinGet\Packages\Cloudflare.cloudflared_Microsoft.Winget.Source_8wekyb3d8bbwe\cloudflared.exe"
if not exist "%CF_EXE%" set "CF_EXE=cloudflared"
if exist "%CF_LOG%" del "%CF_LOG%" >nul 2>&1
start "Pick A Bite - Cloudflare" /MIN cmd /c "%CF_EXE% tunnel --url http://localhost:8080 --no-autoupdate > %CF_LOG% 2>&1"
echo       Cloudflared baslatildi, URL bekleniyor...
set "TUNNEL_URL="
set /a tries=0
:wait_cf
timeout /t 2 /nobreak >nul
set /a tries+=1
for /f "usebackq delims=" %%a in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%_cf-url.ps1" "%CF_LOG%"`) do set "TUNNEL_URL=%%a"
if defined TUNNEL_URL goto cf_ready
if !tries! GEQ 30 (
    echo       HATA: Cloudflare URL alinamadi. Log: %CF_LOG%
    pause
    exit /b 1
)
<nul set /p ="."
goto wait_cf
:cf_ready
echo.
echo       Backend Tunnel: !TUNNEL_URL!
echo.

REM --- 4) .env'i guncelle ---
echo [4/5] .env guncelleniyor (backend = Cloudflare)...
powershell -NoProfile -Command "(Get-Content '%ENV_FILE%') -replace 'EXPO_PUBLIC_BACKEND_URL=.*', 'EXPO_PUBLIC_BACKEND_URL=!TUNNEL_URL!/pick-a-bite' | Set-Content '%ENV_FILE%' -Encoding UTF8"
echo       OK
echo.

REM --- 5) Expo baslat (LAN modu, IP zorlanmis) ---
echo [5/5] Expo (frontend, LAN modu) baslatiliyor...
start "Pick A Bite - Expo" /D "%FRONTEND_DIR%" cmd /k "set REACT_NATIVE_PACKAGER_HOSTNAME=!LAN_IP!&& npx expo start --lan --clear"
echo       Expo baslatildi, hazir olmasi ~30 saniye...
timeout /t 30 /nobreak >nul

REM --- 6) QR PNG olustur ---
echo [Bonus] QR kodu olusturuluyor...
set "EXPO_URL=exp://!LAN_IP!:8081"
py -c "import qrcode; qr=qrcode.QRCode(box_size=12,border=4); qr.add_data('!EXPO_URL!'); qr.make(); qr.make_image().save(r'%ROOT%expo-qr.png')" 2>nul
if exist "%ROOT%expo-qr.png" (
    echo       QR aciliyor: %ROOT%expo-qr.png
    start "" "%ROOT%expo-qr.png"
)
echo.

echo ==========================================================
echo   DEMO HAZIR
echo ==========================================================
echo.
echo   Backend Tunnel : !TUNNEL_URL!/pick-a-bite
echo   Expo URL       : !EXPO_URL!
echo.
echo   TELEFON: Expo Go ile QR'i tara (expo-qr.png acildi)
echo            VEYA manuel URL: !EXPO_URL!
echo.
echo   NOT: Telefon ve PC AYNI WiFi'da olmali!
echo   ONEMLI: BU PENCEREYI KAPATMAYIN.
echo   Durdurmak: taskkill /F /IM cloudflared.exe /IM java.exe /IM node.exe
echo.
:keepalive
timeout /t 600 /nobreak >nul
goto keepalive
