@echo off
setlocal enabledelayedexpansion

REM ======================================================================
REM Pick A Bite - Demo Baslatici
REM Backend + Cloudflare Tunnel + Expo'yu ayri pencerelerde acar
REM ======================================================================

cd /d "%~dp0"
set "ROOT=%~dp0"
set "BACKEND_DIR=%ROOT%pick-a-bite-backend"
set "FRONTEND_DIR=%ROOT%pick-a-bite-main"
set "ENV_FILE=%FRONTEND_DIR%\.env"
set "CF_LOG=%TEMP%\cf_tunnel.log"
set "CF_ERR=%TEMP%\cf_tunnel.err"
set "BE_LOG=%TEMP%\backend.log"

echo.
echo ==========================================================
echo   Pick A Bite - Demo Baslatiliyor
echo ==========================================================
echo.

REM --- 1) Eski process'leri temizle ---
echo [1/5] Eski servisleri kapatiyor...
taskkill /F /IM cloudflared.exe >nul 2>&1
taskkill /F /IM java.exe >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /R /C:":8080 .* LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /R /C:":8081 .* LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 3 /nobreak >nul
echo       OK
echo.

REM --- 2) Backend baslat (pushd ile cwd ayarla, start subprocess inherit eder) ---
echo [2/5] Backend (Spring Boot) baslatiliyor...
if exist "%BE_LOG%" del "%BE_LOG%" >nul 2>&1

REM /D ile subprocess'in cwd'sini explicit ayarla
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
    echo       HATA: Backend 240 saniye icinde hazir olmadi
    echo       Log: %BE_LOG%
    echo.
    echo       Log'un ilk 20 satiri:
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
if not exist "%CF_EXE%" (
    where cloudflared >nul 2>&1
    if errorlevel 1 (
        echo       HATA: cloudflared bulunamadi.
        echo       Kur: winget install Cloudflare.cloudflared
        pause
        exit /b 1
    )
    set "CF_EXE=cloudflared"
)

if exist "%CF_LOG%" del "%CF_LOG%" >nul 2>&1
if exist "%CF_ERR%" del "%CF_ERR%" >nul 2>&1

start "Pick A Bite - Cloudflare Tunnel" /MIN cmd /c "%CF_EXE% tunnel --url http://localhost:8080 --no-autoupdate > %CF_LOG% 2> %CF_ERR%"
echo       Cloudflared baslatildi, URL bekleniyor...

set "TUNNEL_URL="
set /a tries=0
:wait_cf
timeout /t 2 /nobreak >nul
set /a tries+=1
for /f "delims=" %%a in ('powershell -NoProfile -Command "$m = (Select-String -Path @('%CF_LOG%','%CF_ERR%') -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' -ErrorAction SilentlyContinue | Select-Object -First 1); if ($m) { $m.Matches[0].Value }"') do set "TUNNEL_URL=%%a"
if defined TUNNEL_URL goto cf_ready
if !tries! GEQ 30 (
    echo.
    echo       HATA: Cloudflare URL 60 saniyede alinamadi
    echo       Log: %CF_LOG%
    pause
    exit /b 1
)
<nul set /p ="."
goto wait_cf
:cf_ready
echo.
echo       Tunnel URL: %TUNNEL_URL%
echo.

REM --- 4) .env'i guncelle ---
echo [4/5] .env guncelleniyor...
powershell -NoProfile -Command "(Get-Content '%ENV_FILE%') -replace 'EXPO_PUBLIC_BACKEND_URL=.*', 'EXPO_PUBLIC_BACKEND_URL=%TUNNEL_URL%/pick-a-bite' | Set-Content '%ENV_FILE%' -Encoding UTF8"
if errorlevel 1 (
    echo       HATA: .env guncellenemedi
    pause
    exit /b 1
)
echo       OK
echo.

REM --- 5) Expo baslat - CI=true KULLANMA (QR'i kapatir) ---
echo [5/5] Expo (frontend) baslatiliyor...
start "Pick A Bite - Expo Tunnel" /D "%FRONTEND_DIR%" cmd /k "npx expo start --tunnel --clear"
echo       Expo ayri pencerede acildi, hazir olmasi ~30 saniye
echo.

REM --- 6) Expo URL'i bekle + QR PNG olustur (bat penceresinde de gosterim) ---
echo [Bonus] Yedek QR PNG olusturuluyor...
echo       Expo'nun hazir olmasi bekleniyor (30sn)...
timeout /t 30 /nobreak >nul

REM Expo manifest'ten hostUri'yi cek
set "EXPO_HOST="
for /f "delims=" %%a in ('powershell -NoProfile -Command "try { (Invoke-RestMethod -Uri 'http://localhost:8081' -Headers @{'exponent-platform'='ios'} -TimeoutSec 5 -ErrorAction Stop).extra.expoClient.hostUri } catch { '' }"') do (
    if not "%%a"=="" set "EXPO_HOST=%%a"
)

if not defined EXPO_HOST (
    echo       UYARI: Expo URL'i alinamadi. Expo penceresinde QR'a bak.
) else (
    echo       Expo URL: exp://!EXPO_HOST!
    REM QR PNG olustur
    py -c "import qrcode; url='exp://!EXPO_HOST!'; qr=qrcode.QRCode(box_size=12,border=4); qr.add_data(url); qr.make(); qr.make_image().save(r'%ROOT%expo-qr.png')" 2>nul
    if exist "%ROOT%expo-qr.png" (
        echo       QR PNG kaydedildi: %ROOT%expo-qr.png
        start "" "%ROOT%expo-qr.png"
    )
)
echo.

echo ==========================================================
echo   DEMO HAZIR
echo ==========================================================
echo.
echo   Backend  : http://localhost:8080/pick-a-bite
echo   Tunnel   : %TUNNEL_URL%
echo   Expo Go  : "Pick A Bite - Expo Tunnel" penceresinde QR var
echo              VEYA acilan expo-qr.png dosyasini telefondan tara
echo.
echo   ONEMLI: BU PENCEREYI KAPATMAYIN!
echo   Pencere acik kaldigi surece demo calismaya devam eder.
echo.
echo   Kapatmak isterseniz: taskkill /F /IM cloudflared.exe /IM java.exe /IM node.exe
echo.
:keepalive
timeout /t 600 /nobreak >nul
goto keepalive
