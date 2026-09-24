import React from 'react';
import { BeltRank, StripeCount, ClassCategory, Member, ClassSession } from '../types';

// IBJJF Youth Belts for Kids (Ages 4 - 15)
export const KIDS_BELT_RANKS: BeltRank[] = [
  'White',
  'Grey-White',
  'Grey',
  'Grey-Black',
  'Yellow-White',
  'Yellow',
  'Yellow-Black',
  'Orange-White',
  'Orange',
  'Orange-Black',
  'Green-White',
  'Green',
  'Green-Black',
];

// Juvenile Belts for Teens (Ages 16 - 17)
export const TEENS_BELT_RANKS: BeltRank[] = [
  'White',
  'Blue',
  'Purple',
];

// Adult Belts (Ages 18+)
export const ADULT_BELT_RANKS: BeltRank[] = [
  'White',
  'Blue',
  'Purple',
  'Brown',
  'Black',
];

// Full Master List of All Belts
export const ALL_BELT_RANKS: BeltRank[] = [
  'White',
  'Grey-White',
  'Grey',
  'Grey-Black',
  'Yellow-White',
  'Yellow',
  'Yellow-Black',
  'Orange-White',
  'Orange',
  'Orange-Black',
  'Green-White',
  'Green',
  'Green-Black',
  'Blue',
  'Purple',
  'Brown',
  'Black',
];

// Default fallback export
export const BELT_RANKS: BeltRank[] = ALL_BELT_RANKS;

// Official IBJJF Youth Belt Sequential Graduation Hierarchy
export const IBJJF_KIDS_BELT_ORDER: BeltRank[] = [
  'White',
  'Grey-White',
  'Grey',
  'Grey-Black',
  'Yellow-White',
  'Yellow',
  'Yellow-Black',
  'Orange-White',
  'Orange',
  'Orange-Black',
  'Green-White',
  'Green',
  'Green-Black',
];

export const IBJJF_TEEN_BELT_ORDER: BeltRank[] = [
  'White',
  'Blue',
  'Purple',
];

export const IBJJF_ADULT_BELT_ORDER: BeltRank[] = [
  'White',
  'Blue',
  'Purple',
  'Brown',
  'Black',
];

// IBJJF Minimum Age Requirements (Official Poster Chart)
export const IBJJF_BELT_MIN_AGE: Record<BeltRank, number> = {
  White: 4,
  'Grey-White': 4,
  Grey: 4,
  'Grey-Black': 4,
  'Yellow-White': 7,
  Yellow: 7,
  'Yellow-Black': 7,
  'Orange-White': 10,
  Orange: 10,
  'Orange-Black': 10,
  'Green-White': 13,
  Green: 13,
  'Green-Black': 13,
  Blue: 16,
  Purple: 16,
  Brown: 18,
  Black: 19,
};

export interface KidsBeltGroupInfo {
  groupName: string;
  minAge: number;
  maxAge: number;
  ageLabel: string;
  colorTheme: string;
  belts: BeltRank[];
}

export const IBJJF_KIDS_BELT_GROUPS: KidsBeltGroupInfo[] = [
  {
    groupName: 'White Belt',
    minAge: 4,
    maxAge: 15,
    ageLabel: 'Ages 4 - 15',
    colorTheme: 'stone',
    belts: ['White'],
  },
  {
    groupName: 'Grey Belt Family',
    minAge: 4,
    maxAge: 15,
    ageLabel: 'Ages 4 - 15',
    colorTheme: 'stone',
    belts: ['Grey-White', 'Grey', 'Grey-Black'],
  },
  {
    groupName: 'Yellow Belt Family',
    minAge: 7,
    maxAge: 15,
    ageLabel: 'Ages 7 - 15 (Min Age 7)',
    colorTheme: 'amber',
    belts: ['Yellow-White', 'Yellow', 'Yellow-Black'],
  },
  {
    groupName: 'Orange Belt Family',
    minAge: 10,
    maxAge: 15,
    ageLabel: 'Ages 10 - 15 (Min Age 10)',
    colorTheme: 'orange',
    belts: ['Orange-White', 'Orange', 'Orange-Black'],
  },
  {
    groupName: 'Green Belt Family',
    minAge: 13,
    maxAge: 15,
    ageLabel: 'Ages 13 - 15 (Min Age 13)',
    colorTheme: 'emerald',
    belts: ['Green-White', 'Green', 'Green-Black'],
  },
];

