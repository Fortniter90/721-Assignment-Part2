import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase, type Booking } from '../lib/supabase';
import { MapPin, Navigation, Loader, RefreshCw } from 'lucide-react';

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

// Create label icon for displaying booking number above marker
const createLabelIcon = (label: string) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="position: relative;">
      <div style="position: absolute; bottom: 42px; left: 50%; transform: translateX(-50%); white-space: nowrap; background: white; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 11px; color: #d97706; box-shadow: 0 1px 3px rgba(0,0,0,0.3);">${label}</div>
    </div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
};

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
      bookings.forEach(b => {
        if (b.pickup_lat && b.pickup_lng) bounds.push([b.pickup_lat, b.pickup_lng]);
        if (b.dest_lat && b.dest_lng) bounds.push([b.dest_lat, b.dest_lng]);
      });
      if (bounds.length > 0) {
        map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [50, 50] });
      }
    }
  }, [bookings, map]);

  return null;
}

export default function BookingMap() {
  const [bookings, setBookings] = useState<BookingWithCoords[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

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
        .neq('status', 'completed')
        .not('pickup_latitude', 'is', null)
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
            Active Booking Locations
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
            <MapPin className="w-5 h-5 text-red-500" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-2xl font-bold text-green-800">{bookings.filter(b => b.status === 'unassigned').length}</p>
            <p className="text-sm text-green-600">Unassigned</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-2xl font-bold text-amber-800">{bookings.filter(b => b.status === 'assigned').length}</p>
            <p className="text-sm text-amber-600">Assigned</p>
          </div>
        </div>

        <div className="h-[600px] rounded-lg overflow-hidden border-2 border-gray-200">
          {bookings.length > 0 ? (
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
              <FitBounds bookings={bookings} />

              {bookings.map(booking => (
                <div key={booking.id}>
                  {booking.pickup_lat && booking.pickup_lng && (
                    <>
                      <Marker
                        position={[booking.pickup_lat, booking.pickup_lng]}
                        icon={createLabelIcon(formatBookingId(booking.booking_id))}
                      />
                      <Marker
                        position={[booking.pickup_lat, booking.pickup_lng]}
                        icon={pickupIcon}
                      >
                        <Popup>
                          <div className="p-2 min-w-[200px]">
                            <p className="text-xl font-bold text-amber-600 mb-1">{formatBookingId(booking.booking_id)}</p>
                            <p className="font-bold text-green-700 text-sm">Pickup</p>
                            <p className="text-sm text-gray-700 font-semibold">{booking.customer_name}</p>
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
                    </>
                  )}

                  {booking.dest_lat && booking.dest_lng && (
                    <>
                      <Marker
                        position={[booking.dest_lat, booking.dest_lng]}
                        icon={createLabelIcon(formatBookingId(booking.booking_id))}
                      />
                      <Marker
                        position={[booking.dest_lat, booking.dest_lng]}
                        icon={destinationIcon}
                      >
                        <Popup>
                          <div className="p-2 min-w-[200px]">
                            <p className="text-xl font-bold text-amber-600 mb-1">{formatBookingId(booking.booking_id)}</p>
                            <p className="font-bold text-red-700 text-sm">Destination</p>
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
                    </>
                  )}
                </div>
              ))}
            </MapContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-full bg-gray-50">
              <MapPin className="w-16 h-16 text-gray-300 mb-4" />
              <p className="text-gray-600 text-lg">No active bookings with coordinates</p>
              <p className="text-sm text-gray-500 mt-1">Completed jobs are not shown on the map</p>
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
