
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const crypto = require("crypto");
const { normalizeBookingDate, manilaToday } = require("./booking-date");
require("dotenv").config();
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 8, fields: 30 },
  fileFilter: (_req, file, callback) => {
    if (!file.mimetype || !file.mimetype.startsWith("image/")) {
      return callback(new Error("Only image files are allowed."));
    }
    callback(null, true);
  },
});


const app = express();
const PORT = Number(process.env.PORT || 3001);

app.use(cors());
app.use(express.json());

// Lightweight local account authentication for the academic project.
// Passwords are salted and hashed with Node's built-in scrypt; no OTP/email service is required.
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");
const makeToken = (user) => {
  const payload = Buffer.from(JSON.stringify({ id: user.id, email: user.email, role: user.role, exp: Date.now() + 7 * 86400000 })).toString("base64url");
  const signature = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
  return `${payload}.${signature}`;
};
const authRequired = (req, res, next) => {
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return res.status(401).json({ success: false, message: "Please sign in to continue." });
  const expected = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest();
  let actual;
  try { actual = Buffer.from(signature, "base64url"); } catch { return res.status(401).json({ success: false, message: "Invalid session." }); }
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return res.status(401).json({ success: false, message: "Invalid session." });
  try {
    const user = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!user.exp || user.exp < Date.now()) return res.status(401).json({ success: false, message: "Your session expired. Please sign in again." });
    req.user = user;
    next();
  } catch { return res.status(401).json({ success: false, message: "Invalid session." }); }
};
const ownerRequired = (req, res, next) => {
  if (req.user?.role !== "owner") return res.status(403).json({ success: false, message: "Vehicle owner access is required." });
  next();
};
const hashPassword = (password, salt = crypto.randomBytes(16).toString("hex")) => new Promise((resolve, reject) => {
  crypto.scrypt(password, salt, 64, (error, key) => error ? reject(error) : resolve(`${salt}:${key.toString("hex")}`));
});
const verifyPassword = (password, stored) => new Promise((resolve, reject) => {
  const [salt, keyHex] = String(stored || "").split(":");
  if (!salt || !keyHex) return resolve(false);
  crypto.scrypt(password, salt, 64, (error, key) => {
    if (error) return reject(error);
    const expected = Buffer.from(keyHex, "hex");
    resolve(expected.length === key.length && crypto.timingSafeEqual(key, expected));
  });
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const { full_name, email, password, role } = req.body || {};
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!String(full_name || "").trim() || !/^\S+@\S+\.\S+$/.test(normalizedEmail) || String(password || "").length < 8 || !["renter", "owner"].includes(role)) {
      return res.status(400).json({ success: false, message: "Enter your name, a valid email, choose an account type, and use a password with at least 8 characters." });
    }
    const password_hash = await hashPassword(password);
    const [result] = await db.query("INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)", [String(full_name).trim(), normalizedEmail, password_hash, role]);
    const user = { id: result.insertId, full_name: String(full_name).trim(), email: normalizedEmail, role };
    res.status(201).json({ success: true, token: makeToken(user), user });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ success: false, message: "An account with this email already exists. Please sign in instead." });
    console.error("Registration error:", error.message);
    res.status(500).json({ success: false, message: "Could not create the account. Check that the users migration has been applied." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    if (!email || !password) return res.status(400).json({ success: false, message: "Enter your email and password." });
    const [rows] = await db.query("SELECT id, full_name, email, password_hash, role FROM users WHERE email = ? LIMIT 1", [email]);
    if (!rows.length || !(await verifyPassword(password, rows[0].password_hash))) return res.status(401).json({ success: false, message: "Incorrect email or password." });
    const { password_hash, ...user } = rows[0];
    res.json({ success: true, token: makeToken(user), user });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ success: false, message: "Could not sign in. Check that the users migration has been applied." });
  }
});

app.get("/api/profile", authRequired, async (req, res) => {
  try {
    const [rows] = await db.query("SELECT id, full_name, email, role, phone, address, license_no FROM users WHERE id = ?", [req.user.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: "Account not found." });
    res.json({ success: true, data: rows[0] });
  } catch (error) { console.error("Profile fetch error:", error.message); res.status(500).json({ success: false, message: "Could not load profile." }); }
});