export interface BeltStyleConfig {
  name: BeltRank;
  bgGradient: string;
  borderColor: string;
  textColor: string;
  sleeveBg: string;
  sleeveBorder: string;
  stripeColor: string;
  centerStripe?: 'white' | 'black' | null;
}

export const BELT_CONFIGS: Record<BeltRank, BeltStyleConfig> = {
  // Adult & Universal White
  White: {
    name: 'White',
    bgGradient: 'bg-gradient-to-r from-stone-100 via-white to-stone-200',
    borderColor: 'border-stone-400',
    textColor: 'text-stone-900 font-extrabold',
    sleeveBg: 'bg-stone-950',
    sleeveBorder: 'border-stone-800',
    stripeColor: 'bg-white',
    centerStripe: null,
  },

  // IBJJF Youth Grey Group (Ages 4 - 15)
  'Grey-White': {
    name: 'Grey-White',
    bgGradient: 'bg-gradient-to-r from-stone-500 via-stone-400 to-stone-200',
    borderColor: 'border-stone-500',
    textColor: 'text-stone-950 font-black',
    sleeveBg: 'bg-stone-950',
    sleeveBorder: 'border-stone-800',
    stripeColor: 'bg-white',
    centerStripe: 'white',
  },
  Grey: {
    name: 'Grey',
    bgGradient: 'bg-gradient-to-r from-stone-600 via-stone-500 to-stone-600',
    borderColor: 'border-stone-600',
    textColor: 'text-white font-extrabold',
    sleeveBg: 'bg-stone-950',
    sleeveBorder: 'border-stone-800',
    stripeColor: 'bg-white',
    centerStripe: null,
  },
  'Grey-Black': {
    name: 'Grey-Black',
    bgGradient: 'bg-gradient-to-r from-stone-600 via-stone-500 to-stone-900',
    borderColor: 'border-stone-600',
    textColor: 'text-white font-extrabold',
    sleeveBg: 'bg-stone-950',
    sleeveBorder: 'border-stone-800',
    stripeColor: 'bg-white',
    centerStripe: 'black',
  },

  // IBJJF Youth Yellow Group (Ages 7 - 15)
  'Yellow-White': {
    name: 'Yellow-White',
    bgGradient: 'bg-gradient-to-r from-amber-400 via-amber-300 to-stone-100',
    borderColor: 'border-amber-500',
    textColor: 'text-stone-950 font-black',
    sleeveBg: 'bg-stone-950',
    sleeveBorder: 'border-stone-800',
    stripeColor: 'bg-white',
    centerStripe: 'white',
  },
  Yellow: {
    name: 'Yellow',
    bgGradient: 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500',
    borderColor: 'border-amber-600',
    textColor: 'text-stone-950 font-black',
    sleeveBg: 'bg-stone-950',
    sleeveBorder: 'border-stone-800',
    stripeColor: 'bg-white',
    centerStripe: null,
  },
  'Yellow-Black': {
    name: 'Yellow-Black',
    bgGradient: 'bg-gradient-to-r from-amber-500 via-amber-400 to-stone-900',
    borderColor: 'border-amber-600',
    textColor: 'text-stone-950 font-black',
    sleeveBg: 'bg-stone-950',
    sleeveBorder: 'border-stone-800',
    stripeColor: 'bg-white',
    centerStripe: 'black',
  },

  // IBJJF Youth Orange Group (Ages 10 - 15)
  'Orange-White': {
    name: 'Orange-White',
    bgGradient: 'bg-gradient-to-r from-orange-500 via-orange-400 to-stone-100',
    borderColor: 'border-orange-500',
    textColor: 'text-stone-950 font-black',
    sleeveBg: 'bg-stone-950',
    sleeveBorder: 'border-stone-800',
    stripeColor: 'bg-white',
    centerStripe: 'white',
  },
  Orange: {
    name: 'Orange',
    bgGradient: 'bg-gradient-to-r from-orange-600 via-orange-500 to-orange-600',
    borderColor: 'border-orange-600',
    textColor: 'text-white font-extrabold',
    sleeveBg: 'bg-stone-950',
    sleeveBorder: 'border-stone-800',
    stripeColor: 'bg-white',
    centerStripe: null,
  },
  'Orange-Black': {
    name: 'Orange-Black',
    bgGradient: 'bg-gradient-to-r from-orange-600 via-orange-500 to-stone-900',
    borderColor: 'border-orange-600',
    textColor: 'text-white font-extrabold',
    sleeveBg: 'bg-stone-950',
    sleeveBorder: 'border-stone-800',
    stripeColor: 'bg-white',
    centerStripe: 'black',
  },

  // IBJJF Youth Green Group (Ages 13 - 15)
  'Green-White': {
    name: 'Green-White',
    bgGradient: 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-stone-100',
    borderColor: 'border-emerald-600',
    textColor: 'text-stone-950 font-black',
    sleeveBg: 'bg-stone-950',
    sleeveBorder: 'border-stone-800',
    stripeColor: 'bg-white',
    centerStripe: 'white',
  },
  Green: {
    name: 'Green',
    bgGradient: 'bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-700',
    borderColor: 'border-emerald-700',
    textColor: 'text-white font-extrabold',
    sleeveBg: 'bg-stone-950',
    sleeveBorder: 'border-stone-800',
    stripeColor: 'bg-white',
    centerStripe: null,
  },
  'Green-Black': {
    name: 'Green-Black',
    bgGradient: 'bg-gradient-to-r from-emerald-700 via-emerald-600 to-stone-900',
    borderColor: 'border-emerald-700',
    textColor: 'text-white font-extrabold',
    sleeveBg: 'bg-stone-950',
    sleeveBorder: 'border-stone-800',
    stripeColor: 'bg-white',
    centerStripe: 'black',
  },

  // Adult & Juvenile Belts
  Blue: {
    name: 'Blue',
    bgGradient: 'bg-gradient-to-r from-blue-700 via-blue-600 to-blue-700',
    borderColor: 'border-blue-800',
    textColor: 'text-white font-extrabold',
    sleeveBg: 'bg-stone-950',
    sleeveBorder: 'border-black',
    stripeColor: 'bg-white',
    centerStripe: null,
  },
  Purple: {
    name: 'Purple',
    bgGradient: 'bg-gradient-to-r from-purple-800 via-purple-700 to-purple-800',
    borderColor: 'border-purple-900',
    textColor: 'text-white font-extrabold',
    sleeveBg: 'bg-stone-950',
    sleeveBorder: 'border-black',
    stripeColor: 'bg-white',
    centerStripe: null,
  },
  Brown: {
    name: 'Brown',
    bgGradient: 'bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950',
    borderColor: 'border-amber-950',
    textColor: 'text-white font-extrabold',
    sleeveBg: 'bg-stone-950',
    sleeveBorder: 'border-black',
    stripeColor: 'bg-white',
    centerStripe: null,
  },
  Black: {
    name: 'Black',
    bgGradient: 'bg-gradient-to-r from-stone-950 via-black to-stone-950',
    borderColor: 'border-stone-800',
    textColor: 'text-red-400 font-black',
    sleeveBg: 'bg-gradient-to-r from-red-700 to-red-600',
    sleeveBorder: 'border-red-800',
    stripeColor: 'bg-white',
    centerStripe: null,
  },
};

