/*
  # Add destination street fields to bookings

  1. Modified Tables
    - `bookings` - Add destination_street_number and destination_street_name columns

  2. Purpose
    - Store full destination address details
    - Enable better address display in booking references
*/

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS destination_street_number TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS destination_street_name TEXT DEFAULT '';
