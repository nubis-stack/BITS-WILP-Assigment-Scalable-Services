# Windows PowerShell version of minikube-deploy.sh
# Run from medislot-deploy folder:  .\scripts\minikube-deploy.ps1

$ErrorActionPreference = "Continue"
$root = Resolve-Path "$PSScriptRoot\..\.."

$services = "auth-service","doctor-service","appointment-service","medislot-ui"

# docker-env works only with the docker runtime; otherwise build locally and load
$envOut = & minikube -p minikube docker-env --shell powershell 2>$null
if ($LASTEXITCODE -eq 0 -and $envOut) {
  Write-Host ">> building images inside minikube's docker"
  $envOut | Invoke-Expression
  foreach ($s in $services) { docker build -t "medislot/${s}:1.0" "$root\$s" }
} else {
  Write-Host ">> docker-env not available, building locally and loading into minikube"
  foreach ($s in $services) {
    docker build -t "medislot/${s}:1.0" "$root\$s"
    minikube image load "medislot/${s}:1.0"
  }
}

kubectl apply -f "$root\auth-service\k8s\namespace.yaml"
kubectl apply -f "$root\auth-service\k8s\jwt-secret.yaml"
kubectl apply -f "$root\doctor-service\k8s\doctor-db.yaml"
kubectl apply -f "$root\appointment-service\k8s\appointment-db.yaml"
kubectl -n medislot rollout status deploy/doctor-db --timeout=180s
kubectl -n medislot rollout status deploy/appointment-db --timeout=180s

kubectl apply -f "$root\auth-service\k8s\auth-service.yaml"
kubectl apply -f "$root\doctor-service\k8s\doctor-service.yaml"
kubectl apply -f "$root\appointment-service\k8s\appointment-service.yaml"
kubectl apply -f "$root\medislot-ui\k8s\medislot-ui.yaml"

foreach ($d in "auth-service","doctor-service","appointment-service","medislot-ui") {
  kubectl -n medislot rollout status deploy/$d --timeout=180s
}

kubectl -n medislot get pods,svc
Write-Host "Open the UI with:  minikube service -n medislot medislot-ui"
Write-Host "Load demo data with:  .\scripts\seed-data.ps1 <ui-url>"
