Write-Host "Starting port forwarding for all services..." -ForegroundColor Cyan

$backendJob = Start-Job -ScriptBlock { kubectl port-forward svc/backend 8080:8080 }
$frontendJob = Start-Job -ScriptBlock { kubectl port-forward svc/frontend 3000:3000 }
$vmSingleJob = Start-Job -ScriptBlock { kubectl port-forward svc/vm-single-victoria-metrics-single-server -n monitoring 8428:8428 }
$vmAgentJob  = Start-Job -ScriptBlock { kubectl port-forward svc/vm-single-victoria-metrics-agent -n monitoring 8429:8429 }
$vlogsJob    = Start-Job -ScriptBlock { kubectl port-forward svc/victoria-logs 9428:9428 }
$grafanaJob  = Start-Job -ScriptBlock { kubectl port-forward svc/grafana 3001:3000 }
$pgMetricsJob = Start-Job -ScriptBlock { kubectl port-forward svc/postgres 9187:9187 }

Start-Sleep -Seconds 3

Write-Host "Done! Services are available at:" -ForegroundColor Green
Write-Host "Frontend (UI):                  http://localhost:3000" -ForegroundColor Yellow
Write-Host "Backend (REST API & Actuator):  http://localhost:8080/actuator/prometheus" -ForegroundColor Yellow
Write-Host "VictoriaMetrics Server:         http://localhost:8428" -ForegroundColor Yellow
Write-Host "VictoriaMetrics Agent (vmagent):http://localhost:8429/metrics" -ForegroundColor Yellow
Write-Host "PostgreSQL Exporter:            http://localhost:9187/metrics" -ForegroundColor Yellow
Write-Host "VictoriaLogs Web UI (vmui):     http://localhost:9428/select/vmui/" -ForegroundColor Yellow
Write-Host "Grafana:                        http://localhost:3001 (login: admin, password: admin)" -ForegroundColor Yellow
Write-Host ""
Write-Host "To stop forwarding, press Ctrl+C or close this window." -ForegroundColor Gray

try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    Stop-Job $backendJob, $frontendJob, $vmSingleJob, $vmAgentJob, $vlogsJob, $grafanaJob, $pgMetricsJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob, $frontendJob, $vmSingleJob, $vmAgentJob, $vlogsJob, $grafanaJob, $pgMetricsJob -ErrorAction SilentlyContinue
    Write-Host "Port forwarding stopped." -ForegroundColor Red
}
