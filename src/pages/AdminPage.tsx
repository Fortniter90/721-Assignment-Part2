import { useState, useEffect, useCallback } from 'react';
import { supabase, type Booking, type Driver } from '../lib/supabase';
import { Search, CheckCircle, AlertCircle, Loader, Clock, User, MapPin, Users, AlertTriangle, X, Navigation } from 'lucide-react';
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
  // Address popup: stores { label, address } or null
  const [addressPopup, setAddressPopup] = useState<{ label: string; address: string } | null>(null);

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
      let query = supabase.from('bookings').select('*');

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

      const sortedData = (data || []).sort((a, b) => {
        const now = new Date();
        const twoHours = 2 * 60 * 60 * 1000;
        const aDateTime = new Date(`${a.pickup_date}T${a.pickup_time}`);
        const bDateTime = new Date(`${b.pickup_date}T${b.pickup_time}`);
        const aUrgent = a.status === 'unassigned' && (aDateTime.getTime() - now.getTime()) <= twoHours;
        const bUrgent = b.status === 'unassigned' && (bDateTime.getTime() - now.getTime()) <= twoHours;
        if (aUrgent && !bUrgent) return -1;
        if (!aUrgent && bUrgent) return 1;
        if (aDateTime < bDateTime) return -1;
        if (aDateTime > bDateTime) return 1;
        return 0;
      });

      setBookings(sortedData);
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

  // Helper: render an address cell with a "..." button popup if long
  const AddressCell = ({ address, label }: { address: string | null; label: string }) => {
    if (!address) return <span className="text-gray-400 italic text-xs">No address</span>;

    const truncated = address.length > 30 ? address.substring(0, 30) + '…' : address;
    const isLong = address.length > 30;

    return (
      <div className="flex items-center gap-1 min-w-0">
        <span className="truncate text-sm">{truncated}</span>
        {isLong && (
          <button
            onClick={() => setAddressPopup({ label, address })}
            title="View full address"
            className="flex-shrink-0 text-amber-600 hover:text-amber-800 text-xs font-bold bg-amber-50 hover:bg-amber-100 rounded px-1 py-0.5 transition-colors"
          >
            ···
          </button>
        )}
      </div>
    );
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
                {/* No overflow-x-auto — table uses fixed layout fitting the container */}
                <table className="w-full table-fixed">
                  <colgroup>
                    <col className="w-[10%]" />  {/* Booking */}
                    <col className="w-[12%]" />  {/* Customer */}
                    <col className="w-[11%]" />  {/* Phone */}
                    <col className="w-[16%]" />  {/* Pickup */}
                    <col className="w-[16%]" />  {/* Destination */}
                    <col className="w-[13%]" />  {/* Date & Time */}
                    <col className="w-[11%]" />  {/* Status */}
                    <col className="w-[11%]" />  {/* Driver */}
                  </colgroup>
                  <thead className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
                    <tr>
                      <th className="px-3 py-4 text-left text-sm font-semibold">Booking</th>
                      <th className="px-3 py-4 text-left text-sm font-semibold">Customer</th>
                      <th className="px-3 py-4 text-left text-sm font-semibold">Phone</th>
                      <th className="px-3 py-4 text-left text-sm font-semibold">Pickup</th>
                      <th className="px-3 py-4 text-left text-sm font-semibold">Destination</th>
                      <th className="px-3 py-4 text-left text-sm font-semibold">Date & Time</th>
                      <th className="px-3 py-4 text-center text-sm font-semibold">Status</th>
                      <th className="px-3 py-4 text-center text-sm font-semibold">Driver</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {bookings.map((booking, idx) => {
                      const now = new Date();
                      const pickupDateTime = new Date(`${booking.pickup_date}T${booking.pickup_time}`);
                      const hoursUntilPickup = (pickupDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
                      const isUrgent = booking.status === 'unassigned' && hoursUntilPickup <= 2 && hoursUntilPickup > 0;

                      return (
                        <tr
                          key={booking.id}
                          className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${
                            isUrgent ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-amber-50'
                          } transition-colors`}
                        >
                          <td className="px-3 py-4">
                            <div className="flex items-center gap-1">
                              <span className="font-bold text-amber-600 text-sm">{formatBookingId(booking.booking_id)}</span>
                              {isUrgent && <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse flex-shrink-0" />}
                            </div>
                          </td>
                          <td className="px-3 py-4">
                            <span className="font-semibold text-sm truncate block">{booking.customer_name}</span>
                          </td>
                          <td className="px-3 py-4">
                            <span className="text-sm">{booking.customer_phone}</span>
                          </td>
                          <td className="px-3 py-4 overflow-hidden">
                            <AddressCell
                              address={booking.pickup_address}
                              label={`Pickup – ${formatBookingId(booking.booking_id)}`}
                            />
                          </td>
                          <td className="px-3 py-4 overflow-hidden">
                            <AddressCell
                              address={booking.destination_address}
                              label={`Destination – ${formatBookingId(booking.booking_id)}`}
                            />
                          </td>
                          <td className="px-3 py-4">
                            <div className="flex items-center gap-1 text-sm">
                              <Clock className="w-3 h-3 text-amber-500 flex-shrink-0" />
                              <span className="whitespace-nowrap">{formatTime(booking.pickup_time)}</span>
                              <span className="whitespace-nowrap text-gray-500">{formatDate(booking.pickup_date)}</span>
                            </div>
                          </td>
                          <td className="px-3 py-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                                booking.status === 'completed'
                                  ? 'bg-gray-100 text-gray-800'
                                  : booking.status === 'in_transit'
                                  ? 'bg-blue-100 text-blue-800'
                                  : booking.status === 'assigned'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {booking.status === 'completed' ? (
                                <><CheckCircle className="w-3 h-3" />Done</>
                              ) : booking.status === 'in_transit' ? (
                                <><Navigation className="w-3 h-3" />Transit</>
                              ) : booking.status === 'assigned' ? (
                                <><CheckCircle className="w-3 h-3" />Assigned</>
                              ) : (
                                <><Clock className="w-3 h-3" />Pending</>
                              )}
                            </span>
                          </td>
                          <td className="px-3 py-4 text-center">
                            {booking.status === 'completed' ? (
                              <span className="text-gray-400 italic text-xs">Done</span>
                            ) : booking.driver_id ? (
                              <div className="flex items-center justify-center gap-1">
                                <User className="w-3 h-3 text-gray-600" />
                                <span className="font-semibold text-sm">{formatDriverId(booking.driver_id)}</span>
                              </div>
                            ) : (
                              <button
                                onClick={() => setShowDriverModal(booking)}
                                className="px-2 py-1.5 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors flex items-center gap-1 mx-auto text-xs"
                              >
                                <User className="w-3 h-3" />
                                Assign
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : !loading && !error ? (
              <div className="bg-white rounded-lg shadow-xl p-12 text-center">
                <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">No bookings found</p>
              </div>
            ) : null}

            {/* ── Address popup modal ── */}
            {addressPopup && (
              <div
                className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4"
                onClick={() => setAddressPopup(null)}
              >
                <div
                  className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 relative"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => setAddressPopup(null)}
                    className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">{addressPopup.label}</p>
                  <p className="text-gray-800 text-sm leading-relaxed">{addressPopup.address}</p>
                </div>
              </div>
            )}

            {/* ── Assign Driver modal ── */}
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

        {activeTab === 'drivers' && <DriverManagement />}
        {activeTab === 'map' && <BookingMap />}
      </div>
    </div>
  );
}