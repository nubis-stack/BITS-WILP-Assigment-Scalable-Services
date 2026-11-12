# appointment-service

Booking, cancelling and completing appointments for MediSlot. Calls
doctor-service to check and reserve the slot.

- Python 3.12, Flask, SQLAlchemy, PostgreSQL (`appointment_db`)
- Port 5002
- Every endpoint needs a login token; patients only see their own appointments

## API

| Method | Path | |
|--------|------|-|
| POST | /api/appointments | book `{ "doctorId", "slotId", "reason" }` |
| GET | /api/appointments?doctorId=&status=&date= | list (own for patient, all for admin) |
| GET | /api/appointments/:id | one appointment |
| PATCH | /api/appointments/:id/cancel | cancel, slot is released |
| PATCH | /api/appointments/:id/complete | mark completed (admin) |
| GET | /api/appointments/doctor/:id/summary | counts by status (admin) |
| GET | /health | health check, includes db |

Booking returns 201, or 409 if the slot is taken, 404 for an unknown
doctor/slot, 401 without a token and 503 if doctor-service is down.

## Run

Needs PostgreSQL with an `appointment_db` database and doctor-service on
port 4001. Settings are in `.env.example`.

```bash
pip install -r requirements.txt
python wsgi.py
python -m pytest -q
```