export function getBeltsForAgeGroup(ageGroup?: ClassCategory | string): BeltRank[] {
  if (ageGroup === 'Kids') return KIDS_BELT_RANKS;
  if (ageGroup === 'Teens') return TEENS_BELT_RANKS;
  return ADULT_BELT_RANKS;
}

/**
 * Returns the youth belts eligible for a specific kid's age according to IBJJF minimum age rules:
 * - Age 4-6: White & Grey group
 * - Age 7-9: White, Grey, and Yellow groups
 * - Age 10-12: White, Grey, Yellow, and Orange groups
 * - Age 13-15: All youth groups including Green
 */
export function getBeltsForKidsAge(athleteAge: number): BeltRank[] {
  return KIDS_BELT_RANKS.filter((belt) => {
    const minAge = IBJJF_BELT_MIN_AGE[belt] || 4;
    return athleteAge >= minAge;
  });
}

export function isBeltAgeAppropriate(belt: BeltRank, athleteAge: number): {
  isAllowed: boolean;
  minAgeRequired: number;
  reason?: string;
} {
  const minAge = IBJJF_BELT_MIN_AGE[belt] || 4;
  if (athleteAge < minAge) {
    return {
      isAllowed: false,
      minAgeRequired: minAge,
      reason: `IBJJF Rule: ${belt} belt requires minimum age ${minAge}. Athlete is ${athleteAge} years old.`,
    };
  }
  return { isAllowed: true, minAgeRequired: minAge };
}

