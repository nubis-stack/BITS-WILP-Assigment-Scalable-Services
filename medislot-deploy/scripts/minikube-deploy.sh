#!/usr/bin/env bash
# Builds all images inside minikube and applies all manifests.
# Run from medislot-deploy folder:  ./scripts/minikube-deploy.sh
set -e

ROOT=$(cd "$(dirname "$0")/../.." && pwd)

IMAGES="auth-service doctor-service appointment-service medislot-ui"
image_name() { [ "$1" = "medislot-ui" ] && echo "medislot/medislot-ui:1.0" || echo "medislot/$1:1.0"; }

# docker-env only works when minikube runs the docker runtime. With containerd
# (or on Windows where it needs an ssh agent) build locally and load the images.
if ENV_OUT=$(minikube docker-env --shell bash 2>/dev/null); then
  echo ">> building images inside minikube's docker"
  eval "$ENV_OUT"
  for s in $IMAGES; do docker build -t "$(image_name $s)" "$ROOT/$s"; done
else
  echo ">> docker-env not available, building locally and loading into minikube"
  for s in $IMAGES; do
    docker build -t "$(image_name $s)" "$ROOT/$s"
    echo "   loading $(image_name $s) (takes a few seconds)"
    minikube image load "$(image_name $s)"
  done
fi

echo ">> namespace, shared jwt secret and databases"
kubectl apply -f "$ROOT/auth-service/k8s/namespace.yaml"
kubectl apply -f "$ROOT/auth-service/k8s/jwt-secret.yaml"
kubectl apply -f "$ROOT/doctor-service/k8s/doctor-db.yaml"
kubectl apply -f "$ROOT/appointment-service/k8s/appointment-db.yaml"
kubectl -n medislot rollout status deploy/doctor-db --timeout=180s
kubectl -n medislot rollout status deploy/appointment-db --timeout=180s

echo ">> services"
kubectl apply -f "$ROOT/auth-service/k8s/auth-service.yaml"
kubectl apply -f "$ROOT/doctor-service/k8s/doctor-service.yaml"
kubectl apply -f "$ROOT/appointment-service/k8s/appointment-service.yaml"
kubectl apply -f "$ROOT/medislot-ui/k8s/medislot-ui.yaml"

if minikube addons list | grep metrics-server | grep -q enabled; then
  kubectl apply -f "$ROOT/doctor-service/k8s/doctor-hpa.yaml"
  kubectl apply -f "$ROOT/appointment-service/k8s/appointment-hpa.yaml"
fi

for d in auth-service doctor-service appointment-service medislot-ui; do
  kubectl -n medislot rollout status deploy/$d --timeout=180s
done

kubectl -n medislot get pods,svc
echo
echo "UI -> http://$(minikube ip):30080"
echo "(windows/mac with docker driver: minikube service -n medislot medislot-ui --url)"
echo "load demo doctors:  ./scripts/seed-data.sh <ui-url>"
