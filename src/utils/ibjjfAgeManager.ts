import { Member, ClassCategory, BeltRank, IBJJFTransferRecord, PromotionRecord } from '../types';
import { KIDS_BELT_RANKS, TEENS_BELT_RANKS, ADULT_BELT_RANKS } from './bjjBelts';

/**
  * Calculates exact chronological age from a YYYY-MM-DD birth date string.
  */
export function calculateStudentAge(birthDate?: string, refDateStr?: string): number {
  if (!birthDate) return 18; // Default fallback if no DOB
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return 18;

  const refDate = refDateStr ? new Date(refDateStr) : new Date();
  let age = refDate.getFullYear() - birth.getFullYear();
  const monthDiff = refDate.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && refDate.getDate() < birth.getDate())) {
    age--;
  }
  return Math.max(0, age);
}

/**
 * Official IBJJF Formula from the Graduation System Poster:
 * CURRENT YEAR - BIRTH YEAR = AGE OF THE ATHLETE
 */
export function calculateIBJJFCompetitionAge(birthDate?: string, refYear?: number): number {
  if (!birthDate) return 18;
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return 18;
  const currentYear = refYear || new Date().getFullYear();
  return Math.max(0, currentYear - birth.getFullYear());
}

/**
  * Determines the strict IBJJF Age Category based on age:
  * - Kids: Under 16 (Ages 4 to 15)
  * - Teens (Juvenile): Ages 16 to 17
  * - Adults: Ages 18+
  */
export function getIBJJFCategory(age: number): ClassCategory {
  if (age < 16) return 'Kids';
  if (age >= 16 && age <= 17) return 'Teens';
  return 'Adults';
}

/**
  * Returns detailed IBJJF Division breakdown with descriptive sub-grouping
  */
export function getIBJJFDivisionLabel(age: number): {
  category: ClassCategory;
  divisionName: string;
  subGroup: string;
  ageBracket: string;
  beltRules: string;
} {
  if (age < 16) {
    let subGroup = 'Kids';
    if (age <= 6) subGroup = 'Mighty Mite (4-6 yrs)';
    else if (age <= 9) subGroup = 'Pee Wee (7-9 yrs)';
    else if (age <= 12) subGroup = 'Junior (10-12 yrs)';
    else subGroup = 'Teen Youth (13-15 yrs)';

    return {
      category: 'Kids',
      divisionName: `IBJJF Kids Division • ${subGroup}`,
      subGroup,
      ageBracket: 'Ages 4-15 (Under 16)',
      beltRules: 'Youth Belts Only (White, Grey, Yellow, Orange, Green)',
    };
  }

  if (age >= 16 && age <= 17) {
    return {
      category: 'Teens',
      divisionName: 'IBJJF Juvenile Division (Teens 16-17)',
      subGroup: 'Juvenile (16-17 yrs)',
      ageBracket: 'Ages 16-17',
      beltRules: 'Juvenile Ranks (White, Blue, Purple). Brown/Black forbidden.',
    };
  }

  const subGroup = age < 30 ? 'Adults (18-29 yrs)' : `Master ${Math.min(7, Math.floor((age - 30) / 5) + 1)} (${age} yrs)`;
  return {
    category: 'Adults',
    divisionName: `IBJJF Adult Division • ${subGroup}`,
    subGroup,
    ageBracket: 'Ages 18+',
    beltRules: 'Adult Belts (White, Blue, Purple, Brown, Black)',
  };
}

/**
  * Calculates milestone and countdown to the next IBJJF age division transfer.
  */
