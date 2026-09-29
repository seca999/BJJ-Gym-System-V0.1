import { Member, PaymentRecord, AttendanceRecord, ClassSession, GymSettings, Coach, TimetableConfig, SubscriptionPlan, MerchItem, MerchSaleRecord, ExpenseRecord, RenewalReminderLog } from '../types';
import { 
  DEFAULT_SETTINGS, 
  INITIAL_SUBSCRIPTION_PLANS,
  INITIAL_MEMBERS,
  INITIAL_CLASSES,
  INITIAL_COACHES,
  INITIAL_PAYMENTS,
  INITIAL_ATTENDANCE,
  INITIAL_MERCH_ITEMS,
  INITIAL_EXPENSES,
  INITIAL_MERCH_SALES,
} from '../data/sampleData';
import { DEFAULT_TIMETABLE_CONFIG, FIXED_6AM_10PM_SLOTS } from '../data/timetableData';
import { parseTimeToMinutes, parseSlotStartMinutes, parseSlotEndMinutes } from './timeUtils';
import canonicalDatabase from '../data/academy_database.json';

const STORAGE_KEYS = {
  INIT_FLAG: 'bjj_gym_initialized_v11_matboard_grid_fixed',
  MEMBERS: 'bjj_gym_members_v8',
  PAYMENTS: 'bjj_gym_payments_v8',
  ATTENDANCE: 'bjj_gym_attendance_v8',
  CLASSES: 'bjj_gym_classes_v8',
  SETTINGS: 'bjj_gym_settings_v8',
  COACHES: 'bjj_gym_coaches_v8',
  TIMETABLE: 'bjj_gym_timetable_v11_matboard',
  PLANS: 'bjj_gym_plans_v8',
  MERCH_PRODUCTS: 'bjj_gym_merch_products_v1',
  MERCH_SALES: 'bjj_gym_merch_sales_v1',
  EXPENSES: 'bjj_gym_expenses_v1',
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
      // First boot or upgrade to v10: Seed with clean, realistic dummy data
      const seedMembers = INITIAL_MEMBERS;
      const seedClasses = INITIAL_CLASSES;
      const seedCoaches = INITIAL_COACHES;
      const seedAttendance = INITIAL_ATTENDANCE;
      const seedPayments = INITIAL_PAYMENTS;
      const seedPlans = INITIAL_SUBSCRIPTION_PLANS;
      const seedTimetable = DEFAULT_TIMETABLE_CONFIG;
      const seedSettings = DEFAULT_SETTINGS;
      const seedExpenses = INITIAL_EXPENSES;
      const seedMerch = INITIAL_MERCH_ITEMS;
      const seedSales = INITIAL_MERCH_SALES;

      localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(seedMembers));
      localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(seedClasses));
      localStorage.setItem(STORAGE_KEYS.COACHES, JSON.stringify(seedCoaches));
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(seedAttendance));
      localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(seedPayments));
      localStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(seedPlans));
      localStorage.setItem(STORAGE_KEYS.TIMETABLE, JSON.stringify(seedTimetable));
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(seedSettings));
      localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(seedExpenses));
      localStorage.setItem(STORAGE_KEYS.MERCH_PRODUCTS, JSON.stringify(seedMerch));
      localStorage.setItem(STORAGE_KEYS.MERCH_SALES, JSON.stringify(seedSales));
      localStorage.setItem('bjj_gym_ibjjf_transfers_v1', JSON.stringify([]));
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

export function loadMerchProducts(): MerchItem[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.MERCH_PRODUCTS);
    if (!data) {
      saveMerchProducts(INITIAL_MERCH_ITEMS);
      return INITIAL_MERCH_ITEMS;
    }
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return INITIAL_MERCH_ITEMS;
  } catch (err) {
    console.error('Failed to load merch products from localStorage', err);
    return INITIAL_MERCH_ITEMS;
  }
}

export function saveMerchProducts(products: MerchItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.MERCH_PRODUCTS, JSON.stringify(products));
    triggerDiskDatabaseSync();
  } catch (err) {
    console.error('Failed to save merch products to localStorage', err);
  }
}

export function loadMerchSales(): MerchSaleRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.MERCH_SALES);
    if (!data) {
      saveMerchSales(INITIAL_MERCH_SALES);
      return INITIAL_MERCH_SALES;
    }
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return INITIAL_MERCH_SALES;
  } catch (err) {
    console.error('Failed to load merch sales from localStorage', err);
    return INITIAL_MERCH_SALES;
  }
}

