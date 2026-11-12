# auth-service

Login service for MediSlot. Checks dummy users and returns a JWT that the
other services verify with the shared `JWT_SECRET`.

- Node.js 20, Express, jsonwebtoken
- Port 4002, no database

## Users

| Username | Password | Role |
|----------|----------|------|
| rahul / priya / amit | rahul123 / priya123 / amit123 | patient |
| admin | admin123 | admin |
| any new name | demo123 | patient |

## API

| Method | Path | |
|--------|------|-|
| POST | /api/auth/login | `{ "username", "password" }` -> token + user |
| GET | /api/auth/me | user from the Bearer token |
| POST | /api/auth/verify | is the token valid |
| GET | /health | health check |

## Run

```bash
npm install
npm start
npm test
```
