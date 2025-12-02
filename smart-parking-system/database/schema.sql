
-- Smart Parking Management System - MySQL Schema
-- Create database first (example): CREATE DATABASE smart_parking DEFAULT CHARACTER SET utf8mb4;
-- USE smart_parking;

CREATE TABLE IF NOT EXISTS users (
  user_id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  user_type ENUM('admin','owner','user') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS parking_lots (
  lot_id INT PRIMARY KEY AUTO_INCREMENT,
  lot_name VARCHAR(100) NOT NULL,
  address VARCHAR(200),
  city VARCHAR(50),
  state VARCHAR(50),
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  total_spaces INT NOT NULL DEFAULT 0,
  owner_id INT,
  hourly_rate DECIMAL(7,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS parking_spaces (
  space_id INT PRIMARY KEY AUTO_INCREMENT,
  lot_id INT NOT NULL,
  space_number VARCHAR(20) NOT NULL,
  space_type ENUM('regular','handicapped','compact','ev') DEFAULT 'regular',
  status ENUM('active','inactive','maintenance') DEFAULT 'active',
  floor_level VARCHAR(10),
  is_available TINYINT(1) DEFAULT 1,
  UNIQUE KEY uq_space (lot_id, space_number),
  FOREIGN KEY (lot_id) REFERENCES parking_lots(lot_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reservations (
  reservation_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  space_id INT NOT NULL,
  lot_id INT NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  total_amount DECIMAL(10,2) DEFAULT 0,
  status ENUM('pending','confirmed','cancelled','completed') DEFAULT 'pending',
  qr_code TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (space_id) REFERENCES parking_spaces(space_id),
  FOREIGN KEY (lot_id) REFERENCES parking_lots(lot_id)
);

CREATE TABLE IF NOT EXISTS payments (
  payment_id INT PRIMARY KEY AUTO_INCREMENT,
  reservation_id INT NOT NULL,
  user_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method ENUM('card','upi','wallet','cash') DEFAULT 'card',
  transaction_id VARCHAR(100),
  payment_status ENUM('created','paid','failed','refunded') DEFAULT 'created',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reservation_id) REFERENCES reservations(reservation_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS parking_sessions (
  session_id INT PRIMARY KEY AUTO_INCREMENT,
  reservation_id INT NOT NULL,
  entry_time DATETIME,
  exit_time DATETIME,
  actual_duration INT, -- minutes
  additional_charges DECIMAL(10,2) DEFAULT 0,
  FOREIGN KEY (reservation_id) REFERENCES reservations(reservation_id)
);

CREATE TABLE IF NOT EXISTS qr_codes (
  qr_id INT PRIMARY KEY AUTO_INCREMENT,
  reservation_id INT NOT NULL,
  qr_data TEXT NOT NULL,
  generated_at DATETIME NOT NULL,
  expires_at DATETIME,
  is_used TINYINT(1) DEFAULT 0,
  FOREIGN KEY (reservation_id) REFERENCES reservations(reservation_id)
);

CREATE TABLE IF NOT EXISTS admin_users (
  admin_id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(100) NOT NULL,
  role VARCHAR(50) DEFAULT 'admin',
  permissions TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Helpful views
CREATE OR REPLACE VIEW vw_available_spaces AS
SELECT s.space_id, s.lot_id, s.space_number, s.is_available
FROM parking_spaces s
WHERE s.is_available = 1 AND s.status = 'active';

CREATE OR REPLACE VIEW vw_revenue_by_lot AS
SELECT r.lot_id, SUM(p.amount) AS revenue, COUNT(p.payment_id) AS payments_count
FROM payments p
JOIN reservations r ON r.reservation_id = p.reservation_id
WHERE p.payment_status = 'paid'
GROUP BY r.lot_id;

-- Sample data
INSERT INTO users (username, email, password_hash, phone, user_type)
VALUES ('Admin', 'admin@smartpark.local', '$2a$10$2aatlI0z6q0VhGVj2B9uUe6X3M0E6qB7Cz8A9p4Qv1bq1q1q1q1q1', '9999999999', 'admin') 
ON DUPLICATE KEY UPDATE email=email;

INSERT INTO parking_lots (lot_name, address, city, state, latitude, longitude, total_spaces, hourly_rate)
VALUES ('Central Plaza Parking', '123 Main St', 'YourCity', 'YourState', 28.613939, 77.209023, 50, 40.00)
ON DUPLICATE KEY UPDATE lot_name=lot_name;

-- Create sample spaces (1..10)
-- (Create more as you like)
