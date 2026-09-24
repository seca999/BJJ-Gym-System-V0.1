import React, { useMemo } from 'react';
import { Clock } from 'lucide-react';
import {
  TIME_OPTIONS,
  parseTimeRange,
  formatTimeRange,
  addMinutesToTime,
  calculateDurationMinutes,
} from '../utils/timeUtils';

interface MouseTimeRangePickerProps {
  value: string; // e.g. "07:00 PM - 08:30 PM"
  onChange: (timeRange: string, durationMinutes: number) => void;
  label?: string;
  compact?: boolean;
}

export const MouseTimeRangePicker: React.FC<MouseTimeRangePickerProps> = ({
  value,
  onChange,
  label,
  compact = false,
}) => {
  const { start, end, duration } = useMemo(() => {
    return parseTimeRange(value);
  }, [value]);

  const handleStartChange = (newStart: string) => {
    // Keep the current duration when changing start time
    const newEnd = addMinutesToTime(newStart, duration);
    const range = formatTimeRange(newStart, newEnd);
    onChange(range, duration);
  };

  const handleEndChange = (newEnd: string) => {
    // Recalculate duration from start to new end
    const newDuration = calculateDurationMinutes(start, newEnd);
    const range = formatTimeRange(start, newEnd);
    onChange(range, newDuration);
  };

  const formatDurationDisplay = (mins: number) => {
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    if (hours === 0) return `${mins} mins`;
    if (remainingMins === 0) return `${hours} hr${hours > 1 ? 's' : ''} (${mins} mins)`;
    return `${hours}h ${remainingMins}m (${mins} mins)`;
  };

  return (
    <div className={`space-y-2.5 ${compact ? 'text-xs' : 'text-xs sm:text-sm'}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="font-bold text-stone-200 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{label}</span>
          </label>
          <span className="text-[11px] font-bold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-800/80">
            Duration: {formatDurationDisplay(duration)}
          </span>
        </div>
      )}

      {/* Mouse Selectors: Start Time & End Time */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-stone-950/80 p-3 rounded-xl border border-stone-800">
        {/* Start Time Selector */}
        <div>
          <span className="text-[10px] font-bold text-stone-400 block mb-1 uppercase tracking-wider">
            Start Time
          </span>
          <select
            value={start}
            onChange={(e) => handleStartChange(e.target.value)}
            className="w-full bg-stone-900 border border-stone-700 hover:border-amber-400 focus:border-amber-400 rounded-lg px-2.5 py-2 text-white font-mono font-bold text-xs cursor-pointer focus:outline-none transition-colors"
          >
            {TIME_OPTIONS.map((t) => (
              <option key={`start-${t}`} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* End Time Selector */}
        <div>
          <span className="text-[10px] font-bold text-stone-400 block mb-1 uppercase tracking-wider">
            End Time
          </span>
          <select
            value={end}
            onChange={(e) => handleEndChange(e.target.value)}
            className="w-full bg-stone-900 border border-stone-700 hover:border-emerald-400 focus:border-emerald-400 rounded-lg px-2.5 py-2 text-white font-mono font-bold text-xs cursor-pointer focus:outline-none transition-colors"
          >
            {TIME_OPTIONS.map((t) => (
              <option key={`end-${t}`} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Auto-calculated duration readout */}
      <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-stone-900/90 border border-stone-800">
        <span className="text-[11px] font-medium text-stone-400">Class Duration:</span>
        <span className="text-xs font-black text-emerald-400 font-mono-digits">
          {formatDurationDisplay(duration)}
        </span>
      </div>
    </div>
  );
};