export function saveMerchSales(sales: MerchSaleRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.MERCH_SALES, JSON.stringify(sales));
    triggerDiskDatabaseSync();
  } catch (err) {
    console.error('Failed to save merch sales to localStorage', err);
  }
}

export function loadExpenses(): ExpenseRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.EXPENSES);
    if (!data) {
      saveExpenses(INITIAL_EXPENSES);
      return INITIAL_EXPENSES;
    }
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return INITIAL_EXPENSES;
  } catch (err) {
    console.error('Failed to load expenses from localStorage', err);
    return INITIAL_EXPENSES;
  }
}

export function saveExpenses(expenses: ExpenseRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
    triggerDiskDatabaseSync();
  } catch (err) {
    console.error('Failed to save expenses to localStorage', err);
  }
}

export function normalizeFixedTimetable(config: TimetableConfig): TimetableConfig {
  if (!config || !Array.isArray(config.slots) || config.slots.length === 0) {
    return DEFAULT_TIMETABLE_CONFIG;
  }

  // Remap cells to matching fixed 30-minute slots based on start time
  const mappedCells = (config.cells || []).map((cell) => {
    const existingSlot = config.slots.find((s) => s.id === cell.slotId);
    const cellTimeRange = cell.timeRange || existingSlot?.timeRange || '4:30 - 5:30 PM';
    const sMin = parseSlotStartMinutes(cellTimeRange);
    const eMin = parseSlotEndMinutes(cellTimeRange);

    let targetSlot = FIXED_6AM_10PM_SLOTS.find((s) => {
      const slotMin = parseSlotStartMinutes(s.timeRange);
      return sMin >= slotMin && sMin < slotMin + 30;
    });

    if (!targetSlot) {
      targetSlot = sMin < 360 ? FIXED_6AM_10PM_SLOTS[0] : FIXED_6AM_10PM_SLOTS[FIXED_6AM_10PM_SLOTS.length - 1];
    }

    const duration = Math.max(15, eMin - sMin);
    const spanSlots = Math.max(1, Math.round(duration / 30));

    return {
      ...cell,
      slotId: targetSlot.id,
      timeRange: cellTimeRange,
      spanSlots,
    };
  });

  return {
    ...config,
    slots: FIXED_6AM_10PM_SLOTS,
    cells: mappedCells,
  };
}

export function loadTimetableConfig(): TimetableConfig {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.TIMETABLE);
    if (!data) {
      const fallback = (canonicalDatabase.timetableConfig as TimetableConfig) || DEFAULT_TIMETABLE_CONFIG;
      const normalizedFallback = normalizeFixedTimetable(fallback);
      saveTimetableConfig(normalizedFallback);
      return normalizedFallback;
    }
    const parsed = JSON.parse(data);
    const normalized = normalizeFixedTimetable(parsed);
    return normalized;
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
    expenses: INITIAL_EXPENSES,
    merchProducts: INITIAL_MERCH_ITEMS,
    merchSales: INITIAL_MERCH_SALES,
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
  localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(INITIAL_EXPENSES));
  localStorage.setItem(STORAGE_KEYS.MERCH_PRODUCTS, JSON.stringify(INITIAL_MERCH_ITEMS));
  localStorage.setItem(STORAGE_KEYS.MERCH_SALES, JSON.stringify(INITIAL_MERCH_SALES));
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

export function loadReminderLogs(): RenewalReminderLog[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('bjj_gym_renewal_reminder_logs_v1');
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveReminderLogs(logs: RenewalReminderLog[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('bjj_gym_renewal_reminder_logs_v1', JSON.stringify(logs));
  } catch (e) {
    console.error('Failed to save reminder logs:', e);
  }
}

export function loadCoachPaidMap(): Record<string, { isPaid: boolean; paidAmount?: number; paidDate?: string; paymentMethod?: string; notes?: string }> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem('bjj_gym_coach_paid_map_v1');
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveCoachPaidMap(map: Record<string, { isPaid: boolean; paidAmount?: number; paidDate?: string; paymentMethod?: string; notes?: string }>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('bjj_gym_coach_paid_map_v1', JSON.stringify(map));
  } catch (e) {
    console.error('Failed to save coach paid map:', e);
  }
}

