#!/usr/bin/env bash
set -euo pipefail
NS="${NS:-deploy-demo}"

echo "Удаляю приложения и маршруты в namespace $NS ..."
kubectl delete httproute --all -n "$NS" --ignore-not-found
kubectl delete deployment backend backend-v1 backend-v2 -n "$NS" --ignore-not-found
kubectl delete service backend backend-v1 backend-v2 -n "$NS" --ignore-not-found
echo "Сброс завершен. Gateway 'eg' и база данных на месте."
