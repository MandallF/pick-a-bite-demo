# Cloudflare tunnel log dosyasindan trycloudflare URL'ini cikarir
param([string]$LogPath)
if (-not (Test-Path $LogPath)) { return }
$m = Select-String -Path $LogPath -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' -ErrorAction SilentlyContinue | Select-Object -First 1
if ($m) { Write-Output $m.Matches[0].Value }
