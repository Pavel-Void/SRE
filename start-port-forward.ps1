[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "Запуск проброса портов для Frontend (3000) и Backend (8080)..." -ForegroundColor Cyan

$backendJob = Start-Job -ScriptBlock { kubectl port-forward svc/backend 8080:8080 }
$frontendJob = Start-Job -ScriptBlock { kubectl port-forward svc/frontend 3000:3000 }

Start-Sleep -Seconds 2

Write-Host "Готово! Сервисы доступны:" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Yellow
Write-Host "Backend:  http://localhost:8080" -ForegroundColor Yellow
Write-Host ""
Write-Host "Для остановки проброса нажмите Ctrl+C или закройте это окно." -ForegroundColor Gray

try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    Stop-Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
    Write-Host "Проброс портов остановлен." -ForegroundColor Red
}