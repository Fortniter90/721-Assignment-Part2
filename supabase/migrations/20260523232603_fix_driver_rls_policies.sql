/*
  # Fix driver RLS policies for public access

  1. Security Changes
    - Drop existing restrictive policies on drivers table
    - Add policy for public to create drivers (for demo purposes)
    - Add policy for public to update drivers (including status)
    - Add policy for public to delete drivers
    - Add policy for public to read drivers

  2. Purpose
    - Allow driver creation from admin dashboard
    - Enable status toggle functionality
    - Support full CRUD operations for demo
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage all drivers" ON drivers;
DROP POLICY IF EXISTS "Public can view driver basic info" ON drivers;

-- Create new policies allowing full access for demo
CREATE POLICY "Public can create drivers"
  ON drivers
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Public can view drivers"
  ON drivers
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public can update drivers"
  ON drivers
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete drivers"
  ON drivers
  FOR DELETE
  TO anon, authenticated
  USING (true);
