# MediSlot - Clinic Appointment Booking System
Four microservices, each in its own folder with its own Dockerfile, Kubernetes manifests and tests.

| Folder | Service | Tech | Port |
|--------|---------|------|------|
| [auth-service](auth-service) | login, JWT | Node.js / Express | 4002 |
| [doctor-service](doctor-service) | doctors and slots | Node.js / Express / PostgreSQL | 4001 |
| [appointment-service](appointment-service) | booking, cancel, summary | Python / Flask / PostgreSQL | 5002 |
| [medislot-ui](medislot-ui) | web UI and gateway | Node.js / Express | 8080 |
| [medislot-deploy](medislot-deploy) | compose, minikube scripts, Postman | - | - |

Setup: [medislot-deploy/LOCAL_SETUP.md](medislot-deploy/LOCAL_SETUP.md)

CI: `.github/workflows/` has one workflow per service. Each runs the tests when
its folder changes and pushes the image to Docker Hub from `main`.
