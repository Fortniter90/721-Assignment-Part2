import { useState, useEffect } from 'react';
import { supabase, type Driver } from '../lib/supabase';
import { UserPlus, CreditCard as Edit, Trash2, Car, Star, CheckCircle, XCircle, Loader, Search } from 'lucide-react';

export default function DriverManagement() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string>('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    license_number: '',
    vehicle_make: '',
    vehicle_model: '',
    vehicle_year: '',
    vehicle_color: '',
    vehicle_plate: '',
  });

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('drivers')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setDrivers(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch drivers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const driverData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        license_number: formData.license_number,
        vehicle_make: formData.vehicle_make,
        vehicle_model: formData.vehicle_model,
        vehicle_year: parseInt(formData.vehicle_year),
        vehicle_color: formData.vehicle_color,
        vehicle_plate: formData.vehicle_plate,
      };

      if (editingDriver) {
        const { error: updateError } = await supabase
          .from('drivers')
          .update(driverData)
          .eq('driver_id', editingDriver.driver_id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('drivers')
          .insert([driverData]);

        if (insertError) throw insertError;
      }

      await fetchDrivers();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save driver');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      license_number: '',
      vehicle_make: '',
      vehicle_model: '',
      vehicle_year: '',
      vehicle_color: '',
      vehicle_plate: '',
    });
    setShowForm(false);
    setEditingDriver(null);
  };

  const handleEdit = (driver: Driver) => {
    setFormData({
      name: driver.name,
      email: driver.email,
      phone: driver.phone,
      license_number: driver.license_number,
      vehicle_make: driver.vehicle_make,
      vehicle_model: driver.vehicle_model,
      vehicle_year: driver.vehicle_year.toString(),
      vehicle_color: driver.vehicle_color,
      vehicle_plate: driver.vehicle_plate,
    });
    setEditingDriver(driver);
    setShowForm(true);
  };

  const handleDelete = async (driverId: number) => {
    if (!confirm('Are you sure you want to delete this driver?')) return;

    setLoading(true);
    try {
      const { error: deleteError } = await supabase
        .from('drivers')
        .delete()
        .eq('driver_id', driverId);

      if (deleteError) throw deleteError;
      await fetchDrivers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete driver');
    } finally {
      setLoading(false);
    }
  };

  const toggleDriverStatus = async (driver: Driver) => {
    try {
      const newStatus = driver.status === 'available' ? 'offline' : 'available';
      const { error: updateError } = await supabase
        .from('drivers')
        .update({ status: newStatus })
        .eq('driver_id', driver.driver_id);

      if (updateError) throw updateError;
      await fetchDrivers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update driver status');
    }
  };

  const filteredDrivers = drivers.filter(d =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.vehicle_plate.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-white rounded-lg shadow-xl p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Driver Management</h2>
          <p className="text-gray-600 mt-1">Create and manage driver accounts</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold rounded-lg transition-all"
        >
          <UserPlus className="w-5 h-5" />
          Add Driver
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <XCircle className="w-5 h-5 text-red-500" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {showForm && (
        <div className="mb-8 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-6 border-2 border-amber-300">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            {editingDriver ? 'Edit Driver' : 'Create New Driver'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Phone *</label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">License Number *</label>
                <input
                  type="text"
                  required
                  value={formData.license_number}
                  onChange={e => setFormData({ ...formData, license_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>

            <div className="border-t-2 border-gray-300 pt-4 mt-4">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Car className="w-5 h-5 text-amber-500" />
                Vehicle Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Make *</label>
                  <input
                    type="text"
                    required
                    value={formData.vehicle_make}
                    onChange={e => setFormData({ ...formData, vehicle_make: e.target.value })}
                    placeholder="Toyota"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Model *</label>
                  <input
                    type="text"
                    required
                    value={formData.vehicle_model}
                    onChange={e => setFormData({ ...formData, vehicle_model: e.target.value })}
                    placeholder="Camry"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Year *</label>
                  <input
                    type="number"
                    required
                    value={formData.vehicle_year}
                    onChange={e => setFormData({ ...formData, vehicle_year: e.target.value })}
                    placeholder="2023"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Color *</label>
                  <input
                    type="text"
                    required
                    value={formData.vehicle_color}
                    onChange={e => setFormData({ ...formData, vehicle_color: e.target.value })}
                    placeholder="White"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">License Plate *</label>
                  <input
                    type="text"
                    required
                    value={formData.vehicle_plate}
                    onChange={e => setFormData({ ...formData, vehicle_plate: e.target.value.toUpperCase() })}
                    placeholder="ABC123"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-white font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                {loading && <Loader className="w-4 h-4 animate-spin" />}
                {editingDriver ? 'Update Driver' : 'Create Driver'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search drivers by name, email, or plate..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
          />
        </div>
      </div>

      {loading && !drivers.length ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 animate-spin text-amber-500" />
        </div>
      ) : filteredDrivers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDrivers.map(driver => (
            <div
              key={driver.id}
              className="bg-gradient-to-br from-slate-50 to-white rounded-lg border-2 border-gray-200 overflow-hidden hover:border-amber-400 transition-all shadow-md hover:shadow-xl"
            >
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-4 py-3 flex items-center justify-between">
                <span className="text-white font-bold">
                  DRV{String(driver.driver_id).padStart(5, '0')}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    driver.status === 'available'
                      ? 'bg-green-500 text-white'
                      : driver.status === 'busy'
                      ? 'bg-amber-500 text-white'
                      : 'bg-gray-500 text-white'
                  }`}
                >
                  {driver.status.toUpperCase()}
                </span>
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{driver.name}</h3>
                    <p className="text-sm text-gray-600">{driver.email}</p>
                  </div>
                  <div className="flex items-center gap-1 bg-amber-100 px-2 py-1 rounded">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="font-bold text-amber-800">{driver.rating.toFixed(1)}</span>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-gray-700">
                  <p><span className="font-semibold">Phone:</span> {driver.phone}</p>
                  <p><span className="font-semibold">License:</span> {driver.license_number}</p>

                  <div className="border-t border-gray-200 pt-2 mt-2">
                    <p className="font-semibold text-gray-900 flex items-center gap-2">
                      <Car className="w-4 h-4 text-amber-500" />
                      {driver.vehicle_year} {driver.vehicle_make} {driver.vehicle_model}
                    </p>
                    <p><span className="font-semibold">Color:</span> {driver.vehicle_color}</p>
                    <p><span className="font-semibold">Plate:</span> {driver.vehicle_plate}</p>
                    <p className="text-gray-600 text-xs mt-1">{driver.total_trips} trips completed</p>
                  </div>
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleEdit(driver)}
                    className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => toggleDriverStatus(driver)}
                    className={`px-3 py-2 font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 ${
                      driver.status === 'available'
                        ? 'bg-gray-500 hover:bg-gray-600 text-white'
                        : 'bg-green-500 hover:bg-green-600 text-white'
                    }`}
                    title={driver.status === 'available' ? 'Set Offline' : 'Set Available'}
                  >
                    {driver.status === 'available' ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleDelete(driver.driver_id)}
                    className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Car className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">No drivers found</p>
        </div>
      )}
    </div>
  );
}
