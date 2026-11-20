# scripts/run-all-strategies.ps1
$ErrorActionPreference = "Continue"

$logDir = "logs"
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }

$egNs = "envoy-gateway-system"
$svc = (kubectl get svc -n $egNs -l gateway.envoyproxy.io/owning-gateway-name=eg -o jsonpath='{.items[0].metadata.name}' 2>$null)
if (-not $svc) {
    Write-Error "Сервис Envoy-прокси не найден!"
    exit 1
}

# Запуск port-forward на порт 8888
$port = 8888
$testConn = Test-NetConnection -ComputerName 127.0.0.1 -Port $port -WarningAction SilentlyContinue
$pfProcess = $null
if (-not $testConn.TcpTestSucceeded) {
    Write-Host "Запуск port-forward на 127.0.0.1:$port..." -ForegroundColor Cyan
    $pfProcess = Start-Process -FilePath "kubectl" -ArgumentList "port-forward -n $egNs svc/$svc $port`:80" -PassThru -NoNewWindow
    Start-Sleep -Seconds 3
}

$url = "http://127.0.0.1:$port/"

function Request-Backend([hashtable]$headers = @{}) {
    try {
        $r = Invoke-WebRequest -Uri $url -Headers $headers -UseBasicParsing -TimeoutSec 2
        return $r.Content.Trim()
    } catch {
        return "<нет ответа: $($_.Exception.Message)>"
    }
}

