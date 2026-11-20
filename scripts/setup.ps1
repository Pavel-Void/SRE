# scripts/setup.ps1
$ErrorActionPreference = "Stop"

Write-Host "==> 1. Применяем namespace, Gateway и базу данных PostgreSQL..." -ForegroundColor Cyan
kubectl apply -f strategies/00-namespace.yaml
kubectl apply -f strategies/01-gateway.yaml
kubectl apply -f strategies/02-postgres.yaml

Write-Host "==> 2. Применяем ServiceMonitor..." -ForegroundColor Cyan
kubectl apply -f strategies/monitoring/servicemonitor.yaml

Write-Host "==> 3. Провиженим дашборд Grafana..." -ForegroundColor Cyan
kubectl apply -f strategies/monitoring/grafana-dashboard-configmap.yaml

Write-Host "==> 4. Ожидаем готовности Gateway и PostgreSQL..." -ForegroundColor Cyan
kubectl wait --timeout=3m -n deploy-demo gateway/eg --for=condition=Accepted
kubectl rollout status deployment/postgres -n deploy-demo --timeout=2m

Write-Host "==> Готово! Окружение развёрнуто и готово к демонстрации стратегий." -ForegroundColor Green
