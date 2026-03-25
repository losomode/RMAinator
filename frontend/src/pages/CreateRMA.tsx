import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@inator/shared/auth/AuthProvider';
import { rmaApi } from '../api';
import { getApiErrorMessage } from '@inator/shared/types';
import { companiesApi, type Company } from '@inator/shared/api/companies';
import type { RMADevice } from '../types';

const DEVICE_TYPES = [
  'TX2 Camera (Standard Lens)',
  'TX2 Camera (Long Range Lens)',
  'TX2 Node',
  'Orin NX Node',
  'Orin Nano Camera (Standard Lens)',
  'Orin Nano Camera (Long Range Lens)',
] as const;

/** Create-RMA form — supports submitting multiple devices in one group. */
export function CreateRMA(): React.JSX.Element {
  const { isAdmin, user } = useAuth();
  const [devices, setDevices] = useState<RMADevice[]>([
    { serial_number: '', device_type: '', ipn: '', fault_notes: '', files: [] },
  ]);
  const [companyId, setCompanyId] = useState<number | ''>('');
  const [companies, setCompanies] = useState<Company[]>([]);

  // Structured return shipping address
  const [addrContactName, setAddrContactName] = useState('');
  const [addrCompany, setAddrCompany] = useState('');
  const [addrLine1, setAddrLine1] = useState('');
  const [addrLine2, setAddrLine2] = useState('');
  const [addrCity, setAddrCity] = useState('');
  const [addrState, setAddrState] = useState('');
  const [addrZip, setAddrZip] = useState('');
  const [addrCountry, setAddrCountry] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    if (isAdmin) {
      void loadCompanies();
    } else {
      // For non-admins, pre-populate from auth context
      const jwtCompanyId = (user as unknown as { company_id?: number })?.company_id;
      if (jwtCompanyId) setCompanyId(jwtCompanyId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const loadCompanies = async (): Promise<void> => {
    try {
      const data = await companiesApi.list();
      setCompanies(data);
    } catch {
      // Non-critical
    }
  };

  const handleDeviceChange = (index: number, field: keyof Omit<RMADevice, 'files'>, value: string): void => {
    setDevices((prev) => prev.map((d, i) => (i === index ? { ...d, [field]: value } : d)));
  };

  const handleFilesChange = (index: number, files: FileList | null): void => {
    const fileArray = files ? Array.from(files) : [];
    setDevices((prev) => prev.map((d, i) => (i === index ? { ...d, files: fileArray } : d)));
  };

  const addDevice = (): void => {
    setDevices((prev) => [
      ...prev,
      { serial_number: '', device_type: '', ipn: '', fault_notes: '', files: [] },
    ]);
  };

  const removeDevice = (index: number): void => {
    if (devices.length === 1) return;
    setDevices((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');

    if (!companyId) {
      setError('Company is required');
      return;
    }

    // Validate required address fields
    if (!addrContactName.trim()) { setError('Return address: Contact Name is required'); return; }
    if (!addrLine1.trim()) { setError('Return address: Address Line 1 is required'); return; }
    if (!addrCity.trim()) { setError('Return address: City is required'); return; }
    if (!addrState.trim()) { setError('Return address: State / Province is required'); return; }
    if (!addrZip.trim()) { setError('Return address: ZIP / Postal Code is required'); return; }
    if (!addrCountry.trim()) { setError('Return address: Country is required'); return; }

    for (let i = 0; i < devices.length; i++) {
      const device = devices[i];
      if (!device?.serial_number.trim()) {
        setError(`Device ${String(i + 1)}: Serial number is required`);
        return;
      }
      if (!device.device_type.trim()) {
        setError(`Device ${String(i + 1)}: Device type is required`);
        return;
      }
      if (!device.fault_notes.trim()) {
        setError(`Device ${String(i + 1)}: Issue description is required`);
        return;
      }
    }

    setLoading(true);

    try {
      // Format address as a structured multi-line string
      const returnShippingAddress = [
        addrContactName.trim(),
        addrCompany.trim(),
        addrLine1.trim(),
        addrLine2.trim(),
        `${addrCity.trim()}, ${addrState.trim()} ${addrZip.trim()}`.trim(),
        addrCountry.trim(),
      ].filter(Boolean).join('\n');

      const result = await rmaApi.createGroup({
        company_id: companyId as number,
        return_shipping_address: returnShippingAddress,
        rmas: devices.map((device) => ({
          serial_number: device.serial_number,
          device_type: device.device_type,
          ipn: device.ipn || undefined,
          fault_notes: device.fault_notes,
          company_id: companyId as number,
        })),
      });

      // Upload any attached files
      for (let i = 0; i < devices.length; i++) {
        const device = devices[i];
        const rma = result.rmas[i];
        if (device?.files?.length && rma) {
          for (const file of device.files) {
            await rmaApi.uploadAttachment(rma.id, file);
          }
        }
      }

      navigate('/');
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to create RMA'));
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl rounded-lg bg-white p-10 shadow">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Create New RMA</h1>
      <p className="mb-8 text-gray-500">Submit one or more devices for RMA processing</p>

      {error && <div className="mb-5 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-6">
        {/* Company */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-900">
            Company <span className="text-red-500">*</span>
          </label>
          {isAdmin ? (
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value ? parseInt(e.target.value) : '')}
              className="rounded-md border border-gray-300 bg-white px-3 py-3 text-sm"
              required
              disabled={loading}
            >
              <option value="">Select a company…</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-700">
              {companies.find((c) => c.id === companyId)?.name ?? `Company #${String(companyId)}`}
            </div>
          )}
        </div>

        {/* Return Shipping Address */}
        <fieldset className="rounded-md border border-gray-200 p-4">
          <legend className="px-1 text-sm font-semibold text-gray-900">
            Return Shipping Address <span className="text-red-500">*</span>
          </legend>
          <div className="flex flex-col gap-3">
            <AddrField label="Contact Name" value={addrContactName} onChange={setAddrContactName}
              required disabled={loading} />
            <AddrField label="Company" value={addrCompany} onChange={setAddrCompany}
              disabled={loading} />
            <AddrField label="Address Line 1" value={addrLine1} onChange={setAddrLine1}
              required disabled={loading} />
            <AddrField label="Address Line 2" value={addrLine2} onChange={setAddrLine2}
              placeholder="Apartment, suite, unit, building, floor, etc."
              disabled={loading} />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <AddrField label="City" value={addrCity} onChange={setAddrCity}
                required disabled={loading} />
              <AddrField label="State / Province" value={addrState} onChange={setAddrState}
                required disabled={loading} />
              <AddrField label="ZIP / Postal Code" value={addrZip} onChange={setAddrZip}
                required disabled={loading} />
            </div>
            <AddrField label="Country" value={addrCountry} onChange={setAddrCountry}
              required disabled={loading} />
          </div>
        </fieldset>

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

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-900">
                    Serial Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={device.serial_number}
                    onChange={(e) => handleDeviceChange(index, 'serial_number', e.target.value)}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                    placeholder="e.g., 0002067"
                    disabled={loading}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-gray-900">
                    Device Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={device.device_type}
                    onChange={(e) => handleDeviceChange(index, 'device_type', e.target.value)}
                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                    required
                    disabled={loading}
                  >
                    <option value="">Select device type…</option>
                    {DEVICE_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-900">IPN (optional)</label>
                <input
                  type="text"
                  value={device.ipn}
                  onChange={(e) => handleDeviceChange(index, 'ipn', e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Internal Part Number"
                  disabled={loading}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-900">
                  Issue Description and Other Comments <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={device.fault_notes}
                  onChange={(e) => handleDeviceChange(index, 'fault_notes', e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-3 text-sm"
                  placeholder="Describe the issue with this device…"
                  rows={4}
                  disabled={loading}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-900">Attachments (optional)</label>
                <input
                  type="file"
                  multiple
                  onChange={(e) => handleFilesChange(index, e.target.files)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                  disabled={loading}
                />
                {device.files && device.files.length > 0 && (
                  <span className="text-xs text-gray-500">
                    {device.files.length} file{device.files.length > 1 ? 's' : ''} selected
                  </span>
                )}
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
              ? 'Creating RMAs…'
              : `Create ${String(devices.length)} RMA${devices.length > 1 ? 's' : ''}`}
          </button>
        </div>
      </form>
    </div>
  );
}

/** Simple labelled text input for address fields. */
function AddrField({
  label,
  value,
  onChange,
  placeholder,
  required,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-gray-600">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? label}
        disabled={disabled}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
    </div>
  );
}