try {
    # =========================================================================
    # СТРАТЕГИЯ 1: ROLLING UPDATE
    # =========================================================================
    Write-Host "`n========================================================" -ForegroundColor Magenta
    Write-Host ">>> ЗАПУСК СТРАТЕГИИ 1: ROLLING UPDATE" -ForegroundColor Magenta
    Write-Host "========================================================" -ForegroundColor Magenta
    $rollingLog = "$logDir/rolling.log"
    "=== СТРАТЕГИЯ: ROLLING UPDATE ===" | Out-File $rollingLog -Encoding utf8
    Get-Date | Out-File $rollingLog -Append -Encoding utf8

    Write-Host "1. Применяем начальную версию v1 (Deployment 4 реплики)..." -ForegroundColor Cyan
    kubectl apply -f strategies/rolling/01-app-v1.yaml | Out-File $rollingLog -Append -Encoding utf8
    kubectl rollout status deployment/backend -n deploy-demo --timeout=2m | Out-File $rollingLog -Append -Encoding utf8

    Start-Sleep -Seconds 3
    Write-Host "2. Снимаем начальный трафик (v1)..." -ForegroundColor Cyan
    for ($i = 1; $i -le 10; $i++) {
        $line = "$((Get-Date).ToString('HH:mm:ss')) | $(Request-Backend)"
        Write-Host $line
        $line | Out-File $rollingLog -Append -Encoding utf8
        Start-Sleep -Milliseconds 300
    }

    Write-Host "3. Накатываем версию v2 (Rolling Update maxSurge: 1, maxUnavailable: 0)..." -ForegroundColor Cyan
    "--- НАКАТЫВАЕМ V2 ---" | Out-File $rollingLog -Append -Encoding utf8
    kubectl apply -f strategies/rolling/02-app-v2.yaml | Out-File $rollingLog -Append -Encoding utf8

    Write-Host "4. Фиксируем постепенную замену реплик в реальном времени..." -ForegroundColor Cyan
    for ($i = 1; $i -le 45; $i++) {
        $line = "$((Get-Date).ToString('HH:mm:ss')) | $(Request-Backend)"
        Write-Host $line
        $line | Out-File $rollingLog -Append -Encoding utf8
        Start-Sleep -Milliseconds 300
    }

    kubectl rollout status deployment/backend -n deploy-demo --timeout=2m | Out-File $rollingLog -Append -Encoding utf8
    Write-Host "Rolling Update завершен! Лог сохранен в $rollingLog" -ForegroundColor Green

    # Сброс перед следующей стратегией
    powershell -File scripts/reset.ps1

    # =========================================================================
    # СТРАТЕГИЯ 2: BLUE / GREEN
    # =========================================================================
    Write-Host "`n========================================================" -ForegroundColor Magenta
    Write-Host ">>> ЗАПУСК СТРАТЕГИИ 2: BLUE / GREEN" -ForegroundColor Magenta
    Write-Host "========================================================" -ForegroundColor Magenta
    $bgLog = "$logDir/blue-green.log"
    "=== СТРАТЕГИЯ: BLUE / GREEN ===" | Out-File $bgLog -Encoding utf8
    Get-Date | Out-File $bgLog -Append -Encoding utf8

    Write-Host "1. Разворачиваем обе версии: backend-v1 (green) и backend-v2 (blue)..." -ForegroundColor Cyan
    kubectl apply -f strategies/app/backend-v1.yaml | Out-File $bgLog -Append -Encoding utf8
    kubectl apply -f strategies/app/backend-v2.yaml | Out-File $bgLog -Append -Encoding utf8
    kubectl rollout status deployment/backend-v1 -n deploy-demo --timeout=2m | Out-File $bgLog -Append -Encoding utf8
    kubectl rollout status deployment/backend-v2 -n deploy-demo --timeout=2m | Out-File $bgLog -Append -Encoding utf8

    Write-Host "2. Направляем 100% трафика на Green (v1)..." -ForegroundColor Cyan
    kubectl apply -f strategies/blue-green/httproute-green.yaml | Out-File $bgLog -Append -Encoding utf8
    Start-Sleep -Seconds 2
    for ($i = 1; $i -le 10; $i++) {
        $line = "$((Get-Date).ToString('HH:mm:ss')) | [GREEN v1] $(Request-Backend)"
        Write-Host $line
        $line | Out-File $bgLog -Append -Encoding utf8
        Start-Sleep -Milliseconds 200
    }

    Write-Host "3. МГНОВЕННОЕ переключение 100% трафика на Blue (v2)..." -ForegroundColor Cyan
    "--- ПЕРЕКЛЮЧЕНИЕ НА BLUE (v2) ---" | Out-File $bgLog -Append -Encoding utf8
    kubectl apply -f strategies/blue-green/httproute-blue.yaml | Out-File $bgLog -Append -Encoding utf8
    Start-Sleep -Seconds 1
    for ($i = 1; $i -le 15; $i++) {
        $line = "$((Get-Date).ToString('HH:mm:ss')) | [BLUE v2] $(Request-Backend)"
        Write-Host $line
        $line | Out-File $bgLog -Append -Encoding utf8
        Start-Sleep -Milliseconds 200
    }

    Write-Host "4. МГНОВЕННЫЙ ОТКАТ (Rollback) назад на Green (v1)..." -ForegroundColor Cyan
    "--- МГНОВЕННЫЙ ОТКАТ НА GREEN (v1) ---" | Out-File $bgLog -Append -Encoding utf8
    kubectl apply -f strategies/blue-green/httproute-green.yaml | Out-File $bgLog -Append -Encoding utf8
    Start-Sleep -Seconds 1
    for ($i = 1; $i -le 10; $i++) {
        $line = "$((Get-Date).ToString('HH:mm:ss')) | [ROLLBACK v1] $(Request-Backend)"
        Write-Host $line
        $line | Out-File $bgLog -Append -Encoding utf8
        Start-Sleep -Milliseconds 200
    }

    Write-Host "Blue/Green демонстрация завершена! Лог сохранен в $bgLog" -ForegroundColor Green
    powershell -File scripts/reset.ps1

    # =========================================================================
    # СТРАТЕГИЯ 3: CANARY
    # =========================================================================
    Write-Host "`n========================================================" -ForegroundColor Magenta
    Write-Host ">>> ЗАПУСК СТРАТЕГИИ 3: CANARY (90/10 -> 50/50 -> 0/100)" -ForegroundColor Magenta
    Write-Host "========================================================" -ForegroundColor Magenta
    $canaryLog = "$logDir/canary.log"
    "=== СТРАТЕГИЯ: CANARY ===" | Out-File $canaryLog -Encoding utf8
    Get-Date | Out-File $canaryLog -Append -Encoding utf8

    Write-Host "1. Разворачиваем обе версии backend-v1 и backend-v2..." -ForegroundColor Cyan
    kubectl apply -f strategies/app/backend-v1.yaml | Out-File $canaryLog -Append -Encoding utf8
    kubectl apply -f strategies/app/backend-v2.yaml | Out-File $canaryLog -Append -Encoding utf8
    kubectl rollout status deployment/backend-v1 -n deploy-demo --timeout=2m | Out-File $canaryLog -Append -Encoding utf8
    kubectl rollout status deployment/backend-v2 -n deploy-demo --timeout=2m | Out-File $canaryLog -Append -Encoding utf8

    Write-Host "2. Шаг 1: 90% v1 / 10% v2..." -ForegroundColor Cyan
    "--- CANARY ШАГ 1: 90/10 ---" | Out-File $canaryLog -Append -Encoding utf8
    kubectl apply -f strategies/canary/httproute-90-10.yaml | Out-File $canaryLog -Append -Encoding utf8
    Start-Sleep -Seconds 2
    for ($i = 1; $i -le 25; $i++) {
        $line = "$((Get-Date).ToString('HH:mm:ss')) | [90/10] $(Request-Backend)"
        Write-Host $line
        $line | Out-File $canaryLog -Append -Encoding utf8
        Start-Sleep -Milliseconds 200
    }

    Write-Host "3. Шаг 2: 50% v1 / 50% v2..." -ForegroundColor Cyan
    "--- CANARY ШАГ 2: 50/50 ---" | Out-File $canaryLog -Append -Encoding utf8
    kubectl apply -f strategies/canary/httproute-50-50.yaml | Out-File $canaryLog -Append -Encoding utf8
    Start-Sleep -Seconds 2
    for ($i = 1; $i -le 25; $i++) {
        $line = "$((Get-Date).ToString('HH:mm:ss')) | [50/50] $(Request-Backend)"
        Write-Host $line
        $line | Out-File $canaryLog -Append -Encoding utf8
        Start-Sleep -Milliseconds 200
    }

    Write-Host "4. Шаг 3: 0% v1 / 100% v2 (полный перевод)..." -ForegroundColor Cyan
    "--- CANARY ШАГ 3: 0/100 ---" | Out-File $canaryLog -Append -Encoding utf8
    kubectl apply -f strategies/canary/httproute-0-100.yaml | Out-File $canaryLog -Append -Encoding utf8
    Start-Sleep -Seconds 2
    for ($i = 1; $i -le 20; $i++) {
        $line = "$((Get-Date).ToString('HH:mm:ss')) | [0/100] $(Request-Backend)"
        Write-Host $line
        $line | Out-File $canaryLog -Append -Encoding utf8
        Start-Sleep -Milliseconds 200
    }

    Write-Host "Canary демонстрация завершена! Лог сохранен в $canaryLog" -ForegroundColor Green
    powershell -File scripts/reset.ps1

    # =========================================================================
    # СТРАТЕГИЯ 4: A/B TESTING
    # =========================================================================
    Write-Host "`n========================================================" -ForegroundColor Magenta
    Write-Host ">>> ЗАПУСК СТРАТЕГИИ 4: A/B TESTING (по заголовку x-user-group: beta)" -ForegroundColor Magenta
    Write-Host "========================================================" -ForegroundColor Magenta
    $abLog = "$logDir/ab.log"
    "=== СТРАТЕГИЯ: A/B TESTING ===" | Out-File $abLog -Encoding utf8
    Get-Date | Out-File $abLog -Append -Encoding utf8

    Write-Host "1. Разворачиваем backend-v1 и backend-v2..." -ForegroundColor Cyan
    kubectl apply -f strategies/app/backend-v1.yaml | Out-File $abLog -Append -Encoding utf8
    kubectl apply -f strategies/app/backend-v2.yaml | Out-File $abLog -Append -Encoding utf8
    kubectl rollout status deployment/backend-v1 -n deploy-demo --timeout=2m | Out-File $abLog -Append -Encoding utf8
    kubectl rollout status deployment/backend-v2 -n deploy-demo --timeout=2m | Out-File $abLog -Append -Encoding utf8

    Write-Host "2. Применяем правила A/B маршрутизации..." -ForegroundColor Cyan
    kubectl apply -f strategies/ab/httproute-ab.yaml | Out-File $abLog -Append -Encoding utf8
    Start-Sleep -Seconds 2

    Write-Host "3. Запросы БЕЗ заголовка (обычные пользователи -> v1)..." -ForegroundColor Cyan
    "--- ОБЫЧНЫЙ ТРАФИК (БЕЗ ЗАГОЛОВКА) -> v1 ---" | Out-File $abLog -Append -Encoding utf8
    for ($i = 1; $i -le 10; $i++) {
        $line = "$((Get-Date).ToString('HH:mm:ss')) | [Обычный] $(Request-Backend)"
        Write-Host $line
        $line | Out-File $abLog -Append -Encoding utf8
        Start-Sleep -Milliseconds 200
    }

    Write-Host "4. Запросы С ЗАГОЛОВКОМ x-user-group: beta (тестовая группа -> v2)..." -ForegroundColor Cyan
    "--- БЕТА-ТРАФИК (С ЗАГОЛОВКОМ x-user-group: beta) -> v2 ---" | Out-File $abLog -Append -Encoding utf8
    for ($i = 1; $i -le 10; $i++) {
        $line = "$((Get-Date).ToString('HH:mm:ss')) | [Beta Header] $(Request-Backend @{ 'x-user-group' = 'beta' })"
        Write-Host $line
        $line | Out-File $abLog -Append -Encoding utf8
        Start-Sleep -Milliseconds 200
    }

    Write-Host "A/B тестирование завершено! Лог сохранен в $abLog" -ForegroundColor Green
    powershell -File scripts/reset.ps1

    # =========================================================================
    # СТРАТЕГИЯ 5: SHADOW / TRAFFIC MIRRORING
    # =========================================================================
    Write-Host "`n========================================================" -ForegroundColor Magenta
    Write-Host ">>> ЗАПУСК СТРАТЕГИИ 5: SHADOW (Зеркалирование трафика)" -ForegroundColor Magenta
    Write-Host "========================================================" -ForegroundColor Magenta
    $shadowLog = "$logDir/shadow.log"
    "=== СТРАТЕГИЯ: SHADOW ===" | Out-File $shadowLog -Encoding utf8
    Get-Date | Out-File $shadowLog -Append -Encoding utf8

    Write-Host "1. Разворачиваем backend-v1 и backend-v2..." -ForegroundColor Cyan
    kubectl apply -f strategies/app/backend-v1.yaml | Out-File $shadowLog -Append -Encoding utf8
    kubectl apply -f strategies/app/backend-v2.yaml | Out-File $shadowLog -Append -Encoding utf8
    kubectl rollout status deployment/backend-v1 -n deploy-demo --timeout=2m | Out-File $shadowLog -Append -Encoding utf8
    kubectl rollout status deployment/backend-v2 -n deploy-demo --timeout=2m | Out-File $shadowLog -Append -Encoding utf8

    Write-Host "2. Применяем правило RequestMirror (v1 отвечает, копия зеркалится на v2)..." -ForegroundColor Cyan
    kubectl apply -f strategies/shadow/httproute-shadow.yaml | Out-File $shadowLog -Append -Encoding utf8
    Start-Sleep -Seconds 2

    Write-Host "3. Отправляем клиентский трафик (все ответы ДОЛЖНЫ возвращаться с v1)..." -ForegroundColor Cyan
    "--- КЛИЕНТСКИЙ ТРАФИК (ОТВЕТЫ ТОЛЬКО С v1) ---" | Out-File $shadowLog -Append -Encoding utf8
    for ($i = 1; $i -le 15; $i++) {
        $line = "$((Get-Date).ToString('HH:mm:ss')) | [Client] $(Request-Backend)"
        Write-Host $line
        $line | Out-File $shadowLog -Append -Encoding utf8
        Start-Sleep -Milliseconds 200
    }

    Write-Host "4. Проверяем логи подов v2 (туда скопированы все запросы!)..." -ForegroundColor Cyan
    "--- ЛОГИ ПОДОВ v2 (ПОДТВЕРЖДЕНИЕ ЗЕРКАЛИРОВАНИЯ ТРАФИКА) ---" | Out-File $shadowLog -Append -Encoding utf8
    Start-Sleep -Seconds 2
    $v2Logs = kubectl logs -n deploy-demo -l version=v2.0.0 --tail=25
    Write-Host $v2Logs
    $v2Logs | Out-File $shadowLog -Append -Encoding utf8

    Write-Host "Shadow демонстрация завершена! Лог сохранен в $shadowLog" -ForegroundColor Green

} finally {
    if ($pfProcess) {
        Write-Host "`nОстанавливаю port-forward..." -ForegroundColor Yellow
        Stop-Process -Id $pfProcess.Id -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "`n========================================================" -ForegroundColor Green
Write-Host "ВСЕ 5 СТРАТЕГИЙ УСПЕШНО ПРОТЕСТИРОВАНЫ И ЗАЛОГИРОВАНЫ!" -ForegroundColor Green
Write-Host "Файлы логов сохранены в каталоге '$logDir':" -ForegroundColor Green
Get-ChildItem $logDir | ForEach-Object { Write-Host " - $($_.Name) ($($_.Length) байт)" -ForegroundColor Cyan }
Write-Host "========================================================" -ForegroundColor Green
