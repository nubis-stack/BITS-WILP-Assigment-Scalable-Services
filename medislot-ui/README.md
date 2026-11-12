# medislot-ui

Web UI for MediSlot. The Express server serves the pages from `public/` and
forwards `/api/*` calls to the backend services, so the browser only talks
to this one service.

- Node.js 20, Express, plain HTML / CSS / JavaScript
- Port 8080

| Path | Forwarded to |
|------|--------------|
| /api/auth | auth-service |
| /api/doctors, /api/slots (GET only) | doctor-service |
| /api/appointments | appointment-service |

## Screens

- Patient: find a doctor, view slots, book, my appointments, cancel
- Admin: add doctors, publish slots, all appointments, complete / cancel

## Run

The three backend services should be running.

```bash
npm install
npm start      # http://localhost:8080
npm test
```
