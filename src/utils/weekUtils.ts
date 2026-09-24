/**
 * Week & Calendar Utilities for 52-Week Mat Schedule Navigation and Future Check-Ins
 * Gym week runs Saturday through Friday (7 days).
 */

export interface GymDayInfo {
  dayFull: string; // 'Saturday', 'Sunday', etc.
  dayShort: string; // 'Sat', 'Sun', etc.
  dateStr: string; // 'YYYY-MM-DD'
  dayOfMonth: number;
  monthShort: string; // 'Jan', 'Feb', etc.
  monthFull: string;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
}

export interface GymWeek {
  weekNumber: number; // 1 to 52 (or 53)
  year: number;
  startDateStr: string; // 'YYYY-MM-DD' (Saturday)
  endDateStr: string; // 'YYYY-MM-DD' (Friday)
  label: string; // 'Week 39: Sep 19 – Sep 25'
  shortLabel: string; // 'W39 • Sep 19 - 25'
  monthLabel: string; // 'September'
  isCurrentWeek: boolean;
  isFutureWeek: boolean;
  isPastWeek: boolean;
  days: GymDayInfo[];
}

export const DAY_NAMES_FULL = [
  'Saturday',
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
];

export const DAY_NAMES_SHORT = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

export const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export const MONTH_NAMES_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Formats a Date object to 'YYYY-MM-DD' in local time (avoiding UTC offset bugs)
 */
export function formatDateToISO(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses 'YYYY-MM-DD' into a local Date object at midnight
 */
export function parseISODate(dateStr: string): Date {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }
  return new Date();
}

/**
 * Finds the Saturday that starts the academy week containing the given date.
 * JavaScript getDay(): 0 = Sun, 1 = Mon, ..., 5 = Fri, 6 = Sat
 */
export function getSaturdayOfWeek(d: Date): Date {
  const dayOfWeek = d.getDay();
  // Saturday is day 6. If day is 6, diff is 0. If day is 0 (Sunday), diff is -1, etc.
  const diff = dayOfWeek === 6 ? 0 : -(dayOfWeek + 1);
  const sat = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
  sat.setHours(0, 0, 0, 0);
  return sat;
}

/**
 * Returns today's ISO date string
 */
export function getTodayDateStr(): string {
  return formatDateToISO(new Date());
}

/**
 * Formats a date range: e.g. "Sep 19 – Sep 25, 2026"
 */
export function formatWeekDateRange(startDateStr: string, endDateStr: string): string {
  const start = parseISODate(startDateStr);
  const end = parseISODate(endDateStr);
  const startMonth = MONTH_NAMES_SHORT[start.getMonth()];
  const endMonth = MONTH_NAMES_SHORT[end.getMonth()];

  if (startMonth === endMonth) {
    return `${startMonth} ${start.getDate()} – ${end.getDate()}, ${end.getFullYear()}`;
  }
  return `${startMonth} ${start.getDate()} – ${endMonth} ${end.getDate()}, ${end.getFullYear()}`;
}

/**
 * Generates all 52 (or 53) weeks of a given year (running Saturday to Friday).
 * Week 1 starts on the Saturday that begins the first week of the year.
 */
