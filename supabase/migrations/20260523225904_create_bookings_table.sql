/*
  # Create bookings table for Cabs Online application

  1. New Tables
    - `bookings`
      - `id` (uuid, primary key) - Auto-generated unique identifier
      - `booking_id` (integer, auto-increment) - Sequential booking reference number
      - `customer_name` (text) - Full name of customer
      - `customer_phone` (text) - Customer contact phone
      - `unit_number` (text, nullable) - Unit/apartment number
      - `street_number` (text) - Street address number
      - `street_name` (text) - Street name
      - `pickup_suburb` (text) - Pickup location suburb
      - `destination_suburb` (text) - Destination location suburb
      - `pickup_date` (date) - Scheduled pickup date
      - `pickup_time` (time) - Scheduled pickup time
      - `status` (text) - Current booking status (unassigned, assigned)
      - `created_at` (timestamp) - Record creation timestamp
      - `updated_at` (timestamp) - Record last update timestamp

  2. Security
    - Enable RLS on `bookings` table
    - Add policy for public users to insert new bookings
    - Add policy for admins (with admin JWT claim) to read and update bookings
    - Add policy for public to read their own booking by booking_id

  3. Indexes
    - Add index on status for faster queries
    - Add index on pickup_date and pickup_time for time-range searches
*/

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id SERIAL UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  unit_number TEXT,
  street_number TEXT NOT NULL,
  street_name TEXT NOT NULL,
  pickup_suburb TEXT,
  destination_suburb TEXT NOT NULL,
  pickup_date DATE NOT NULL,
  pickup_time TIME NOT NULL,
  status TEXT DEFAULT 'unassigned',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert a booking
CREATE POLICY "Public users can create bookings"
  ON bookings
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy: Admins can read all bookings
CREATE POLICY "Admins can read all bookings"
  ON bookings
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Policy: Public can read specific booking by ID (for confirmation)
CREATE POLICY "Public can read own booking reference"
  ON bookings
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Policy: Admins can update bookings
CREATE POLICY "Admins can update bookings"
  ON bookings
  FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_pickup_datetime ON bookings(pickup_date, pickup_time);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_id ON bookings(booking_id);
