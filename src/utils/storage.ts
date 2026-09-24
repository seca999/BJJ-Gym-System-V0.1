import { Member, PaymentRecord, AttendanceRecord, ClassSession, GymSettings, Coach, TimetableConfig, SubscriptionPlan } from '../types';
import { 
  DEFAULT_SETTINGS, 
  INITIAL_SUBSCRIPTION_PLANS,
  INITIAL_MEMBERS,
  INITIAL_CLASSES,
  INITIAL_COACHES,
  INITIAL_PAYMENTS,
  INITIAL_ATTENDANCE
} from '../data/sampleData';
import { DEFAULT_TIMETABLE_CONFIG } from '../data/timetableData';
import canonicalDatabase from '../data/academy_database.json';

const STORAGE_KEYS = {
  INIT_FLAG: 'bjj_gym_initialized_v7',
  MEMBERS: 'bjj_gym_members_v7',
  PAYMENTS: 'bjj_gym_payments_v7',
  ATTENDANCE: 'bjj_gym_attendance_v7',
  CLASSES: 'bjj_gym_classes_v7',
  SETTINGS: 'bjj_gym_settings_v7',
  COACHES: 'bjj_gym_coaches_v7',
  TIMETABLE: 'bjj_gym_timetable_v7',
  PLANS: 'bjj_gym_plans_v7',
};

/**
 * Ensures browser storage is seeded from the Git-tracked code database (src/data/academy_database.json)
 * or comprehensive initial sample data when running on a new computer or after a git pull/clone.
 */
export function ensureInitializedFromCodeFiles(): void {
  if (typeof window === 'undefined') return;
  try {
    const isInitialized = localStorage.getItem(STORAGE_KEYS.INIT_FLAG);
    if (!isInitialized) {
      // First boot on this machine/browser: Seed directly from repository code files or fallback sample data
      const seedMembers = canonicalDatabase.members && canonicalDatabase.members.length > 0 
        ? canonicalDatabase.members 
        : INITIAL_MEMBERS;
      const seedClasses = canonicalDatabase.classes && canonicalDatabase.classes.length > 0
        ? canonicalDatabase.classes
        : INITIAL_CLASSES;
      const seedCoaches = canonicalDatabase.coaches && canonicalDatabase.coaches.length > 0
        ? canonicalDatabase.coaches
        : INITIAL_COACHES;
      const seedAttendance = canonicalDatabase.attendance && canonicalDatabase.attendance.length > 0
        ? canonicalDatabase.attendance
        : INITIAL_ATTENDANCE;
      const seedPayments = canonicalDatabase.payments && canonicalDatabase.payments.length > 0
        ? canonicalDatabase.payments
        : INITIAL_PAYMENTS;
      const seedPlans = canonicalDatabase.subscriptionPlans && canonicalDatabase.subscriptionPlans.length > 0
        ? canonicalDatabase.subscriptionPlans
        : INITIAL_SUBSCRIPTION_PLANS;
      const seedTimetable = canonicalDatabase.timetableConfig && canonicalDatabase.timetableConfig.cells && canonicalDatabase.timetableConfig.cells.length > 0
        ? canonicalDatabase.timetableConfig
        : DEFAULT_TIMETABLE_CONFIG;
      const seedSettings = canonicalDatabase.settings || DEFAULT_SETTINGS;

      localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(seedMembers));
      localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(seedClasses));
      localStorage.setItem(STORAGE_KEYS.COACHES, JSON.stringify(seedCoaches));
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(seedAttendance));
      localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(seedPayments));
      localStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(seedPlans));
      localStorage.setItem(STORAGE_KEYS.TIMETABLE, JSON.stringify(seedTimetable));
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(seedSettings));
      localStorage.setItem('bjj_gym_ibjjf_transfers_v1', JSON.stringify(canonicalDatabase.ibjjfTransfers || []));
      localStorage.setItem(STORAGE_KEYS.INIT_FLAG, 'true');
    }
  } catch (e) {
    console.error('Failed to initialize from code database:', e);
  }
}

// Automatically run initialization
ensureInitializedFromCodeFiles();

let autoSyncDebounceTimer: any = null;

/**
 * Debounced background sync that saves every single change directly into the
 * repository code files:
 * 1. src/data/academy_database.json (canonical Git code file)
 * 2. public/academy_database.json (public web mirror)
 * 3. database/bjj_master.json (in-repo database folder)
 * 4. database/bjj_master.db (real SQLite binary file)
 * 5. database/bjj_master.sql (portable SQL dump)
 */
export function triggerDiskDatabaseSync(): void {
  if (typeof window === 'undefined') return;
  if (autoSyncDebounceTimer) clearTimeout(autoSyncDebounceTimer);
  autoSyncDebounceTimer = setTimeout(async () => {
    try {
      const configRaw = localStorage.getItem('bjj_gym_db_config_v1');
      const targetPath = configRaw ? JSON.parse(configRaw).storagePath : 'database/bjj_master.db';

      const payload = {
        members: loadMembers(),
        classes: loadClasses(),
        attendance: loadAttendance(),
        payments: loadPayments(),
        coaches: loadCoaches(),
        subscriptionPlans: loadSubscriptionPlans(),
        timetableConfig: loadTimetableConfig(),
        settings: loadSettings(),
        ibjjfTransfers: JSON.parse(localStorage.getItem('bjj_gym_ibjjf_transfers_v1') || '[]'),
      };

      await fetch('/api/database/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: targetPath, data: payload }),
      });
    } catch {
      // background sync silently catches offline
    }
  }, 800);
}

