# MediSlot - setup

Keep the five folders side by side:

```
medislot/
  auth-service/  doctor-service/  appointment-service/  medislot-ui/  medislot-deploy/
```

Needs Docker Desktop (WSL2 on Windows). For minikube also install minikube
and kubectl. On Windows run the `.sh` scripts from Git Bash, or use the
`.ps1` versions in PowerShell.

Logins: `rahul / rahul123` (patient), `admin / admin123` (admin), or any new
name with `demo123` (patient).

## Option 1 - Docker Compose

1. Start Docker Desktop.
2. Build and start:
   ```bash
   cd medislot-deploy
   docker compose up --build -d
   ```
3. Add demo data:
   ```bash
   ./scripts/seed-data.sh
   ```
4. Open http://localhost:8080
5. Stop:
   ```bash
   docker compose down
   ```

## Option 2 - minikube

Run these from the `medislot` folder.

1. Start the cluster:
   ```bash
   minikube start --driver=docker --container-runtime=docker --cpus=2 --memory=3072
   minikube addons enable metrics-server
   ```
2. Build the images and deploy:
   ```bash
   ./medislot-deploy/scripts/minikube-deploy.sh
   ```
3. Wait until all 10 pods are Running:
   ```bash
   kubectl -n medislot get pods
   ```
4. Open the UI (keep this terminal open):
   ```bash
   kubectl -n medislot port-forward svc/medislot-ui 8080:8080
   ```
5. In another terminal, add demo data once:
   ```bash
   ./medislot-deploy/scripts/seed-data.sh http://localhost:8080
   ```
6. Open http://localhost:8080
7. Dashboard:
   ```bash
   minikube dashboard
   ```
8. Stop / start later:
   ```bash
   minikube stop
   minikube start      # then repeat step 4
   ```
9. Remove everything:
   ```bash
   kubectl delete namespace medislot
   ```

## Postman

Import `postman/MediSlot.postman_collection.json`, set `authUrl`,
`doctorUrl` and `appointmentUrl` to `http://localhost:8080`, and run the
requests in order.

## If something fails

| Problem | Fix |
|---------|-----|
| "Docker Desktop has only ... MB memory" | use `--memory=3072` or give Docker more memory |
| Pod shows `ErrImageNeverPull` | run `minikube-deploy.sh` again |
| No open slots in the UI | run `seed-data.sh` again, old slots may have passed |
| Port 8080 in use | stop `docker compose` or the other port-forward |