/**
 * Returns the next belt in the graduation progression sequence
 */
export function getNextBeltInHierarchy(
  currentBelt: BeltRank,
  category: ClassCategory = 'Adults'
): BeltRank {
  if (category === 'Kids') {
    const idx = IBJJF_KIDS_BELT_ORDER.indexOf(currentBelt);
    if (idx !== -1 && idx < IBJJF_KIDS_BELT_ORDER.length - 1) {
      return IBJJF_KIDS_BELT_ORDER[idx + 1];
    }
    return currentBelt;
  }

  if (category === 'Teens') {
    const idx = IBJJF_TEEN_BELT_ORDER.indexOf(currentBelt);
    if (idx !== -1 && idx < IBJJF_TEEN_BELT_ORDER.length - 1) {
      return IBJJF_TEEN_BELT_ORDER[idx + 1];
    }
    return currentBelt;
  }

  const idx = IBJJF_ADULT_BELT_ORDER.indexOf(currentBelt);
  if (idx !== -1 && idx < IBJJF_ADULT_BELT_ORDER.length - 1) {
    return IBJJF_ADULT_BELT_ORDER[idx + 1];
  }
  return currentBelt;
}

export function isBeltAllowedForAgeGroup(belt: BeltRank, ageGroup?: ClassCategory | string): boolean {
  if (ageGroup === 'Kids') {
    return KIDS_BELT_RANKS.includes(belt);
  }
  if (ageGroup === 'Teens') {
    return TEENS_BELT_RANKS.includes(belt);
  }
  return ADULT_BELT_RANKS.includes(belt);
}

export interface ClassEligibilityCheck {
  isEligible: boolean;
  reason?: string;
  badgeText?: string;
  severity?: 'error' | 'warning';
}

/**
 * Strict IBJJF age and belt division validation logic.
 * Ensures adults and teens cannot be checked into kids classes,
 * kids cannot be checked into adults/teens sparring,
 * and adult ranks (Blue, Purple, Brown, Black) are never admitted to kids classes.
 */
