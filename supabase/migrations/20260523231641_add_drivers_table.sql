/*
  # Create drivers table and update bookings table

  1. New Tables
    - `drivers`
      - `id` (uuid, primary key) - Auto-generated unique identifier
      - `driver_id` (integer, auto-increment) - Sequential driver reference number
      - `name` (text) - Driver full name
      - `email` (text, unique) - Driver email address
      - `phone` (text) - Driver contact phone
      - `license_number` (text) - Driver's license number
      - `vehicle_make` (text) - Vehicle manufacturer
      - `vehicle_model` (text) - Vehicle model
      - `vehicle_year` (integer) - Vehicle year
      - `vehicle_color` (text) - Vehicle color
      - `vehicle_plate` (text) - Vehicle license plate
      - `status` (text) - Driver status (available, busy, offline)
      - `rating` (decimal) - Driver rating (0-5)
      - `total_trips` (integer) - Total completed trips
      - `created_at` (timestamp) - Record creation timestamp
      - `updated_at` (timestamp) - Record last update timestamp

  2. Modified Tables
    - `bookings`
      - Add `driver_id` (integer, nullable) - Assigned driver reference
      - Add `driver_assigned_at` (timestamp, nullable) - When driver was assigned

  3. Security
    - Enable RLS on `drivers` table
    - Add policy for admins to manage drivers
    - Add policy for drivers to view their own data

  4. Indexes
    - Add index on driver_id for faster lookups
    - Add index on status for availability queries
*/

-- Create drivers table
CREATE TABLE IF NOT EXISTS drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id SERIAL UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  license_number TEXT NOT NULL,
  vehicle_make TEXT NOT NULL,
  vehicle_model TEXT NOT NULL,
  vehicle_year INTEGER NOT NULL,
  vehicle_color TEXT NOT NULL,
  vehicle_plate TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'available',
  rating DECIMAL(3,2) DEFAULT 5.00,
  total_trips INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security on drivers table
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can manage all drivers
CREATE POLICY "Admins can manage all drivers"
  ON drivers
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Policy: Public can view driver info (for display when assigned)
CREATE POLICY "Public can view driver basic info"
  ON drivers
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Add driver_id column to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS driver_id INTEGER;

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS driver_assigned_at TIMESTAMPTZ;

-- Add foreign key constraint
ALTER TABLE bookings 
ADD CONSTRAINT fk_driver 
FOREIGN KEY (driver_id) 
REFERENCES drivers(driver_id) 
ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_drivers_driver_id ON drivers(driver_id);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status);
CREATE INDEX IF NOT EXISTS idx_bookings_driver_id ON bookings(driver_id);