export function getIBJJFTransferMilestone(
  birthDate?: string,
  currentCategory?: ClassCategory,
  refDateStr?: string
): {
  currentAge: number;
  currentCategory: ClassCategory;
  isEligibleForNext: boolean;
  nextCategory?: ClassCategory;
  targetAge?: number;
  transferDate?: string;
  daysRemaining?: number;
  countdownText: string;
  description: string;
} {
  const currentAge = calculateStudentAge(birthDate, refDateStr);
  const detectedCategory = getIBJJFCategory(currentAge);
  const activeCategory = currentCategory || detectedCategory;
  const refDate = refDateStr ? new Date(refDateStr) : new Date();

  if (!birthDate) {
    return {
      currentAge,
      currentCategory: activeCategory,
      isEligibleForNext: false,
      countdownText: 'No Birth Date Configured',
      description: 'Add date of birth in student profile to enable automatic IBJJF progression.',
    };
  }

  const birth = new Date(birthDate);

  if (activeCategory === 'Kids' || currentAge < 16) {
    // Target age 16 -> Teens
    const targetDate = new Date(birth);
    targetDate.setFullYear(birth.getFullYear() + 16);
    const diffTime = targetDate.getTime() - refDate.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    const targetDateStr = targetDate.toISOString().split('T')[0];

    if (currentAge >= 16) {
      return {
        currentAge,
        currentCategory: 'Kids',
        isEligibleForNext: true,
        nextCategory: 'Teens',
        targetAge: 16,
        transferDate: targetDateStr,
        daysRemaining: 0,
        countdownText: 'Ready for Immediate Transfer to Teens!',
        description: `Student reached age ${currentAge} and is ready to be transferred to Teens (Juvenile) division.`,
      };
    }

    return {
      currentAge,
      currentCategory: 'Kids',
      isEligibleForNext: false,
      nextCategory: 'Teens',
      targetAge: 16,
      transferDate: targetDateStr,
      daysRemaining,
      countdownText: daysRemaining === 1 ? '1 day to Teens' : `${daysRemaining} days to Teens Division`,
      description: `Must remain in Kids division until turning 16 on ${targetDateStr} (${daysRemaining} days remaining).`,
    };
  }

  if (activeCategory === 'Teens' || (currentAge >= 16 && currentAge <= 17)) {
    // Target age 18 -> Adults
    const targetDate = new Date(birth);
    targetDate.setFullYear(birth.getFullYear() + 18);
    const diffTime = targetDate.getTime() - refDate.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    const targetDateStr = targetDate.toISOString().split('T')[0];

    if (currentAge >= 18) {
      return {
        currentAge,
        currentCategory: 'Teens',
        isEligibleForNext: true,
        nextCategory: 'Adults',
        targetAge: 18,
        transferDate: targetDateStr,
        daysRemaining: 0,
        countdownText: 'Ready for Immediate Transfer to Adults!',
        description: `Student reached age ${currentAge} and is ready to be transferred to Adults division.`,
      };
    }

    return {
      currentAge,
      currentCategory: 'Teens',
      isEligibleForNext: false,
      nextCategory: 'Adults',
      targetAge: 18,
      transferDate: targetDateStr,
      daysRemaining,
      countdownText: daysRemaining === 1 ? '1 day to Adults' : `${daysRemaining} days to Adults Division`,
      description: `In Teens/Juvenile division until turning 18 on ${targetDateStr} (${daysRemaining} days remaining).`,
    };
  }

  return {
    currentAge,
    currentCategory: 'Adults',
    isEligibleForNext: false,
    countdownText: 'Adult Division (Ages 18+)',
    description: 'Student is in the Adult division under IBJJF rules.',
  };
}

/**
  * Adjusts the belt rank when a student transfers between age divisions according to IBJJF guidelines.
  * - Youth White -> Juvenile White
  * - Youth Color Belts (Grey, Yellow, Orange, Green) -> Juvenile Blue Belt (IBJJF youth conversion)
  * - Juvenile Belts (White, Blue, Purple) carry directly into Adult division.
  */
export function transitionBeltForNewAgeGroup(
  currentBelt: BeltRank,
  targetCategory: ClassCategory
): {
  newBelt: BeltRank;
  wasConverted: boolean;
  conversionNote?: string;
} {
  if (targetCategory === 'Kids') {
    if (KIDS_BELT_RANKS.includes(currentBelt)) {
      return { newBelt: currentBelt, wasConverted: false };
    }
    return {
      newBelt: 'White',
      wasConverted: true,
      conversionNote: `Belt reset to Youth White as ${currentBelt} is not recognized in IBJJF Youth division.`,
    };
  }

  if (targetCategory === 'Teens') {
    // If transferring from Kids to Teens
    if (TEENS_BELT_RANKS.includes(currentBelt)) {
      return { newBelt: currentBelt, wasConverted: false };
    }

    // Youth White stays White
    if (currentBelt === 'White') {
      return { newBelt: 'White', wasConverted: false };
    }

    // Youth Color belts (Grey, Yellow, Orange, Green) convert to Juvenile Blue belt
    const isYouthColor = [
      'Grey-White', 'Grey', 'Grey-Black',
      'Yellow-White', 'Yellow', 'Yellow-Black',
      'Orange-White', 'Orange', 'Orange-Black',
      'Green-White', 'Green', 'Green-Black',
    ].includes(currentBelt);

    if (isYouthColor) {
      return {
        newBelt: 'Blue',
        wasConverted: true,
        conversionNote: `Graduated from Youth ${currentBelt} Belt to Juvenile Blue Belt under IBJJF Youth-to-Juvenile conversion rules.`,
      };
    }

    // Adult Brown/Black is not permitted in Teens
    return {
      newBelt: 'Purple',
      wasConverted: true,
      conversionNote: 'Adjusted to Juvenile Purple belt (Juveniles under 18 cannot hold Brown/Black belt under IBJJF rules).',
    };
  }

  if (targetCategory === 'Adults') {
    if (ADULT_BELT_RANKS.includes(currentBelt)) {
      return { newBelt: currentBelt, wasConverted: false };
    }

    // If a youth belt reached adults directly
    const isYouthColor = [
      'Grey-White', 'Grey', 'Grey-Black',
      'Yellow-White', 'Yellow', 'Yellow-Black',
      'Orange-White', 'Orange', 'Orange-Black',
      'Green-White', 'Green', 'Green-Black',
    ].includes(currentBelt);

    if (isYouthColor) {
      return {
        newBelt: 'Blue',
        wasConverted: true,
        conversionNote: `Youth ${currentBelt} belt transitioned to Adult Blue Belt.`,
      };
    }

    return {
      newBelt: 'White',
      wasConverted: true,
      conversionNote: 'Transitioned to Adult White Belt.',
    };
  }

  return { newBelt: currentBelt, wasConverted: false };
}

