/*
  # Add full address columns

  1. New Columns
    - `pickup_address` (text) - Full pickup address from OpenStreetMap
    - `destination_address` (text) - Full destination address from OpenStreetMap
  
  2. Purpose
    - Store the complete address string returned from OpenStreetMap
    - Used for displaying full addresses with expand/collapse functionality
  
  3. Important Notes
    - Both columns are nullable for backward compatibility
    - Will be populated from new bookings going forward
*/

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS pickup_address TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS destination_address TEXT DEFAULT '';