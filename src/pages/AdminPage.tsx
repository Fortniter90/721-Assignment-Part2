import { useState, useEffect, useCallback } from 'react';
import { supabase, type Booking, type Driver } from '../lib/supabase';
import { Search, CheckCircle, AlertCircle, Loader, Clock, User, MapPin, Users, Table as Tab } from 'lucide-react';
import DriverManagement from '../components/DriverManagement';
import BookingMap from '../components/BookingMap';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'bookings' | 'drivers' | 'map'>('bookings');
  const [searchInput, setSearchInput] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [assignConfirmation, setAssignConfirmation] = useState<string>('');
  const [showDriverModal, setShowDriverModal] = useState<Booking | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<number | null>(null);

  const formatBookingId = (id: number) => 'BRN' + String(id).padStart(5, '0');
  const formatDriverId = (id: number) => 'DRV' + String(id).padStart(5, '0');
  const formatTime = (time: string) => time.slice(0, -3);
  const formatDate = (date: string) => {
    const [year, month, day] = date.split('-');
    return `${day}/${month}/${year}`;
  };

  const searchBookings = useCallback(async () => {
    setError('');
    setAssignConfirmation('');
    setLoading(true);

    try {
      let query = supabase
        .from('bookings')
        .select('*');

      const bookingRefRegex = /^BRN\d{5}$/;

      if (searchInput.match(bookingRefRegex)) {
        const bookingId = parseInt(searchInput.replace(/^BRN0*/, ''));
        query = query.eq('booking_id', bookingId);
      } else if (searchInput === '') {
        query = query.order('pickup_date', { ascending: true }).order('pickup_time', { ascending: true });
      } else {
        setError('Please input a valid booking format (e.g BRN00001) or leave blank for all bookings');
        setLoading(false);
        return;
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;
      setBookings(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search bookings');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [searchInput]);

  useEffect(() => {
    if (activeTab === 'bookings') {
      searchBookings();
      fetchDrivers();
    }
  }, [activeTab, searchBookings]);

  const fetchDrivers = async () => {
    try {
      const { data } = await supabase
        .from('drivers')
        .select('*')
        .eq('status', 'available')
        .order('rating', { ascending: false });
      setDrivers(data || []);
    } catch (err) {
      console.error('Failed to fetch drivers:', err);
    }
  };

  const assignDriver = async (bookingId: number, driverId: number) => {
    try {
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          driver_id: driverId,
          status: 'assigned',
          driver_assigned_at: new Date().toISOString()
        })
        .eq('booking_id', bookingId);

      if (updateError) throw updateError;

      setAssignConfirmation(`Driver ${formatDriverId(driverId)} assigned to Booking ${formatBookingId(bookingId)}`);
      setShowDriverModal(null);
      setSelectedDriver(null);
      await searchBookings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign driver');
    }
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-8 py-6">
            <h1 className="text-4xl font-bold text-white mb-2">Admin Dashboard</h1>
            <p className="text-gray-300">Manage bookings, drivers, and view locations</p>
          </div>

          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('bookings')}
              className={`flex-1 px-6 py-4 font-semibold flex items-center justify-center gap-2 transition-colors ${
                activeTab === 'bookings'
                  ? 'bg-amber-50 text-amber-700 border-b-2 border-amber-500'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Clock className="w-5 h-5" />
              Bookings
            </button>
            <button
              onClick={() => setActiveTab('drivers')}
              className={`flex-1 px-6 py-4 font-semibold flex items-center justify-center gap-2 transition-colors ${
                activeTab === 'drivers'
                  ? 'bg-amber-50 text-amber-700 border-b-2 border-amber-500'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Users className="w-5 h-5" />
              Drivers
            </button>
            <button
              onClick={() => setActiveTab('map')}
              className={`flex-1 px-6 py-4 font-semibold flex items-center justify-center gap-2 transition-colors ${
                activeTab === 'map'
                  ? 'bg-amber-50 text-amber-700 border-b-2 border-amber-500'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <MapPin className="w-5 h-5" />
              Map View
            </button>
          </div>
        </div>

        {activeTab === 'bookings' && (
          <>
            {assignConfirmation && (
              <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
                <p className="text-green-800 font-semibold">{assignConfirmation}</p>
              </div>
            )}

            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
                <p className="text-red-800">{error}</p>
              </div>
            )}

            <div className="bg-white rounded-lg shadow-xl p-8 mb-6">
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
                    onKeyPress={(e) => e.key === 'Enter' && searchBookings()}
                    placeholder="Enter booking reference (e.g., BRN00001) or leave blank for all"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                  />
                </div>
                <button
                  onClick={searchBookings}
                  disabled={loading}
                  className="px-8 py-3 bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-white font-bold rounded-lg transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {loading && <Loader className="w-5 h-5 animate-spin" />}
                  Search
                </button>
              </div>
            </div>

            {bookings.length > 0 ? (
              <div className="bg-white rounded-lg shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
                      <tr>
                        <th className="px-6 py-4 text-left font-semibold">Booking</th>
                        <th className="px-6 py-4 text-left font-semibold">Customer</th>
                        <th className="px-6 py-4 text-left font-semibold">Phone</th>
                        <th className="px-6 py-4 text-left font-semibold">Pickup</th>
                        <th className="px-6 py-4 text-left font-semibold">Destination</th>
                        <th className="px-6 py-4 text-left font-semibold">Date & Time</th>
                        <th className="px-6 py-4 text-center font-semibold">Status</th>
                        <th className="px-6 py-4 text-center font-semibold">Driver</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {bookings.map((booking, idx) => (
                        <tr
                          key={booking.id}
                          className={idx % 2 === 0 ? 'bg-white hover:bg-amber-50' : 'bg-gray-50 hover:bg-amber-100'}
                        >
                          <td className="px-6 py-4 font-bold text-amber-600">
                            {formatBookingId(booking.booking_id)}
                          </td>
                          <td className="px-6 py-4 font-semibold">{booking.customer_name}</td>
                          <td className="px-6 py-4">{booking.customer_phone}</td>
                          <td className="px-6 py-4">
                            {booking.street_number} {booking.street_name}
                          </td>
                          <td className="px-6 py-4">
                            {booking.destination_street_number} {booking.destination_street_name}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4 text-amber-500" />
                              {formatTime(booking.pickup_time)} {formatDate(booking.pickup_date)}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full font-semibold ${
                                booking.status === 'completed'
                                  ? 'bg-gray-100 text-gray-800'
                                : booking.status === 'assigned'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {booking.status === 'completed' ? (
                                <>
                                  <CheckCircle className="w-4 h-4" />
                                  Completed
                                </>
                              ) : booking.status === 'assigned' ? (
                                <>
                                  <CheckCircle className="w-4 h-4" />
                                  Assigned
                                </>
                              ) : (
                                <>
                                  <Clock className="w-4 h-4" />
                                  Pending
                                </>
                              )}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {booking.status === 'completed' ? (
                              <span className="text-gray-400 italic">Completed</span>
                            ) : booking.driver_id ? (
                              <div className="flex items-center justify-center gap-2">
                                <User className="w-4 h-4 text-gray-600" />
                                <span className="font-semibold">{formatDriverId(booking.driver_id)}</span>
                              </div>
                            ) : (
                              <button
                                onClick={() => setShowDriverModal(booking)}
                                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors flex items-center gap-1 mx-auto"
                              >
                                <User className="w-4 h-4" />
                                Assign Driver
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : !loading && !error ? (
              <div className="bg-white rounded-lg shadow-xl p-12 text-center">
                <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">No bookings found</p>
              </div>
            ) : null}

            {showDriverModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
                  <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-4 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-white">
                      Assign Driver to {formatBookingId(showDriverModal.booking_id)}
                    </h3>
                    <button
                      onClick={() => setShowDriverModal(null)}
                      className="text-white hover:text-amber-400 text-2xl"
                    >
                      ×
                    </button>
                  </div>

                  <div className="p-6">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                      <p className="text-gray-700">
                        <span className="font-semibold">Booking:</span> {formatBookingId(showDriverModal.booking_id)}<br />
                        <span className="font-semibold">Route:</span> {showDriverModal.pickup_suburb || 'Unknown'} → {showDriverModal.destination_suburb}<br />
                        <span className="font-semibold">Time:</span> {formatTime(showDriverModal.pickup_time)} {formatDate(showDriverModal.pickup_date)}
                      </p>
                    </div>

                    {drivers.length > 0 ? (
                      <>
                        <h4 className="text-lg font-bold mb-4">Available Drivers</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[40vh] overflow-y-auto">
                          {drivers.map(driver => (
                            <button
                              key={driver.id}
                              onClick={() => setSelectedDriver(driver.driver_id)}
                              className={`p-4 rounded-lg border-2 text-left transition-all ${
                                selectedDriver === driver.driver_id
                                  ? 'border-amber-500 bg-amber-50'
                                  : 'border-gray-200 hover:border-amber-300'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="font-bold">{driver.name}</p>
                                  <p className="text-sm text-gray-600">{formatDriverId(driver.driver_id)}</p>
                                  <p className="text-sm text-gray-600">{driver.vehicle_year} {driver.vehicle_make} {driver.vehicle_model}</p>
                                  <p className="text-sm text-gray-600">{driver.vehicle_color} • {driver.vehicle_plate}</p>
                                </div>
                                <div className="bg-amber-100 px-2 py-1 rounded flex items-center gap-1">
                                  <span className="font-bold text-amber-800">{driver.rating.toFixed(1)}</span>
                                  <span className="text-amber-600">★</span>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>

                        <div className="flex gap-3 mt-6">
                          <button
                            onClick={() => selectedDriver && assignDriver(showDriverModal.booking_id, selectedDriver)}
                            disabled={!selectedDriver}
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                          >
                            Confirm Assignment
                          </button>
                          <button
                            onClick={() => setShowDriverModal(null)}
                            className="px-6 py-3 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold rounded-lg"
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-600">No available drivers</p>
                        <p className="text-sm text-gray-500 mt-1">Add drivers in the Drivers tab first</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'drivers' && (
          <DriverManagement />
        )}

        {activeTab === 'map' && (
          <BookingMap />
        )}
      </div>
    </div>
  );
}
