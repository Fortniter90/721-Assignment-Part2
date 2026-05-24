import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase, type Booking, type Driver } from '../lib/supabase';
import { MapPin, Navigation, Loader, AlertCircle, CheckCircle, Clock, User, Car, RefreshCw } from 'lucide-react';

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

export default function DriverPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [availableJobs, setAvailableJobs] = useState<BookingWithCoords[]>([]);
  const [myJobs, setMyJobs] = useState<BookingWithCoords[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const formatBookingId = (id: number) => 'BRN' + String(id).padStart(5, '0');
  const formatTime = (time: string) => time.slice(0, -3);
  const formatDate = (date: string) => {
    const [year, month, day] = date.split('-');
    return `${day}/${month}/${year}`;
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  useEffect(() => {
    if (selectedDriver) {
      fetchJobs();
    }
  }, [selectedDriver]);

  const fetchDrivers = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('drivers')
        .select('*')
        .order('name');

      if (fetchError) throw fetchError;
      setDrivers(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch drivers');
    }
  };

  const fetchJobs = async () => {
    if (!selectedDriver) return;
    setLoading(true);
    try {
      // Fetch all active bookings with coordinates (excluding completed)
      const { data: allBookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .neq('status', 'completed')
        .not('pickup_latitude', 'is', null)
        .order('pickup_date', { ascending: true });

      if (bookingsError) throw bookingsError;

      const bookingsWithCoords = (allBookings || []).map(b => ({
        ...b,
        pickup_lat: b.pickup_latitude,
        pickup_lng: b.pickup_longitude,
        dest_lat: b.destination_latitude,
        dest_lng: b.destination_longitude,
      }));

      // Available jobs: unassigned or assigned to me
      const available = bookingsWithCoords.filter(
        b => b.status === 'unassigned' || b.driver_id === selectedDriver.driver_id
      );

      // My active jobs
      const mine = bookingsWithCoords.filter(
        b => b.driver_id === selectedDriver.driver_id && b.status === 'assigned'
      );

      setAvailableJobs(available);
      setMyJobs(mine);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  };

  const assignJob = async (bookingId: number) => {
    if (!selectedDriver) return;

    try {
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          driver_id: selectedDriver.driver_id,
          status: 'assigned',
          driver_assigned_at: new Date().toISOString()
        })
        .eq('booking_id', bookingId);

      if (updateError) throw updateError;

      // Update driver status to busy
      await supabase
        .from('drivers')
        .update({ status: 'busy' })
        .eq('driver_id', selectedDriver.driver_id);

      await fetchDrivers();
      await fetchJobs();

      // Update local driver state
      setSelectedDriver(prev => prev ? { ...prev, status: 'busy' } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign job');
    }
  };

  const completeJob = async (bookingId: number) => {
    if (!selectedDriver) return;

    try {
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ status: 'completed' })
        .eq('booking_id', bookingId);

      if (updateError) throw updateError;

      // Update driver trip count directly
      const { error: tripError } = await supabase
        .from('drivers')
        .update({ total_trips: selectedDriver.total_trips + 1 })
        .eq('driver_id', selectedDriver.driver_id);

      if (tripError) console.error('Failed to update trip count:', tripError);

      await fetchJobs();

      // Update local driver state
      setSelectedDriver(prev =>
        prev ? { ...prev, total_trips: prev.total_trips + 1 } : null
      );

      // Check if all jobs completed - set driver to available
      const remainingJobs = myJobs.filter(j => j.booking_id !== bookingId);
      if (remainingJobs.length === 0) {
        const { error: statusError } = await supabase
          .from('drivers')
          .update({ status: 'available' })
          .eq('driver_id', selectedDriver.driver_id);

        if (!statusError) {
          setSelectedDriver(prev => prev ? { ...prev, status: 'available' } : null);
          await fetchDrivers();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete job');
    }
  };

  const setDriverStatus = async (status: 'available' | 'offline') => {
    if (!selectedDriver) return;

    if (status === 'offline' && myJobs.length > 0) {
      setError('Complete all your assigned jobs before going offline');
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from('drivers')
        .update({ status })
        .eq('driver_id', selectedDriver.driver_id);

      if (updateError) throw updateError;

      await fetchDrivers();
      setSelectedDriver(prev => prev ? { ...prev, status } : null);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const selectDriver = (driver: Driver) => {
    setSelectedDriver(driver);
    setError('');
  };

  if (!selectedDriver) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <Car className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Driver Portal</h1>
            <p className="text-gray-600">Select your driver profile to access your dashboard</p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-3">
            {drivers.map(driver => (
              <button
                key={driver.id}
                onClick={() => selectDriver(driver)}
                className="w-full p-4 rounded-lg bg-slate-800 hover:bg-slate-600 text-white transition-colors text-left"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-lg">{driver.name}</p>
                    <p className="text-sm text-slate-300">
                      {driver.vehicle_year} {driver.vehicle_make} {driver.vehicle_model}
                    </p>
                    <p className="text-sm text-slate-400">{driver.vehicle_plate}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${
                      driver.status === 'available' ? 'text-green-400' :
                      driver.status === 'busy' ? 'text-amber-400' : 'text-gray-400'
                    }`}>
                      {driver.status.toUpperCase()}
                    </p>
                    <p className="text-xs text-slate-400">{driver.total_trips} trips</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {drivers.length === 0 && !loading && (
            <p className="text-center text-gray-500 mt-8">No drivers found. Create drivers in the admin dashboard.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{selectedDriver.name}</h1>
              <p className="text-gray-600">{selectedDriver.vehicle_make} {selectedDriver.vehicle_model}</p>
              <p className="text-sm text-gray-500">{selectedDriver.total_trips} completed trips</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`px-4 py-2 rounded-lg font-semibold ${
              selectedDriver.status === 'available' ? 'bg-green-100 text-green-800' :
              selectedDriver.status === 'busy' ? 'bg-amber-100 text-amber-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {selectedDriver.status.toUpperCase()}
            </div>
            <button
              onClick={fetchJobs}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <RefreshCw className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={() => setSelectedDriver(null)}
              className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-semibold rounded-lg transition-colors"
            >
              Switch Driver
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-red-800">{error}</p>
          <button onClick={() => setError('')} className="ml-auto text-red-600 hover:text-red-800">Dismiss</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-lg p-4">
          <p className="text-3xl font-bold text-blue-600">{availableJobs.filter(j => j.status === 'unassigned').length}</p>
          <p className="text-sm text-gray-600">Available Jobs</p>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-4">
          <p className="text-3xl font-bold text-amber-600">{myJobs.length}</p>
          <p className="text-sm text-gray-600">My Active Jobs</p>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-4">
          <p className="text-3xl font-bold text-green-600">{selectedDriver.total_trips}</p>
          <p className="text-sm text-gray-600">Completed Trips</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Job List */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Available Jobs</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setDriverStatus('available')}
                disabled={selectedDriver.status === 'available'}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  selectedDriver.status === 'available'
                    ? 'bg-green-500 text-white'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                Go Available
              </button>
              <button
                onClick={() => setDriverStatus('offline')}
                disabled={myJobs.length > 0}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  selectedDriver.status === 'offline'
                    ? 'bg-gray-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Go Offline
              </button>
            </div>
          </div>

          {myJobs.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-amber-700 mb-3">My Assigned Jobs</h3>
              <div className="space-y-3">
                {myJobs.map(job => (
                  <div key={job.id} className="p-4 rounded-lg bg-amber-50 border-2 border-amber-300">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold text-gray-900">{formatBookingId(job.booking_id)}</p>
                        <p className="text-sm text-gray-700">{job.customer_name}</p>
                      </div>
                      <span className="px-2 py-1 bg-amber-500 text-white text-xs font-semibold rounded">IN PROGRESS</span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><MapPin className="w-4 h-4 inline text-green-500" /> {job.pickup_suburb}</p>
                      <p><Navigation className="w-4 h-4 inline text-red-500" /> {job.destination_suburb}</p>
                      <p><Clock className="w-4 h-4 inline text-gray-400" /> {formatTime(job.pickup_time)} {formatDate(job.pickup_date)}</p>
                    </div>
                    <button
                      onClick={() => completeJob(job.booking_id)}
                      className="w-full mt-3 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Complete Job
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <h3 className="text-lg font-semibold text-gray-700 mb-3">Unassigned Jobs</h3>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="w-6 h-6 animate-spin text-amber-500" />
            </div>
          ) : availableJobs.filter(j => j.status === 'unassigned').length > 0 ? (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {availableJobs.filter(j => j.status === 'unassigned').map(job => (
                <div key={job.id} className="p-4 rounded-lg bg-gray-50 border border-gray-200 hover:border-amber-300 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-gray-900">{formatBookingId(job.booking_id)}</p>
                      <p className="text-sm text-gray-700">{job.customer_name} • {job.customer_phone}</p>
                    </div>
                    <button
                      onClick={() => assignJob(job.booking_id)}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors text-sm"
                    >
                      Accept Job
                    </button>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1 mt-2 pt-2 border-t border-gray-200">
                    <p><MapPin className="w-4 h-4 inline text-green-500" /> {job.pickup_suburb || `${job.street_number} ${job.street_name}`}</p>
                    <p><Navigation className="w-4 h-4 inline text-red-500" /> {job.destination_suburb}</p>
                    <p><Clock className="w-4 h-4 inline text-gray-400" /> {formatTime(job.pickup_time)} {formatDate(job.pickup_date)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No available jobs with coordinates</p>
            </div>
          )}
        </div>

        {/* Map */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Job Locations</h2>
          <div className="h-[600px] rounded-lg overflow-hidden border-2 border-gray-200">
            {availableJobs.some(j => j.pickup_lat) ? (
              <MapContainer
                center={[-36.8485, 174.7633]}
                zoom={12}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <FitBounds bookings={availableJobs.filter(j => j.pickup_lat && j.pickup_lng)} />

                {availableJobs.filter(j => j.pickup_lat).map(job => {
                  const isMine = job.driver_id === selectedDriver.driver_id;
                  return (
                    <div key={job.id}>
                      {job.pickup_lat && job.pickup_lng && (
                        <>
                          <Marker
                            position={[job.pickup_lat, job.pickup_lng]}
                            icon={createLabelIcon(formatBookingId(job.booking_id))}
                          />
                          <Marker position={[job.pickup_lat, job.pickup_lng]} icon={pickupIcon}>
                            <Popup>
                              <div className="p-2">
                                <p className="text-xl font-bold text-amber-600 mb-1">{formatBookingId(job.booking_id)}</p>
                                <p className={`font-bold text-sm ${isMine ? 'text-amber-600' : 'text-green-700'}`}>
                                  {isMine ? 'YOUR JOB - PICKUP' : 'PICKUP'}
                                </p>
                                <p className="text-sm font-semibold">{job.customer_name}</p>
                                <p className="text-sm text-gray-600">{job.pickup_suburb}</p>
                                <p className="text-xs text-gray-500 mt-1">{formatTime(job.pickup_time)} {formatDate(job.pickup_date)}</p>
                                {job.status === 'unassigned' && (
                                  <button
                                    onClick={() => assignJob(job.booking_id)}
                                    className="mt-2 w-full px-3 py-1 bg-blue-500 text-white text-sm rounded"
                                  >
                                    Accept
                                  </button>
                                )}
                              </div>
                            </Popup>
                          </Marker>
                        </>
                      )}
                      {job.dest_lat && job.dest_lng && (
                        <>
                          <Marker
                            position={[job.dest_lat, job.dest_lng]}
                            icon={createLabelIcon(formatBookingId(job.booking_id))}
                          />
                          <Marker position={[job.dest_lat, job.dest_lng]} icon={destinationIcon}>
                            <Popup>
                              <div className="p-2">
                                <p className="text-xl font-bold text-amber-600 mb-1">{formatBookingId(job.booking_id)}</p>
                                <p className="font-bold text-red-700 text-sm">DESTINATION</p>
                                <p className="text-sm text-gray-600">{job.destination_suburb}</p>
                              </div>
                            </Popup>
                          </Marker>
                        </>
                      )}
                    </div>
                  );
                })}
              </MapContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full bg-gray-50">
                <MapPin className="w-16 h-16 text-gray-300" />
                <p className="text-gray-600 mt-2">No jobs with coordinates available</p>
              </div>
            )}
          </div>

          <div className="mt-4 bg-gradient-to-r from-green-50 to-red-50 rounded-lg p-3">
            <div className="flex justify-center gap-8">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-500"></div>
                <span className="text-sm text-gray-700">Pickup</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-500"></div>
                <span className="text-sm text-gray-700">Destination</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
