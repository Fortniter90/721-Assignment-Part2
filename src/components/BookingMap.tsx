import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase, type Booking } from '../lib/supabase';
import { MapPin, Navigation, Loader, AlertCircle, RefreshCw } from 'lucide-react';

// Fix default marker icon issue with React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom marker icons
const pickupIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const destinationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface BookingWithCoords extends Booking {
  pickup_lat: number | null;
  pickup_lng: number | null;
  dest_lat: number | null;
  dest_lng: number | null;
}

// Component to fit map bounds
function FitBounds({ bookings }: { bookings: BookingWithCoords[] }) {
  const map = useMap();

  useEffect(() => {
    if (bookings.length > 0) {
      const bounds: [number, number][] = [];
      let hasValidCoords = false;

      bookings.forEach(b => {
        if (b.pickup_lat && b.pickup_lng) {
          bounds.push([b.pickup_lat, b.pickup_lng]);
          hasValidCoords = true;
        }
        if (b.dest_lat && b.dest_lng) {
          bounds.push([b.dest_lat, b.dest_lng]);
          hasValidCoords = true;
        }
      });

      if (hasValidCoords && bounds.length > 0) {
        map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [50, 50] });
      }
    }
  }, [bookings, map]);

  return null;
}

export default function BookingMap() {
  const [bookings, setBookings] = useState<BookingWithCoords[]>([]);
  const [loading, setLoading] = useState(true);
  const [geocodingBooking, setGeocodingBooking] = useState<number | null>(null);
  const [error, setError] = useState<string>('');
  const [showWithoutCoords, setShowWithoutCoords] = useState(false);

  const formatBookingId = (id: number) => 'BRN' + String(id).padStart(5, '0');
  const formatTime = (time: string) => time.slice(0, -3);
  const formatDate = (date: string) => {
    const [year, month, day] = date.split('-');
    return `${day}/${month}/${year}`;
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('bookings')
        .select('*')
        .order('pickup_date', { ascending: false });

      if (fetchError) throw fetchError;

      const bookingsWithCoords = (data || []).map(b => ({
        ...b,
        pickup_lat: b.pickup_latitude,
        pickup_lng: b.pickup_longitude,
        dest_lat: b.destination_latitude,
        dest_lng: b.destination_longitude,
      }));

      setBookings(bookingsWithCoords);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycode=nz`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
        };
      }
    } catch (err) {
      console.error('Geocoding error:', err);
    }
    return null;
  };

  const addCoordinatesToBooking = async (booking: BookingWithCoords) => {
    setGeocodingBooking(booking.booking_id);
    setError('');

    try {
      // Build addresses from booking data
      const pickupAddress = booking.pickup_suburb
        ? `${booking.pickup_suburb}, Auckland, New Zealand`
        : `${booking.street_number} ${booking.street_name}, Auckland, New Zealand`;

      const destAddress = `${booking.destination_suburb}, Auckland, New Zealand`;

      const [pickupCoords, destCoords] = await Promise.all([
        geocodeAddress(pickupAddress),
        geocodeAddress(destAddress),
      ]);

      if (pickupCoords || destCoords) {
        const { error: updateError } = await supabase
          .from('bookings')
          .update({
            pickup_latitude: pickupCoords?.lat || null,
            pickup_longitude: pickupCoords?.lng || null,
            destination_latitude: destCoords?.lat || null,
            destination_longitude: destCoords?.lng || null,
          })
          .eq('booking_id', booking.booking_id);

        if (updateError) throw updateError;
        await fetchBookings();
      } else {
        setError('Unable to geocode addresses. Try more specific location names.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add coordinates');
    } finally {
      setGeocodingBooking(null);
    }
  };

  const bookingsWithCoords = bookings.filter(b => b.pickup_lat && b.pickup_lng);
  const bookingsWithoutCoords = bookings.filter(b => !b.pickup_lat || !b.pickup_lng);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Navigation className="w-6 h-6 text-amber-500" />
            Booking Locations Map
          </h3>
          <button
            onClick={fetchBookings}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-2xl font-bold text-amber-800">{bookings.length}</p>
            <p className="text-sm text-amber-600">Total Bookings</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-2xl font-bold text-green-800">{bookingsWithCoords.length}</p>
            <p className="text-sm text-green-600">With Coordinates</p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-2xl font-bold text-orange-800">{bookingsWithoutCoords.length}</p>
            <p className="text-sm text-orange-600">Need Geocoding</p>
          </div>
        </div>

        {bookingsWithoutCoords.length > 0 && (
          <button
            onClick={() => setShowWithoutCoords(!showWithoutCoords)}
            className="mb-4 text-amber-600 hover:text-amber-700 font-semibold flex items-center gap-2"
          >
            {showWithoutCoords ? 'Hide' : 'Show'} {bookingsWithoutCoords.length} bookings without coordinates
          </button>
        )}

        {showWithoutCoords && bookingsWithoutCoords.length > 0 && (
          <div className="mb-6 bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-sm text-gray-700 mb-3">Click "Geocode" to fetch coordinates:</p>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {bookingsWithoutCoords.slice(0, 20).map(booking => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between bg-white p-3 rounded border border-gray-200"
                >
                  <div>
                    <p className="font-bold text-gray-900">{formatBookingId(booking.booking_id)}</p>
                    <p className="text-sm text-gray-600">
                      {booking.pickup_suburb || `${booking.street_number} ${booking.street_name}`} → {booking.destination_suburb}
                    </p>
                  </div>
                  <button
                    onClick={() => addCoordinatesToBooking(booking)}
                    disabled={geocodingBooking === booking.booking_id}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 text-sm flex items-center gap-2"
                  >
                    {geocodingBooking === booking.booking_id && <Loader className="w-4 h-4 animate-spin" />}
                    Geocode
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="h-[600px] rounded-lg overflow-hidden border-2 border-gray-200">
          {bookingsWithCoords.length > 0 ? (
            <MapContainer
              center={[-36.8485, 174.7633]}
              zoom={12}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <FitBounds bookings={bookingsWithCoords} />

              {bookingsWithCoords.map(booking => (
                <div key={booking.id}>
                  {booking.pickup_lat && booking.pickup_lng && (
                    <Marker
                      position={[booking.pickup_lat, booking.pickup_lng]}
                      icon={pickupIcon}
                    >
                      <Popup>
                        <div className="p-2 min-w-[200px]">
                          <p className="font-bold text-green-700 text-lg">Pickup</p>
                          <p className="text-sm font-semibold text-gray-900">{formatBookingId(booking.booking_id)}</p>
                          <p className="text-sm text-gray-600">{booking.customer_name}</p>
                          <div className="border-t border-gray-200 mt-2 pt-2">
                            <p className="text-sm text-gray-700">
                              {booking.street_number} {booking.street_name}
                            </p>
                            {booking.pickup_suburb && (
                              <p className="text-sm text-gray-700">{booking.pickup_suburb}</p>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            {formatTime(booking.pickup_time)} {formatDate(booking.pickup_date)}
                          </p>
                          <p className="text-xs mt-1">
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              booking.status === 'assigned'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {booking.status}
                            </span>
                          </p>
                        </div>
                      </Popup>
                    </Marker>
                  )}

                  {booking.dest_lat && booking.dest_lng && (
                    <Marker
                      position={[booking.dest_lat, booking.dest_lng]}
                      icon={destinationIcon}
                    >
                      <Popup>
                        <div className="p-2 min-w-[200px]">
                          <p className="font-bold text-red-700 text-lg">Destination</p>
                          <p className="text-sm font-semibold text-gray-900">{formatBookingId(booking.booking_id)}</p>
                          <div className="border-t border-gray-200 mt-2 pt-2">
                            <p className="text-sm text-gray-700">{booking.destination_suburb}</p>
                          </div>
                          <p className="text-xs mt-1">
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              booking.status === 'assigned'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {booking.status}
                            </span>
                          </p>
                        </div>
                      </Popup>
                    </Marker>
                  )}
                </div>
              ))}
            </MapContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-full bg-gray-50">
              <MapPin className="w-16 h-16 text-gray-300 mb-4" />
              <p className="text-gray-600 text-lg">No bookings with coordinates yet</p>
              <p className="text-sm text-gray-500 mt-1">Bookings with address selection will appear here</p>
            </div>
          )}
        </div>

        <div className="mt-6 bg-gradient-to-r from-green-50 to-red-50 rounded-lg p-4 border border-gray-200">
          <h4 className="font-bold text-gray-900 mb-3">Map Legend</h4>
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-500"></div>
              <span className="text-gray-700">Pickup Locations</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-500"></div>
              <span className="text-gray-700">Destination Locations</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
