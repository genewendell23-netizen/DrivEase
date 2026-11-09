# DrivEase — local development

## Important security note
Never upload `server/.env`, passwords, API keys, or database dumps to a public repository or chat. The previously shared archive contained a `.env` file; rotate the Cloudinary API secret and database password, then update your local environment file.

## Requirements
- Node.js (LTS)
- MySQL or MariaDB
- A Cloudinary account for vehicle photo uploads

## Project folders
- `src/` — React + TypeScript frontend
- `server/` — Express API
- `database/schema.sql` — starter schema for a NEW database

## Backend setup
1. Open PowerShell in the `server` folder.
2. Install backend dependencies:
   `npm.cmd install`
3. Copy `.env.example` to `.env` in the same `server` folder.
4. Fill in the database and Cloudinary values in `server/.env`.
5. For a NEW database, import `database/schema.sql` into MySQL. Do not run it as a replacement for an existing database.
6. If you already have the `cars` table, check its columns. The updated Add Vehicle API expects `color` and `plate_no`; the migration `database/migrations/001_booking_and_vehicle_fields.sql` adds missing fields safely:
   Run `database/migrations/001_booking_and_vehicle_fields.sql` in MySQL Workbench.
7. Start the API:
   `npm.cmd start`
8. Check `http://localhost:3001/api/health` and `http://localhost:3001/api/db-test`.

## Frontend setup
1. Open a second PowerShell window in the project root.
2. Install dependencies:
   `npm.cmd install`
3. Start Vite:
   `npm.cmd run dev`
4. Open the local URL printed by Vite.

## Vehicle photo upload
The Add Vehicle form now uploads the selected image to Cloudinary first, then sends the returned secure image URL with the vehicle details to MySQL. Images must be 5 MB or smaller and use an image MIME type.

## Current implementation boundary
This archive includes API routing repairs plus the existing authentication, vehicle, booking, and Cloudinary code. Actual database-dependent workflows must still be verified against your local MySQL and Cloudinary configuration before submission.


## Existing database: required one-time migrations

Before using account registration/login in this updated version, back up `drivease_db`, then run these scripts in MySQL Workbench with `drivease_db` selected, in this order:

1. `database/migrations/001_booking_and_vehicle_fields.sql`
2. `database/migrations/002_users_auth.sql`

Do not run `database/schema.sql` against an existing database. It is for a brand-new database only. The migrations add the missing fields and the `users` table without dropping existing vehicles or bookings.

## Accounts

Use **Create Account** to register a renter or vehicle-owner account. Passwords are hashed using Node.js `scrypt`. Passwords must be at least 8 characters. The owner account type is intended for the project demonstration; for a real deployment, owner account creation should be restricted by an administrator. There is no OTP, email, SMS, or payment gateway integration.

After running migrations, restart the backend (`npm.cmd start`) and frontend (`npm.cmd run dev`).
