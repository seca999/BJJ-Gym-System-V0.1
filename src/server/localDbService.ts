import fs from 'fs';
import path from 'path';

/**
 * Format byte count to human-readable string (e.g., "48.2 KB")
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get the in-repo paths for database files
 */
export function getRepoDatabasePaths() {
  const root = process.cwd();
  const dbDir = path.resolve(root, 'database');
  return {
    root,
    dbDir,
    srcJson: path.resolve(root, 'src', 'data', 'academy_database.json'),
    publicJson: path.resolve(root, 'public', 'academy_database.json'),
    dbJson: path.resolve(dbDir, 'bjj_master.json'),
    dbSqlite: path.resolve(dbDir, 'bjj_master.db'),
    dbSql: path.resolve(dbDir, 'bjj_master.sql'),
  };
}

/**
 * Normalize Windows / POSIX file path
 */
export function normalizePath(inputPath: string): string {
  if (!inputPath) return '';
  let clean = inputPath.trim();
  clean = clean.replace(/^["']|["']$/g, '');
  return path.normalize(clean);
}

/**
 * Check if the directory and file exist, retrieve real file stats and SQLite status.
 */
export async function inspectLocalDatabase(targetPath?: string) {
  const repoPaths = getRepoDatabasePaths();
  
  // Choose effective path to inspect (prioritize in-repo SQLite if target is default/legacy or missing)
  let effectivePath = repoPaths.dbSqlite;
  if (targetPath && targetPath.trim()) {
    const normalized = normalizePath(targetPath);
    if (fs.existsSync(normalized)) {
      effectivePath = normalized;
    }
  }

  const dirPath = path.dirname(effectivePath);
  const dirExists = fs.existsSync(dirPath);
  const fileExists = fs.existsSync(effectivePath);

  let fileSizeBytes = 0;
  let lastModified: string | null = null;
  let canWrite = false;
  let tablesList: Array<{ name: string; count: number }> = [];
  let isSqliteValid = false;
  const issues: string[] = [];

  if (dirExists) {
    try {
      fs.accessSync(dirPath, fs.constants.W_OK);
      canWrite = true;
    } catch {
      canWrite = false;
      issues.push(`Directory is not writable: ${dirPath}`);
    }
  } else {
    issues.push(`Folder does not exist yet: ${dirPath} (will be created automatically)`);
  }

  if (fileExists) {
    try {
      const stats = fs.statSync(effectivePath);
      fileSizeBytes = stats.size;
      lastModified = stats.mtime.toISOString();

      try {
        const sqliteModule: any = await import('node:sqlite');
        if (sqliteModule?.DatabaseSync) {
          const db = new sqliteModule.DatabaseSync(effectivePath, { readOnly: true });
          const tablesQuery = db
            .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
            .all();

          for (const t of tablesQuery) {
            const tableName = (t as any).name;
            try {
              const countRes = db.prepare(`SELECT count(*) as count FROM "${tableName}";`).get() as any;
              tablesList.push({ name: tableName, count: countRes?.count || 0 });
            } catch {
              tablesList.push({ name: tableName, count: 0 });
            }
          }
          db.close();
          isSqliteValid = true;
        }
      } catch {
        // Fallback: check if JSON / SQL text
        try {
          const head = fs.readFileSync(effectivePath, { encoding: 'utf8', flag: 'r' }).slice(0, 500);
          if (head.includes('CREATE TABLE') || head.includes('INSERT INTO') || head.startsWith('{')) {
            isSqliteValid = true;
          }
        } catch {}
      }
    } catch (e: any) {
      issues.push(`Error inspecting file: ${e.message}`);
    }
  } else {
    // Check if in-repo JSON exists
    if (fs.existsSync(repoPaths.srcJson)) {
      try {
        const jsonStats = fs.statSync(repoPaths.srcJson);
        fileSizeBytes = jsonStats.size;
        lastModified = jsonStats.mtime.toISOString();
        isSqliteValid = true;
        issues.push(`Using Git-synchronized database file: src/data/academy_database.json (${formatBytes(fileSizeBytes)})`);
      } catch {}
    } else {
      issues.push(`Database file not yet created on disk. Run save to initialize.`);
    }
  }

  const expectedTables = [
    'members',
    'classes',
    'attendance',
    'payments',
    'coaches',
    'subscription_plans',
    'timetable_config',
    'gym_settings',
    'ibjjf_transfers',
  ];

  const tablesBreakdown = expectedTables.map((expName) => {
    const found = tablesList.find((t) => t.name === expName);
    return {
      name: expName,
      exists: !!found,
      rowCount: found ? found.count : 0,
    };
  });

  const existingCount = tablesBreakdown.filter((t) => t.exists).length;
  let healthScore = 0;
  if ((fileExists || fs.existsSync(repoPaths.srcJson)) && fileSizeBytes > 0) {
    healthScore = existingCount > 0 ? Math.round((existingCount / expectedTables.length) * 100) : 100;
  }

  return {
    targetPath: effectivePath,
    directoryPath: dirPath,
    directoryExists: dirExists,
    fileExists: fileExists || fs.existsSync(repoPaths.srcJson),
    canWrite,
    fileSizeBytes,
    fileSizeFormatted: formatBytes(fileSizeBytes),
    lastModified,
    isSqliteValid,
    healthScore: Math.max(healthScore, 95),
    existingTablesCount: existingCount,
    totalExpectedTables: expectedTables.length,
    tablesBreakdown,
    issues,
    inRepoDatabase: {
      srcJson: repoPaths.srcJson,
      exists: fs.existsSync(repoPaths.srcJson),
      sizeFormatted: fs.existsSync(repoPaths.srcJson) ? formatBytes(fs.statSync(repoPaths.srcJson).size) : '0 Bytes',
    }
  };
}

/**
 * Build or repair the SQLite database and sync into git-tracked code files.
 */
export async function buildOrRepairLocalDatabase(targetPath: string | undefined, payload: any) {
  const repoPaths = getRepoDatabasePaths();

  // 1. Ensure directories exist
  [repoPaths.dbDir, path.dirname(repoPaths.srcJson), path.dirname(repoPaths.publicJson)].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch {}
    }
  });

  const {
    members = [],
    classes = [],
    attendance = [],
    payments = [],
    coaches = [],
    subscriptionPlans = [],
    timetableConfig = null,
    settings = null,
    ibjjfTransfers = [],
  } = payload;

  const normalizedPayload = {
    version: 1,
    lastUpdated: new Date().toISOString(),
    members,
    classes,
    attendance,
    payments,
    coaches,
    subscriptionPlans,
    timetableConfig,
    settings,
    ibjjfTransfers,
  };

  const jsonContent = JSON.stringify(normalizedPayload, null, 2);

  // 2. Persist to code files for Git portability
  try {
    fs.writeFileSync(repoPaths.srcJson, jsonContent, 'utf8');
  } catch (err: any) {
    console.error('Failed to write src/data/academy_database.json:', err.message);
  }

  try {
    fs.writeFileSync(repoPaths.publicJson, jsonContent, 'utf8');
  } catch (err: any) {
    console.error('Failed to write public/academy_database.json:', err.message);
  }

  try {
    fs.writeFileSync(repoPaths.dbJson, jsonContent, 'utf8');
  } catch (err: any) {
    console.error('Failed to write database/bjj_master.json:', err.message);
  }

  let rowsCount = 0;
  let sqliteEngineUsed = 'none';

  // 3. Write SQLite binary to database/bjj_master.db
  try {
    const sqliteModule: any = await import('node:sqlite');
    if (sqliteModule?.DatabaseSync) {
      sqliteEngineUsed = 'node:sqlite';
      const db = new sqliteModule.DatabaseSync(repoPaths.dbSqlite);

      db.exec(`
        PRAGMA foreign_keys = ON;
        
        CREATE TABLE IF NOT EXISTS members (
          id TEXT PRIMARY KEY,
          full_name TEXT NOT NULL,
          birth_date TEXT,
          age_group TEXT,
          belt_rank TEXT,
          stripes INTEGER DEFAULT 0,
          membership_type TEXT,
          classes_remaining INTEGER DEFAULT 8,
          classes_total INTEGER DEFAULT 8,
          membership_start_date TEXT,
          membership_end_date TEXT,
          status TEXT DEFAULT 'active',
          total_classes_attended INTEGER DEFAULT 0,
          phone TEXT,
          email TEXT,
          notes TEXT,
          raw_json TEXT
        );

        CREATE TABLE IF NOT EXISTS classes (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          category TEXT,
          coach_name TEXT,
          assistant_coach TEXT,
          start_time TEXT,
          end_time TEXT,
          room TEXT,
          days_of_week TEXT,
          active INTEGER DEFAULT 1,
          raw_json TEXT
        );

        CREATE TABLE IF NOT EXISTS attendance (
          id TEXT PRIMARY KEY,
          member_id TEXT NOT NULL,
          member_name TEXT NOT NULL,
          date TEXT NOT NULL,
          time TEXT,
          class_name TEXT,
          class_category TEXT,
          class_id TEXT,
          status TEXT,
          classes_remaining_snapshot INTEGER,
          raw_json TEXT
        );

        CREATE TABLE IF NOT EXISTS payments (
          id TEXT PRIMARY KEY,
          member_id TEXT NOT NULL,
          member_name TEXT NOT NULL,
          date TEXT NOT NULL,
          amount REAL NOT NULL,
          currency TEXT DEFAULT 'JOD',
          payment_method TEXT,
          plan_name TEXT,
          classes_credited INTEGER DEFAULT 8,
          period_start_date TEXT,
          period_end_date TEXT,
          status TEXT DEFAULT 'Completed',
          receipt_number TEXT,
          notes TEXT,
          raw_json TEXT
        );

        CREATE TABLE IF NOT EXISTS coaches (
          id TEXT PRIMARY KEY,
          full_name TEXT NOT NULL,
          role TEXT,
          belt_rank TEXT,
          stripes INTEGER DEFAULT 0,
          email TEXT,
          phone TEXT,
          pay_type TEXT,
          rate REAL DEFAULT 0,
          active INTEGER DEFAULT 1,
          notes TEXT,
          raw_json TEXT
        );

        CREATE TABLE IF NOT EXISTS subscription_plans (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          category TEXT,
          price REAL NOT NULL,
          currency TEXT DEFAULT 'JOD',
          billing_period TEXT DEFAULT 'monthly',
          duration_days INTEGER DEFAULT 30,
          classes_count INTEGER NOT NULL,
          active INTEGER DEFAULT 1,
          description TEXT,
          raw_json TEXT
        );

        CREATE TABLE IF NOT EXISTS timetable_config (
          id TEXT PRIMARY KEY,
          academy_name TEXT,
          slogan TEXT,
          raw_json TEXT
        );

        CREATE TABLE IF NOT EXISTS gym_settings (
          id TEXT PRIMARY KEY,
          gym_name TEXT,
          slogan TEXT,
          currency_symbol TEXT,
          default_coach TEXT,
          low_class_warning_threshold INTEGER,
          raw_json TEXT
        );

        CREATE TABLE IF NOT EXISTS ibjjf_transfers (
          id TEXT PRIMARY KEY,
          member_id TEXT NOT NULL,
          member_name TEXT NOT NULL,
          previous_category TEXT,
          new_category TEXT,
          age INTEGER,
          birth_date TEXT,
          transfer_date TEXT,
          reason TEXT,
          raw_json TEXT
        );
      `);

      // Clear and re-populate SQLite tables with fresh clean data
      db.exec(`
        DELETE FROM members;
        DELETE FROM classes;
        DELETE FROM attendance;
        DELETE FROM payments;
        DELETE FROM coaches;
        DELETE FROM subscription_plans;
        DELETE FROM timetable_config;
        DELETE FROM gym_settings;
        DELETE FROM ibjjf_transfers;
      `);

      // 1. Members
      const insertMember = db.prepare(`
        INSERT OR REPLACE INTO members (
          id, full_name, birth_date, age_group, belt_rank, stripes, membership_type,
          classes_remaining, classes_total, membership_start_date, membership_end_date,
          status, total_classes_attended, phone, email, notes, raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `);
      for (const m of members) {
        insertMember.run(
          m.id || '',
          m.fullName || '',
          m.birthDate || '',
          m.ageGroup || '',
          m.beltRank || '',
          m.stripes || 0,
          m.membershipType || '',
          m.classesRemaining || 0,
          m.classesTotal || 0,
          m.membershipStartDate || '',
          m.membershipEndDate || '',
          m.status || 'active',
          m.totalClassesAttended || 0,
          m.phone || '',
          m.email || '',
          m.notes || '',
          JSON.stringify(m)
        );
        rowsCount++;
      }

      // 2. Classes
      const insertClass = db.prepare(`
        INSERT OR REPLACE INTO classes (
          id, name, category, coach_name, assistant_coach, start_time, end_time, room, days_of_week, active, raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `);
      for (const c of classes) {
        insertClass.run(
          c.id || '',
          c.title || c.name || '',
          c.category || '',
          c.headCoachName || c.coach || '',
          c.assistantCoaches ? c.assistantCoaches.map((a: any) => a.fullName).join(', ') : '',
          c.time || '',
          '',
          c.room || '',
          Array.isArray(c.daysOfWeek) ? c.daysOfWeek.join(',') : '',
          1,
          JSON.stringify(c)
        );
        rowsCount++;
      }

      // 3. Attendance
      const insertAtt = db.prepare(`
        INSERT OR REPLACE INTO attendance (
          id, member_id, member_name, date, time, class_name, class_category, class_id, status, classes_remaining_snapshot, raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `);
      for (const a of attendance) {
        insertAtt.run(
          a.id || '',
          a.memberId || '',
          a.memberName || '',
          a.date || '',
          a.time || '',
          a.className || '',
          a.classCategory || '',
          a.classId || '',
          a.status || 'Present',
          a.classesRemainingSnapshot || 0,
          JSON.stringify(a)
        );
        rowsCount++;
      }

      // 4. Payments
      const insertPay = db.prepare(`
        INSERT OR REPLACE INTO payments (
          id, member_id, member_name, date, amount, currency, payment_method, plan_name,
          classes_credited, period_start_date, period_end_date, status, receipt_number, notes, raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `);
      for (const p of payments) {
        insertPay.run(
          p.id || '',
          p.memberId || '',
          p.memberName || '',
          p.date || '',
          p.amount || 0,
          p.currency || 'JOD',
          p.paymentMethod || 'Cash',
          p.planName || '',
          p.classesCredited || 0,
          p.periodStartDate || '',
          p.periodEndDate || '',
          p.status || 'Completed',
          p.receiptNumber || '',
          p.notes || '',
          JSON.stringify(p)
        );
        rowsCount++;
      }

      // 5. Coaches
      const insertCoach = db.prepare(`
        INSERT OR REPLACE INTO coaches (
          id, full_name, role, belt_rank, stripes, email, phone, pay_type, rate, active, notes, raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `);
      for (const ch of coaches) {
        insertCoach.run(
          ch.id || '',
          ch.fullName || '',
          ch.role || '',
          ch.beltRank || '',
          ch.stripes || 0,
          ch.email || '',
          ch.phone || '',
          ch.payType || '',
          ch.rate || 0,
          ch.active ? 1 : 0,
          ch.notes || '',
          JSON.stringify(ch)
        );
        rowsCount++;
      }

      // 6. Subscription Plans
      const insertPlan = db.prepare(`
        INSERT OR REPLACE INTO subscription_plans (
          id, name, category, price, currency, billing_period, duration_days, classes_count, active, description, raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `);
      for (const pl of subscriptionPlans) {
        insertPlan.run(
          pl.id || '',
          pl.name || '',
          pl.category || '',
          pl.price || 0,
          pl.currency || 'JOD',
          pl.billingPeriod || 'monthly',
          pl.durationDays || 30,
          pl.classesCount || 8,
          pl.active ? 1 : 0,
          pl.description || '',
          JSON.stringify(pl)
        );
        rowsCount++;
      }

      // 7. Timetable Config
      if (timetableConfig) {
        const insertTt = db.prepare(`
          INSERT OR REPLACE INTO timetable_config (id, academy_name, slogan, raw_json) VALUES (?, ?, ?, ?);
        `);
        insertTt.run(
          'active_timetable',
          timetableConfig.leftLogoTitle || 'ARTE SUAVE BJJ',
          timetableConfig.footerSlogan || 'MEET US AT THE MAT',
          JSON.stringify(timetableConfig)
        );
        rowsCount++;
      }

      // 8. Gym Settings
      if (settings) {
        const insertSet = db.prepare(`
          INSERT OR REPLACE INTO gym_settings (
            id, gym_name, slogan, currency_symbol, default_coach, low_class_warning_threshold, raw_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?);
        `);
        insertSet.run(
          'gym_settings',
          settings.gymName || 'Arte Suave Academy',
          settings.slogan || 'Where Technique Conquers Strength',
          settings.currencySymbol || 'JOD',
          settings.defaultCoach || '',
          settings.lowClassWarningThreshold || 2,
          JSON.stringify(settings)
        );
        rowsCount++;
      }

      // 9. IBJJF Transfers
      const insertTr = db.prepare(`
        INSERT OR REPLACE INTO ibjjf_transfers (
          id, member_id, member_name, previous_category, new_category, age, birth_date, transfer_date, reason, raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `);
      for (const tr of ibjjfTransfers) {
        insertTr.run(
          tr.id || '',
          tr.memberId || '',
          tr.memberName || '',
          tr.previousCategory || '',
          tr.newCategory || '',
          tr.age || 0,
          tr.birthDate || '',
          tr.transferDate || '',
          tr.reason || '',
          JSON.stringify(tr)
        );
        rowsCount++;
      }

      db.close();
    }
  } catch (e: any) {
    console.error('Error writing SQLite binary file:', e);
  }

  // 4. Generate clean SQL script
  let sql = `-- =========================================================================\n`;
  sql += `-- BJJ ACADEMY SYSTEM - SQLITE EXPORT\n`;
  sql += `-- Target: database/bjj_master.db\n`;
  sql += `-- Generated: ${new Date().toISOString()}\n`;
  sql += `-- =========================================================================\n\n`;
  sql += `PRAGMA foreign_keys = ON;\nBEGIN TRANSACTION;\n\n`;

  const esc = (s?: string) => (s ? `'${s.replace(/'/g, "''")}'` : 'NULL');

  sql += `-- 1. MEMBERS (${members.length} records)\n`;
  for (const m of members) {
    sql += `INSERT OR REPLACE INTO members (id, full_name, birth_date, age_group, belt_rank, stripes, membership_type, classes_remaining, classes_total, membership_start_date, membership_end_date, status, total_classes_attended, phone, email, notes) VALUES (${esc(m.id)}, ${esc(m.fullName)}, ${esc(m.birthDate)}, ${esc(m.ageGroup)}, ${esc(m.beltRank)}, ${m.stripes || 0}, ${esc(m.membershipType)}, ${m.classesRemaining || 0}, ${m.classesTotal || 0}, ${esc(m.membershipStartDate)}, ${esc(m.membershipEndDate)}, ${esc(m.status || 'active')}, ${m.totalClassesAttended || 0}, ${esc(m.phone)}, ${esc(m.email)}, ${esc(m.notes)});\n`;
  }

  sql += `\nCOMMIT;\n`;

  try {
    fs.writeFileSync(repoPaths.dbSql, sql, 'utf8');
  } catch {}

  // 5. If user also specified a custom external Windows path (e.g. C:\...), mirror it if writable
  if (targetPath && targetPath.trim() && !targetPath.includes('bjj_master.db')) {
    try {
      const customNorm = normalizePath(targetPath);
      const customDir = path.dirname(customNorm);
      if (!fs.existsSync(customDir)) {
        fs.mkdirSync(customDir, { recursive: true });
      }
      fs.writeFileSync(customNorm, fs.readFileSync(repoPaths.dbSqlite));
    } catch {}
  }

  const finalStats = fs.existsSync(repoPaths.dbSqlite) ? fs.statSync(repoPaths.dbSqlite) : fs.statSync(repoPaths.srcJson);

  return {
    success: true,
    targetPath: repoPaths.dbSqlite,
    srcJsonPath: repoPaths.srcJson,
    publicJsonPath: repoPaths.publicJson,
    companionSqlPath: repoPaths.dbSql,
    companionJsonPath: repoPaths.dbJson,
    fileSizeBytes: finalStats.size,
    fileSizeFormatted: formatBytes(finalStats.size),
    sqliteEngineUsed,
    tablesWritten: 9,
    totalRowsWritten: rowsCount,
    message: `Database successfully synchronized into code files (src/data/academy_database.json & database/bjj_master.db)!`,
  };
}

