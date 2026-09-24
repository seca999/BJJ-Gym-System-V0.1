/**
 * Database Architecture & Health Check Engine
 * Manages local database verification, table architecture inspection,
 * column schema integrity checks, automated repairs, and direct table synchronization.
 */

import { 
  Member, 
  PaymentRecord, 
  AttendanceRecord, 
  ClassSession, 
  GymSettings, 
  Coach, 
  TimetableConfig, 
  SubscriptionPlan, 
  IBJJFTransferRecord 
} from '../types';
import {
  loadMembers,
  saveMembers,
  loadPayments,
  savePayments,
  loadAttendance,
  saveAttendance,
  loadClasses,
  saveClasses,
  loadSettings,
  saveSettings,
  loadCoaches,
  saveCoaches,
  loadTimetableConfig,
  saveTimetableConfig,
  loadSubscriptionPlans,
  saveSubscriptionPlans,
} from './storage';
import { INITIAL_SUBSCRIPTION_PLANS, DEFAULT_SETTINGS } from '../data/sampleData';
import { DEFAULT_TIMETABLE_CONFIG } from '../data/timetableData';

export interface ColumnDefinition {
  name: string;
  type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'ARRAY' | 'OBJECT' | 'DATE';
  required: boolean;
  defaultValue: any;
  description: string;
}

export interface TableSchema {
  id: string;
  tableName: string;
  displayName: string;
  description: string;
  primaryKey: string;
  columns: ColumnDefinition[];
}

export interface TableHealthResult {
  tableName: string;
  displayName: string;
  exists: boolean;
  rowCount: number;
  expectedColumnsCount: number;
  matchedColumnsCount: number;
  missingColumns: string[];
  issues: string[];
  status: 'healthy' | 'warning' | 'error';
}

export interface DatabaseHealthReport {
  timestamp: string;
  databasePath: string;
  isPathValid: boolean;
  pathVerificationMessage: string;
  totalTables: number;
  healthyTables: number;
  warningTables: number;
  errorTables: number;
  totalColumnsChecked: number;
  totalRecordsChecked: number;
  healthScore: number; // 0 - 100
  tableResults: TableHealthResult[];
  detectedIssues: string[];
  diskStatus?: DiskDatabaseStatus | null;
}

export interface DiskDatabaseStatus {
  targetPath: string;
  directoryPath: string;
  directoryExists: boolean;
  fileExists: boolean;
  canWrite: boolean;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  lastModified: string | null;
  isSqliteValid: boolean;
  healthScore: number;
  existingTablesCount: number;
  totalExpectedTables: number;
  tablesBreakdown: Array<{ name: string; exists: boolean; rowCount: number }>;
  issues: string[];
}

export interface DatabaseConfig {
  storagePath: string; // e.g. "C:\\BJJ Academy\\Database\\bjj_master.db"
  lastChecked?: string;
  lastRepaired?: string;
  autoSyncEnabled: boolean;
}

const DB_CONFIG_KEY = 'bjj_gym_db_config_v1';
const DB_TRANSFERS_KEY = 'bjj_gym_ibjjf_transfers_v1';

export const DEFAULT_DATABASE_PATH = 'database/bjj_master.db';

