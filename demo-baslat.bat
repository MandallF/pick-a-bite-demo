@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

REM ======================================================================
REM Pick A Bite - Demo Baslatici
REM Backend + Cloudflare Tunnel + Expo'yu ayri pencerelerde acar
REM ======================================================================

cd /d "%~dp0"
set ROOT=%~dp0
set BACKEND_DIR=%ROOT%pick-a-bite-backend
set FRONTEND_DIR=%ROOT%pick-a-bite-main
set ENV_FILE=%FRONTEND_DIR%\.env
set CF_LOG=%TEMP%\cf_tunnel.log
set BE_LOG=%TEMP%\backend.log
set JAVA_HOME=C:\Program Files\Microsoft\jdk-17.0.19.10-hotspot

echo.
echo ==========================================================
echo   Pick A Bite - Demo Baslatiliyor
echo ==========================================================
echo.

REM --- 1) Eski process'leri temizle ---
echo [1/5] Eski servisleri kapatiyor...
taskkill /F /IM cloudflared.exe >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /R /C:":8080.*LISTENING"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /R /C:":8081.*LISTENING"') do taskkill /F /PID %%a >nul 2>&1
timeout /t 2 /nobreak >nul
echo       OK
echo.

REM --- 2) Backend baslat (ayri pencerede) ---
echo [2/5] Backend (Spring Boot) baslatiliyor...
start "Pick A Bite - Backend" /MIN cmd /c "cd /d %BACKEND_DIR% && set JAVA_HOME=%JAVA_HOME% && set PATH=%JAVA_HOME%\bin;%PATH% && mvnw.cmd spring-boot:run > %BE_LOG% 2>&1"
echo       Backend baslatildi, hazir olmasi bekleniyor...

set /a tries=0
:wait_backend
timeout /t 2 /nobreak >nul
set /a tries+=1
curl -s -o nul -w "%%{http_code}" http://localhost:8080/pick-a-bite/restoranlar >temp_code.txt 2>nul
set /p HTTP_CODE=<temp_code.txt
del temp_code.txt >nul 2>&1
if "%HTTP_CODE%"=="200" goto backend_ready
if %tries% GEQ 60 (
    echo       HATA: Backend hazir olmadi 120 saniye icinde
    echo       Log: %BE_LOG%
    pause
    exit /b 1
)
echo|set /p="."
goto wait_backend
:backend_ready
echo.
echo       Backend HAZIR (port 8080)
echo.

REM --- 3) Cloudflare Tunnel baslat ---
echo [3/5] Cloudflare Tunnel baslatiliyor...
set CF_EXE=%LOCALAPPDATA%\Microsoft\WinGet\Packages\Cloudflare.cloudflared_Microsoft.Winget.Source_8wekyb3d8bbwe\cloudflared.exe
if not exist "%CF_EXE%" (
    where cloudflared >nul 2>&1
    if errorlevel 1 (
        echo       HATA: cloudflared bulunamadi. winget install Cloudflare.cloudflared
        pause
        exit /b 1
    )
    set CF_EXE=cloudflared
)

if exist "%CF_LOG%" del "%CF_LOG%"
start "Pick A Bite - Cloudflare Tunnel" /MIN cmd /c ""%CF_EXE%" tunnel --url http://localhost:8080 --no-autoupdate > %CF_LOG% 2>&1"
echo       Cloudflared baslatildi, URL bekleniyor...

set TUNNEL_URL=
set /a tries=0
:wait_cf
timeout /t 2 /nobreak >nul
set /a tries+=1
for /f "tokens=*" %%a in ('findstr /R /C:"https://[a-z0-9-]*\.trycloudflare\.com" "%CF_LOG%" 2^>nul') do (
    for /f "tokens=*" %%b in ('echo %%a ^| findstr /R /O "https://[a-z0-9-]*\.trycloudflare\.com"') do (
        rem ok
    )
)
REM PowerShell ile regex match (en güvenilir)
for /f "delims=" %%a in ('powershell -NoProfile -Command "(Select-String -Path '%CF_LOG%' -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' -ErrorAction SilentlyContinue | Select-Object -First 1).Matches[0].Value"') do set TUNNEL_URL=%%a
if not "%TUNNEL_URL%"=="" goto cf_ready
if %tries% GEQ 30 (
    echo       HATA: Cloudflare URL alinamadi
    pause
    exit /b 1
)
echo|set /p="."
goto wait_cf
:cf_ready
echo.
echo       Tunnel URL: %TUNNEL_URL%
echo.

REM --- 4) .env'i guncelle ---
echo [4/5] .env guncelleniyor...
powershell -NoProfile -Command "(Get-Content '%ENV_FILE%') -replace 'EXPO_PUBLIC_BACKEND_URL=.*', 'EXPO_PUBLIC_BACKEND_URL=%TUNNEL_URL%/pick-a-bite' | Set-Content '%ENV_FILE%' -Encoding UTF8"
echo       OK
echo.

REM --- 5) Expo baslat (ayri pencerede) ---
echo [5/5] Expo (frontend) baslatiliyor...
start "Pick A Bite - Expo Tunnel" cmd /k "cd /d %FRONTEND_DIR% && set CI=1 && npx expo start --tunnel --clear"
echo       Expo ayri pencerede acildi, QR kodu orada gorunecek
echo.

echo ==========================================================
echo   DEMO HAZIR
echo ==========================================================
echo.
echo   Backend  : http://localhost:8080/pick-a-bite
echo   Tunnel   : %TUNNEL_URL%
echo   Expo Go  : Yeni acilan pencerede QR'i tarayin
echo.
echo   Durdurmak icin: bu pencereyi kapatin veya:
echo     taskkill /F /IM cloudflared.exe /IM java.exe /IM node.exe
echo.
pause