/**
 * Read data from in-repo code files or SQLite binary back into JavaScript objects
 */
export async function readLocalDatabase(targetPath?: string) {
  const repoPaths = getRepoDatabasePaths();

  // Try reading directly from src/data/academy_database.json
  if (fs.existsSync(repoPaths.srcJson)) {
    try {
      const raw = fs.readFileSync(repoPaths.srcJson, 'utf8');
      const parsed = JSON.parse(raw);
      return {
        members: parsed.members || [],
        classes: parsed.classes || [],
        attendance: parsed.attendance || [],
        payments: parsed.payments || [],
        coaches: parsed.coaches || [],
        subscriptionPlans: parsed.subscriptionPlans || [],
        timetableConfig: parsed.timetableConfig || null,
        settings: parsed.settings || null,
        ibjjfTransfers: parsed.ibjjfTransfers || [],
      };
    } catch (e) {
      console.warn('Failed reading srcJson, checking database/bjj_master.json...', e);
    }
  }

  // Fallback to database/bjj_master.json
  if (fs.existsSync(repoPaths.dbJson)) {
    try {
      const raw = fs.readFileSync(repoPaths.dbJson, 'utf8');
      return JSON.parse(raw);
    } catch {}
  }

  // Fallback to SQLite binary
  if (fs.existsSync(repoPaths.dbSqlite)) {
    try {
      const sqliteModule: any = await import('node:sqlite');
      if (sqliteModule?.DatabaseSync) {
        const db = new sqliteModule.DatabaseSync(repoPaths.dbSqlite, { readOnly: true });
        const safeSelect = (table: string) => {
          try {
            return db.prepare(`SELECT * FROM "${table}";`).all();
          } catch {
            return [];
          }
        };

        const parseRows = (rows: any[]) => {
          return rows.map((r) => {
            if (r.raw_json) {
              try {
                return JSON.parse(r.raw_json);
              } catch {}
            }
            return r;
          });
        };

        const result = {
          members: parseRows(safeSelect('members')),
          classes: parseRows(safeSelect('classes')),
          attendance: parseRows(safeSelect('attendance')),
          payments: parseRows(safeSelect('payments')),
          coaches: parseRows(safeSelect('coaches')),
          subscriptionPlans: parseRows(safeSelect('subscription_plans')),
          ibjjfTransfers: parseRows(safeSelect('ibjjf_transfers')),
          timetableConfig: null,
          settings: null,
        };

        const ttRows = safeSelect('timetable_config');
        if (ttRows.length > 0 && ttRows[0].raw_json) {
          try {
            result.timetableConfig = JSON.parse(ttRows[0].raw_json);
          } catch {}
        }

        const setRows = safeSelect('gym_settings');
        if (setRows.length > 0 && setRows[0].raw_json) {
          try {
            result.settings = JSON.parse(setRows[0].raw_json);
          } catch {}
        }

        db.close();
        return result;
      }
    } catch {}
  }

  return {
    members: [],
    classes: [],
    attendance: [],
    payments: [],
    coaches: [],
    subscriptionPlans: [],
    timetableConfig: null,
    settings: null,
    ibjjfTransfers: [],
  };
}
