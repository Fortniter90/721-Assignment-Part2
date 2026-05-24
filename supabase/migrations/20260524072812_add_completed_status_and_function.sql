/*
  # Add completed status and helper function

  1. Modified Tables
    - `bookings` - Add 'completed' as valid status option
    - Status values: 'unassigned', 'assigned', 'completed'

  2. New Functions
    - `increment_driver_trips(driver_id)` - Increment total_trips counter

  3. Purpose
    - Support job completion workflow
    - Track driver trip statistics
*/

-- Create function to increment driver trips
CREATE OR REPLACE FUNCTION increment_driver_trips(p_driver_id INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE drivers
  SET total_trips = total_trips + 1
  WHERE driver_id = p_driver_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
