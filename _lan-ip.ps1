# LAN IPv4 adresini bulur (192.168.x / 10.x / 172.x), tek satir stdout'a yazar
$ip = Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object {
        ($_.IPAddress -like '192.168.*' -or $_.IPAddress -like '10.*' -or $_.IPAddress -like '172.16.*' -or $_.IPAddress -like '172.2*' -or $_.IPAddress -like '172.3*') -and
        $_.InterfaceAlias -notlike '*Loopback*' -and
        $_.InterfaceAlias -notlike '*vEthernet*' -and
        $_.InterfaceAlias -notlike '*WSL*'
    } |
    Sort-Object -Property @{ Expression = { $_.InterfaceAlias -like '*Wi-Fi*' }; Descending = $true } |
    Select-Object -First 1 -ExpandProperty IPAddress
if ($ip) { Write-Output $ip } else { Write-Output "localhost" }
