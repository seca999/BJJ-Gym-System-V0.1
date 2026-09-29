/**
 * Time utility functions for mouse-driven scheduling and automatic duration calculation
 * Unified on Jordanian Time Protocol (Asia/Amman, UTC+3)
 */

export const JORDAN_TIMEZONE = 'Asia/Amman';

/**
 * Returns today's date formatted as "YYYY-MM-DD" in Jordan / Amman timezone
 */
export function getJordanDateStr(date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: JORDAN_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date); // en-CA outputs YYYY-MM-DD
  } catch {
    const d = new Date(date.getTime() + 3 * 3600 * 1000);
    return d.toISOString().split('T')[0];
  }
}

/**
 * Returns current time formatted as "HH:mm:ss" or "HH:mm" in Jordan / Amman timezone (24-hour)
 */
export function getJordanTimeStr(date: Date = new Date(), withSeconds = true): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: JORDAN_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      second: withSeconds ? '2-digit' : undefined,
      hour12: false,
    });
    return formatter.format(date);
  } catch {
    const d = new Date(date.getTime() + 3 * 3600 * 1000);
    const h = String(d.getUTCHours()).padStart(2, '0');
    const m = String(d.getUTCMinutes()).padStart(2, '0');
    const s = String(d.getUTCSeconds()).padStart(2, '0');
    return withSeconds ? `${h}:${m}:${s}` : `${h}:${m}`;
  }
}

/**
 * Returns current time formatted as "hh:mm A" or "hh:mm:ss A" in Jordan / Amman timezone (12-hour)
 */
export function getJordanTime12Str(date: Date = new Date(), withSeconds = false): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: JORDAN_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      second: withSeconds ? '2-digit' : undefined,
      hour12: true,
    });
    return formatter.format(date);
  } catch {
    const d = new Date(date.getTime() + 3 * 3600 * 1000);
    const rawH = d.getUTCHours();
    const period = rawH >= 12 ? 'PM' : 'AM';
    const displayH = rawH % 12 === 0 ? 12 : rawH % 12;
    const m = String(d.getUTCMinutes()).padStart(2, '0');
    const s = String(d.getUTCSeconds()).padStart(2, '0');
    return withSeconds
      ? `${String(displayH).padStart(2, '0')}:${m}:${s} ${period}`
      : `${String(displayH).padStart(2, '0')}:${m} ${period}`;
  }
}

/**
 * Formats a Date object or ISO string in Jordan / Amman timezone
 */
export function formatJordanDate(
  date: Date | string = new Date(),
  options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    timeZone: JORDAN_TIMEZONE,
    ...options,
  });
}

/**
 * Gets the current hour, minute and total minutes in Jordan timezone
 */
export function getJordanCurrentMinutes(date: Date = new Date()): { hours: number; minutes: number; totalMinutes: number } {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: JORDAN_TIMEZONE,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    }).formatToParts(date);

    let hours = 0;
    let minutes = 0;
    parts.forEach((p) => {
      if (p.type === 'hour') hours = parseInt(p.value, 10) % 24;
      if (p.type === 'minute') minutes = parseInt(p.value, 10);
    });
    return { hours, minutes, totalMinutes: hours * 60 + minutes };
  } catch {
    const d = new Date(date.getTime() + 3 * 3600 * 1000);
    const hours = d.getUTCHours();
    const minutes = d.getUTCMinutes();
    return { hours, minutes, totalMinutes: hours * 60 + minutes };
  }
}

/**
 * Returns a Date object representing Jordan time
 */
export function toJordanDate(date: Date | string = new Date()): Date {
  const d = typeof date === 'string' ? new Date(date) : date;
  const str = d.toLocaleString('en-US', { timeZone: JORDAN_TIMEZONE });
  return new Date(str);
}

// Generate 15-minute intervals from 5:00 AM to 11:45 PM
export const TIME_OPTIONS: string[] = (() => {
  const options: string[] = [];
  for (let hour = 5; hour <= 23; hour++) {
    for (let min = 0; min < 60; min += 15) {
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 === 0 ? 12 : hour % 12;
      const displayMin = String(min).padStart(2, '0');
      const timeStr = `${String(displayHour).padStart(2, '0')}:${displayMin} ${period}`;
      options.push(timeStr);
    }
  }
  return options;
})();

