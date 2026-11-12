# doctor-service

Doctors and their consultation slots for MediSlot.

- Node.js 20, Express, PostgreSQL (`doctor_db`)
- Port 4001
- Adding or changing doctors and slots needs an admin token

## API

| Method | Path | |
|--------|------|-|
| GET | /api/doctors?specialization= | list doctors |
| GET | /api/doctors/:id | one doctor |
| POST | /api/doctors | add doctor (admin) |
| PUT | /api/doctors/:id | update doctor (admin) |
| DELETE | /api/doctors/:id | delete doctor (admin) |
| POST | /api/doctors/:id/slots | add slot (admin) |
| GET | /api/doctors/:id/slots?date=&status= | slots of a doctor |
| GET | /api/slots/:id | one slot |
| PATCH | /api/slots/:id/reserve | used by appointment-service, 409 if taken |
| PATCH | /api/slots/:id/release | used by appointment-service on cancel |
| GET | /health | health check, includes db |

## Run

Needs PostgreSQL with a `doctor_db` database. Settings are in `.env.example`.

```bash
npm install
npm start
npm test
```