app.patch("/api/profile", authRequired, async (req, res) => {
  try {
    const { full_name, phone, address, license_no } = req.body || {};
    if (!String(full_name || "").trim()) return res.status(400).json({ success: false, message: "Full name is required." });
    await db.query("UPDATE users SET full_name = ?, phone = ?, address = ?, license_no = ? WHERE id = ?", [String(full_name).trim(), phone || null, address || null, license_no || null, req.user.id]);
    const [rows] = await db.query("SELECT id, full_name, email, role, phone, address, license_no FROM users WHERE id = ?", [req.user.id]);
    res.json({ success: true, data: rows[0] });
  } catch (error) { console.error("Profile update error:", error.message); res.status(500).json({ success: false, message: "Could not save profile." }); }
});
app.post("/api/upload", authRequired, ownerRequired, (req, res, next) => {
  // Accept any multipart field name so older/newer frontend builds both work.
  upload.any()(req, res, (error) => {
    if (error) return next(error);
    next();
  });
}, async (req, res) => {
  try {
    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      return res.status(503).json({
        success: false,
        message: "Cloudinary is not configured. Check the server environment variables.",
      });
    }

    const imageFiles = (req.files || []).filter((file) => file.mimetype && file.mimetype.startsWith("image/")).slice(0, 8);
    if (!imageFiles.length) return res.status(400).json({ success: false, message: "Please select at least one image." });
    const imageUrls = await Promise.all(imageFiles.map((file) => new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({ folder: "drivease/vehicles" }, (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      });
      stream.end(file.buffer);
    })));
    res.json({ success: true, image_urls: imageUrls, image_url: imageUrls[0] });
  } catch (error) {
    console.error("Cloudinary upload error:", error.message);

    res.status(500).json({
      success: false,
      message: `Image upload failed: ${error.message}` ,
    });
  }
});

const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "drivease_app",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "drivease_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Root response helps distinguish the API server from the Vite frontend.
app.get("/", (_req, res) => res.json({ success: true, message: "DrivEase API is running. See /api/health." }));

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "DrivEase API is running!",
  });
});

// Database connection test
app.get("/api/db-test", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT 1 AS connected");

    res.json({
      success: true,
      message: "DrivEase is connected to MySQL!",
      data: rows,
    });
  } catch (error) {
    console.error("Database connection error:", error.message);

    res.status(500).json({
      success: false,
      message: "Database connection failed.",
    });
  }
});

// Get all vehicles
app.get("/api/cars", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM cars ORDER BY created_at DESC"
    );

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("Error fetching cars:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to fetch cars.",
    });
  }
});

// Add a new vehicle. Accept both JSON requests (pre-uploaded Cloudinary URLs)
 // and multipart requests that send photos directly with the vehicle form.
