# DrivEase — Booking Fix Update

This package is based on the uploaded `DrivEase-Ready-to-Run (2)` project.

## What was fixed

1. Booking date validation now accepts both `YYYY-MM-DD` and `YYYY-MM-DDTHH:mm` (HTML `datetime-local`) values.
2. Date values are validated as real calendar dates and normalized to `YYYY-MM-DD` before MySQL DATE storage.
3. Manila's current date is calculated from explicit date parts rather than relying on locale-specific output formatting.
4. Booking overlap checks and inserts use the same normalized date values.
5. The renter email saved to a booking is taken from the authenticated session, not trusted from the browser payload.
6. Vehicle image uploads now require an authenticated owner; the frontend sends the existing bearer token.
7. Added dependency-free booking-date tests and connected them to `npm test` in the server package.

## Important

- This package does not include `server/.env` or any credentials.
- Keep your existing `server/.env` private. Copy it into this package's `server` folder.
- Back up your existing MySQL database before applying any schema changes. This update does not require a destructive migration.
- Keep your old project folder as a backup.

## Run locally

Terminal 1 — backend:

```powershell
cd "$HOME\Downloads\DrivEase-Fixed\server"
npm.cmd install
npm.cmd test
npm.cmd start
```

Terminal 2 — frontend:

```powershell
cd "$HOME\Downloads\DrivEase-Fixed"
npm.cmd install
npm.cmd run dev
```

Open the Vite URL printed in the frontend terminal. The Vite configuration defaults to port 8444 and proxies `/api` to `http://127.0.0.1:3001`.

## Verification completed in this package

- `node --check server/server.js` — passed.
- `node --check server/booking-date.js` — passed.
- `node server/test-booking-date.js` — passed (8 assertions).

A live MySQL booking has not been verified here because the local database and private environment variables are not accessible in this environment. Complete the end-to-end test on your machine after restoring your own `.env`.