export function checkStudentClassEligibility(student: Member, session: ClassSession): ClassEligibilityCheck {
  // --- ARCHIVED / DELETED STATUS CHECK ---
  if (student.isDeleted) {
    return {
      isEligible: false,
      reason: `${student.fullName} has been archived or removed from the active roster and cannot participate in class sessions.`,
      badgeText: 'Archived / Deleted',
      severity: 'error',
    };
  }

  // --- KIDS CLASS VALIDATION ---
  if (session.category === 'Kids') {
    // 1. Must be categorized as a Kid
    if (student.ageGroup && student.ageGroup !== 'Kids') {
      return {
        isEligible: false,
        reason: `${student.fullName} is an ${student.ageGroup} student. Adults and Teens are strictly prohibited from Kids classes under IBJJF safety guidelines.`,
        badgeText: `Ineligible: ${student.ageGroup} in Kids Class`,
        severity: 'error',
      };
    }

    // 2. Belts in Kids Class: STRICTLY YOUTH BELTS ONLY
    // Adult ranks (Blue, Purple, Brown, Black) are NEVER allowed
    if (student.beltRank === 'Brown') {
      return {
        isEligible: false,
        reason: `${student.fullName} holds a Brown Belt (Adult Rank, min age 18). Kids classes only use the Youth Belt system (White, Grey, Yellow, Orange, Green).`,
        badgeText: 'Ineligible: Brown Belt (Adult Rank)',
        severity: 'error',
      };
    }

    if (['Blue', 'Purple', 'Black'].includes(student.beltRank)) {
      return {
        isEligible: false,
        reason: `${student.fullName} holds a ${student.beltRank} Belt (Adult/Juvenile Rank). Kids classes only admit Youth Belt holders.`,
        badgeText: `Ineligible: ${student.beltRank} Belt`,
        severity: 'error',
      };
    }

    if (!KIDS_BELT_RANKS.includes(student.beltRank)) {
      return {
        isEligible: false,
        reason: `${student.beltRank} Belt is not recognized in the IBJJF Youth division.`,
        badgeText: 'Ineligible Belt',
        severity: 'error',
      };
    }

    return { isEligible: true };
  }

  // --- TEENS CLASS VALIDATION ---
  if (session.category === 'Teens') {
    if (student.ageGroup === 'Kids') {
      return {
        isEligible: false,
        reason: `${student.fullName} is registered in the Kids division. Teens classes have higher sparring intensity.`,
        badgeText: 'Ineligible: Kids in Teens Class',
        severity: 'error',
      };
    }

    if (student.ageGroup === 'Adults') {
      return {
        isEligible: false,
        reason: `${student.fullName} is an Adult. Adults cannot attend Teens youth sessions.`,
        badgeText: 'Ineligible: Adult in Teens Class',
        severity: 'error',
      };
    }

    if (student.beltRank === 'Brown' || student.beltRank === 'Black') {
      return {
        isEligible: false,
        reason: `Teens/Juveniles under 18 cannot hold ${student.beltRank} belt under IBJJF rules (minimum age for Brown is 18, Black is 19).`,
        badgeText: `Ineligible: ${student.beltRank} Belt in Teens`,
        severity: 'error',
      };
    }

    return { isEligible: true };
  }

  // --- ADULTS CLASS VALIDATION ---
  if (session.category === 'Adults') {
    if (student.ageGroup === 'Kids') {
      return {
        isEligible: false,
        reason: `${student.fullName} is a child student and cannot join Adult full-contact sparring sessions.`,
        badgeText: 'Ineligible: Kids in Adult Class',
        severity: 'error',
      };
    }

    if (student.ageGroup === 'Teens') {
      return {
        isEligible: false,
        reason: `${student.fullName} is in the Teens youth program. Adults classes are reserved for members 18+.`,
        badgeText: 'Ineligible: Teen in Adult Class',
        severity: 'error',
      };
    }

    // Youth belts (Grey, Yellow, Orange, Green) are not adult ranks
    const isYouthSpecificBelt = [
      'Grey-White', 'Grey', 'Grey-Black',
      'Yellow-White', 'Yellow', 'Yellow-Black',
      'Orange-White', 'Orange', 'Orange-Black',
      'Green-White', 'Green', 'Green-Black',
    ].includes(student.beltRank);

    if (isYouthSpecificBelt) {
      return {
        isEligible: false,
        reason: `${student.fullName} holds a youth belt (${student.beltRank}). Adults must be evaluated under the Adult belt system (White, Blue, Purple, Brown, Black).`,
        badgeText: 'Ineligible: Youth Belt in Adult Class',
        severity: 'error',
      };
    }

    return { isEligible: true };
  }

  return { isEligible: true };
}

