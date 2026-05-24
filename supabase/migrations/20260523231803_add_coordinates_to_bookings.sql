/*
  # Add coordinates to bookings table and create map view component

  1. Modified Tables
    - `bookings`
      - Add `pickup_latitude` (decimal, nullable) - Latitude for pickup location
      - Add `pickup_longitude` (decimal, nullable) - Longitude for pickup location
      - Add `destination_latitude` (decimal, nullable) - Latitude for destination
      - Add `destination_longitude` (decimal, nullable) - Longitude for destination

  2. Purpose
    - Store GPS coordinates for interactive map visualization
    - Enable route calculation and distance estimation
    - Support real-time driver tracking in future features
*/

-- Add coordinate columns to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS pickup_latitude DECIMAL(10, 8);

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS pickup_longitude DECIMAL(11, 8);

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS destination_latitude DECIMAL(10, 8);

ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS destination_longitude DECIMAL(11, 8);

-- Create index for geospatial queries
CREATE INDEX IF NOT EXISTS idx_bookings_coordinates ON bookings(pickup_latitude, pickup_longitude);