/**
  * Evaluates all members against their date of birth / age and automatically transfers
  * them to their rightful IBJJF category (Kids <16, Teens 16-17, Adults 18+),
  * updating their belt if needed and generating official transfer history logs.
  */
export function evaluateAndAutoTransferMembers(
  members: Member[],
  refDateStr?: string
): {
  updatedMembers: Member[];
  transferEvents: IBJJFTransferRecord[];
  hasChanges: boolean;
} {
  const todayStr = refDateStr || new Date().toISOString().split('T')[0];
  const transferEvents: IBJJFTransferRecord[] = [];
  let hasChanges = false;

  const updatedMembers = members.map((member) => {
    // Determine age from birthDate or infer
    let age = member.age;
    if (member.birthDate) {
      age = calculateStudentAge(member.birthDate, todayStr);
    } else if (age === undefined) {
      // Infer from notes or ageGroup
      if (member.notes && /age\s*(\d+)/i.test(member.notes)) {
        const match = member.notes.match(/age\s*(\d+)/i);
        if (match) age = parseInt(match[1], 10);
      }
      if (age === undefined) {
        age = member.ageGroup === 'Kids' ? 9 : member.ageGroup === 'Teens' ? 16 : 24;
      }
    }

    const currentCategory = member.ageGroup || 'Adults';
    const targetCategory = getIBJJFCategory(age);

    // Check 1-month plan expiration:
    // If the plan has passed its 1-month validity date, remaining classes expire to 0 automatically
    let updatedRemaining = member.classesRemaining;
    let updatedStatus = member.status;

    if (member.membershipEndDate && todayStr > member.membershipEndDate) {
      if (updatedRemaining > 0) {
        updatedRemaining = 0;
        updatedStatus = 'expired';
        hasChanges = true;
      } else if (updatedRemaining === 0 && updatedStatus !== 'expired') {
        updatedStatus = 'expired';
        hasChanges = true;
      } else if (updatedRemaining === -1 && updatedStatus !== 'expired') {
        updatedStatus = 'expired';
        hasChanges = true;
      }
    }

    // Check if category must change
    if (currentCategory !== targetCategory) {
      hasChanges = true;
      const { newBelt, wasConverted, conversionNote } = transitionBeltForNewAgeGroup(
        member.beltRank,
        targetCategory
      );

      const transferEvent: IBJJFTransferRecord = {
        id: `ibjjf-transfer-${member.id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        memberId: member.id,
        memberName: member.fullName,
        previousCategory: currentCategory,
        newCategory: targetCategory,
        age,
        birthDate: member.birthDate || '',
        previousBelt: member.beltRank,
        newBelt,
        transferDate: todayStr,
        reason: `Turned age ${age}. Automatically graduated from ${currentCategory} to ${targetCategory} under IBJJF rules.${
          wasConverted ? ` ${conversionNote}` : ''
        }`,
      };

      transferEvents.push(transferEvent);

      // Create promotion history record
      const promoRecord: PromotionRecord = {
        id: `promo-ibjjf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        targetId: member.id,
        targetName: member.fullName,
        targetType: 'student',
        previousBelt: member.beltRank,
        previousStripes: member.stripes,
        newBelt,
        newStripes: wasConverted && newBelt !== member.beltRank ? 0 : member.stripes,
        promotionDate: todayStr,
        promotedBy: 'IBJJF Automatic Age System',
        notes: transferEvent.reason,
        classesAtPromotion: member.totalClassesAttended,
      };

      const existingHistory = member.promotionHistory || [];

      return {
        ...member,
        age,
        ageGroup: targetCategory,
        beltRank: newBelt,
        stripes: wasConverted && newBelt !== member.beltRank ? 0 : member.stripes,
        classesRemaining: updatedRemaining,
        status: updatedStatus,
        promotionHistory: [promoRecord, ...existingHistory],
        notes: member.notes
          ? `${member.notes} | IBJJF Auto-Transfer: ${currentCategory} -> ${targetCategory} (Age ${age}) on ${todayStr}`
          : `IBJJF Auto-Transfer: ${currentCategory} -> ${targetCategory} (Age ${age}) on ${todayStr}`,
      };
    }

    // If member has no age recorded or needs age updated or status/remaining updated
    if (member.age !== age || member.classesRemaining !== updatedRemaining || member.status !== updatedStatus) {
      hasChanges = true;
      return {
        ...member,
        age,
        classesRemaining: updatedRemaining,
        status: updatedStatus,
      };
    }

    return member;
  });

  return {
    updatedMembers,
    transferEvents,
    hasChanges,
  };
}
