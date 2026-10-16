Write-Host "Start port forwarding for Frontend (3000), Backend (8080), VictoriaLogs (9428) and Grafana (3001)..." -ForegroundColor Cyan

$backendJob = Start-Job -ScriptBlock { kubectl port-forward svc/backend 8080:8080 }
$frontendJob = Start-Job -ScriptBlock { kubectl port-forward svc/frontend 3000:3000 }
$vlogsJob = Start-Job -ScriptBlock { kubectl port-forward svc/victoria-logs 9428:9428 }
$grafanaJob = Start-Job -ScriptBlock { kubectl port-forward svc/grafana 3001:3000 }

Start-Sleep -Seconds 3

Write-Host "Done! Services available:" -ForegroundColor Green
Write-Host "Frontend:       http://localhost:3000" -ForegroundColor Yellow
Write-Host "Backend:        http://localhost:8080" -ForegroundColor Yellow
Write-Host "VictoriaLogs:   http://localhost:9428/select/vmui/" -ForegroundColor Yellow
Write-Host "Grafana:        http://localhost:3001 (login: admin, password: admin)" -ForegroundColor Yellow
Write-Host ""
Write-Host "To stop forwarding, press Ctrl+C or close this window." -ForegroundColor Gray

try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    Stop-Job $backendJob, $frontendJob, $vlogsJob, $grafanaJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob, $frontendJob, $vlogsJob, $grafanaJob -ErrorAction SilentlyContinue
    Write-Host "Port forwarding has stopped." -ForegroundColor Red
}