/**
 * Parses time string (e.g. "07:00 PM", "7:00 AM", "7 PM", "19:00", "08:30") to minutes from midnight
 */
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  let clean = timeStr.trim().toUpperCase();

  // If timeStr is a range like "4:20-5:20 PM" or "11:00 AM - 12:15 PM"
  if (clean.includes('-')) {
    const rangeParts = clean.split('-');
    const startPart = rangeParts[0].trim();
    const endPart = rangeParts[1].trim();

    // If startPart does not have AM or PM, inherit period from range
    if (!startPart.includes('AM') && !startPart.includes('PM')) {
      const endPeriod = endPart.includes('PM') ? 'PM' : endPart.includes('AM') ? 'AM' : '';
      if (endPeriod) {
        const startHourMatch = startPart.match(/^(\d{1,2})/);
        const startHour = startHourMatch ? parseInt(startHourMatch[1], 10) : 0;
        let periodToUse = endPeriod;
        // If start hour is 8-11 and end is 12 or 1 PM, start is AM (e.g. 11:00 - 12:15 PM)
        if (endPeriod === 'PM' && startHour >= 8 && startHour <= 11) {
          periodToUse = 'AM';
        }
        clean = `${startPart} ${periodToUse}`;
      } else {
        clean = startPart;
      }
    } else {
      clean = startPart;
    }
  }

  // Match "07:00 PM" or "7:00PM" or "7 PM" or "7:30"
  const ampmMatch = clean.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (ampmMatch) {
    let hour = parseInt(ampmMatch[1], 10);
    const min = ampmMatch[2] ? parseInt(ampmMatch[2], 10) : 0;
    const period = ampmMatch[3]?.toUpperCase();

    if (period === 'PM' && hour < 12) {
      hour += 12;
    } else if (period === 'AM' && hour === 12) {
      hour = 0;
    }
    return hour * 60 + min;
  }

  // Fallback 24-hour format "19:30"
  const parts = clean.split(':');
  if (parts.length >= 2) {
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    return h * 60 + m;
  }

  return 0;
}

/**
 * Formats minutes from midnight to "hh:mm A" string (e.g. 1110 -> "06:30 PM")
 */
