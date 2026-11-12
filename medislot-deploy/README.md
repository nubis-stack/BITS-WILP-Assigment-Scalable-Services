# medislot-deploy

Files to run the four MediSlot services together.

| Path | |
|------|-|
| docker-compose.yml | all services and both databases on one machine |
| scripts/minikube-deploy.sh / .ps1 | build images and deploy to minikube |
| scripts/seed-data.sh / .ps1 | add demo doctors and slots |
| scripts/cleanup.sh | remove the deployment from minikube |
| postman/ | Postman collection for all APIs |
| docs/ | diagrams and UI screenshots |

Setup steps are in [LOCAL_SETUP.md](LOCAL_SETUP.md).
