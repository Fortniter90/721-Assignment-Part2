import { useState, useEffect, useRef } from 'react';
import { supabase, type Booking } from '../lib/supabase';
import { CheckCircle, AlertCircle, Loader, MapPin, X } from 'lucide-react';

interface AddressSuggestion {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
}

export default function BookingPage() {
  const [loading, setLoading] = useState(false);
  const [confirmation, setConfirmation] = useState<Booking | null>(null);
  const [error, setError] = useState<string>('');

  const [formData, setFormData] = useState({
    cname: '',
    phone: '',
    pickup_address: '',
    pickup_lat: '',
    pickup_lng: '',
    destination_address: '',
    dest_lat: '',
    dest_lng: '',
    date: '',
    time: '',
  });

  const [pickupSuggestions, setPickupSuggestions] = useState<AddressSuggestion[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<AddressSuggestion[]>([]);
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);
  const [pickupSearching, setPickupSearching] = useState(false);
  const [destSearching, setDestSearching] = useState(false);

  const pickupDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const destDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const searchAddresses = async (query: string, type: 'pickup' | 'destination') => {
    if (query.length < 3) {
      if (type === 'pickup') {
        setPickupSuggestions([]);
        setShowPickupSuggestions(false);
      } else {
        setDestSuggestions([]);
        setShowDestSuggestions(false);
      }
      return;
    }

    if (type === 'pickup') setPickupSearching(true);
    else setDestSearching(true);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycode=nz`
      );
      const data: AddressSuggestion[] = await response.json();

      if (type === 'pickup') {
        setPickupSuggestions(data);
        setShowPickupSuggestions(true);
      } else {
        setDestSuggestions(data);
        setShowDestSuggestions(true);
      }
    } catch (err) {
      console.error('Address search error:', err);
    } finally {
      if (type === 'pickup') setPickupSearching(false);
      else setDestSearching(false);
    }
  };

  const handlePickupChange = (value: string) => {
    setFormData(prev => ({ ...prev, pickup_address: value, pickup_lat: '', pickup_lng: '' }));
    if (pickupDebounceRef.current) clearTimeout(pickupDebounceRef.current);
    pickupDebounceRef.current = setTimeout(() => searchAddresses(value, 'pickup'), 300);
  };

  const handleDestChange = (value: string) => {
    setFormData(prev => ({ ...prev, destination_address: value, dest_lat: '', dest_lng: '' }));
    if (destDebounceRef.current) clearTimeout(destDebounceRef.current);
    destDebounceRef.current = setTimeout(() => searchAddresses(value, 'destination'), 300);
  };

  const selectPickupAddress = (suggestion: AddressSuggestion) => {
    setFormData(prev => ({
      ...prev,
      pickup_address: suggestion.display_name,
      pickup_lat: suggestion.lat,
      pickup_lng: suggestion.lon,
    }));
    setShowPickupSuggestions(false);
    setPickupSuggestions([]);
  };

  const selectDestAddress = (suggestion: AddressSuggestion) => {
    setFormData(prev => ({
      ...prev,
      destination_address: suggestion.display_name,
      dest_lat: suggestion.lat,
      dest_lng: suggestion.lon,
    }));
    setShowDestSuggestions(false);
    setDestSuggestions([]);
  };

  useEffect(() => {
    return () => {
      if (pickupDebounceRef.current) clearTimeout(pickupDebounceRef.current);
      if (destDebounceRef.current) clearTimeout(destDebounceRef.current);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!formData.pickup_lat || !formData.pickup_lng) {
      setError('Please select a valid pickup address from the suggestions');
      setLoading(false);
      return;
    }

    if (!formData.dest_lat || !formData.dest_lng) {
      setError('Please select a valid destination address from the suggestions');
      setLoading(false);
      return;
    }

    const bookingDateTime = new Date(`${formData.date} ${formData.time}`);
    if (bookingDateTime <= new Date()) {
      setError(`Please provide a time after ${new Date().toLocaleString()}`);
      setLoading(false);
      return;
    }

    try {
      // Parse the address to extract components
      const pickupParts = formData.pickup_address.split(',').map(s => s.trim());
      const destParts = formData.destination_address.split(',').map(s => s.trim());

      // Get street number and name from first part
      const streetMatch = pickupParts[0].match(/^(\d+)\s+(.+)$/);
      const streetNumber = streetMatch ? streetMatch[1] : '';
      const streetName = streetMatch ? streetMatch[2] : pickupParts[0];

      // Get suburb (usually second or third part)
      const pickupSuburb = pickupParts[1] || pickupParts[2] || 'Auckland';
      const destSuburb = destParts[1] || destParts[2] || 'Auckland';

      const { data, error: insertError } = await supabase
        .from('bookings')
        .insert([
          {
            customer_name: formData.cname,
            customer_phone: formData.phone,
            street_number: streetNumber,
            street_name: streetName,
            pickup_suburb: pickupSuburb,
            destination_suburb: destSuburb,
            pickup_date: formData.date,
            pickup_time: formData.time,
            status: 'unassigned',
            pickup_latitude: parseFloat(formData.pickup_lat),
            pickup_longitude: parseFloat(formData.pickup_lng),
            destination_latitude: parseFloat(formData.dest_lat),
            destination_longitude: parseFloat(formData.dest_lng),
          },
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      setConfirmation(data);
      setFormData({
        cname: '',
        phone: '',
        pickup_address: '',
        pickup_lat: '',
        pickup_lng: '',
        destination_address: '',
        dest_lat: '',
        dest_lng: '',
        date: '',
        time: '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  const formatBookingId = (id: number) => 'BRN' + String(id).padStart(5, '0');
  const formatTime = (time: string) => time.slice(0, -3);
  const formatDate = (date: string) => {
    const [year, month, day] = date.split('-');
    return `${day}/${month}/${year}`;
  };

  if (confirmation) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Booking Confirmed!</h1>
          <p className="text-gray-600 mb-6">Your cab has been booked successfully.</p>

          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-6 mb-6 text-left">
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Booking Reference</label>
                <p className="text-2xl font-bold text-amber-600">{formatBookingId(confirmation.booking_id)}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</label>
                <p className="text-lg font-semibold text-gray-900">{confirmation.customer_name}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date & Time</label>
                <p className="text-gray-800">{formatTime(confirmation.pickup_time)} on {formatDate(confirmation.pickup_date)}</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setConfirmation(null);
              const now = new Date();
              now.setMinutes(now.getMinutes() + 30);
              setFormData(prev => ({
                ...prev,
                date: now.toISOString().split('T')[0],
                time: now.toTimeString().slice(0, 5),
              }));
            }}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            Book Another Cab
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Book a Cab</h1>
        <p className="text-gray-600 mb-8">Enter your details and select precise locations from the dropdown</p>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Customer Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 font-bold text-sm">1</span>
              Customer Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name *</label>
                <input
                  type="text"
                  name="cname"
                  value={formData.cname}
                  onChange={(e) => setFormData(prev => ({ ...prev, cname: e.target.value }))}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                  placeholder="+64 9 123 4567"
                />
              </div>
            </div>
          </div>

          {/* Pickup Location */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold text-sm">2</span>
              Pickup Location
            </h3>
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Pickup Address *
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3.5 w-5 h-5 text-green-500" />
                <input
                  type="text"
                  value={formData.pickup_address}
                  onChange={(e) => handlePickupChange(e.target.value)}
                  onFocus={() => formData.pickup_address.length >= 3 && pickupSuggestions.length > 0 && setShowPickupSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowPickupSuggestions(false), 200)}
                  required
                  className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  placeholder="Start typing an address (e.g., 123 Queen Street, Auckland)"
                />
                {pickupSearching && (
                  <Loader className="absolute right-3 top-3.5 w-5 h-5 text-gray-400 animate-spin" />
                )}
                {formData.pickup_lat && (
                  <CheckCircle className="absolute right-3 top-3.5 w-5 h-5 text-green-500" />
                )}
              </div>
              {showPickupSuggestions && pickupSuggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                  {pickupSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.place_id}
                      type="button"
                      onClick={() => selectPickupAddress(suggestion)}
                      className="w-full px-4 py-3 text-left hover:bg-amber-50 border-b border-gray-100 last:border-0 transition-colors"
                    >
                      <p className="text-sm font-medium text-gray-900">{suggestion.display_name}</p>
                      <p className="text-xs text-gray-500 mt-1">Click to select</p>
                    </button>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">Select from dropdown for accurate location</p>
            </div>
          </div>

          {/* Destination */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-red-700 font-bold text-sm">3</span>
              Destination
            </h3>
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Destination Address *
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3.5 w-5 h-5 text-red-500" />
                <input
                  type="text"
                  value={formData.destination_address}
                  onChange={(e) => handleDestChange(e.target.value)}
                  onFocus={() => formData.destination_address.length >= 3 && destSuggestions.length > 0 && setShowDestSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowDestSuggestions(false), 200)}
                  required
                  className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  placeholder="Start typing an address (e.g., Auckland Airport)"
                />
                {destSearching && (
                  <Loader className="absolute right-3 top-3.5 w-5 h-5 text-gray-400 animate-spin" />
                )}
                {formData.dest_lat && (
                  <CheckCircle className="absolute right-3 top-3.5 w-5 h-5 text-green-500" />
                )}
              </div>
              {showDestSuggestions && destSuggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                  {destSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.place_id}
                      type="button"
                      onClick={() => selectDestAddress(suggestion)}
                      className="w-full px-4 py-3 text-left hover:bg-amber-50 border-b border-gray-100 last:border-0 transition-colors"
                    >
                      <p className="text-sm font-medium text-gray-900">{suggestion.display_name}</p>
                      <p className="text-xs text-gray-500 mt-1">Click to select</p>
                    </button>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">Select from dropdown for accurate location</p>
            </div>
          </div>

          {/* Date & Time */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-sm">4</span>
              Pickup Time
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Date *</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  required
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Time *</label>
                <input
                  type="time"
                  name="time"
                  value={formData.time}
                  onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-lg font-bold py-4 rounded-lg transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {loading && <Loader className="w-5 h-5 animate-spin" />}
            {loading ? 'Processing...' : 'Book Now'}
          </button>
        </form>
      </div>
    </div>
  );
}
