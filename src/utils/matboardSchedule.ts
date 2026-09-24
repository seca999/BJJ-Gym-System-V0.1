import { TimetableConfig, TimetableDay, ClassSession, Coach, TimetableCell } from '../types';
import { parseTimeToMinutes } from './timeUtils';

export const DAY_FULL_TO_TIMETABLE_DAY: Record<string, TimetableDay> = {
  sunday: 'SUN',
  sun: 'SUN',
  monday: 'MON',
  mon: 'MON',
  tuesday: 'TUE',
  tue: 'TUE',
  wednesday: 'WED',
  wed: 'WED',
  thursday: 'THU',
  thu: 'THU',
  friday: 'FRI',
  fri: 'FRI',
  saturday: 'SAT',
  sat: 'SAT',
};

export const TIMETABLE_DAY_TO_FULL: Record<TimetableDay, string> = {
  SUN: 'Sunday',
  MON: 'Monday',
  TUE: 'Tuesday',
  WED: 'Wednesday',
  THU: 'Thursday',
  FRI: 'Friday',
  SAT: 'Saturday',
};

/**
 * Resolves any day input (Date object, day name, short day, or ISO string) to TimetableDay ('SAT' | 'SUN' | 'MON' | ...)
 */
export function resolveTimetableDay(input: string | Date | number): TimetableDay {
  if (input instanceof Date) {
    const map: TimetableDay[] = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    return map[input.getDay()] || 'SUN';
  }
  if (typeof input === 'number') {
    const map: TimetableDay[] = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    return map[input] || 'SUN';
  }
  const clean = String(input).trim().toLowerCase();
  if (DAY_FULL_TO_TIMETABLE_DAY[clean]) {
    return DAY_FULL_TO_TIMETABLE_DAY[clean];
  }
  const parsed = new Date(input);
  if (!isNaN(parsed.getTime())) {
    const map: TimetableDay[] = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    return map[parsed.getDay()] || 'SUN';
  }
  return 'SUN';
}

/**
 * Intelligent matcher that pairs a timetable cell with its canonical registered class in the academy registry.
 * Uses category matching, keyword semantics (beginner, advanced, competition, morning, wrestling, etc.),
 * time slot matching, and room matching to ensure precise pairing without cross-slot collisions.
 */
