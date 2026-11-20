#!/usr/bin/env bash
set -euo pipefail

echo "==> 1. Применяем namespace, Gateway и базу данных PostgreSQL..."
kubectl apply -f strategies/00-namespace.yaml
kubectl apply -f strategies/01-gateway.yaml
kubectl apply -f strategies/02-postgres.yaml

echo "==> 2. Применяем ServiceMonitor..."
kubectl apply -f strategies/monitoring/servicemonitor.yaml

echo "==> 3. Провиженим дашборд Grafana..."
kubectl apply -f strategies/monitoring/grafana-dashboard-configmap.yaml

echo "==> 4. Ожидаем готовности Gateway и PostgreSQL..."
kubectl wait --timeout=3m -n deploy-demo gateway/eg --for=condition=Accepted
kubectl rollout status deployment/postgres -n deploy-demo --timeout=2m

echo "==> Готово! Окружение развёрнуто."
