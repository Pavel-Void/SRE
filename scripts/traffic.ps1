# scripts/traffic.ps1
param(
    [int]$Count = 0,
    [double]$Interval = 0.2,
    [int]$Port = 8888,
    [hashtable]$Headers = @{}
)

$egNs = "envoy-gateway-system"
$svc = (kubectl get svc -n $egNs -l gateway.envoyproxy.io/owning-gateway-name=eg -o jsonpath='{.items[0].metadata.name}' 2>$null)
if (-not $svc) {
    Write-Error "Не найден сервис Envoy-прокси для Gateway 'eg' в namespace $egNs."
    exit 1
}

# Проверяем, запущен ли уже port-forward на порт $Port
$testConn = Test-NetConnection -ComputerName 127.0.0.1 -Port $Port -WarningAction SilentlyContinue
$pfProcess = $null
if (-not $testConn.TcpTestSucceeded) {
    Write-Host "Запускаю port-forward: 127.0.0.1:$Port -> $egNs/svc/$svc`:80" -ForegroundColor Cyan
    $pfProcess = Start-Process -FilePath "kubectl" -ArgumentList "port-forward -n $egNs svc/$svc $Port`:80" -PassThru -NoNewWindow
    Start-Sleep -Seconds 2
}

$url = "http://127.0.0.1:$Port/"
Write-Host "Генерация трафика на $url (интервал ${Interval}s)..." -ForegroundColor Green
Write-Host "-------------------------------------------------------------------"

$i = 0
try {
    while ($true) {
        $timestamp = (Get-Date).ToString("HH:mm:ss")
        try {
            $resp = Invoke-WebRequest -Uri $url -Headers $Headers -UseBasicParsing -TimeoutSec 2
            $body = $resp.Content.Trim()
        } catch {
            $body = "<нет ответа: $($_.Exception.Message)>"
        }

        Write-Host "$timestamp | $body"
        $i++
        if ($Count -gt 0 -and $i -ge $Count) { break }
        Start-Sleep -Seconds $Interval
    }
} finally {
    if ($pfProcess) {
        Write-Host "Останавливаю port-forward..." -ForegroundColor Yellow
        Stop-Process -Id $pfProcess.Id -Force -ErrorAction SilentlyContinue
    }
}
