import { useState } from 'react';

interface TimeoutPickerProps {
  initialHours: number;
  onSave: (hours: number) => void;
  onCancel: () => void;
}

const PRESETS = [
  { label: '4h', hours: 4 },
  { label: '8h', hours: 8 },
  { label: '12h', hours: 12 },
  { label: '1d', hours: 24 },
  { label: '2d', hours: 48 },
  { label: '3d', hours: 72 },
  { label: '5d', hours: 120 },
  { label: '1w', hours: 168 },
] as const;

/** Format hours into a human-friendly label. */
export function formatHours(hours: number): string {
  if (hours < 24) return `${String(hours)}h`;
  if (hours % 168 === 0) return `${String(hours / 168)}w`;
  if (hours % 24 === 0) return `${String(hours / 24)}d`;
  return `${String(hours)}h`;
}

/** Modal-friendly timeout picker with presets and custom input. */
export function TimeoutPicker({
  initialHours,
  onSave,
  onCancel,
}: TimeoutPickerProps): React.JSX.Element {
  const [selectedHours, setSelectedHours] = useState(initialHours);
  const [customMode, setCustomMode] = useState(false);

  const handleSave = (): void => {
    if (selectedHours <= 0) return;
    onSave(selectedHours);
  };

  return (
    <div className="min-w-[400px] rounded-lg border-2 border-blue-500 bg-gray-50 p-4">
      {/* Presets */}
      <div className="mb-3 grid grid-cols-5 gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.hours}
            type="button"
            onClick={() => {
              setSelectedHours(preset.hours);
              setCustomMode(false);
            }}
            className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
              selectedHours === preset.hours && !customMode
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            {preset.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCustomMode(true)}
          className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
            customMode
              ? 'border-blue-600 bg-blue-600 text-white'
              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          Custom
        </button>
      </div>

      {/* Custom input */}
      {customMode && (
        <div className="mb-3 flex items-center gap-2">
          <input
            type="number"
            min="1"
            value={selectedHours}
            onChange={(e) => setSelectedHours(parseInt(e.target.value, 10) || 0)}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="Hours"
          />
          <span className="text-sm font-medium text-gray-500">hours</span>
        </div>
      )}

      {/* Display */}
      <div className="mb-3 rounded-md bg-white p-3 text-center text-sm text-gray-700">
        Selected: <strong>{formatHours(selectedHours)}</strong>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={handleSave}
          className="rounded-md bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-700"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md bg-gray-500 px-5 py-2 text-sm font-semibold text-white hover:bg-gray-600"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
