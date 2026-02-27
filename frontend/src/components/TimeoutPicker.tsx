import { useState } from 'react';

interface TimeoutPickerProps {
  initialHours: number;
  onSave: (hours: number) => void;
  onCancel: () => void;
}

const TimeoutPicker = ({ initialHours, onSave, onCancel }: TimeoutPickerProps) => {
  const [selectedHours, setSelectedHours] = useState(initialHours);
  const [customMode, setCustomMode] = useState(false);

  // Common presets in hours
  const presets = [
    { label: '4h', hours: 4 },
    { label: '8h', hours: 8 },
    { label: '12h', hours: 12 },
    { label: '1d', hours: 24 },
    { label: '2d', hours: 48 },
    { label: '3d', hours: 72 },
    { label: '5d', hours: 120 },
    { label: '1w', hours: 168 },
  ];

  const formatDisplay = (hours: number): string => {
    if (hours < 24) {
      return `${hours}h`;
    } else if (hours % 168 === 0) {
      return `${hours / 168}w`;
    } else if (hours % 24 === 0) {
      return `${hours / 24}d`;
    } else {
      return `${hours}h`;
    }
  };

  const handlePresetClick = (hours: number) => {
    setSelectedHours(hours);
    setCustomMode(false);
  };

  const handleCustomClick = () => {
    setCustomMode(true);
  };

  const handleSave = () => {
    if (selectedHours <= 0) {
      alert('Timeout must be greater than 0 hours');
      return;
    }
    onSave(selectedHours);
  };

  return (
    <div style={styles.container}>
      <div style={styles.presets}>
        {presets.map((preset) => (
          <button
            key={preset.hours}
            onClick={() => handlePresetClick(preset.hours)}
            style={{
              ...styles.presetButton,
              ...(selectedHours === preset.hours && !customMode ? styles.presetButtonActive : {}),
            }}
          >
            {preset.label}
          </button>
        ))}
        <button
          onClick={handleCustomClick}
          style={{
            ...styles.presetButton,
            ...(customMode ? styles.presetButtonActive : {}),
          }}
        >
          Custom
        </button>
      </div>

      {customMode && (
        <div style={styles.customInput}>
          <input
            type="number"
            min="1"
            value={selectedHours}
            onChange={(e) => setSelectedHours(parseInt(e.target.value, 10) || 0)}
            style={styles.input}
            placeholder="Hours"
            autoFocus
          />
          <span style={styles.inputLabel}>hours</span>
        </div>
      )}

      <div style={styles.display}>
        Selected: <strong>{formatDisplay(selectedHours)}</strong>
      </div>

      <div style={styles.actions}>
        <button onClick={handleSave} style={styles.saveButton}>
          Save
        </button>
        <button onClick={onCancel} style={styles.cancelButton}>
          Cancel
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '16px',
    backgroundColor: '#f9fafb',
    border: '2px solid #3b82f6',
    borderRadius: '8px',
    minWidth: '400px',
  },
  presets: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '8px',
    marginBottom: '12px',
  },
  presetButton: {
    padding: '8px 12px',
    backgroundColor: 'white',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500' as const,
    color: '#374151',
    transition: 'all 0.2s',
  },
  presetButtonActive: {
    backgroundColor: '#3b82f6',
    color: 'white',
    borderColor: '#2563eb',
  },
  customInput: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  input: {
    flex: 1,
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
  },
  inputLabel: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500' as const,
  },
  display: {
    padding: '12px',
    backgroundColor: 'white',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#374151',
    marginBottom: '12px',
    textAlign: 'center' as const,
  },
  actions: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
  },
  saveButton: {
    padding: '8px 20px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600' as const,
  },
  cancelButton: {
    padding: '8px 20px',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600' as const,
  },
};

export default TimeoutPicker;