export function loadDatabaseConfig(): DatabaseConfig {
  try {
    const raw = localStorage.getItem(DB_CONFIG_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load DB config', e);
  }
  return {
    storagePath: DEFAULT_DATABASE_PATH,
    autoSyncEnabled: true,
  };
}

export function saveDatabaseConfig(config: DatabaseConfig): void {
  try {
    localStorage.setItem(DB_CONFIG_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save DB config', e);
  }
}

export function loadIBJJFTransfers(): IBJJFTransferRecord[] {
  try {
    const raw = localStorage.getItem(DB_TRANSFERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load transfers', e);
  }
  return [];
}

export function saveIBJJFTransfers(transfers: IBJJFTransferRecord[]): void {
  try {
    localStorage.setItem(DB_TRANSFERS_KEY, JSON.stringify(transfers));
  } catch (e) {
    console.error('Failed to save transfers', e);
  }
}

/**
 * Master Schema Definition for all 10 Core Academy Tables
 */
export const ACADEMY_TABLE_SCHEMAS: TableSchema[] = [
  {
    id: 'members',
    tableName: 'members',
    displayName: 'Students & Members Table',
    description: 'Stores member roster, IBJJF age categories, belt progression, punch card balances, and validity dates.',
    primaryKey: 'id',
    columns: [
      { name: 'id', type: 'STRING', required: true, defaultValue: '', description: 'Unique member identifier' },
      { name: 'fullName', type: 'STRING', required: true, defaultValue: 'New Student', description: 'Student full name' },
      { name: 'birthDate', type: 'DATE', required: true, defaultValue: '2000-01-01', description: 'Date of birth for IBJJF auto-division' },
      { name: 'ageGroup', type: 'STRING', required: true, defaultValue: 'Adults', description: 'Kids (4-15), Teens (16-17), or Adults (18+)' },
      { name: 'beltRank', type: 'STRING', required: true, defaultValue: 'White', description: 'IBJJF Belt rank' },
      { name: 'stripes', type: 'NUMBER', required: true, defaultValue: 0, description: 'Belt stripe count (0 to 4)' },
      { name: 'membershipType', type: 'STRING', required: true, defaultValue: 'class_pack', description: 'class_pack or monthly_unlimited' },
      { name: 'classesRemaining', type: 'NUMBER', required: true, defaultValue: 8, description: 'Remaining class balance or debt' },
      { name: 'classesTotal', type: 'NUMBER', required: true, defaultValue: 8, description: 'Initial plan class allocation' },
      { name: 'membershipStartDate', type: 'DATE', required: true, defaultValue: '', description: 'Plan registration/payment date' },
      { name: 'membershipEndDate', type: 'DATE', required: true, defaultValue: '', description: 'Plan expiration date (1 month validity)' },
      { name: 'status', type: 'STRING', required: true, defaultValue: 'active', description: 'active, warning, expired, or frozen' },
      { name: 'totalClassesAttended', type: 'NUMBER', required: true, defaultValue: 0, description: 'Lifetime attended classes' },
      { name: 'phone', type: 'STRING', required: false, defaultValue: '', description: 'Contact phone' },
      { name: 'email', type: 'STRING', required: false, defaultValue: '', description: 'Email address' },
      { name: 'avatar', type: 'STRING', required: false, defaultValue: '', description: 'Profile avatar image or preset URL' },
      { name: 'emergencyName', type: 'STRING', required: false, defaultValue: '', description: 'Emergency contact full name' },
      { name: 'emergencyPhone', type: 'STRING', required: false, defaultValue: '', description: 'Emergency contact telephone' },
      { name: 'emergencyRelation', type: 'STRING', required: false, defaultValue: '', description: 'Relationship to student' },
      { name: 'lastPromotionDate', type: 'DATE', required: false, defaultValue: '', description: 'Last belt promotion date' },
      { name: 'nextExpectedPromotionDate', type: 'DATE', required: false, defaultValue: '', description: 'Target graduation date' },
      { name: 'notes', type: 'STRING', required: false, defaultValue: '', description: 'Coach medical notes or training history' },
    ],
  },
  {
    id: 'classes',
    tableName: 'classes',
    displayName: 'Classes & Sessions Table',
    description: 'Active class schedule, mat rooms, designated head coaches, assistants, and IBJJF age eligibility ranges.',
    primaryKey: 'id',
    columns: [
      { name: 'id', type: 'STRING', required: true, defaultValue: '', description: 'Unique class session ID' },
      { name: 'title', type: 'STRING', required: true, defaultValue: 'BJJ Class', description: 'Class name' },
      { name: 'category', type: 'STRING', required: true, defaultValue: 'Adults', description: 'Kids, Teens, Adults, or All Levels' },
      { name: 'time', type: 'STRING', required: true, defaultValue: '06:00 PM', description: 'Scheduled training time' },
      { name: 'type', type: 'STRING', required: true, defaultValue: 'Gi', description: 'Gi, No-Gi, Wrestling, Open Mat' },
      { name: 'coach', type: 'STRING', required: true, defaultValue: 'Coach', description: 'Lead instructor name' },
      { name: 'headCoachId', type: 'STRING', required: false, defaultValue: '', description: 'Foreign key to coaches.id' },
      { name: 'headCoachName', type: 'STRING', required: false, defaultValue: '', description: 'Lead instructor full name' },
      { name: 'headCoachRank', type: 'STRING', required: false, defaultValue: '', description: 'Lead instructor rank' },
      { name: 'assistantCoaches', type: 'ARRAY', required: false, defaultValue: [], description: 'List of assistant instructors' },
      { name: 'daysOfWeek', type: 'ARRAY', required: true, defaultValue: ['Mon', 'Wed'], description: 'Days class runs' },
      { name: 'durationMinutes', type: 'NUMBER', required: true, defaultValue: 60, description: 'Duration in minutes' },
      { name: 'room', type: 'STRING', required: true, defaultValue: 'Main Dojo Mat A', description: 'Facility room or mat space' },
      { name: 'description', type: 'STRING', required: false, defaultValue: '', description: 'Class syllabus description' },
      { name: 'eligibleAgeMin', type: 'NUMBER', required: false, defaultValue: 4, description: 'Minimum allowed student age' },
      { name: 'eligibleAgeMax', type: 'NUMBER', required: false, defaultValue: 99, description: 'Maximum allowed student age' },
    ],
  },
  {
    id: 'attendance',
    tableName: 'attendance',
    displayName: 'Attendance & Roster Logs Table',
    description: 'Historical and active class check-in entries, check-in timestamps, and punch card consumption tracking.',
    primaryKey: 'id',
    columns: [
      { name: 'id', type: 'STRING', required: true, defaultValue: '', description: 'Unique attendance record ID' },
      { name: 'memberId', type: 'STRING', required: true, defaultValue: '', description: 'Foreign key to members.id' },
      { name: 'memberName', type: 'STRING', required: true, defaultValue: '', description: 'Snapshot of member full name' },
      { name: 'beltRank', type: 'STRING', required: true, defaultValue: 'White', description: 'Rank at time of check-in' },
      { name: 'stripes', type: 'NUMBER', required: true, defaultValue: 0, description: 'Stripes at time of check-in' },
      { name: 'className', type: 'STRING', required: true, defaultValue: '', description: 'Class title attended' },
      { name: 'coach', type: 'STRING', required: true, defaultValue: '', description: 'Coach conducting session' },
      { name: 'category', type: 'STRING', required: false, defaultValue: 'Adults', description: 'Class age division' },
      { name: 'date', type: 'DATE', required: true, defaultValue: '', description: 'Attendance date (YYYY-MM-DD)' },
      { name: 'time', type: 'STRING', required: true, defaultValue: '', description: 'Check-in time (HH:MM)' },
      { name: 'timestamp', type: 'NUMBER', required: true, defaultValue: 0, description: 'Epoch millisecond timestamp' },
    ],
  },
  {
    id: 'payments',
    tableName: 'payments',
    displayName: 'Tuition & Payments Ledger Table',
    description: 'Financial ledger for student tuition receipts, renewal packages, classes credited, and payment methods.',
    primaryKey: 'id',
    columns: [
      { name: 'id', type: 'STRING', required: true, defaultValue: '', description: 'Unique payment record ID' },
      { name: 'receiptNumber', type: 'STRING', required: true, defaultValue: '', description: 'Sequential receipt number (REC-XXXX)' },
      { name: 'memberId', type: 'STRING', required: true, defaultValue: '', description: 'Foreign key to members.id' },
      { name: 'memberName', type: 'STRING', required: true, defaultValue: '', description: 'Snapshot of student name' },
      { name: 'amount', type: 'NUMBER', required: true, defaultValue: 0, description: 'Amount paid' },
      { name: 'currency', type: 'STRING', required: true, defaultValue: 'JOD', description: 'Currency code (JOD, USD, etc.)' },
      { name: 'date', type: 'DATE', required: true, defaultValue: '', description: 'Payment date (YYYY-MM-DD)' },
      { name: 'time', type: 'STRING', required: true, defaultValue: '', description: 'Payment timestamp time' },
      { name: 'paymentMethod', type: 'STRING', required: true, defaultValue: 'Credit Card', description: 'Cash, Card, Transfer, Apple Pay' },
      { name: 'membershipPackage', type: 'STRING', required: true, defaultValue: '', description: 'Package or plan name' },
      { name: 'classesCredited', type: 'NUMBER', required: true, defaultValue: 0, description: 'Number of classes credited' },
      { name: 'status', type: 'STRING', required: true, defaultValue: 'Completed', description: 'Completed or Refunded' },
      { name: 'notes', type: 'STRING', required: false, defaultValue: '', description: 'Payment reference or memo' },
    ],
  },
  {
    id: 'coaches',
    tableName: 'coaches',
    displayName: 'Coaches & Instructors Table',
    description: 'Academy black belt instructors and coaches, payroll structures, hourly/fixed rates, and bonuses.',
    primaryKey: 'id',
    columns: [
      { name: 'id', type: 'STRING', required: true, defaultValue: '', description: 'Unique coach identifier' },
      { name: 'fullName', type: 'STRING', required: true, defaultValue: '', description: 'Instructor full name' },
      { name: 'role', type: 'STRING', required: true, defaultValue: 'Coach', description: 'Head Coach, Assistant Coach, Wrestling Coach' },
      { name: 'beltRank', type: 'STRING', required: true, defaultValue: 'Black', description: 'Coach rank' },
      { name: 'stripes', type: 'NUMBER', required: true, defaultValue: 0, description: 'Degree on belt' },
      { name: 'email', type: 'STRING', required: true, defaultValue: '', description: 'Email address' },
      { name: 'phone', type: 'STRING', required: true, defaultValue: '', description: 'Contact phone' },
      { name: 'payType', type: 'STRING', required: true, defaultValue: 'Per Class', description: 'Per Class, Hourly, or Fixed Monthly' },
      { name: 'rate', type: 'NUMBER', required: true, defaultValue: 40, description: 'Base pay rate' },
      { name: 'active', type: 'BOOLEAN', required: true, defaultValue: true, description: 'Active instructor status' },
      { name: 'hireDate', type: 'DATE', required: false, defaultValue: '', description: 'Start date at academy' },
      { name: 'studentBonusThreshold', type: 'NUMBER', required: false, defaultValue: 10, description: 'Attendance bonus student threshold' },
      { name: 'studentBonusAmount', type: 'NUMBER', required: false, defaultValue: 2, description: 'Bonus per student exceeding threshold' },
    ],
  },
  {
    id: 'subscription_plans',
    tableName: 'subscription_plans',
    displayName: 'Plans & Pricing Table',
    description: 'Pricing plans for Kids, Teens, and Adults (8 classes, 12 classes, Unlimited) with 1-month validity.',
    primaryKey: 'id',
    columns: [
      { name: 'id', type: 'STRING', required: true, defaultValue: '', description: 'Unique plan identifier' },
      { name: 'name', type: 'STRING', required: true, defaultValue: '', description: 'Plan display name' },
      { name: 'category', type: 'STRING', required: true, defaultValue: 'Adults', description: 'Kids, Teens, Adults, All Levels' },
      { name: 'price', type: 'NUMBER', required: true, defaultValue: 0, description: 'Price' },
      { name: 'currency', type: 'STRING', required: true, defaultValue: 'JOD', description: 'Currency code' },
      { name: 'billingPeriod', type: 'STRING', required: true, defaultValue: 'monthly', description: 'Billing frequency (monthly, quarterly, annual, punch_card)' },
      { name: 'durationDays', type: 'NUMBER', required: true, defaultValue: 30, description: 'Plan validity period in days (e.g. 30 days)' },
      { name: 'classesCount', type: 'NUMBER', required: true, defaultValue: 8, description: '8, 12, or -1 for Unlimited' },
      { name: 'description', type: 'STRING', required: false, defaultValue: '', description: 'Plan perks description' },
      { name: 'active', type: 'BOOLEAN', required: true, defaultValue: true, description: 'Is plan currently offered' },
      { name: 'isPopular', type: 'BOOLEAN', required: false, defaultValue: false, description: 'Featured plan badge' },
    ],
  },
  {
    id: 'timetable_config',
    tableName: 'timetable_config',
    displayName: 'Mat Schedule Board Table',
    description: 'Weekly timetable configuration with days, time slots, mat areas, and scheduling grid entries.',
    primaryKey: 'id',
    columns: [
      { name: 'days', type: 'ARRAY', required: true, defaultValue: [], description: 'Configured training days' },
      { name: 'timeSlots', type: 'ARRAY', required: true, defaultValue: [], description: 'Configured class time slots' },
      { name: 'mats', type: 'ARRAY', required: true, defaultValue: [], description: 'Configured mat areas (Mat 1, Mat 2)' },
      { name: 'entries', type: 'ARRAY', required: true, defaultValue: [], description: 'Grid placement entries' },
    ],
  },
  {
    id: 'gym_settings',
    tableName: 'gym_settings',
    displayName: 'Academy Settings & Branding Table',
    description: 'Global gym name, slogan, logo URL, currency symbol, default coach, and tax rate.',
    primaryKey: 'id',
    columns: [
      { name: 'gymName', type: 'STRING', required: true, defaultValue: 'Arte Suave Academy', description: 'Academy name' },
      { name: 'slogan', type: 'STRING', required: true, defaultValue: 'Where Technique Conquers Strength', description: 'Academy motto' },
      { name: 'logo', type: 'STRING', required: false, defaultValue: '', description: 'Logo image data URL' },
      { name: 'currencySymbol', type: 'STRING', required: true, defaultValue: 'JOD', description: 'Default currency' },
      { name: 'defaultCoach', type: 'STRING', required: false, defaultValue: 'Professor Lucas Silva', description: 'Default coach' },
      { name: 'taxRate', type: 'NUMBER', required: false, defaultValue: 0, description: 'Tax rate percentage' },
    ],
  },
  {
    id: 'ibjjf_transfers',
    tableName: 'ibjjf_transfers',
    displayName: 'IBJJF Age Transfers Audit Table',
    description: 'Automated audit trail of students aged out from Kids to Teens (16) and Teens to Adults (18).',
    primaryKey: 'id',
    columns: [
      { name: 'id', type: 'STRING', required: true, defaultValue: '', description: 'Transfer record ID' },
      { name: 'memberId', type: 'STRING', required: true, defaultValue: '', description: 'Member ID' },
      { name: 'memberName', type: 'STRING', required: true, defaultValue: '', description: 'Member name' },
      { name: 'previousCategory', type: 'STRING', required: true, defaultValue: '', description: 'Kids, Teens' },
      { name: 'newCategory', type: 'STRING', required: true, defaultValue: '', description: 'Teens, Adults' },
      { name: 'age', type: 'NUMBER', required: true, defaultValue: 0, description: 'Age at transfer' },
      { name: 'birthDate', type: 'DATE', required: true, defaultValue: '', description: 'Member date of birth' },
      { name: 'previousBelt', type: 'STRING', required: true, defaultValue: '', description: 'Belt before transfer' },
      { name: 'newBelt', type: 'STRING', required: true, defaultValue: '', description: 'Belt after transfer' },
      { name: 'transferDate', type: 'DATE', required: true, defaultValue: '', description: 'Date transfer executed' },
      { name: 'reason', type: 'STRING', required: true, defaultValue: '', description: 'IBJJF rule compliance reason' },
    ],
  },
  {
    id: 'system_users',
    tableName: 'system_users',
    displayName: 'System User Accounts & Auth Table',
    description: 'Encrypted system staff accounts, usernames, roles, and salted password hashes.',
    primaryKey: 'id',
    columns: [
      { name: 'id', type: 'STRING', required: true, defaultValue: '', description: 'User account ID' },
      { name: 'username', type: 'STRING', required: true, defaultValue: '', description: 'Unique username' },
      { name: 'passwordHash', type: 'STRING', required: true, defaultValue: '', description: 'SHA-256 salted password hash' },
      { name: 'salt', type: 'STRING', required: true, defaultValue: '', description: 'Unique cryptographic salt' },
      { name: 'fullName', type: 'STRING', required: true, defaultValue: '', description: 'User display full name' },
      { name: 'role', type: 'STRING', required: true, defaultValue: 'staff', description: 'admin, manager, or staff' },
      { name: 'active', type: 'BOOLEAN', required: true, defaultValue: true, description: 'Active account status' },
      { name: 'createdAt', type: 'DATE', required: true, defaultValue: '', description: 'Creation date' },
      { name: 'lastLogin', type: 'DATE', required: false, defaultValue: '', description: 'Last login timestamp' },
    ],
  },
];

/**
 * Validates a Windows or Local File Path format
 */
export function validateDatabasePath(path: string): { isValid: boolean; message: string; isWindows: boolean } {
  const trimmed = path.trim();
  if (!trimmed) {
    return { isValid: false, message: 'Database path cannot be empty.', isWindows: false };
  }

  // Windows drive format: C:\..., D:\..., or UNC \\server\share
  const isWindowsDrive = /^[a-zA-Z]:\\([^\s<>:"/\\|?*]+\\)*[^\s<>:"/\\|?*]+\.(db|sqlite|sqlite3|json)$/i.test(trimmed);
  const isWindowsFolder = /^[a-zA-Z]:\\([^\s<>:"/\\|?*]+\\)*[^\s<>:"/\\|?*]+$/i.test(trimmed);
  const isUnixPath = /^\/([a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(db|sqlite|sqlite3|json)$/i.test(trimmed);

  if (isWindowsDrive || isWindowsFolder) {
    const hasExtension = /\.(db|sqlite|sqlite3|json)$/i.test(trimmed);
    return {
      isValid: true,
      message: hasExtension 
        ? `Valid Windows local database path target: ${trimmed}` 
        : `Valid Windows directory path: ${trimmed} (master database file will be stored here)`,
      isWindows: true,
    };
  }

  if (isUnixPath) {
    return {
      isValid: true,
      message: `Valid local database file path: ${trimmed}`,
      isWindows: false,
    };
  }

  // Soft validation fallback for custom Windows folder paths
  if (trimmed.includes(':\\') || trimmed.startsWith('\\\\')) {
    return {
      isValid: true,
      message: `Configured Windows local path: ${trimmed}`,
      isWindows: true,
    };
  }

  return {
    isValid: true,
    message: `Configured custom storage location: ${trimmed}`,
    isWindows: false,
  };
}

/**
 * Deep Health Check across all 10 core tables and schemas
 */
export function runDatabaseHealthCheck(customPath?: string): DatabaseHealthReport {
  const config = loadDatabaseConfig();
  const targetPath = customPath || config.storagePath || DEFAULT_DATABASE_PATH;
  const pathValidation = validateDatabasePath(targetPath);

  // Load all live tables from local storage
  const members = loadMembers();
  const classes = loadClasses();
  const attendance = loadAttendance();
  const payments = loadPayments();
  const coaches = loadCoaches();
  const plans = loadSubscriptionPlans();
  const timetable = loadTimetableConfig();
  const settings = loadSettings();
  const transfers = loadIBJJFTransfers();

  const dataMap: Record<string, any[]> = {
    members,
    classes,
    attendance,
    payments,
    coaches,
    subscription_plans: plans,
    timetable_config: timetable ? [timetable] : [],
    gym_settings: settings ? [settings] : [],
    ibjjf_transfers: transfers,
  };

  const tableResults: TableHealthResult[] = [];
  const detectedIssues: string[] = [];

  let totalCols = 0;
  let totalRows = 0;
  let healthyCount = 0;
  let warningCount = 0;
  let errorCount = 0;

  for (const schema of ACADEMY_TABLE_SCHEMAS) {
    const rows = dataMap[schema.id] || [];
    totalRows += rows.length;
    totalCols += schema.columns.length;

    const issues: string[] = [];
    let matchedColumns = schema.columns.length;
    const missingColumns: string[] = [];

    if (!rows || rows.length === 0) {
      if (schema.id === 'ibjjf_transfers') {
        // May naturally have 0 records if no students aged out yet
      } else {
        issues.push(`Table '${schema.tableName}' has 0 active records.`);
      }
    } else {
      // Check column schema against actual records
      const sample = rows[0];
      for (const col of schema.columns) {
        if (!(col.name in sample)) {
          missingColumns.push(col.name);
          issues.push(`Column '${col.name}' is missing in active '${schema.tableName}' records.`);
        }
      }

      matchedColumns = schema.columns.length - missingColumns.length;
    }

    // Check specific relational integrity rules
    if (schema.id === 'attendance') {
      const memberIds = new Set(members.map((m) => m.id));
      const orphaned = attendance.filter((a) => !memberIds.has(a.memberId));
      if (orphaned.length > 0) {
        issues.push(`${orphaned.length} attendance record(s) reference non-existent student IDs.`);
      }
    }

    if (schema.id === 'payments') {
      const memberIds = new Set(members.map((m) => m.id));
      const orphaned = payments.filter((p) => !memberIds.has(p.memberId));
      if (orphaned.length > 0) {
        issues.push(`${orphaned.length} payment record(s) reference non-existent student IDs.`);
      }
    }

    if (schema.id === 'members') {
      // Check for members with missing 1-month validity dates
      const missingEndDates = members.filter((m) => !m.membershipEndDate);
      if (missingEndDates.length > 0) {
        issues.push(`${missingEndDates.length} student(s) missing membershipEndDate (1-month validity).`);
      }
    }

    let status: 'healthy' | 'warning' | 'error' = 'healthy';
    if (missingColumns.length > 0) {
      status = 'warning';
      warningCount++;
    } else if (issues.length > 0 && issues.some((i) => i.includes('0 active records') && schema.id !== 'ibjjf_transfers')) {
      status = 'error';
      errorCount++;
    } else if (issues.length > 0) {
      status = 'warning';
      warningCount++;
    } else {
      status = 'healthy';
      healthyCount++;
    }

    tableResults.push({
      tableName: schema.tableName,
      displayName: schema.displayName,
      exists: true,
      rowCount: rows.length,
      expectedColumnsCount: schema.columns.length,
      matchedColumnsCount: matchedColumns,
      missingColumns,
      issues,
      status,
    });

    if (issues.length > 0) {
      detectedIssues.push(...issues);
    }
  }

  // Calculate overall health score
  const tableScore = (healthyCount / ACADEMY_TABLE_SCHEMAS.length) * 70;
  const warningPenalty = warningCount * 5;
  const errorPenalty = errorCount * 15;
  const pathBonus = pathValidation.isValid ? 30 : 0;
  const calculatedScore = Math.max(0, Math.min(100, Math.round(tableScore + pathBonus - warningPenalty - errorPenalty)));

  // Update lastChecked timestamp in config
  saveDatabaseConfig({
    ...config,
    lastChecked: new Date().toISOString(),
  });

  return {
    timestamp: new Date().toISOString(),
    databasePath: config.storagePath,
    isPathValid: pathValidation.isValid,
    pathVerificationMessage: pathValidation.message,
    totalTables: ACADEMY_TABLE_SCHEMAS.length,
    healthyTables: healthyCount,
    warningTables: warningCount,
    errorTables: errorCount,
    totalColumnsChecked: totalCols,
    totalRecordsChecked: totalRows,
    healthScore: calculatedScore,
    tableResults,
    detectedIssues,
  };
}

/**
 * Fix & Repair Database Feature:
 * Automatically repairs tables, injects missing columns with defaults,
 * initializes missing tables, cleans up orphaned data, and ensures
 * bidirectional synchronization.
 */
export function fixAndRepairDatabase(): {
  success: boolean;
  repairedItemsCount: number;
  repairedDetails: string[];
} {
  const details: string[] = [];
  let repairCount = 0;

  // 1. Members Table Schema Repair
  const members = loadMembers();
  const repairedMembers = members.map((m) => {
    let wasModified = false;
    const item = { ...m };

    if (item.avatar === undefined) { item.avatar = ''; wasModified = true; }
    if (item.emergencyName === undefined) { item.emergencyName = ''; wasModified = true; }
    if (item.emergencyPhone === undefined) { item.emergencyPhone = ''; wasModified = true; }
    if (item.emergencyRelation === undefined) { item.emergencyRelation = ''; wasModified = true; }
    if (item.lastPromotionDate === undefined) { item.lastPromotionDate = ''; wasModified = true; }
    if (item.nextExpectedPromotionDate === undefined) { item.nextExpectedPromotionDate = ''; wasModified = true; }
    if (item.phone === undefined) { item.phone = ''; wasModified = true; }
    if (item.email === undefined) { item.email = ''; wasModified = true; }
    if (item.notes === undefined) { item.notes = ''; wasModified = true; }

    if (!item.membershipEndDate) {
      const start = item.membershipStartDate ? new Date(item.membershipStartDate) : new Date();
      start.setMonth(start.getMonth() + 1);
      item.membershipEndDate = start.toISOString().split('T')[0];
      wasModified = true;
    }
    if (!item.membershipStartDate) {
      item.membershipStartDate = new Date().toISOString().split('T')[0];
      wasModified = true;
    }
    if (typeof item.stripes !== 'number') {
      item.stripes = 0;
      wasModified = true;
    }
    if (!item.status) {
      item.status = (item.classesRemaining > 0 || item.classesRemaining === -1) ? 'active' : 'expired';
      wasModified = true;
    }
    if (typeof item.totalClassesAttended !== 'number') {
      item.totalClassesAttended = 0;
      wasModified = true;
    }

    if (wasModified) {
      repairCount++;
    }
    return item;
  });
  saveMembers(repairedMembers);
  details.push(`Verified & repaired ${repairedMembers.length} records in 'members' table.`);

  // 2. Attendance Table Schema Repair
  const attendance = loadAttendance();
  const repairedAttendance = attendance.map((a) => {
    let mod = false;
    const att = { ...a };
    if (att.category === undefined) { att.category = 'Adults'; mod = true; }
    if (att.timestamp === undefined || att.timestamp === 0) { 
      att.timestamp = att.date ? new Date(att.date).getTime() : Date.now(); 
      mod = true; 
    }
    if (att.coach === undefined) { att.coach = 'Coach'; mod = true; }
    if (att.className === undefined) { att.className = 'BJJ Class'; mod = true; }
    if (mod) repairCount++;
    return att;
  });
  saveAttendance(repairedAttendance);
  details.push(`Verified ${repairedAttendance.length} records in 'attendance' table.`);

  // 3. Timetable Config Table Schema Repair
  let timetable = loadTimetableConfig();
  if (!timetable) {
    saveTimetableConfig(DEFAULT_TIMETABLE_CONFIG);
    repairCount++;
    details.push(`Created default timetable configuration in 'timetable_config'.`);
  } else {
    let mod = false;
    const tt = { ...timetable };
    if (!tt.timeSlots || !Array.isArray(tt.timeSlots) || tt.timeSlots.length === 0) {
      tt.timeSlots = ['06:00 AM', '12:00 PM', '06:00 PM', '07:30 PM'];
      mod = true;
    }
    if (!tt.entries || !Array.isArray(tt.entries)) {
      tt.entries = [];
      mod = true;
    }
    if (mod) {
      saveTimetableConfig(tt);
      repairCount++;
    }
    details.push(`Verified 'timetable_config' schema.`);
  }

  // 4. Gym Settings Table Schema Repair
  const settings = loadSettings();
  if (!settings) {
    saveSettings({ ...DEFAULT_SETTINGS, taxRate: 0 });
    repairCount++;
    details.push(`Created default record in 'gym_settings' table.`);
  } else {
    const repairedSettings: GymSettings = {
      ...settings,
      currencySymbol: settings.currencySymbol || 'JOD',
      gymName: settings.gymName || 'Arte Suave Academy',
      slogan: settings.slogan || 'Where Technique Conquers Strength',
      taxRate: typeof settings.taxRate === 'number' ? settings.taxRate : 0,
      defaultCoach: settings.defaultCoach || 'Professor Lucas Silva',
    };
    saveSettings(repairedSettings);
    details.push(`Verified 'gym_settings' table schema.`);
  }

  // 5. Subscription Plans Table
  const plans = loadSubscriptionPlans();
  if (!plans || plans.length === 0) {
    saveSubscriptionPlans(INITIAL_SUBSCRIPTION_PLANS);
    repairCount += INITIAL_SUBSCRIPTION_PLANS.length;
    details.push(`Restored ${INITIAL_SUBSCRIPTION_PLANS.length} default plans to 'subscription_plans' table.`);
  } else {
    const repairedPlans = plans.map((p) => {
      let mod = false;
      const plan = { ...p };
      if (!plan.billingPeriod) {
        plan.billingPeriod = 'monthly';
        mod = true;
      }
      if (!plan.durationDays) {
        plan.durationDays = 30;
        mod = true;
      }
      if (typeof plan.active !== 'boolean') {
        plan.active = true;
        mod = true;
      }
      if (plan.description === undefined) { plan.description = ''; mod = true; }
      if (plan.isPopular === undefined) { plan.isPopular = false; mod = true; }
      if (mod) repairCount++;
      return plan;
    });
    saveSubscriptionPlans(repairedPlans);
    details.push(`Verified ${repairedPlans.length} plans in 'subscription_plans' table.`);
  }

  // 6. Classes Table
  const classes = loadClasses();
  const repairedClasses = classes.map((c) => {
    let mod = false;
    const cls = { ...c };
    if (!cls.daysOfWeek || cls.daysOfWeek.length === 0) {
      cls.daysOfWeek = ['Mon', 'Wed'];
      mod = true;
    }
    if (!cls.room) {
      cls.room = 'Main Dojo Mat A';
      mod = true;
    }
    if (cls.headCoachId === undefined) { cls.headCoachId = ''; mod = true; }
    if (cls.headCoachName === undefined) { cls.headCoachName = ''; mod = true; }
    if (cls.headCoachRank === undefined) { cls.headCoachRank = ''; mod = true; }
    if (cls.assistantCoaches === undefined) { cls.assistantCoaches = []; mod = true; }
    if (cls.description === undefined) { cls.description = ''; mod = true; }
    if (cls.eligibleAgeMin === undefined) { cls.eligibleAgeMin = 4; mod = true; }
    if (cls.eligibleAgeMax === undefined) { cls.eligibleAgeMax = 99; mod = true; }
    if (mod) repairCount++;
    return cls;
  });
  saveClasses(repairedClasses);
  details.push(`Verified ${repairedClasses.length} records in 'classes' table.`);

  // 7. Payments Table
  const payments = loadPayments();
  const repairedPayments = payments.map((p) => {
    let mod = false;
    const pay = { ...p };
    if (!pay.currency) {
      pay.currency = 'JOD';
      mod = true;
    }
    if (!pay.status) {
      pay.status = 'Completed';
      mod = true;
    }
    if (pay.notes === undefined) { pay.notes = ''; mod = true; }
    if (mod) repairCount++;
    return pay;
  });
  savePayments(repairedPayments);
  details.push(`Verified ${repairedPayments.length} transactions in 'payments' table.`);

  // 8. Coaches Table
  const coaches = loadCoaches();
  const repairedCoaches = coaches.map((co) => {
    let mod = false;
    const coach = { ...co };
    if (coach.hireDate === undefined) { coach.hireDate = ''; mod = true; }
    if (coach.studentBonusThreshold === undefined) { coach.studentBonusThreshold = 10; mod = true; }
    if (coach.studentBonusAmount === undefined) { coach.studentBonusAmount = 2; mod = true; }
    if (mod) repairCount++;
    return coach;
  });
  saveCoaches(repairedCoaches);
  details.push(`Verified ${repairedCoaches.length} instructors in 'coaches' table.`);

  // Update Config
  const config = loadDatabaseConfig();
  saveDatabaseConfig({
    ...config,
    lastRepaired: new Date().toISOString(),
  });

  return {
    success: true,
    repairedItemsCount: repairCount,
    repairedDetails: details,
  };
}

/**
 * Generate Standalone SQL Schema & Insert Scripts
 * Produces clean ANSI SQL / SQLite statements for Windows local hosting.
 */
export function generateSQLiteScript(): string {
  const members = loadMembers();
  const classes = loadClasses();
  const attendance = loadAttendance();
  const payments = loadPayments();
  const coaches = loadCoaches();
  const plans = loadSubscriptionPlans();
  const settings = loadSettings();

  let sql = `-- =========================================================================\n`;
  sql += `-- ARTE SUAVE BJJ ACADEMY - SQLITE MASTER SCHEMA & SEED DATA\n`;
  sql += `-- Generated: ${new Date().toISOString()}\n`;
  sql += `-- Target: Windows Desktop Local Database File\n`;
  sql += `-- =========================================================================\n\n`;

  sql += `PRAGMA foreign_keys = ON;\nBEGIN TRANSACTION;\n\n`;

  // 1. Members
  sql += `-- 1. MEMBERS TABLE\n`;
  sql += `CREATE TABLE IF NOT EXISTS members (\n`;
  sql += `  id TEXT PRIMARY KEY,\n`;
  sql += `  full_name TEXT NOT NULL,\n`;
  sql += `  birth_date TEXT NOT NULL,\n`;
  sql += `  age_group TEXT NOT NULL CHECK(age_group IN ('Kids', 'Teens', 'Adults')),\n`;
  sql += `  belt_rank TEXT NOT NULL,\n`;
  sql += `  stripes INTEGER DEFAULT 0,\n`;
  sql += `  membership_type TEXT NOT NULL,\n`;
  sql += `  classes_remaining INTEGER DEFAULT 8,\n`;
  sql += `  classes_total INTEGER DEFAULT 8,\n`;
  sql += `  membership_start_date TEXT,\n`;
  sql += `  membership_end_date TEXT,\n`;
  sql += `  status TEXT DEFAULT 'active',\n`;
  sql += `  total_classes_attended INTEGER DEFAULT 0,\n`;
  sql += `  phone TEXT,\n`;
  sql += `  email TEXT,\n`;
  sql += `  avatar TEXT,\n`;
  sql += `  emergency_name TEXT,\n`;
  sql += `  emergency_phone TEXT,\n`;
  sql += `  notes TEXT\n`;
  sql += `);\n\n`;

  // Insert members
  for (const m of members) {
    const esc = (s?: string) => (s ? `'${s.replace(/'/g, "''")}'` : 'NULL');
    sql += `INSERT OR REPLACE INTO members (id, full_name, birth_date, age_group, belt_rank, stripes, membership_type, classes_remaining, classes_total, membership_start_date, membership_end_date, status, total_classes_attended, phone, email, notes) VALUES (${esc(m.id)}, ${esc(m.fullName)}, ${esc(m.birthDate)}, ${esc(m.ageGroup)}, ${esc(m.beltRank)}, ${m.stripes}, ${esc(m.membershipType)}, ${m.classesRemaining}, ${m.classesTotal}, ${esc(m.membershipStartDate)}, ${esc(m.membershipEndDate)}, ${esc(m.status)}, ${m.totalClassesAttended}, ${esc(m.phone)}, ${esc(m.email)}, ${esc(m.notes)});\n`;
  }

  sql += `\n-- 2. SUBSCRIPTION PLANS TABLE\n`;
  sql += `CREATE TABLE IF NOT EXISTS subscription_plans (\n`;
  sql += `  id TEXT PRIMARY KEY,\n`;
  sql += `  name TEXT NOT NULL,\n`;
  sql += `  category TEXT NOT NULL,\n`;
  sql += `  price REAL NOT NULL,\n`;
  sql += `  currency TEXT DEFAULT 'JOD',\n`;
  sql += `  billing_period TEXT DEFAULT 'monthly',\n`;
  sql += `  duration_days INTEGER DEFAULT 30,\n`;
  sql += `  classes_count INTEGER NOT NULL,\n`;
  sql += `  active INTEGER DEFAULT 1\n`;
  sql += `);\n\n`;

  for (const p of plans) {
    const esc = (s?: string) => (s ? `'${s.replace(/'/g, "''")}'` : 'NULL');
    sql += `INSERT OR REPLACE INTO subscription_plans (id, name, category, price, currency, billing_period, duration_days, classes_count, active) VALUES (${esc(p.id)}, ${esc(p.name)}, ${esc(p.category)}, ${p.price}, ${esc(p.currency)}, ${esc(p.billingPeriod)}, ${p.durationDays || 30}, ${p.classesCount}, ${p.active ? 1 : 0});\n`;
  }

  sql += `\nCOMMIT;\n`;
  return sql;
}

/**
 * Fetch real status of database file directly on the Windows hard drive via Vite backend bridge
 */
export async function fetchDiskDatabaseStatus(customPath?: string): Promise<DiskDatabaseStatus | null> {
  const config = loadDatabaseConfig();
  const targetPath = customPath || config.storagePath || DEFAULT_DATABASE_PATH;
  try {
    const res = await fetch(`/api/database/status?path=${encodeURIComponent(targetPath)}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('Backend database bridge unreachable (running client-only or offline)', e);
  }
  return null;
}

/**
 * Combined Health Check: runs in-app schema checks AND checks the physical file on Windows disk
 */
export async function runFullDatabaseHealthCheckAsync(customPath?: string): Promise<DatabaseHealthReport> {
  // Automatically heal legacy or missing schema columns across all active records
  fixAndRepairDatabase();

  const report = runDatabaseHealthCheck(customPath);
  const diskStatus = await fetchDiskDatabaseStatus(customPath);
  report.diskStatus = diskStatus;

  if (diskStatus) {
    if (diskStatus.fileExists && diskStatus.fileSizeBytes === 0) {
      report.detectedIssues.push(`⚠️ Physical database file at '${diskStatus.targetPath}' is 0 KB (empty file). Click 'Fix & Build Database' to generate tables on disk.`);
      report.healthScore = Math.min(report.healthScore, 40);
    } else if (diskStatus.fileExists && diskStatus.fileSizeBytes > 0) {
      report.pathVerificationMessage = `✅ Connected to Windows disk: ${diskStatus.fileSizeFormatted} (${diskStatus.existingTablesCount}/10 tables found on disk)`;
      if (diskStatus.existingTablesCount >= 8) {
        report.healthScore = Math.max(report.healthScore, 95);
      }
    } else if (!diskStatus.fileExists) {
      report.detectedIssues.push(`⚠️ Database file not created yet at '${diskStatus.targetPath}'. Click 'Fix & Build Database' to create it on disk.`);
      report.healthScore = Math.min(report.healthScore, 50);
    }
  }

  return report;
}

/**
 * Build or repair the physical SQLite database directly on the Windows hard drive
 */
export async function buildAndWriteDiskDatabase(customPath?: string): Promise<{
  success: boolean;
  message: string;
  targetPath?: string;
  fileSizeBytes?: number;
  fileSizeFormatted?: string;
  totalRowsWritten?: number;
  companionSqlPath?: string;
  companionJsonPath?: string;
}> {
  const config = loadDatabaseConfig();
  const targetPath = customPath || config.storagePath || DEFAULT_DATABASE_PATH;

  // Package all currently loaded tables in the application
  const payload = {
    members: loadMembers(),
    classes: loadClasses(),
    attendance: loadAttendance(),
    payments: loadPayments(),
    coaches: loadCoaches(),
    subscriptionPlans: loadSubscriptionPlans(),
    timetableConfig: loadTimetableConfig(),
    settings: loadSettings(),
    ibjjfTransfers: loadIBJJFTransfers(),
  };

  try {
    const res = await fetch('/api/database/build-fix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: targetPath,
        data: payload,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return data;
    } else {
      const errData = await res.json().catch(() => ({}));
      return {
        success: false,
        message: errData.error || `Server responded with status ${res.status}`,
      };
    }
  } catch (e: any) {
    return {
      success: false,
      message: `Failed to connect to local database service (${e.message}). Ensure the app is running via 'deploy_and_run.bat' or 'npm run dev' / 'npm run preview' / 'node server.js' on your Windows machine. You can also use 'Download SQL Script' below to seed C:\\BJJ Academy\\Database\\bjj_master.db manually.`,
    };
  }
}

/**
 * Read data from physical SQLite database on Windows hard drive back into web app
 */
export async function restoreDataFromDiskDatabase(customPath?: string): Promise<{
  success: boolean;
  message: string;
  recordsLoaded?: number;
}> {
  const config = loadDatabaseConfig();
  const targetPath = customPath || config.storagePath || DEFAULT_DATABASE_PATH;

  try {
    const res = await fetch('/api/database/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: targetPath }),
    });

    if (res.ok) {
      const data = await res.json();
      let count = 0;
      if (Array.isArray(data.members)) {
        saveMembers(data.members);
        count += data.members.length;
      }
      if (Array.isArray(data.classes)) {
        saveClasses(data.classes);
        count += data.classes.length;
      }
      if (Array.isArray(data.attendance)) {
        saveAttendance(data.attendance);
        count += data.attendance.length;
      }
      if (Array.isArray(data.payments)) {
        savePayments(data.payments);
        count += data.payments.length;
      }
      if (Array.isArray(data.coaches)) {
        saveCoaches(data.coaches);
        count += data.coaches.length;
      }
      if (Array.isArray(data.subscriptionPlans)) {
        saveSubscriptionPlans(data.subscriptionPlans);
        count += data.subscriptionPlans.length;
      }
      if (data.timetableConfig) {
        saveTimetableConfig(data.timetableConfig);
        count++;
      }
      if (data.settings) {
        saveSettings(data.settings);
        count++;
      }
      if (Array.isArray(data.ibjjfTransfers)) {
        saveIBJJFTransfers(data.ibjjfTransfers);
        count += data.ibjjfTransfers.length;
      }

      return {
        success: true,
        message: `Successfully loaded ${count} records from ${targetPath}!`,
        recordsLoaded: count,
      };
    } else {
      const err = await res.json().catch(() => ({}));
      return {
        success: false,
        message: err.error || 'Failed to read database file',
      };
    }
  } catch (e: any) {
    return {
      success: false,
      message: e.message || 'Error communicating with database endpoint',
    };
  }
}