export function generate52WeeksForYear(year: number, todayStr: string = getTodayDateStr()): GymWeek[] {
  const today = parseISODate(todayStr);
  today.setHours(0, 0, 0, 0);
  const currentWeekSaturday = getSaturdayOfWeek(today);
  const currentWeekSatStr = formatDateToISO(currentWeekSaturday);

  // Find the first Saturday of the year or the Saturday preceding Jan 1
  // If Jan 1 is Thursday, the Saturday before is Dec 27.
  // Standard convention: Week 1 is the first week containing at least 4 days of the new year,
  // or simply the week starting on or right before Jan 1st.
  const jan1 = new Date(year, 0, 1);
  let firstSaturday = getSaturdayOfWeek(jan1);

  // If the Saturday of Jan 1 only has 1 or 2 days in the new year (i.e. Jan 1 is Friday or Saturday),
  // check whether firstSaturday falls in December.
  // If Dec 27 has 5 days in Dec and only 2 in Jan, some prefer the next Saturday (Jan 3).
  // But having Dec 27 or Jan 3 as Week 1 is fine as long as all 52/53 weeks are contiguous!
  if (firstSaturday.getFullYear() < year) {
    // If firstSaturday is in previous year, check if Jan 1 is Friday (day 5) or Thursday (day 4)
    // If Jan 1 is Friday, only 2 days in Jan (Jan 1, Jan 2), so Week 1 starts on Jan 2 or Jan 3.
    // Let's use Jan 1's week as Week 1 if it has Jan 1.
  }

  const weeks: GymWeek[] = [];
  let currentSat = new Date(firstSaturday.getFullYear(), firstSaturday.getMonth(), firstSaturday.getDate());

  // Generate 52 or 53 weeks until the end of the year is reached
  for (let w = 1; w <= 53; w++) {
    const startDateStr = formatDateToISO(currentSat);

    // End date is Friday (6 days after Saturday)
    const currentFri = new Date(currentSat.getFullYear(), currentSat.getMonth(), currentSat.getDate() + 6);
    const endDateStr = formatDateToISO(currentFri);

    // If week 53 starts well into the NEXT year (e.g. currentSat is Jan 3 of next year), break
    if (w > 52 && currentSat.getFullYear() > year) {
      break;
    }

    const isCurrentWeek = startDateStr === currentWeekSatStr;
    const isPastWeek = currentFri.getTime() < today.getTime() && !isCurrentWeek;
    const isFutureWeek = currentSat.getTime() > today.getTime();

    // Generate the 7 days for this week
    const days: GymDayInfo[] = [];
    for (let d = 0; d < 7; d++) {
      const dayDate = new Date(currentSat.getFullYear(), currentSat.getMonth(), currentSat.getDate() + d);
      const dayDateStr = formatDateToISO(dayDate);
      const isDayToday = dayDateStr === todayStr;
      const isDayPast = dayDate.getTime() < today.getTime() && !isDayToday;
      const isDayFuture = dayDate.getTime() > today.getTime();

      days.push({
        dayFull: DAY_NAMES_FULL[d],
        dayShort: DAY_NAMES_SHORT[d],
        dateStr: dayDateStr,
        dayOfMonth: dayDate.getDate(),
        monthShort: MONTH_NAMES_SHORT[dayDate.getMonth()],
        monthFull: MONTH_NAMES_FULL[dayDate.getMonth()],
        isToday: isDayToday,
        isPast: isDayPast,
        isFuture: isDayFuture,
      });
    }

    const monthLabel = MONTH_NAMES_FULL[currentFri.getMonth()];
    const dateRangeLabel = formatWeekDateRange(startDateStr, endDateStr);

    weeks.push({
      weekNumber: w,
      year,
      startDateStr,
      endDateStr,
      label: `Week ${w} • ${dateRangeLabel}`,
      shortLabel: `W${w} (${days[0].monthShort} ${days[0].dayOfMonth}-${days[6].dayOfMonth})`,
      monthLabel,
      isCurrentWeek,
      isFutureWeek,
      isPastWeek,
      days,
    });

    // Advance 7 days to next Saturday
    currentSat = new Date(currentSat.getFullYear(), currentSat.getMonth(), currentSat.getDate() + 7);
  }

  return weeks;
}

/**
 * Finds the GymWeek matching any given date string 'YYYY-MM-DD'
 */
export function findWeekForDate(dateStr: string, weeks: GymWeek[]): GymWeek | undefined {
  return weeks.find((w) => {
    return dateStr >= w.startDateStr && dateStr <= w.endDateStr;
  });
}

/**
 * Checks if a given date string is in the future compared to today
 */
export function isDateInFuture(dateStr: string, todayStr: string = getTodayDateStr()): boolean {
  return dateStr > todayStr;
}

/**
 * Returns human-readable relative label for date:
 * e.g. "Today", "Tomorrow", "Yesterday", or "In 2 weeks", or "3 days ago"
 */
export function getRelativeDateLabel(dateStr: string, todayStr: string = getTodayDateStr()): string {
  if (dateStr === todayStr) return 'Today';
  const target = parseISODate(dateStr);
  const today = parseISODate(todayStr);
  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;
  if (diffDays > 7 && diffDays <= 14) return 'Next week';
  if (diffDays > 14) return `In ${Math.round(diffDays / 7)} weeks`;
  if (diffDays < -1 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;
  return `${Math.abs(Math.round(diffDays / 7))} weeks ago`;
}
