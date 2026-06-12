@echo off
setlocal enabledelayedexpansion

REM ======================================================================
REM QR KESIF DEMOSU - tek tik
REM Ekran kaydinda "QR okut -> restoran menusuyle eklendi" sahnesi icin:
REM   1) Onceki demo kaydini OTOMATIK siler (sahne hep sifirdan baslar)
REM   2) Sahte restoran sitesini baslatir (Kofteci Niyazi Usta, port 8090)
REM   3) PC'nin LAN IP'sine gore demo QR'ini uretir ve acar
REM Istedigin kadar tekrar cek: bu dosyayi yeniden calistirman yeterli.
REM NOT: demo-baslat.bat (backend) ayrica calisiyor olmali.
REM ======================================================================

cd /d "%~dp0"
set "ROOT=%~dp0"

echo.
echo [1/4] LAN IP tespit ediliyor...
set "LAN_IP="
for /f "usebackq delims=" %%a in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%_lan-ip.ps1"`) do set "LAN_IP=%%a"
if not defined LAN_IP set "LAN_IP=localhost"
echo       IP: !LAN_IP!

echo [2/4] Onceki demo kaydi kontrol ediliyor (varsa silinir)...
node "%ROOT%pick-a-bite-data\demo-temizle.js"

echo [3/4] Demo restoran sitesi baslatiliyor (port 8090)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /R /C:":8090 .* LISTENING"') do taskkill /F /PID %%a >nul 2>&1
start "Demo Restoran Sitesi" /MIN cmd /c "node "%ROOT%pick-a-bite-data\demo-restoran-sitesi.js""

echo [4/4] Demo QR uretiliyor...
py "%ROOT%pick-a-bite-data\uret-kesif-qr.py" !LAN_IP!
if exist "%ROOT%test-qr\qr-4-kesif-demo.png" start "" "%ROOT%test-qr\qr-4-kesif-demo.png"

echo.
echo ==========================================================
echo   HAZIR! Telefonla acilan QR'i okut:
echo     -^> "Restoran Eklendi" bildirimi + menu acilir
echo     -^> Haritada yeni pin: Kofteci Niyazi Usta
echo.
echo   Sahneyi TEKRAR cekmek icin bu dosyayi YENIDEN calistir:
echo   eski demo kaydi otomatik silinir, QR yeniden uretilir.
echo ==========================================================
echo.
pause
