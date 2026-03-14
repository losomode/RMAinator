import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { rmaApi } from '../api';
import { getApiErrorMessage } from '@inator/shared/types';
import type { RMADevice, RMAPriority } from '../types';

/** Create-RMA form — supports submitting multiple devices in one group. */
export function CreateRMA(): React.JSX.Element {
  const [devices, setDevices] = useState<RMADevice[]>([
    { serial_number: '', first_ship_date: '', fault_notes: '' },
  ]);
  const [priority, setPriority] = useState<RMAPriority>('NORMAL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  const handleDeviceChange = (index: number, field: keyof RMADevice, value: string): void => {
    setDevices((prev) => prev.map((d, i) => (i === index ? { ...d, [field]: value } : d)));
  };

  const addDevice = (): void => {
    setDevices((prev) => [{ serial_number: '', first_ship_date: '', fault_notes: '' }, ...prev]);
  };

  const removeDevice = (index: number): void => {
    if (devices.length === 1) return;
    setDevices((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      for (let i = 0; i < devices.length; i++) {
        const device = devices[i];
        if (!device?.serial_number || !device.fault_notes) {
          setError(`Device ${String(i + 1)}: Serial number and issue description are required`);
          setLoading(false);
          return;
        }
      }

      const rmasData = devices.map((device) => ({
        serial_number: device.serial_number,
        first_ship_date: device.first_ship_date || null,
        fault_notes: device.fault_notes,
        priority,
      }));

      await rmaApi.createGroup({ rmas: rmasData });
      navigate('/');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to create RMA group'));
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl rounded-lg bg-white p-10 shadow">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Create New RMA</h1>
      <p className="mb-8 text-gray-500">Submit one or more devices for RMA processing</p>

      {error && <div className="mb-5 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-6">
        {/* Priority */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-900">
            Priority (applies to all devices) <span className="text-red-500">*</span>
          </label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as RMAPriority)}
            className="rounded-md border border-gray-300 bg-white px-3 py-3 text-sm"
            required
            disabled={loading}
          >
            <option value="HIGH">High</option>
            <option value="NORMAL">Normal</option>
            <option value="LOW">Low</option>
          </select>
        </div>

        {/* Devices */}
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold text-gray-900">Devices to RMA ({devices.length})</h3>

          {devices.map((device, index) => (
            <div
              key={index}
              className="flex flex-col gap-4 rounded-lg border-2 border-gray-200 bg-gray-50 p-5"
            >
              <div className="flex items-center justify-between border-b border-gray-300 pb-3">
                <h4 className="text-base font-semibold text-gray-700">Device {index + 1}</h4>
                {devices.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeDevice(index)}
                    className="rounded bg-red-500 px-3 py-1 text-sm text-white hover:bg-red-600"
                    disabled={loading}
                  >
                    × Remove
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-900">
                  Serial Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={device.serial_number}
                  onChange={(e) => handleDeviceChange(index, 'serial_number', e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-3 text-sm"
                  placeholder="e.g., SN-12345"
                  disabled={loading}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-900">First Ship Date</label>
                <input
                  type="date"
                  value={device.first_ship_date}
                  onChange={(e) => handleDeviceChange(index, 'first_ship_date', e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-3 text-sm"
                  disabled={loading}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-900">
                  Issue Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={device.fault_notes}
                  onChange={(e) => handleDeviceChange(index, 'fault_notes', e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-3 text-sm"
                  placeholder="Describe the issue with this device..."
                  rows={4}
                  disabled={loading}
                />
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addDevice}
            className="rounded-md border-2 border-dashed border-green-500 bg-green-600 px-6 py-3 text-base font-medium text-white hover:bg-green-700"
            disabled={loading}
          >
            + Add Another Device
          </button>
        </div>

        {/* Submit */}
        <div className="mt-5 flex justify-end gap-3 border-t border-gray-200 pt-5">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="rounded-md bg-gray-500 px-6 py-3 text-base text-white hover:bg-gray-600"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-8 py-3 text-base font-medium text-white hover:bg-blue-700"
            disabled={loading}
          >
            {loading
              ? 'Creating RMAs...'
              : `Create ${String(devices.length)} RMA${devices.length > 1 ? 's' : ''}`}
          </button>
        </div>
      </form>
    </div>
  );
}
