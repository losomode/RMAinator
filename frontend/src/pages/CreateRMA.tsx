import { useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { rmaAPI } from '../services/api';
import type { RMADevice, RMAPriority } from '../types';

const CreateRMA = () => {
  const [devices, setDevices] = useState<RMADevice[]>([
    {
      serial_number: '',
      first_ship_date: '',
      fault_notes: '',
    }
  ]);
  const [priority, setPriority] = useState<RMAPriority>('NORMAL');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  
  const navigate = useNavigate();

  const handleDeviceChange = (index: number, field: keyof RMADevice, value: string): void => {
    const newDevices = [...devices];
    newDevices[index][field] = value;
    setDevices(newDevices);
  };

  const addDevice = (): void => {
    setDevices([
      {
        serial_number: '',
        first_ship_date: '',
        fault_notes: '',
      },
      ...devices,
    ]);
  };

  const removeDevice = (index: number): void => {
    if (devices.length === 1) return; // Keep at least one device
    const newDevices = devices.filter((_, i) => i !== index);
    setDevices(newDevices);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate all devices have required fields
      for (let i = 0; i < devices.length; i++) {
        if (!devices[i].serial_number || !devices[i].fault_notes) {
          setError(`Device ${i + 1}: Serial number and issue description are required`);
          setLoading(false);
          return;
        }
      }

      // Create RMA group with all devices
      const rmasData = devices.map(device => ({
        serial_number: device.serial_number,
        first_ship_date: device.first_ship_date || null,
        fault_notes: device.fault_notes,
        priority: priority,
      }));

      await rmaAPI.createGroup({ rmas: rmasData });

      // Success - redirect to dashboard
      navigate('/dashboard');
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } } };
      setError(axiosError.response?.data?.detail || 'Failed to create RMA group');
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={styles.card}>
        <h1 style={styles.title}>Create New RMA</h1>
        <p style={styles.subtitle}>Submit one or more devices for RMA processing</p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Priority - applies to all devices */}
          <div style={styles.formGroup}>
            <label style={styles.label}>
              Priority (applies to all devices) <span style={styles.required}>*</span>
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as RMAPriority)}
              style={styles.select}
              required
              disabled={loading}
            >
              <option value="HIGH">High</option>
              <option value="NORMAL">Normal</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          {/* Devices */}
          <div style={styles.devicesSection}>
            <h3 style={styles.sectionTitle}>Devices to RMA ({devices.length})</h3>
            
            {devices.map((device, index) => (
              <div key={index} style={styles.deviceCard}>
                <div style={styles.deviceHeader}>
                  <h4 style={styles.deviceTitle}>Device {index + 1}</h4>
                  {devices.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDevice(index)}
                      style={styles.removeBtn}
                      disabled={loading}
                    >
                      × Remove
                    </button>
                  )}
                </div>

                {/* Serial Number */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Serial Number <span style={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    value={device.serial_number}
                    onChange={(e) => handleDeviceChange(index, 'serial_number', e.target.value)}
                    style={styles.input}
                    placeholder="e.g., SN-12345"
                    disabled={loading}
                  />
                </div>

                {/* First Ship Date */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    First Ship Date
                  </label>
                  <input
                    type="date"
                    value={device.first_ship_date}
                    onChange={(e) => handleDeviceChange(index, 'first_ship_date', e.target.value)}
                    style={styles.input}
                    disabled={loading}
                  />
                </div>

                {/* Fault Notes */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Issue Description <span style={styles.required}>*</span>
                  </label>
                  <textarea
                    value={device.fault_notes}
                    onChange={(e) => handleDeviceChange(index, 'fault_notes', e.target.value)}
                    style={styles.textarea}
                    placeholder="Describe the issue with this device..."
                    rows={4}
                    disabled={loading}
                  />
                </div>
              </div>
            ))}

            {/* Add Device Button */}
            <button
              type="button"
              onClick={addDevice}
              style={styles.addDeviceBtn}
              disabled={loading}
            >
              + Add Another Device
            </button>
          </div>

          {/* Submit Button */}
          <div style={styles.submitSection}>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              style={styles.cancelBtn}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={styles.submitBtn}
              disabled={loading}
            >
              {loading ? 'Creating RMAs...' : `Create ${devices.length} RMA${devices.length > 1 ? 's' : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles: Record<string, CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '20px',
  },
  header: {
    maxWidth: '800px',
    margin: '0 auto 20px',
  },
  backBtn: {
    padding: '8px 16px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  card: {
    maxWidth: '800px',
    margin: '0 auto',
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '30px',
  },
  error: {
    backgroundColor: '#fee',
    color: '#c33',
    padding: '12px',
    borderRadius: '4px',
    marginBottom: '20px',
    fontSize: '14px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
  },
  required: {
    color: '#dc3545',
  },
  input: {
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
  },
  select: {
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    backgroundColor: 'white',
    color: '#333',
  },
  textarea: {
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical',
  },
  fileInput: {
    padding: '8px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
  },
  hint: {
    fontSize: '12px',
    color: '#999',
  },
  fileList: {
    marginTop: '8px',
    padding: '12px',
    backgroundColor: '#f8f9fa',
    borderRadius: '4px',
    fontSize: '13px',
  },
  fileListUl: {
    margin: '8px 0 0 0',
    paddingLeft: '20px',
  },
  submitSection: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '20px',
    paddingTop: '20px',
    borderTop: '1px solid #eee',
  },
  cancelBtn: {
    padding: '12px 24px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    cursor: 'pointer',
  },
  submitBtn: {
    padding: '12px 32px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  button: {
    padding: '12px 24px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  devicesSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '4px',
  },
  deviceCard: {
    padding: '20px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    backgroundColor: '#f9f9f9',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  deviceHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    paddingBottom: '12px',
    borderBottom: '1px solid #ddd',
  },
  deviceTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#444',
    margin: 0,
  },
  removeBtn: {
    padding: '6px 12px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  addDeviceBtn: {
    padding: '12px 24px',
    backgroundColor: '#28a745',
    color: 'white',
    border: '2px dashed #28a745',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '500',
    textAlign: 'center',
  },
};

export default CreateRMA;
