# scripts/reset.ps1
param(
    [string]$Namespace = "deploy-demo"
)

Write-Host "Удаляю приложения и маршруты в namespace $Namespace ..." -ForegroundColor Yellow
kubectl delete httproute --all -n $Namespace --ignore-not-found
kubectl delete deployment backend backend-v1 backend-v2 -n $Namespace --ignore-not-found
kubectl delete service backend backend-v1 backend-v2 -n $Namespace --ignore-not-found
Write-Host "Сброс завершен. Gateway 'eg' и база данных на месте." -ForegroundColor Green
