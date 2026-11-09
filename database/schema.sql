-- DrivEase MVP database schema
-- Use this only for a NEW database. Back up an existing database before migrating it.
CREATE DATABASE IF NOT EXISTS drivease_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE drivease_db;

CREATE TABLE IF NOT EXISTS cars (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  brand VARCHAR(80) NOT NULL,
  model VARCHAR(100) NOT NULL,
  year SMALLINT UNSIGNED NOT NULL,
  price_per_day DECIMAL(10,2) NOT NULL,
  transmission VARCHAR(30) NOT NULL,
  seats TINYINT UNSIGNED NOT NULL,
  image_url TEXT NULL,
  color VARCHAR(80) NULL,
  plate_no VARCHAR(30) NOT NULL,
  description TEXT NULL,
  fuel_type VARCHAR(40) NULL,
  available TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cars_plate_no (plate_no),
  KEY idx_cars_available (available)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS bookings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  car_id INT UNSIGNED NOT NULL,
  renter_name VARCHAR(150) NOT NULL,
  renter_email VARCHAR(190) NOT NULL,
  renter_phone VARCHAR(40) NULL,
  pickup_location VARCHAR(190) NOT NULL,
  return_location VARCHAR(190) NOT NULL,
  pickup_date DATE NOT NULL,
  return_date DATE NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  status ENUM('Pending','Accepted','Rejected','Completed') NOT NULL DEFAULT 'Pending',
  payment_status ENUM('Unpaid','Paid','Due on pickup') NOT NULL DEFAULT 'Unpaid',
  payment_method VARCHAR(40) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_bookings_car_dates (car_id, pickup_date, return_date),
  KEY idx_bookings_status (status),
  KEY idx_bookings_email (renter_email),
  CONSTRAINT fk_bookings_car FOREIGN KEY (car_id) REFERENCES cars(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_booking_dates CHECK (return_date > pickup_date),
  CONSTRAINT chk_booking_price CHECK (total_price >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
  id INT NOT NULL AUTO_INCREMENT,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('renter','owner') NOT NULL DEFAULT 'renter',
  phone VARCHAR(40) NULL,
  address VARCHAR(255) NULL,
  license_no VARCHAR(100) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