app.post("/api/cars", authRequired, ownerRequired, (req, res, next) => {
  upload.any()(req, res, (error) => {
    if (error) return next(error);
    next();
  });
}, async (req, res) => {
  try {
    const {
      name,
      year,
      price_per_day,
      transmission,
      seats,
      image_url,
      color,
      plate_no,
      category,
      available,
    } = req.body || {};

    if (!name || !year || !price_per_day || !transmission || !seats || !plate_no) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required vehicle details.",
      });
    }

    // If the client sent image files directly with /api/cars, upload them here.
    // upload.any() intentionally accepts legacy field names such as image, images,
    // photos, vehicleImages, etc., avoiding Multer's "Unexpected field" rejection.
    let savedImageUrl = image_url || "";
    const incomingImages = Array.isArray(req.files) ? req.files.slice(0, 8) : [];
    if (incomingImages.length) {
      if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        return res.status(503).json({ success: false, message: "Cloudinary is not configured. Check the server environment variables." });
      }
      const uploadedUrls = await Promise.all(incomingImages.map((file) => new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({ folder: "drivease/vehicles" }, (error, result) => {
          if (error) return reject(error);
          resolve(result.secure_url);
        });
        stream.end(file.buffer);
      })));
      savedImageUrl = uploadedUrls.length > 1 ? JSON.stringify(uploadedUrls) : uploadedUrls[0];
    } else if (Array.isArray(savedImageUrl)) {
      savedImageUrl = JSON.stringify(savedImageUrl);
    } else if (savedImageUrl && typeof savedImageUrl === "object") {
      savedImageUrl = JSON.stringify(savedImageUrl);
    }

    const parts = String(name).trim().split(" ");
    const brand = parts.shift();
    const model = parts.join(" ") || brand;

    const [result] = await db.query(
      `INSERT INTO cars
      (name, brand, model, year, price_per_day,
       transmission, seats, image_url, color, plate_no, category, available)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        String(name).trim(),
        brand,
        model,
        Number(year),
        Number(price_per_day),
        String(transmission).trim(),
        Number(seats),
        savedImageUrl,
        color ? String(color).trim() : null,
        String(plate_no).trim().toUpperCase(),
        ["Sedan", "SUV", "MPV", "Motorcycle", "Other"].includes(category) ? category : "Other",
        available === false ? 0 : 1,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Vehicle added successfully.",
      carId: result.insertId,
    });
  } catch (error) {
    console.error("Error adding vehicle:", error.message);

    res.status(500).json({
      success: false,
      message: error.code === "ER_DATA_TOO_LONG" ? "Vehicle photo data is too large. Run migration 006_vehicle_image_gallery.sql, then try again." : (error.code === "ER_DUP_ENTRY" ? "That plate number is already registered. Check the plate number and try again." : `Failed to add vehicle: ${error.message}`),
    });
  }
});

// Update vehicle availability.
app.patch("/api/cars/:id/availability", authRequired, ownerRequired, async (req, res) => {
  try {
    const carId = Number(req.params.id);
    const { available } = req.body;

    if (!Number.isInteger(carId) || carId < 1 || typeof available !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "Provide a valid vehicle ID and availability value.",
      });
    }

    const [result] = await db.query(
      "UPDATE cars SET available = ? WHERE id = ?",
      [available ? 1 : 0, carId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found.",
      });
    }

    res.json({
      success: true,
      message: "Vehicle availability updated.",
    });
  } catch (error) {
    console.error("Error updating vehicle availability:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to update vehicle availability.",
    });
  }
});

// Update editable vehicle details without replacing the existing record.
app.patch("/api/cars/:id", authRequired, ownerRequired, async (req, res) => {
  try {
    const carId = Number(req.params.id);
    const { name, year, price_per_day, transmission, seats, image_url, color, plate_no, description, category } = req.body;
    if (!Number.isInteger(carId) || carId < 1 || !name || !Number(year) || !Number(price_per_day) || !transmission || !Number(seats)) {
      return res.status(400).json({ success: false, message: "Provide valid vehicle details." });
    }
    const parts = String(name).trim().split(/\s+/);
    const brand = parts.shift();
    const model = parts.join(" ") || brand;
    const [result] = await db.query(
      `UPDATE cars SET name = ?, brand = ?, model = ?, year = ?, price_per_day = ?,
       transmission = ?, seats = ?, image_url = COALESCE(?, image_url), color = ?,
       plate_no = ?, category = ?, available = ?, description = ? WHERE id = ?`,
      [String(name).trim(), brand, model, Number(year), Number(price_per_day),
       String(transmission).trim(), Number(seats), image_url || null,
       color || null, plate_no ? String(plate_no).trim().toUpperCase() : null,
       ["Sedan", "SUV", "MPV", "Motorcycle", "Other"].includes(category) ? category : "Other",
       req.body.available === false ? 0 : 1, description || null, carId]
    );
    if (!result.affectedRows) {
      const [existing] = await db.query("SELECT id FROM cars WHERE id = ?", [carId]);
      if (!existing.length) return res.status(404).json({ success: false, message: "Vehicle not found." });
    }
    res.json({ success: true, message: "Vehicle updated." });
  } catch (error) {
    console.error("Error updating vehicle:", error.message);
    res.status(500).json({ success: false, message: "Failed to update vehicle. Check that the plate number is unique." });
  }
});

// Delete only vehicles that have no booking history.
app.delete("/api/cars/:id", authRequired, ownerRequired, async (req, res) => {
  try {
    const carId = Number(req.params.id);
    if (!Number.isInteger(carId) || carId < 1) return res.status(400).json({ success: false, message: "Invalid vehicle ID." });
    const [result] = await db.query("DELETE FROM cars WHERE id = ?", [carId]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: "Vehicle not found." });
    res.json({ success: true, message: "Vehicle deleted." });
  } catch (error) {
    if (error.code === "ER_ROW_IS_REFERENCED_2") return res.status(409).json({ success: false, message: "This vehicle has booking history and cannot be deleted. Mark it unavailable instead." });
    console.error("Error deleting vehicle:", error.message);
    res.status(500).json({ success: false, message: "Failed to delete vehicle." });
  }
});

// Retrieve bookings for the renter or owner view.
app.get("/api/bookings", authRequired, async (req, res) => {
  try {
    const email = req.user.role === "owner" ? "" : req.user.email;
    const [rows] = await db.query(
      `SELECT b.*, c.name AS vehicle_name, c.image_url AS vehicle_image
       FROM bookings b
       INNER JOIN cars c ON c.id = b.car_id
       ${email ? "WHERE LOWER(b.renter_email) = LOWER(?)" : ""}
       ORDER BY b.created_at DESC`,
      email ? [email] : []
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error fetching bookings:", error.message);
    res.status(500).json({ success: false, message: "Failed to fetch bookings." });
  }
});

// Create a pending booking and prevent overlapping active reservations.
app.post("/api/bookings", authRequired, async (req, res) => {
  let connection;
  try {
    const {
      car_id, renter_name, renter_email, renter_phone,
      pickup_location, return_location, pickup_date, return_date,
      total_price, payment_method,
    } = req.body;

    const carId = Number(car_id);

    // Normalize date and datetime-local values before validation and MySQL storage.
    const pickupText = normalizeBookingDate(pickup_date);
    const returnText = normalizeBookingDate(return_date);
    const todayText = manilaToday();
    const pickup = pickupText ? new Date(`${pickupText}T00:00:00.000Z`) : new Date(Number.NaN);
    const returning = returnText ? new Date(`${returnText}T00:00:00.000Z`) : new Date(Number.NaN);
    const renterName = String(renter_name || "").trim();
    const renterEmail = String(req.user.email || "").trim().toLowerCase();

    if (!Number.isInteger(carId) || carId < 1 || !renterName ||
        !/^\S+@\S+\.\S+$/.test(renterEmail) ||
        !String(pickup_location || "").trim() || !String(return_location || "").trim() ||
        !pickupText || !returnText || returnText <= pickupText || pickupText < todayText ||
        !["Cash", "GCash"].includes(payment_method)) {
      return res.status(400).json({ success: false, message: "Please provide valid booking details, choose Cash or GCash, and select a pickup date today or later with a later return date." });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();
    const [cars] = await connection.query(
      "SELECT id, available, price_per_day FROM cars WHERE id = ? FOR UPDATE", [carId]
    );
    if (!cars.length || !cars[0].available) {
      await connection.rollback();
      return res.status(409).json({ success: false, message: "This vehicle is currently unavailable." });
    }

    const [conflicts] = await connection.query(
      `SELECT id FROM bookings
       WHERE car_id = ? AND status IN ('Pending', 'Accepted')
       AND pickup_date < ? AND return_date > ? LIMIT 1`,
      [carId, returnText, pickupText]
    );
    if (conflicts.length) {
      await connection.rollback();
      return res.status(409).json({ success: false, message: "This vehicle already has a booking during those dates. Please choose different dates." });
    }

    const rentalDays = Math.round((returning.getTime() - pickup.getTime()) / 86400000);
    const calculatedTotal = rentalDays * Number(cars[0].price_per_day);
    if (!Number.isFinite(calculatedTotal) || calculatedTotal <= 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: "Could not calculate the rental total. Please check the vehicle's daily rate." });
    }

    const [result] = await connection.query(
      `INSERT INTO bookings
       (car_id, renter_name, renter_email, renter_phone, pickup_location,
        return_location, pickup_date, return_date, total_price, status,
        payment_status, payment_method)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?)`,
      [carId, renterName, renterEmail,
       renter_phone || null, String(pickup_location).trim(), String(return_location).trim(),
       pickupText, returnText, calculatedTotal,
       payment_method === "Cash" ? "Due on pickup" : "Unpaid",
       payment_method || null]
    );
    await connection.query("UPDATE cars SET available = 0 WHERE id = ?", [carId]);
    await connection.commit();
    res.status(201).json({
      success: true,
      message: "Booking submitted and is awaiting owner approval.",
      bookingId: result.insertId,
      reference: `DRV-${String(result.insertId).padStart(6, "0")}`,
      status: "Pending",
      total_price: calculatedTotal,
      rental_days: rentalDays,
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error creating booking:", error.message);
    res.status(500).json({ success: false, message: "Failed to save booking." });
  } finally {
    if (connection) connection.release();
  }
});

// Owner workflow: approve/reject a pending booking or complete an accepted one.
app.patch("/api/bookings/:id/status", authRequired, ownerRequired, async (req, res) => {
  try {
    const bookingId = Number(req.params.id);
    const { status } = req.body;
    const transitions = {
      Pending: ["Accepted", "Rejected"],
      Accepted: ["Completed"],
    };
    if (!Number.isInteger(bookingId) || bookingId < 1 || !["Accepted", "Rejected", "Completed"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid booking ID or status." });
    }
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const [rows] = await connection.query("SELECT status FROM bookings WHERE id = ? FOR UPDATE", [bookingId]);
      if (!rows.length) {
        await connection.rollback();
        return res.status(404).json({ success: false, message: "Booking not found." });
      }
      if (!(transitions[rows[0].status] || []).includes(status)) {
        await connection.rollback();
        return res.status(409).json({ success: false, message: `A booking cannot move from ${rows[0].status} to ${status}.` });
      }
      await connection.query("UPDATE bookings SET status = ? WHERE id = ?", [status, bookingId]);
      if (status === "Rejected" || status === "Completed") {
        const [bookingCar] = await connection.query("SELECT car_id FROM bookings WHERE id = ?", [bookingId]);
        if (bookingCar.length) {
          const [otherActive] = await connection.query(
            "SELECT id FROM bookings WHERE car_id = ? AND id <> ? AND status IN ('Pending','Accepted') LIMIT 1",
            [bookingCar[0].car_id, bookingId]
          );
          if (!otherActive.length) await connection.query("UPDATE cars SET available = 1 WHERE id = ?", [bookingCar[0].car_id]);
        }
      }
      await connection.commit();
      res.json({ success: true, message: `Booking ${status.toLowerCase()}.`, status });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error updating booking status:", error.message);
    const statusCode = error.code === "ER_LOCK_DEADLOCK" ? 409 : 500;
    res.status(statusCode).json({ success: false, message: "Failed to update booking." });
  }
});

// Renters may cancel only their own Pending requests; records remain in booking history.
app.patch("/api/bookings/:id/cancel", authRequired, async (req, res) => {
  try {
    const bookingId = Number(req.params.id);
    const reason = String(req.body?.reason || "").trim();
    const allowedReasons = ["Found another option", "Found a cheaper rental", "Change of plans", "Incorrect booking details", "Other"];
    if (!Number.isInteger(bookingId) || bookingId < 1 || !allowedReasons.includes(reason)) {
      return res.status(400).json({ success: false, message: "Choose a valid cancellation reason." });
    }
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const [rows] = await connection.query("SELECT id, car_id, status FROM bookings WHERE id = ? AND LOWER(renter_email) = LOWER(?) FOR UPDATE", [bookingId, req.user.email]);
      if (!rows.length) { await connection.rollback(); return res.status(404).json({ success: false, message: "Booking not found." }); }
      if (rows[0].status !== "Pending") { await connection.rollback(); return res.status(409).json({ success: false, message: "Only pending requests can be cancelled. Contact the owner if the request has already been accepted." }); }
      await connection.query("UPDATE bookings SET status = 'Cancelled', cancellation_reason = ? WHERE id = ?", [reason, bookingId]);
      const [active] = await connection.query("SELECT id FROM bookings WHERE car_id = ? AND status IN ('Pending','Accepted') LIMIT 1", [rows[0].car_id]);
      if (!active.length) await connection.query("UPDATE cars SET available = 1 WHERE id = ?", [rows[0].car_id]);
      await connection.commit();
      res.json({ success: true, message: "Your rental request has been cancelled." });
    } catch (error) { await connection.rollback(); throw error; }
    finally { connection.release(); }
  } catch (error) {
    console.error("Booking cancellation error:", error.message);
    res.status(500).json({ success: false, message: "Could not cancel booking." });
  }
});

// Renters may review only their own completed rentals, using a 1–3 star scale.
const saveBookingReview = async (req, res) => {
  try {
    const bookingId = Number(req.params.id);
    const rating = Number(req.body?.rating);
    const comment = String(req.body?.comment || "").trim();
    if (!Number.isInteger(bookingId) || bookingId < 1 || ![1, 2, 3, 4, 5].includes(rating) || comment.length > 600) {
      return res.status(400).json({ success: false, message: "Choose a rating from 1–5 stars and enter a comment of up to 600 characters." });
    }
    const [result] = await db.query(
      "UPDATE bookings SET review_rating = ?, review_comment = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ? AND LOWER(renter_email) = LOWER(?) AND status = 'Completed'",
      [rating, comment || null, bookingId, req.user.email]
    );
    if (!result.affectedRows) return res.status(409).json({ success: false, message: "Only your completed rentals can be reviewed, and each review must be saved against an existing booking." });
    res.json({ success: true, message: "Thank you. Your review has been saved." });
  } catch (error) {
    console.error("Booking review error:", error.message);
    res.status(500).json({ success: false, message: "Could not save your review. Apply migration 004 first." });
  }
};
app.patch("/api/bookings/:id/review", authRequired, saveBookingReview);
app.post("/api/bookings/:id/review", authRequired, saveBookingReview);

// Owner records an externally collected payment; no payment gateway is used.
app.patch("/api/bookings/:id/payment", authRequired, ownerRequired, async (req, res) => {
  try {
    const bookingId = Number(req.params.id);
    const { payment_status } = req.body;
    if (!Number.isInteger(bookingId) || bookingId < 1 || !["Paid", "Unpaid", "Due on pickup"].includes(payment_status)) {
      return res.status(400).json({ success: false, message: "Invalid booking ID or payment status." });
    }
    const [existing] = await db.query("SELECT id, status FROM bookings WHERE id = ?", [bookingId]);
    if (!existing.length) return res.status(404).json({ success: false, message: "Booking not found." });
    if (["Rejected", "Cancelled"].includes(existing[0].status)) {
      return res.status(409).json({ success: false, message: "Payment cannot be recorded for a rejected or cancelled booking." });
    }
    await db.query("UPDATE bookings SET payment_status = ? WHERE id = ?", [payment_status, bookingId]);
    res.json({ success: true, message: "Payment status updated." });
  } catch (error) {
    console.error("Error updating payment:", error.message);
    res.status(500).json({ success: false, message: "Failed to update payment status." });
  }
});

// Test route
app.get("/api/routes-test", (req, res) => {
  res.json({
    success: true,
    message: "Routes test is working",
  });
});

// Handle upload middleware and unexpected request errors.
app.use((error, _req, res, _next) => {
  console.error("API request error:", error.message);
  res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({
    success: false,
    message:
      error.code === "LIMIT_FILE_SIZE"
        ? "Image must be 5 MB or smaller."
        : error.message || "The request could not be processed.",
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`DrivEase API running at http://localhost:${PORT}`);
  console.log("DrivEase upload handler: permissive multi-image mode (up to 8 files)");
});
