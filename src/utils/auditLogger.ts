import { AuditLogEntry } from '../types';
import { getJordanDateStr, getJordanTimeStr } from './timeUtils';

const AUDIT_LOG_STORAGE_KEY = 'arte_suave_audit_logs_v1';

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'log-1001',
    timestamp: '2026-09-26T11:45:00.000Z',
    date: '2026-09-26',
    time: '11:45:12',
    userName: 'Professor Lucas Silva',
    userRole: 'Head Coach & Admin',
    action: 'Student Mat Check-In',
    category: 'CHECK_IN',
    details: 'Checked in Maya Haddad for Youth & Kids BJJ Fundamentals class (Mat A). Remaining balance: 7 classes.',
    ipAddress: '192.168.1.101',
  },
  {
    id: 'log-1002',
    timestamp: '2026-09-26T11:20:15.000Z',
    date: '2026-09-26',
    time: '11:20:15',
    userName: 'Coach Ismat Al-Masri',
    userRole: 'Senior BJJ Instructor',
    action: 'VIP 1-on-1 Lesson Booked',
    category: 'CHECK_IN',
    details: 'Booked private 1-on-1 session with Laith El Kondara (Focus: Half Guard Sweeps & Leg Drag).',
    ipAddress: '192.168.1.105',
  },
  {
    id: 'log-1003',
    timestamp: '2026-09-26T10:30:44.000Z',
    date: '2026-09-26',
    time: '10:30:44',
    userName: 'Professor Lucas Silva',
    userRole: 'Head Coach & Admin',
    action: 'New Member Registered',
    category: 'MEMBER',
    details: 'Registered new student Yazan Al-Majali (Auto-Assigned Adults Division, 12 Classes / Month Plan).',
    ipAddress: '192.168.1.101',
  },
  {
    id: 'log-1004',
    timestamp: '2026-09-26T09:15:30.000Z',
    date: '2026-09-26',
    time: '09:15:30',
    userName: 'System Administrator',
    userRole: 'Super Admin',
    action: 'Tuition Payment Processed',
    category: 'PAYMENT',
    details: 'Received 85 JOD payment via Credit Card from Maya Haddad (Receipt #REC-884210).',
    ipAddress: '127.0.0.1',
  },
  {
    id: 'log-1005',
    timestamp: '2026-09-26T08:00:10.000Z',
    date: '2026-09-26',
    time: '08:00:10',
    userName: 'Coach Ismat Al-Masri',
    userRole: 'Senior BJJ Instructor',
    action: 'Morning Class Schedule Updated',
    category: 'CLASS',
    details: 'Updated room assignment for Dawn Patrol Adult Gi to Main Dojo Mat A.',
    ipAddress: '192.168.1.105',
  },
  {
    id: 'log-1006',
    timestamp: '2026-09-25T18:45:00.000Z',
    date: '2026-09-25',
    time: '18:45:00',
    userName: 'System Administrator',
    userRole: 'Super Admin',
    action: 'System Security Login',
    category: 'SECURITY',
    details: 'Successful user authentication for username: admin (Role: Super Admin).',
    ipAddress: '192.168.1.100',
  },
  {
    id: 'log-1007',
    timestamp: '2026-09-25T16:20:00.000Z',
    date: '2026-09-25',
    time: '16:20:00',
    userName: 'Coach Rana Khalil',
    userRole: 'Youth Director',
    action: 'Belt Stripe Promotion',
    category: 'MEMBER',
    details: 'Awarded 4th Stripe on Yellow Belt to Maya Haddad following quarterly youth testing.',
    ipAddress: '192.168.1.112',
  },
];

export function getAuditLogs(): AuditLogEntry[] {
  try {
    const raw = localStorage.getItem(AUDIT_LOG_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(AUDIT_LOG_STORAGE_KEY, JSON.stringify(INITIAL_AUDIT_LOGS));
      return INITIAL_AUDIT_LOGS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_AUDIT_LOGS;
  } catch {
    return INITIAL_AUDIT_LOGS;
  }
}

export function addAuditLog(params: {
  userName: string;
  userRole?: string;
  action: string;
  category: 'CHECK_IN' | 'MEMBER' | 'PAYMENT' | 'CLASS' | 'SYSTEM' | 'SECURITY';
  details: string;
}): AuditLogEntry {
  const now = new Date();
  const dateStr = getJordanDateStr(now);
  const timeStr = getJordanTimeStr(now, true);

  const newEntry: AuditLogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    timestamp: now.toISOString(),
    date: dateStr,
    time: timeStr,
    userName: params.userName || 'System User',
    userRole: params.userRole || 'Instructor',
    action: params.action,
    category: params.category,
    details: params.details,
    ipAddress: '192.168.1.101',
  };

  try {
    const logs = getAuditLogs();
    const updated = [newEntry, ...logs];
    localStorage.setItem(AUDIT_LOG_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('audit_logs_updated'));
  } catch (err) {
    console.error('Failed to save audit log:', err);
  }

  return newEntry;
}

export function clearAuditLogs(): void {
  try {
    localStorage.setItem(AUDIT_LOG_STORAGE_KEY, JSON.stringify([]));
    window.dispatchEvent(new Event('audit_logs_updated'));
  } catch (err) {
    console.error('Failed to clear audit logs:', err);
  }
}