export function loadMembers(): Member[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.MEMBERS);
    if (!data) {
      const fallback = (canonicalDatabase.members as Member[]) || [];
      saveMembers(fallback);
      return fallback;
    }
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to load members from localStorage', err);
    return [];
  }
}

export function saveMembers(members: Member[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
    triggerDiskDatabaseSync();
  } catch (err) {
    console.error('Failed to save members to localStorage', err);
  }
}

export function loadPayments(): PaymentRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
    if (!data) {
      const fallback = (canonicalDatabase.payments as PaymentRecord[]) || [];
      savePayments(fallback);
      return fallback;
    }
    const parsed: PaymentRecord[] = JSON.parse(data);
    const processed = parsed.map(p => ({
      ...p,
      currency: !p.currency || p.currency === '$' ? 'JOD' : p.currency,
    }));
    return processed;
  } catch (err) {
    console.error('Failed to load payments from localStorage', err);
    return [];
  }
}

export function savePayments(payments: PaymentRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
    triggerDiskDatabaseSync();
  } catch (err) {
    console.error('Failed to save payments to localStorage', err);
  }
}

export function loadAttendance(): AttendanceRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
    if (!data) {
      const fallback = (canonicalDatabase.attendance as AttendanceRecord[]) || [];
      saveAttendance(fallback);
      return fallback;
    }
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to load attendance from localStorage', err);
    return [];
  }
}

export function saveAttendance(records: AttendanceRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(records));
    triggerDiskDatabaseSync();
  } catch (err) {
    console.error('Failed to save attendance to localStorage', err);
  }
}

export function loadClasses(): ClassSession[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CLASSES);
    if (!data) {
      const fallback = (canonicalDatabase.classes as ClassSession[]) || [];
      saveClasses(fallback);
      return fallback;
    }
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to load classes from localStorage', err);
    return [];
  }
}

export function saveClasses(classes: ClassSession[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(classes));
    triggerDiskDatabaseSync();
  } catch (err) {
    console.error('Failed to save classes to localStorage', err);
  }
}

export function loadSettings(): GymSettings {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!data) {
      const fallback = (canonicalDatabase.settings as GymSettings) || DEFAULT_SETTINGS;
      saveSettings(fallback);
      return fallback;
    }
    const parsed = JSON.parse(data);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      currencySymbol: !parsed.currencySymbol || parsed.currencySymbol === '$' ? 'JOD' : parsed.currencySymbol,
      slogan: parsed.slogan || DEFAULT_SETTINGS.slogan,
      logo: {
        ...DEFAULT_SETTINGS.logo,
        ...(parsed.logo || {}),
      },
    };
  } catch (err) {
    console.error('Failed to load settings from localStorage', err);
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: GymSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    triggerDiskDatabaseSync();
  } catch (err) {
    console.error('Failed to save settings to localStorage', err);
  }
}

export function loadCoaches(): Coach[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.COACHES);
    if (!data) {
      const fallback = (canonicalDatabase.coaches as Coach[]) || [];
      saveCoaches(fallback);
      return fallback;
    }
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to load coaches from localStorage', err);
    return [];
  }
}

export function saveCoaches(coaches: Coach[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.COACHES, JSON.stringify(coaches));
    triggerDiskDatabaseSync();
  } catch (err) {
    console.error('Failed to save coaches to localStorage', err);
  }
}

export function loadTimetableConfig(): TimetableConfig {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.TIMETABLE);
    if (!data) {
      const fallback = (canonicalDatabase.timetableConfig as TimetableConfig) || DEFAULT_TIMETABLE_CONFIG;
      saveTimetableConfig(fallback);
      return fallback;
    }
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to load timetable config from localStorage', err);
    return DEFAULT_TIMETABLE_CONFIG;
  }
}

export function saveTimetableConfig(config: TimetableConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TIMETABLE, JSON.stringify(config));
    triggerDiskDatabaseSync();
  } catch (err) {
    console.error('Failed to save timetable config to localStorage', err);
  }
}

export function loadSubscriptionPlans(): SubscriptionPlan[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PLANS);
    if (!data) {
      const fallback = (canonicalDatabase.subscriptionPlans as SubscriptionPlan[]) || INITIAL_SUBSCRIPTION_PLANS;
      saveSubscriptionPlans(fallback);
      return fallback;
    }
    const parsed: SubscriptionPlan[] = JSON.parse(data);
    return parsed.map(p => ({
      ...p,
      currency: !p.currency || p.currency === '$' ? 'JOD' : p.currency,
    }));
  } catch (err) {
    console.error('Failed to load subscription plans from localStorage', err);
    return INITIAL_SUBSCRIPTION_PLANS;
  }
}

