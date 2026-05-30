import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Booking {
  id: string;
  booking_id: number;
  customer_name: string;
  customer_phone: string;
  unit_number?: string;
  street_number: string;
  street_name: string;
  pickup_suburb?: string;
  destination_suburb: string;
  destination_street_number?: string;
  destination_street_name?: string;
  pickup_latitude?: number;
  pickup_longitude?: number;
  destination_latitude?: number;
  destination_longitude?: number;
  pickup_date: string;
  pickup_time: string;
  status: 'unassigned' | 'assigned' | 'in_transit';
  driver_id?: number;
  driver_assigned_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Driver {
  id: string;
  driver_id: number;
  name: string;
  email: string;
  phone: string;
  license_number: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  vehicle_color: string;
  vehicle_plate: string;
  status: 'available' | 'busy' | 'offline';
  rating: number;
  total_trips: number;
  created_at: string;
  updated_at: string;
}
