import { Member, RenewalReminderLog, ReminderTriggerType } from '../types';
import { loadReminderLogs, saveReminderLogs } from './storage';
import { getJordanDateStr, getJordanTimeStr } from './timeUtils';

export interface RecipientContactInfo {
  isYouth: boolean;
  recipientName: string;
  rawParentName: string;
  cleanParentName: string;
  recipientPhone: string;
  relationLabel: string;
}

export function isYouthMember(member: Member): boolean {
  return member.ageGroup === 'Kids' || member.ageGroup === 'Teens';
}

export function getMemberRecipientInfo(member: Member): RecipientContactInfo {
  const isYouth = isYouthMember(member);
  const rawParentName = member.emergencyContact?.name || '';
  const hasParent = rawParentName && rawParentName !== 'Not specified';
  
  // Clean parent name by stripping out relationship tags in parentheses like (Mother), (Father)
  const cleanParentName = rawParentName.replace(/\s*\([^)]*\)/gi, '').trim();
  
  const recipientName = isYouth
    ? (hasParent ? cleanParentName : `Parent / Guardian of ${member.fullName}`)
    : member.fullName;

  const recipientPhone = (isYouth && hasParent && member.emergencyContact?.phone)
    ? member.emergencyContact.phone
    : member.phone;

  return {
    isYouth,
    recipientName,
    rawParentName,
    cleanParentName,
    recipientPhone,
    relationLabel: isYouth ? (member.emergencyContact?.relation || 'Parent / Guardian') : 'Direct Student',
  };
}

/**
 * Strict reminder message generation:
 * 1. Exactly 1 class left: Friendly top-up notice before running out.
 * 2. Subscription fully finished (0 classes remaining or debt): Expiration notice to renew pass.
 */
export function generateRenewalReminderMessage(
  member: Member,
  academyName = 'Ravens BJJ Academy'
): { text: string; triggerType: ReminderTriggerType } {
  const { isYouth, recipientName, relationLabel } = getMemberRecipientInfo(member);
  const isFinished = member.classesRemaining <= 0;
  const isDebt = member.classesRemaining < 0;
  const debtAmount = Math.abs(member.classesRemaining);

  if (isFinished) {
    const triggerType: ReminderTriggerType = 'subscription_finished';
    if (isYouth) {
      if (isDebt) {
        return {
          triggerType,
          text: `Dear ${recipientName} (${relationLabel} of ${member.fullName}),\n\nNotice from ${academyName}: ${member.fullName}'s membership subscription has finished and has ${debtAmount} pending class(es) to settle. Please visit the front desk to renew their membership pass so their mat training continues without interruption. See you on the mats! OSS! 🥋`
        };
      }
      return {
        triggerType,
        text: `Dear ${recipientName} (${relationLabel} of ${member.fullName}),\n\nNotice from ${academyName}: ${member.fullName}'s membership subscription has now fully finished (0 classes remaining). Please visit the front desk to renew their training pass so their mat training continues without interruption. See you on the mats! OSS! 🥋`
      };
    } else {
      if (isDebt) {
        return {
          triggerType,
          text: `Dear ${member.fullName},\n\nNotice from ${academyName}: Your membership subscription has finished and has ${debtAmount} pending class(es) to settle. Please visit the front desk to renew your membership pass so your mat training continues without interruption. See you on the mats! OSS! 🥋`
        };
      }
      return {
        triggerType,
        text: `Dear ${member.fullName},\n\nNotice from ${academyName}: Your membership subscription has now fully finished (0 classes remaining). Please visit the front desk to renew your membership pass so your mat training continues without interruption. See you on the mats! OSS! 🥋`
      };
    }
  } else {
    // Exactly 1 class left
    const triggerType: ReminderTriggerType = 'one_class_left';
    if (isYouth) {
      return {
        triggerType,
        text: `Dear ${recipientName} (${relationLabel} of ${member.fullName}),\n\nFriendly reminder from ${academyName}: ${member.fullName} has 1 class left in their membership pass. Please visit the front desk to top up their plan so their mat training continues without interruption. See you on the mats! OSS! 🥋`
      };
    } else {
      return {
        triggerType,
        text: `Dear ${member.fullName},\n\nFriendly reminder from ${academyName}: You have 1 class left in your membership pass. Please visit the front desk to top up your plan so your mat training continues without interruption. See you on the mats! OSS! 🥋`
      };
    }
  }
}

/**
 * Checks if a member qualifies for renewal reminder:
 * Must be a class_pack (or single_dropin) and have classesRemaining <= 1 (1 class left or finished).
 * Unlimited memberships (-1) or students with > 1 classes left are NOT reminded.
 */
export function qualifiesForRenewalReminder(member: Member): boolean {
  if (member.isDeleted) return false;
  if (member.membershipType !== 'class_pack' && member.membershipType !== 'single_dropin') return false;
  return member.classesRemaining <= 1;
}

/**
 * Automated Background Reminder Engine:
 * Scans active members, generates appropriate reminder records for 1-class-left and finished subscriptions,
 * and saves into the chronological reminder audit log.
 */
export function processAutomatedRenewalReminders(members: Member[]): RenewalReminderLog[] {
  const existingLogs = loadReminderLogs();
  const now = new Date();
  const todayStr = getJordanDateStr(now);
  const timeStr = getJordanTimeStr(now, false);
  let updatedLogs = [...existingLogs];
  let changed = false;

  members.forEach((member) => {
    if (!qualifiesForRenewalReminder(member)) return;

    const { text, triggerType } = generateRenewalReminderMessage(member);
    const { isYouth, recipientName, recipientPhone } = getMemberRecipientInfo(member);

    // Check if we already logged this reminder today for this student & trigger type
    const alreadyLoggedToday = updatedLogs.some(
      (l) => l.memberId === member.id && l.triggerType === triggerType && l.date === todayStr
    );

    if (!alreadyLoggedToday) {
      const newLog: RenewalReminderLog = {
        id: `rem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        memberId: member.id,
        memberName: member.fullName,
        phone: member.phone,
        recipientName,
        recipientPhone,
        isYouth,
        ageGroup: member.ageGroup,
        beltRank: member.beltRank,
        classesRemaining: member.classesRemaining,
        triggerType,
        messageText: text,
        date: todayStr,
        time: timeStr,
        sentVia: 'automated_background',
        status: 'Logged',
      };
      updatedLogs = [newLog, ...updatedLogs];
      changed = true;
    }
  });

  if (changed) {
    saveReminderLogs(updatedLogs);
  }

  return updatedLogs;
}