function findBestMatchingClass(
  cell: TimetableCell,
  timeRange: string,
  roomName: string,
  registeredClasses: ClassSession[]
): ClassSession | null {
  if (!registeredClasses || registeredClasses.length === 0) return null;

  const cellTitle = (cell.title || '').trim().toLowerCase();
  const cellSub = (cell.subtitle || '').trim().toLowerCase();
  const combinedCellText = `${cellTitle} ${cellSub}`.replace(/\s+/g, ' ');
  const cellCategory = (cell.category || '').toLowerCase();
  const cellInstructor = (cell.instructor || '').toLowerCase();

  let bestMatch: ClassSession | null = null;
  let highestScore = 0;

  for (const rc of registeredClasses) {
    let score = 0;
    const rcTitle = (rc.title || '').toLowerCase();
    const rcDesc = (rc.description || '').toLowerCase();
    const rcCoach = (rc.coach || '').toLowerCase();
    const rcTime = (rc.time || '').toLowerCase();
    const rcRoom = (rc.room || '').toLowerCase();
    const rcCategory = (rc.category || '').toLowerCase();

    // 1. Strict category compatibility
    if (cellCategory && rcCategory) {
      if (cellCategory === rcCategory) {
        score += 25;
      } else {
        // Heavy penalty for category mismatch (e.g. Adult class must never pair with Kids)
        score -= 60;
      }
    }

    // 2. Exact or direct title match
    if (rcTitle === cellTitle) {
      score += 45;
    } else if (rcTitle.includes(cellTitle) && cellTitle.length > 3) {
      score += 15;
    }

    // 3. High-discriminator keywords
    const keywords = [
      { key: 'competition', weight: 50 },
      { key: 'advanced', weight: 40 },
      { key: 'beginner', weight: 40 },
      { key: 'fundamentals', weight: 35 },
      { key: 'little ninja', weight: 50 },
      { key: 'ninja', weight: 45 },
      { key: 'mighty mite', weight: 50 },
      { key: 'might', weight: 40 },
      { key: 'mite', weight: 40 },
      { key: 'morning', weight: 40 },
      { key: 'patrol', weight: 35 },
      { key: 'evening', weight: 35 },
      { key: 'all levels', weight: 35 },
      { key: 'wrestling', weight: 50 },
      { key: 'open mat', weight: 50 },
      { key: 'juvenile', weight: 35 },
      { key: 'teens', weight: 20 },
      { key: 'kids', weight: 15 },
    ];

    for (const kw of keywords) {
      const inCell = combinedCellText.includes(kw.key);
      const inRc = rcTitle.includes(kw.key) || rcDesc.includes(kw.key);
      if (inCell && inRc) {
        score += kw.weight;
      } else if (inCell && !inRc && kw.weight >= 40) {
        // Cell specifically asks for this variant, but candidate is missing it
        score -= 30;
      } else if (!inCell && inRc && kw.weight >= 40) {
        // Candidate has a strong variant (e.g. competition/advanced) that the cell did not specify
        score -= 20;
      }
    }

    // 4. Time range / start time proximity
    if (timeRange && rcTime) {
      const cleanCellTime = timeRange.replace(/\s+/g, '');
      const cleanRcTime = rcTime.replace(/\s+/g, '');
      if (cleanCellTime === cleanRcTime) {
        score += 30;
      } else {
        const startSlot = timeRange.split('-')[0]?.trim();
        if (startSlot && rcTime.includes(startSlot)) {
          score += 18;
        }
      }
    }

    // 5. Room match
    if (roomName && rcRoom) {
      if (roomName.toLowerCase() === rcRoom.toLowerCase()) {
        score += 10;
      }
    }

    // 6. Instructor match
    if (cellInstructor && (rcCoach.includes(cellInstructor) || (rc.headCoachName && rc.headCoachName.toLowerCase().includes(cellInstructor)))) {
      score += 20;
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = rc;
    }
  }

  return highestScore >= 35 ? bestMatch : null;
}

/**
 * Derives the active scheduled classes for a specific day STRICTLY from the Matboard (timetableConfig).
 * The Matboard is the single source of truth:
 * - If the matboard does not have any cells on a day (e.g. Sunday), NO classes exist for that day.
 * - Every session has a GUARANTEED UNIQUE ID (cell.id), preventing multi-card selection bugs.
 * - Classes scheduled at different times on the same day never collapse into identical names.
 */
