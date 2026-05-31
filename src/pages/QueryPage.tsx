import { useState } from 'react';
import { supabase, type Booking } from '../lib/supabase';
import { Search, MapPin, Navigation, User, Car, CheckCircle, AlertCircle, Loader, Clock } from 'lucide-react';

interface BookingDetails extends Booking {
  driver_name?: string;
  driver_phone?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  vehicle_color?: string;
  vehicle_plate?: string;
  status: 'unassigned' | 'assigned' | 'in_transit' | 'completed';
}

export default function QueryPage() {
  const [bookingRef, setBookingRef] = useState('');
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formatBookingId = (id: number) => 'BRN' + String(id).padStart(5, '0');
  const formatTime = (time: string) => time.slice(0, -3);
  const formatDate = (date: string) => {
    const [year, month, day] = date.split('-');
    return `${day}/${month}/${year}`;
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBooking(null);

    // Validate booking reference format
    const bookingRefRegex = /^BRN\d{5}$/;
    if (!bookingRef.match(bookingRefRegex)) {
      setError('Please enter a valid booking reference (e.g., BRN00001)');
      return;
    }

    setLoading(true);

    try {
      const bookingId = parseInt(bookingRef.replace(/^BRN0*/, ''));

      // Fetch booking details
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select('*')
        .eq('booking_id', bookingId)
        .maybeSingle();

      if (bookingError) throw bookingError;

      if (!bookingData) {
        setError('Booking not found. Please check your booking reference.');
        setLoading(false);
        return;
      }

      // If driver assigned, fetch driver details
      let bookingDetails: BookingDetails = bookingData;

      if (bookingData.driver_id) {
        const { data: driverData } = await supabase
          .from('drivers')
          .select('name, phone, vehicle_make, vehicle_model, vehicle_year, vehicle_color, vehicle_plate')
          .eq('driver_id', bookingData.driver_id)
          .maybeSingle();

        if (driverData) {
          bookingDetails = {
            ...bookingData,
            driver_name: driverData.name,
            driver_phone: driverData.phone,
            vehicle_make: driverData.vehicle_make,
            vehicle_model: driverData.vehicle_model,
            vehicle_year: driverData.vehicle_year,
            vehicle_color: driverData.vehicle_color,
            vehicle_plate: driverData.vehicle_plate,
          };
        }
      }

      setBooking(bookingDetails);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch booking details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-16 px-4">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-8 py-12 text-center">
          <h1 className="text-4xl font-bold text-white mb-2">Track Your Booking</h1>
          <p className="text-amber-100 text-lg">Enter your booking reference to check the status</p>
        </div>

        {/* Search Form */}
        <div className="px-8 py-10">
          <form onSubmit={handleSearch} className="mb-8">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={bookingRef}
                  onChange={(e) => setBookingRef(e.target.value.toUpperCase())}
                  placeholder="Enter booking reference (e.g., BRN00001)"
                  className="w-full pl-12 pr-4 py-4 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-lg"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                Track
              </button>
            </div>
          </form>

          {/* Error Message */}
          {error && (
            <div className="mb-8 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Booking Details */}
          {booking && (
            <div className="space-y-6">
              {/* Status Banner */}
              <div className={`rounded-lg p-6 ${
                booking.status === 'completed' ? 'bg-green-50 border-2 border-green-300' :
                booking.status === 'assigned' ? 'bg-blue-50 border-2 border-blue-300' :
                'bg-amber-50 border-2 border-amber-300'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {booking.status === 'completed' ? (
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    ) : (
                      <Clock className="w-8 h-8 text-amber-600" />
                    )}
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Booking Status</p>
                      <p className={`text-2xl font-bold capitalize ${
                        booking.status === 'completed' ? 'text-green-800' :
                        booking.status === 'in_transit' ? 'text-purple-800' :
                        booking.status === 'assigned' ? 'text-blue-800' :
                        'text-amber-800'
                      }`}>
                        {booking.status === 'in_transit' ? 'In Transit' : booking.status}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 mb-1">Booking Reference</p>
                    <p className="text-2xl font-bold text-amber-600">{formatBookingId(booking.booking_id)}</p>
                  </div>
                </div>
              </div>

              {/* Customer & Trip Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Customer Info */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-amber-500" />
                    Your Details
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Name</p>
                      <p className="font-semibold text-gray-900">{booking.customer_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="font-semibold text-gray-900">{booking.customer_phone}</p>
                    </div>
                  </div>
                </div>

                {/* Trip Details */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-amber-500" />
                    Trip Details
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Date</p>
                      <p className="font-semibold text-gray-900">{formatDate(booking.pickup_date)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Time</p>
                      <p className="font-semibold text-gray-900">{formatTime(booking.pickup_time)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Address Details */}
              <div className="bg-gradient-to-br from-green-50 to-red-50 rounded-lg p-6 border-2 border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-amber-500" />
                  Route Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Pickup */}
                  <div>
                    <p className="text-sm font-semibold text-green-700 mb-2">Pickup Location</p>
                    <div className="bg-white rounded-lg p-4 border border-green-200">
                      <p className="font-semibold text-gray-900">
                        {booking.pickup_address ||
                          [booking.street_number, booking.street_name, booking.pickup_suburb]
                            .filter(Boolean)
                            .join(' ')}
                      </p>
                    </div>
                  </div>

                  {/* Destination */}
                  <div>
                    <p className="text-sm font-semibold text-red-700 mb-2">Destination</p>
                    <div className="bg-white rounded-lg p-4 border border-red-200">
                      <p className="font-semibold text-gray-900">
                        {booking.destination_address ||
                          [booking.destination_street_number, booking.destination_street_name, booking.destination_suburb]
                            .filter(Boolean)
                            .join(' ')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Driver Details (if assigned) */}
              {booking.status !== 'unassigned' && booking.driver_name && (
                <div className="bg-blue-50 rounded-lg p-6 border-2 border-blue-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Car className="w-5 h-5 text-blue-500" />
                    Driver Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-600">Driver Name</p>
                        <p className="font-semibold text-gray-900">{booking.driver_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Driver Phone</p>
                        <p className="font-semibold text-gray-900">{booking.driver_phone}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-600">Vehicle</p>
                        <p className="font-semibold text-gray-900">
                          {booking.vehicle_year} {booking.vehicle_make} {booking.vehicle_model}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Plate Number</p>
                        <p className="font-semibold text-gray-900">
                          {booking.vehicle_color} • {booking.vehicle_plate}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Status Timeline */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Booking Progress</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      true ? 'bg-green-500 text-white' : 'bg-gray-300'
                    }`}>
                      <CheckCircle className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">Booking Created</p>
                      <p className="text-sm text-gray-600">{formatDate(booking.created_at?.split('T')[0] || booking.pickup_date)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      booking.status !== 'unassigned' ? 'bg-green-500 text-white' : 'bg-gray-300'
                    }`}>
                      {booking.status !== 'unassigned' ? (
                        <CheckCircle className="w-6 h-6" />
                      ) : (
                        <Clock className="w-6 h-6 text-gray-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`font-semibold ${booking.status !== 'unassigned' ? 'text-gray-900' : 'text-gray-500'}`}>
                        Driver Assigned
                      </p>
                      {booking.driver_assigned_at && (
                        <p className="text-sm text-gray-600">
                          {formatDate(booking.driver_assigned_at.split('T')[0])}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      booking.status === 'in_transit' || booking.status === 'completed' ? 'bg-green-500 text-white' : 'bg-gray-300'
                    }`}>
                      {booking.status === 'in_transit' || booking.status === 'completed' ? (
                        <CheckCircle className="w-6 h-6" />
                      ) : (
                        <MapPin className="w-6 h-6 text-gray-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`font-semibold ${booking.status === 'in_transit' || booking.status === 'completed' ? 'text-gray-900' : 'text-gray-500'}`}>
                        Pickup
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatDate(booking.pickup_date)} at {formatTime(booking.pickup_time)}
                      </p>
                      {(booking.status === 'in_transit' || booking.status === 'completed') && (
                        <p className="text-xs text-green-600 mt-0.5 font-medium">Customer picked up</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      booking.status === 'completed' ? 'bg-green-500 text-white' : 'bg-gray-300'
                    }`}>
                      {booking.status === 'completed' ? (
                        <CheckCircle className="w-6 h-6" />
                      ) : (
                        <Clock className="w-6 h-6 text-gray-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`font-semibold ${booking.status === 'completed' ? 'text-gray-900' : 'text-gray-500'}`}>
                        Trip Completed
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Help Text */}
          {!booking && !error && (
            <div className="text-center py-8">
              <div className="bg-amber-50 rounded-lg p-6 border border-amber-200">
                <p className="text-gray-700 mb-2">Your booking reference can be found in your confirmation email or SMS.</p>
                <p className="text-sm text-gray-500">Format: BRN followed by 5 digits (e.g., BRN00001)</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