interface BeltBadgeProps {
  belt: BeltRank;
  stripes: StripeCount;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const BeltBadge: React.FC<BeltBadgeProps> = ({
  belt,
  stripes,
  size = 'md',
  showLabel = true,
}) => {
  const config = BELT_CONFIGS[belt] || BELT_CONFIGS.White;

  const heightClass = size === 'sm' ? 'h-6 text-xs' : size === 'lg' ? 'h-8 text-sm' : 'h-7 text-xs';
  const minWidthClass = size === 'sm' ? 'min-w-[138px]' : size === 'lg' ? 'min-w-[210px]' : 'min-w-[170px]';
  const sleeveWidthClass = size === 'sm' ? 'w-8' : size === 'lg' ? 'w-11' : 'w-9.5';
  const stripeWidth = size === 'sm' ? 'w-[2px]' : size === 'lg' ? 'w-[3.5px]' : 'w-[2.5px]';

  return (
    <div className="inline-flex items-center gap-2 max-w-full">
      {/* Authentic BJJ Belt visual representation with stitching & rank sleeve */}
      <div
        className={`relative inline-flex items-center justify-between rounded-md border shadow-sm overflow-hidden select-none shrink-0 ${config.bgGradient} ${config.borderColor} ${heightClass} ${minWidthClass}`}
        title={`${belt} Belt, ${stripes} Stripe${stripes === 1 ? '' : 's'}`}
      >
        {/* Belt fabric stitching lines top and bottom */}
        <div className="absolute inset-x-0 top-[2px] border-t border-black/15 pointer-events-none" />
        <div className="absolute inset-x-0 bottom-[2px] border-b border-black/15 pointer-events-none" />

        {/* Youth center longitudinal stripe for White/Black youth varieties */}
        {config.centerStripe && (
          <div
            className={`absolute inset-x-0 top-1/2 -translate-y-1/2 h-[28%] ${
              config.centerStripe === 'white' ? 'bg-white shadow-xs' : 'bg-black shadow-xs'
            } pointer-events-none opacity-95`}
          />
        )}

        {/* Full Belt Rank Name - Never truncated */}
        <span
          className={`relative z-10 px-2 font-black tracking-wider uppercase whitespace-nowrap drop-shadow-xs ${config.textColor}`}
          style={{ fontSize: size === 'sm' ? '10px' : size === 'lg' ? '12.5px' : '11px' }}
        >
          {belt}
        </span>

        {/* Rank sleeve bar with stripe positions */}
        <div
          className={`relative z-10 h-full flex items-center justify-evenly px-1 border-l shrink-0 ${config.sleeveBg} ${config.sleeveBorder} ${sleeveWidthClass}`}
        >
          {Array.from({ length: 4 }).map((_, index) => {
            const hasStripe = index < stripes;
            return (
              <div
                key={index}
                className={`h-[78%] rounded-[0.5px] transition-colors shadow-xs ${stripeWidth} ${
                  hasStripe ? `${config.stripeColor} opacity-100` : 'bg-black/20 opacity-30'
                }`}
              />
            );
          })}
        </div>
      </div>

      {showLabel && (
        <span className="text-xs font-semibold text-stone-300 dark:text-stone-300 whitespace-nowrap">
          {stripes > 0 ? `${stripes} stripe${stripes > 1 ? 's' : ''}` : 'No stripes'}
        </span>
      )}
    </div>
  );
};