export function saveSubscriptionPlans(plans: SubscriptionPlan[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(plans));
    triggerDiskDatabaseSync();
  } catch (err) {
    console.error('Failed to save subscription plans to localStorage', err);
  }
}

/**
 * Factory Reset Data Erase:
 * Completely purges all members, classes, coaches, attendance, and payments,
 * resetting the database to 0 records so the user can start filling from scratch.
 * Also immediately synchronizes the clean state to the code files on disk.
 */
export async function factoryResetDataErase(): Promise<void> {
  const cleanState = {
    version: 1,
    lastUpdated: new Date().toISOString(),
    members: [],
    classes: [],
    attendance: [],
    payments: [],
    coaches: [],
    subscriptionPlans: INITIAL_SUBSCRIPTION_PLANS,
    timetableConfig: DEFAULT_TIMETABLE_CONFIG,
    settings: DEFAULT_SETTINGS,
    ibjjfTransfers: [],
  };

  localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.COACHES, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(INITIAL_SUBSCRIPTION_PLANS));
  localStorage.setItem(STORAGE_KEYS.TIMETABLE, JSON.stringify(DEFAULT_TIMETABLE_CONFIG));
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
  localStorage.setItem('bjj_gym_ibjjf_transfers_v1', JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.INIT_FLAG, 'true');

  try {
    await fetch('/api/database/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: cleanState }),
    });
  } catch (e) {
    console.error('Failed to push factory reset to server:', e);
  }
}

export function resetAllDataToDefault(): void {
  factoryResetDataErase();
}

/**
 * Loads rich dummy data (students, coaches, classes, attendance, payments)
 * for testing application logic (Kids, Teens, Adults, warnings, expirations, unmetered).
 */
export async function loadSampleDemoData(): Promise<void> {
  const currentSettings = loadSettings();
  const sampleState = {
    version: 1,
    lastUpdated: new Date().toISOString(),
    members: INITIAL_MEMBERS,
    classes: INITIAL_CLASSES,
    attendance: INITIAL_ATTENDANCE,
    payments: INITIAL_PAYMENTS,
    coaches: INITIAL_COACHES,
    subscriptionPlans: INITIAL_SUBSCRIPTION_PLANS,
    timetableConfig: DEFAULT_TIMETABLE_CONFIG,
    settings: currentSettings,
    ibjjfTransfers: [],
  };

  localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(INITIAL_MEMBERS));
  localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(INITIAL_CLASSES));
  localStorage.setItem(STORAGE_KEYS.COACHES, JSON.stringify(INITIAL_COACHES));
  localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(INITIAL_ATTENDANCE));
  localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(INITIAL_PAYMENTS));
  localStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(INITIAL_SUBSCRIPTION_PLANS));
  localStorage.setItem(STORAGE_KEYS.TIMETABLE, JSON.stringify(DEFAULT_TIMETABLE_CONFIG));
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(currentSettings));
  localStorage.setItem('bjj_gym_ibjjf_transfers_v1', JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.INIT_FLAG, 'true');

  try {
    await fetch('/api/database/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: sampleState }),
    });
  } catch (e) {
    console.error('Failed to push sample data to server:', e);
  }
}

export function exportBackupJSON(): string {
  const exportData = {
    gymSettings: loadSettings(),
    members: loadMembers(),
    payments: loadPayments(),
    attendance: loadAttendance(),
    classes: loadClasses(),
    coaches: loadCoaches(),
    timetable: loadTimetableConfig(),
    subscriptionPlans: loadSubscriptionPlans(),
    ibjjfTransfers: JSON.parse(localStorage.getItem('bjj_gym_ibjjf_transfers_v1') || '[]'),
    exportedAt: new Date().toISOString(),
  };
  return JSON.stringify(exportData, null, 2);
}

export function importBackupJSON(jsonStr: string): boolean {
  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed.members && Array.isArray(parsed.members)) {
      saveMembers(parsed.members);
    }
    if (parsed.payments && Array.isArray(parsed.payments)) {
      savePayments(parsed.payments);
    }
    if (parsed.attendance && Array.isArray(parsed.attendance)) {
      saveAttendance(parsed.attendance);
    }
    if (parsed.classes && Array.isArray(parsed.classes)) {
      saveClasses(parsed.classes);
    }
    if (parsed.coaches && Array.isArray(parsed.coaches)) {
      saveCoaches(parsed.coaches);
    }
    if (parsed.timetable) {
      saveTimetableConfig(parsed.timetable);
    }
    if (parsed.gymSettings) {
      saveSettings(parsed.gymSettings);
    }
    if (parsed.subscriptionPlans && Array.isArray(parsed.subscriptionPlans)) {
      saveSubscriptionPlans(parsed.subscriptionPlans);
    }
    if (parsed.ibjjfTransfers && Array.isArray(parsed.ibjjfTransfers)) {
      localStorage.setItem('bjj_gym_ibjjf_transfers_v1', JSON.stringify(parsed.ibjjfTransfers));
    }
    triggerDiskDatabaseSync();
    return true;
  } catch (err) {
    console.error('Failed to import JSON data', err);
    return false;
  }
}