export function formatMinutesToTime(minutes: number): string {
  let normalized = Math.max(0, minutes % 1440);
  const hour = Math.floor(normalized / 60);
  const min = normalized % 60;
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(displayHour).padStart(2, '0')}:${String(min).padStart(2, '0')} ${period}`;
}

/**
 * Normalizes time string to standard "hh:mm A" format
 */
export function normalizeTimeString(timeStr: string): string {
  const mins = parseTimeToMinutes(timeStr);
  return formatMinutesToTime(mins);
}

/**
 * Calculates duration in minutes between start time and end time
 */
export function calculateDurationMinutes(startTimeStr: string, endTimeStr: string): number {
  const startMins = parseTimeToMinutes(startTimeStr);
  const endMins = parseTimeToMinutes(endTimeStr);

  if (endMins > startMins) {
    return endMins - startMins;
  } else if (endMins < startMins) {
    // If wrapping midnight (e.g. 11:30 PM to 01:00 AM)
    return 1440 - startMins + endMins;
  }
  return 60; // default 1 hour if same
}

/**
 * Adds minutes to a given time string and returns formatted result
 */
export function addMinutesToTime(timeStr: string, minutesToAdd: number): string {
  const startMins = parseTimeToMinutes(timeStr);
  const totalMins = (startMins + minutesToAdd) % 1440;
  return formatMinutesToTime(totalMins);
}

/**
 * Parses a combined range string (e.g. "07:00 PM - 08:30 PM", "7:00-8:00 AM", "07:00 PM - 9 PM")
 */
export function parseTimeRange(rangeStr: string): {
  start: string;
  end: string;
  duration: number;
} {
  if (!rangeStr) {
    return { start: '07:00 PM', end: '08:15 PM', duration: 75 };
  }

  const parts = rangeStr.split(/[-–—to]+/).map((s) => s.trim());
  if (parts.length >= 2) {
    let startPart = parts[0];
    let endPart = parts[1];

    // If start has no AM/PM but end does (e.g. "7:00 - 8:00 AM")
    const endPeriodMatch = endPart.match(/(AM|PM)/i);
    const startPeriodMatch = startPart.match(/(AM|PM)/i);
    if (!startPeriodMatch && endPeriodMatch) {
      startPart = `${startPart} ${endPeriodMatch[1]}`;
    }

    const start = normalizeTimeString(startPart);
    const end = normalizeTimeString(endPart);
    const duration = calculateDurationMinutes(start, end);

    return { start, end, duration };
  }

  const start = normalizeTimeString(rangeStr);
  const end = addMinutesToTime(start, 75);
  return { start, end, duration: 75 };
}

/**
 * Formats start and end times into standard range string: "07:00 PM - 08:30 PM"
 */
export function formatTimeRange(start: string, end: string): string {
  return `${normalizeTimeString(start)} - ${normalizeTimeString(end)}`;
}

/**
 * Extracts start time in minutes from midnight (0 - 1440) for a slot or class time range
 */
export function parseSlotStartMinutes(timeOrRangeStr: string): number {
  if (!timeOrRangeStr) return 0;
  const { start } = parseTimeRange(timeOrRangeStr);
  return parseTimeToMinutes(start);
}

/**
 * Extracts end time in minutes from midnight (0 - 1440) for a slot or class time range
 */
export function parseSlotEndMinutes(timeOrRangeStr: string): number {
  if (!timeOrRangeStr) return 0;
  const { end } = parseTimeRange(timeOrRangeStr);
  return parseTimeToMinutes(end);
}

/**
 * Quick duration choices in minutes
 */
export const DURATION_PRESETS = [
  { label: '45m', minutes: 45 },
  { label: '60m (1h)', minutes: 60 },
  { label: '75m (1h 15m)', minutes: 75 },
  { label: '90m (1.5h)', minutes: 90 },
  { label: '105m (1h 45m)', minutes: 105 },
  { label: '120m (2h)', minutes: 120 },
];

/**
 * Academy standard time slot templates for Matboard (e.g. morning and evening split)
 */
export const ACADEMY_TIMETABLE_PRESETS = [
  {
    id: 'split-morning-evening',
    name: 'Morning Class + Evening Split (Gym Unoccupied 9 AM - 4 PM)',
    description: '1 Morning BJJ Class (7:00 - 8:30 AM), Blank Midday (9:00 AM - 4:00 PM), and Evening Sessions (4:00 PM - 9:30 PM)',
    slots: [
      { id: 'slot-m1', timeRange: '07:00 AM - 08:30 AM', matId: 'mat-1' },
      { id: 'slot-e1', timeRange: '04:00 PM - 05:15 PM', matId: 'mat-1' },
      { id: 'slot-e2', timeRange: '05:30 PM - 06:45 PM', matId: 'mat-1' },
      { id: 'slot-e3', timeRange: '07:00 PM - 08:30 PM', matId: 'mat-1' },
      { id: 'slot-e4', timeRange: '08:30 PM - 09:45 PM', matId: 'mat-1' },
    ],
  },
  {
    id: 'split-two-mornings',
    name: '2 Morning Classes (7:00 - 9:30 AM) & Evening (4:00 - 9:30 PM)',
    description: 'Morning Dawn & Fundamentals with blank midday gap until 4 PM',
    slots: [
      { id: 'slot-m1', timeRange: '07:00 AM - 08:30 AM', matId: 'mat-1' },
      { id: 'slot-m2', timeRange: '08:30 AM - 09:30 AM', matId: 'mat-1' },
      { id: 'slot-e1', timeRange: '04:00 PM - 05:15 PM', matId: 'mat-1' },
      { id: 'slot-e2', timeRange: '05:30 PM - 06:45 PM', matId: 'mat-1' },
      { id: 'slot-e3', timeRange: '07:00 PM - 08:30 PM', matId: 'mat-1' },
      { id: 'slot-e4', timeRange: '08:30 PM - 09:45 PM', matId: 'mat-1' },
    ],
  },
  {
    id: 'evening-block',
    name: 'Standard Evening Block Only (4:00 PM - 9:30 PM)',
    description: 'Kids classes into adult evening fundamentals and sparring',
    slots: [
      { id: 'slot-std-1', timeRange: '04:00 PM - 05:15 PM', matId: 'mat-1' },
      { id: 'slot-std-2', timeRange: '05:30 PM - 06:45 PM', matId: 'mat-1' },
      { id: 'slot-std-3', timeRange: '07:00 PM - 08:30 PM', matId: 'mat-1' },
      { id: 'slot-std-4', timeRange: '08:30 PM - 09:45 PM', matId: 'mat-1' },
    ],
  },
  {
    id: 'full-day',
    name: 'Full Day Continuous (Morning, Noon & Evening)',
    description: 'All-day open facility with noon and afternoon training',
    slots: [
      { id: 'slot-fd-1', timeRange: '07:00 AM - 08:15 AM', matId: 'mat-1' },
      { id: 'slot-fd-2', timeRange: '12:00 PM - 01:15 PM', matId: 'mat-1' },
      { id: 'slot-fd-3', timeRange: '04:00 PM - 05:00 PM', matId: 'mat-1' },
      { id: 'slot-fd-4', timeRange: '05:30 PM - 06:45 PM', matId: 'mat-1' },
      { id: 'slot-fd-5', timeRange: '07:00 PM - 08:30 PM', matId: 'mat-1' },
      { id: 'slot-fd-6', timeRange: '08:30 PM - 09:30 PM', matId: 'mat-1' },
    ],
  },
  {
    id: 'fixed-6am-10pm',
    name: 'Fixed Time Slots (6:00 AM - 10:00 PM)',
    description: 'Fixed hourly slots from 6 AM early morning until 10 PM night dojo',
    slots: [
      { id: 'slot-6am', timeRange: '06:00 AM - 07:00 AM', matId: 'mat-1' },
      { id: 'slot-7am', timeRange: '07:00 AM - 08:00 AM', matId: 'mat-1' },
      { id: 'slot-8am', timeRange: '08:00 AM - 09:00 AM', matId: 'mat-1' },
      { id: 'slot-9am', timeRange: '09:00 AM - 10:00 AM', matId: 'mat-1' },
      { id: 'slot-10am', timeRange: '10:00 AM - 11:00 AM', matId: 'mat-1' },
      { id: 'slot-11am', timeRange: '11:00 AM - 12:00 PM', matId: 'mat-1' },
      { id: 'slot-12pm', timeRange: '12:00 PM - 01:00 PM', matId: 'mat-1' },
      { id: 'slot-1pm', timeRange: '01:00 PM - 02:00 PM', matId: 'mat-1' },
      { id: 'slot-2pm', timeRange: '02:00 PM - 03:00 PM', matId: 'mat-1' },
      { id: 'slot-3pm', timeRange: '03:00 PM - 04:00 PM', matId: 'mat-1' },
      { id: 'slot-4pm', timeRange: '04:00 PM - 05:00 PM', matId: 'mat-1' },
      { id: 'slot-5pm', timeRange: '05:00 PM - 06:00 PM', matId: 'mat-1' },
      { id: 'slot-6pm', timeRange: '06:00 PM - 07:00 PM', matId: 'mat-1' },
      { id: 'slot-7pm', timeRange: '07:00 PM - 08:00 PM', matId: 'mat-1' },
      { id: 'slot-8pm', timeRange: '08:00 PM - 09:00 PM', matId: 'mat-1' },
      { id: 'slot-9pm', timeRange: '09:00 PM - 10:00 PM', matId: 'mat-1' },
    ],
  },
];

export const FIXED_6AM_10PM_HOURLY_SLOTS = [
  '06:00 AM - 07:00 AM',
  '07:00 AM - 08:00 AM',
  '08:00 AM - 09:00 AM',
  '09:00 AM - 10:00 AM',
  '10:00 AM - 11:00 AM',
  '11:00 AM - 12:00 PM',
  '12:00 PM - 01:00 PM',
  '01:00 PM - 02:00 PM',
  '02:00 PM - 03:00 PM',
  '03:00 PM - 04:00 PM',
  '04:00 PM - 05:00 PM',
  '05:00 PM - 06:00 PM',
  '06:00 PM - 07:00 PM',
  '07:00 PM - 08:00 PM',
  '08:00 PM - 09:00 PM',
  '09:00 PM - 10:00 PM',
];
