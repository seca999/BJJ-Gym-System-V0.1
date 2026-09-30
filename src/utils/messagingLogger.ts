import { RenewalReminderLog, MessageChannel, ReminderTriggerType, StripeCount } from '../types';
import { loadReminderLogs, saveReminderLogs } from './storage';
import { getJordanDateStr, getJordanTimeStr } from './timeUtils';

const SEED_LOGS_FLAG = 'bjj_gym_seeded_msg_logs_v2';

/**
 * Normalizes phone numbers for WhatsApp / SMS URL dispatch (Jordan +962 / international format)
 */
export function cleanPhoneNumber(phone?: string): string {
  if (!phone) return '';
  // Remove spaces, dashes, parentheses
  let cleaned = phone.replace(/[^0-9+]/g, '');
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.substring(2);
  }
  // Jordan local 07xxxxxxxx -> +9627xxxxxxxx
  if (cleaned.startsWith('07') && cleaned.length === 10) {
    cleaned = '+962' + cleaned.substring(1);
  } else if (cleaned.startsWith('7') && cleaned.length === 9) {
    cleaned = '+962' + cleaned;
  }
  return cleaned;
}

/**
 * Generates direct WhatsApp web / app link
 */
export function getWhatsAppLink(phone: string, text: string): string {
  const clean = cleanPhoneNumber(phone).replace(/^\+/, '');
  const encodedText = encodeURIComponent(text);
  return clean ? `https://wa.me/${clean}?text=${encodedText}` : `https://wa.me/?text=${encodedText}`;
}

/**
 * Generates direct SMS link
 */
export function getSMSLink(phone: string, text: string): string {
  const clean = cleanPhoneNumber(phone);
  const encodedText = encodeURIComponent(text);
  return `sms:${clean}?body=${encodedText}`;
}

/**
 * Logs a message dispatch event with complete audit details
 */
export function logDispatchedMessage(entry: Omit<RenewalReminderLog, 'id' | 'date' | 'time' | 'characterCount'> & {
  date?: string;
  time?: string;
  id?: string;
}): RenewalReminderLog {
  const now = new Date();
  const date = entry.date || getJordanDateStr(now);
  const time = entry.time || getJordanTimeStr(now, false);
  const id = entry.id || `msg_log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const characterCount = entry.messageText.length;

  const fullLog: RenewalReminderLog = {
    ...entry,
    id,
    date,
    time,
    characterCount,
    channel: entry.channel || (entry.sentVia === 'whatsapp' ? 'whatsapp' : entry.sentVia === 'sms' ? 'sms' : 'automated_background'),
    deliveryDetails: entry.deliveryDetails || {
      platform: entry.channel === 'whatsapp' ? 'WhatsApp Business' : entry.channel === 'sms' ? 'SMS Gateway' : 'Automated System',
      targetNumber: entry.recipientPhone || entry.phone,
      dispatchedTimestamp: `${date} ${time}`,
      messageType: entry.triggerType,
    },
  };

  const currentLogs = loadReminderLogs();
  const updatedLogs = [fullLog, ...currentLogs];
  saveReminderLogs(updatedLogs);
  return fullLog;
}

/**
 * Dispatches a WhatsApp message and automatically registers full audit log
 */
export function dispatchWhatsAppMessage(
  payload: {
    memberId: string;
    memberName: string;
    phone: string;
    recipientName: string;
    recipientPhone: string;
    isYouth: boolean;
    ageGroup?: string;
    beltRank: string;
    stripes?: StripeCount;
    classesRemaining: number;
    triggerType: ReminderTriggerType;
    messageText: string;
    dispatchedBy?: string;
  },
  openWindow = true
): { log: RenewalReminderLog; url: string } {
  const url = getWhatsAppLink(payload.recipientPhone || payload.phone, payload.messageText);

  const log = logDispatchedMessage({
    ...payload,
    channel: 'whatsapp',
    sentVia: 'whatsapp',
    status: 'Sent',
    dispatchedBy: payload.dispatchedBy || 'Staff / Coach',
    deliveryDetails: {
      platform: 'WhatsApp Web / App API',
      targetNumber: cleanPhoneNumber(payload.recipientPhone || payload.phone),
      dispatchedTimestamp: `${getJordanDateStr()} ${getJordanTimeStr()}`,
      messageType: payload.triggerType,
    },
  });

  if (openWindow && typeof window !== 'undefined') {
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      // ignore
    }
  }

  return { log, url };
}

/**
 * Dispatches an SMS message and automatically registers full audit log
 */
export function dispatchSMSMessage(
  payload: {
    memberId: string;
    memberName: string;
    phone: string;
    recipientName: string;
    recipientPhone: string;
    isYouth: boolean;
    ageGroup?: string;
    beltRank: string;
    stripes?: StripeCount;
    classesRemaining: number;
    triggerType: ReminderTriggerType;
    messageText: string;
    dispatchedBy?: string;
  },
  openWindow = true
): { log: RenewalReminderLog; url: string } {
  const url = getSMSLink(payload.recipientPhone || payload.phone, payload.messageText);

  const log = logDispatchedMessage({
    ...payload,
    channel: 'sms',
    sentVia: 'sms',
    status: 'Sent',
    dispatchedBy: payload.dispatchedBy || 'SMS Carrier Service',
    deliveryDetails: {
      platform: 'SMS Gateway Route',
      targetNumber: cleanPhoneNumber(payload.recipientPhone || payload.phone),
      dispatchedTimestamp: `${getJordanDateStr()} ${getJordanTimeStr()}`,
      messageType: payload.triggerType,
    },
  });

  if (openWindow && typeof window !== 'undefined') {
    try {
      window.location.href = url;
    } catch {
      // ignore
    }
  }

  return { log, url };
}

/**
 * Ensures initial message logs contain ONLY real sent messages by purging any old mock seed entries
 */
export function ensureInitialMessageLogsSeeded(): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem('bjj_gym_renewal_reminder_logs_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Filter out any mock seed logs
        const cleaned = parsed.filter(
          (l) => !l.id?.startsWith('msg_log_seed_')
        );
        if (cleaned.length !== parsed.length) {
          saveReminderLogs(cleaned);
        }
      }
    }
  } catch (e) {
    console.warn('Could not clean message logs:', e);
  }
}