export function getMatboardClassesForDay(
  dayInput: string | Date | number,
  timetableConfig: TimetableConfig | undefined | null,
  registeredClasses: ClassSession[] = [],
  coaches: Coach[] = []
): ClassSession[] {
  if (!timetableConfig || !timetableConfig.cells) {
    return [];
  }

  const targetDay = resolveTimetableDay(dayInput);

  // Filter cells on the matboard that belong to this day and have an assigned class title
  const dayCells = timetableConfig.cells.filter(
    (cell) => cell.day === targetDay && cell.title && cell.title.trim() !== ''
  );

  if (dayCells.length === 0) {
    return [];
  }

  const slotsMap = new Map((timetableConfig.slots || []).map((s) => [s.id, s]));
  const matsMap = new Map((timetableConfig.mats || []).map((m) => [m.id, m]));

  const resultClasses: (ClassSession & { registeredClassId?: string })[] = [];
  const seenSlotKeys = new Set<string>();

  dayCells.forEach((cell, idx) => {
    const slot = slotsMap.get(cell.slotId);
    const mat = matsMap.get(cell.matId || slot?.matId || '');
    const timeRange =
      slot?.timeRange ||
      (cell.subtitle && cell.subtitle.includes(':') ? cell.subtitle.split('\n').pop() : '') ||
      'Scheduled';
    const roomName = mat?.name || 'Mat 01';

    // Prevent duplicate entries for exact same cell slot on the same day & mat
    const duplicateKey = `${cell.id || `${cell.slotId}-${cell.day}-${roomName}`}`;
    if (seenSlotKeys.has(duplicateKey)) return;
    seenSlotKeys.add(duplicateKey);

    const matchedClass = findBestMatchingClass(cell, timeRange, roomName, registeredClasses);

    // CRITICAL: Every session in the day has a GUARANTEED UNIQUE ID (cell.id)!
    // This ensures clicking one class card selects ONLY that card!
    const uniqueSessionId = cell.id || `session-${targetDay}-${cell.slotId || idx}`;

    // Determine clean descriptive title
    let sessionTitle: string;
    if (matchedClass) {
      sessionTitle = matchedClass.title;
    } else {
      const cleanSub = (cell.subtitle || '')
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s && !s.includes(':') && !s.toLowerCase().includes('mat'))
        .join(' ');
      sessionTitle = cleanSub ? `${cell.title} (${cleanSub})` : cell.title;
    }

    // Resolve instructor
    const coachName = cell.instructor || matchedClass?.headCoachName || matchedClass?.coach || 'Academy Coach';
    const cleanCoachSearch = coachName.replace(/\(.*?\)/g, '').trim().toLowerCase();
    const coachObj = coaches.find(
      (c) => !c.isDeleted && (c.fullName.toLowerCase().includes(cleanCoachSearch) || cleanCoachSearch.includes(c.fullName.toLowerCase()))
    );

    if (matchedClass) {
      resultClasses.push({
        ...matchedClass,
        // Crucial: unique id per scheduled slot on matboard
        id: uniqueSessionId,
        registeredClassId: matchedClass.id,
        title: sessionTitle,
        time: timeRange,
        room: roomName,
        category: cell.category || matchedClass.category || 'Adults',
        coach: coachObj ? `${coachObj.fullName} (Coach)` : (cell.instructor ? `${cell.instructor} (Coach)` : matchedClass.coach),
        headCoachId: coachObj?.id || matchedClass.headCoachId,
        headCoachName: coachObj?.fullName || matchedClass.headCoachName || coachName,
        headCoachRank: coachObj ? `${coachObj.beltRank} Belt` : matchedClass.headCoachRank,
      });
    } else {
      resultClasses.push({
        id: uniqueSessionId,
        title: sessionTitle,
        time: timeRange,
        room: roomName,
        category: cell.category || 'Adults',
        daysOfWeek: [TIMETABLE_DAY_TO_FULL[cell.day]],
        type:
          cell.title.toLowerCase().includes('no-gi') || cell.title.toLowerCase().includes('nogi')
            ? 'No-Gi'
            : cell.title.toLowerCase().includes('wrestling')
            ? 'No-Gi'
            : 'Gi',
        coach: coachObj ? `${coachObj.fullName} (Coach)` : coachName,
        headCoachId: coachObj?.id,
        headCoachName: coachObj?.fullName || coachName,
        headCoachRank: coachObj ? `${coachObj.beltRank} Belt` : undefined,
        description: cell.subtitle || 'Scheduled session on Academy Matboard',
        eligibleAgeMin: cell.category === 'Kids' ? 4 : cell.category === 'Teens' ? 12 : 16,
        eligibleAgeMax: cell.category === 'Kids' ? 11 : cell.category === 'Teens' ? 15 : 99,
      });
    }
  });

  // Ensure no two sessions on the same day share the identical title (disambiguate by time if needed)
  const titleCounts = new Map<string, number>();
  resultClasses.forEach((c) => {
    titleCounts.set(c.title, (titleCounts.get(c.title) || 0) + 1);
  });

  resultClasses.forEach((c) => {
    if ((titleCounts.get(c.title) || 0) > 1) {
      c.title = `${c.title} • ${c.time}`;
    }
  });

  // Sort chronologically by start time
  return resultClasses.sort((a, b) => {
    const aMin = parseTimeToMinutes(a.time);
    const bMin = parseTimeToMinutes(b.time);
    return aMin - bMin;
  });
}
