/*
  # Fix bookings RLS policies for public access

  1. Security Changes
    - Drop existing restrictive policies on bookings table
    - Add policy for public to read bookings
    - Add policy for public to create bookings
    - Add policy for public to update bookings (including driver assignment)
    - Add policy for public to delete bookings

  2. Purpose
    - Allow driver assignment from admin dashboard
    - Enable full CRUD operations for demo
    - Support status updates
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create bookings" ON bookings;
DROP POLICY IF EXISTS "Users can view bookings" ON bookings;
DROP POLICY IF EXISTS "Users can update bookings" ON bookings;
DROP POLICY IF EXISTS "Users can delete bookings" ON bookings;

-- Create new policies allowing full access for demo
CREATE POLICY "Public can create bookings"
  ON bookings
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Public can view bookings"
  ON bookings
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public can update bookings"
  ON bookings
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete bookings"
  ON bookings
  FOR DELETE
  TO anon, authenticated
  USING (true);
