# DrivEase implementation update

## Included in this update
- Vehicle inventory is retrieved from MySQL.
- Vehicle creation uploads the selected image to Cloudinary before saving its URL in MySQL.
- Vehicle availability changes are persisted through the API.
- Booking creation writes a Pending booking to MySQL and checks for overlapping Pending/Accepted reservations while holding a row lock on the vehicle.
- Renter and owner booking lists now load from MySQL instead of relying only on temporary in-memory state.
- Owner booking status actions persist Accepted, Rejected, and Completed transitions to MySQL.
- Added an existing-database migration for optional vehicle/payment fields.
- Included the Vite `.figma/make/site.json` file required by `vite.config.ts`.

## Important limitations
- This update does not yet implement real user authentication, password hashing, or role-based access control. The current role switcher is a UI/demo selector, not a security boundary.
- Payment is recorded manually; no GCash/card gateway is connected. Do not collect or store card CVV or full card numbers in this demo.
- This update has not been fully acceptance-tested against the user's local MySQL schema. Apply the migration only after taking a database backup.

## Existing database migration
1. Back up `drivease_db`.
2. Select `drivease_db` in MySQL Workbench.
3. Open and execute `database/migrations/001_booking_and_vehicle_fields.sql`.
4. If your database has a different table/column layout, stop and inspect it before proceeding.

Do not import `database/schema.sql` over an existing database; that file is intended only for a new database.

## Additional functional-scope updates
- Removed the fake sample owner bookings from the management screen; owner booking lists now display database records only.
- Removed card-number, expiry, CVV, and GCash credential collection. Payment choice is now a manual collection/confirmation method (Cash or GCash), consistent with a school-project rental workflow and without storing payment credentials.
- Booking creation now sends the selected payment method to the API.
- Added API endpoints for editing and deleting vehicles. Vehicles with booking history are protected from deletion by the database foreign key; mark those vehicles unavailable instead.

## Authentication and account features added in this pass
- Added database-backed registration and login for renter and vehicle-owner accounts.
- Passwords are stored as salted scrypt hashes using Node's built-in crypto module.
- Added signed, expiring local session tokens and owner-only API guards for vehicle changes, booking status, and payment recording.
- Added persistent profile retrieval and update endpoints for name, phone, address, and driver's-license number.
- Connected the login/signup UI to the new account endpoints and profile save to MySQL.
- Added an owner workflow to manually mark an external payment as received.
- Added edit and delete controls to vehicle management.

## Readiness and verification
This is an academic local-use system, not a hardened public production deployment. It intentionally has no OTP, email/SMS verification, payment gateway, or card credential collection. The backend JavaScript syntax and frontend TypeScript/JSX transpilation syntax were checked. A full TypeScript typecheck and Vite production build could not be completed in this environment because dependency installation timed out. The existing local MySQL database must have both migration scripts applied before authentication and the expanded fields work. Browser acceptance testing on the user's machine is still required; do not describe the application as fully verified until the renter-to-owner workflow has been tested locally.
