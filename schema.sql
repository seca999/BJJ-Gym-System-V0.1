-- =====================================================================
-- BJJ ACADEMY MANAGEMENT SYSTEM - SQLITE DATABASE SCHEMA & SEED DATA
-- Compatible with: DB Browser for SQLite, SQLiteStudio, DBeaver, SQLite3 CLI
-- =====================================================================

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------
-- 1. Drop existing tables if they exist
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS vw_coach_session_summary;
DROP VIEW IF EXISTS vw_student_roster;
DROP TABLE IF EXISTS timetable_cells;
DROP TABLE IF EXISTS timetable_slots;
DROP TABLE IF EXISTS timetable_mats;
DROP TABLE IF EXISTS timetable_board_config;
DROP TABLE IF EXISTS class_assistant_coaches;
DROP TABLE IF EXISTS attendance_records;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS promotions;
DROP TABLE IF EXISTS classes;
DROP TABLE IF EXISTS members;
DROP TABLE IF EXISTS coaches;
DROP TABLE IF EXISTS gym_settings;

-- =====================================================================
-- TABLE: gym_settings
-- =====================================================================
CREATE TABLE gym_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  gym_name TEXT NOT NULL DEFAULT 'Arte Suave BJJ Academy',
  slogan TEXT DEFAULT 'Where Technique Conquers Strength • Honor, Discipline & Respect',
  currency_symbol TEXT NOT NULL DEFAULT '$',
  default_coach TEXT DEFAULT 'Professor Lucas Silva (Black Belt)',
  low_class_warning_threshold INTEGER NOT NULL DEFAULT 2,
  logo_preset TEXT DEFAULT 'emblem-shield',
  logo_url TEXT,
  logo_width INTEGER DEFAULT 76,
  logo_height INTEGER DEFAULT 76,
  logo_border_radius INTEGER DEFAULT 12,
  logo_fit TEXT DEFAULT 'contain' CHECK (logo_fit IN ('contain', 'cover')),
  logo_border_width INTEGER DEFAULT 1,
  logo_border_color TEXT DEFAULT '#dc2626',
  logo_bg_color TEXT DEFAULT '#7f1d1d',
  show_emblem_fallback INTEGER DEFAULT 1,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
-- TABLE: coaches
-- =====================================================================
CREATE TABLE coaches (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  nickname TEXT,
  role TEXT NOT NULL DEFAULT 'BJJ Instructor',
  belt_rank TEXT NOT NULL DEFAULT 'Black',
  stripes INTEGER NOT NULL DEFAULT 0,
  avatar_url TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  specialties TEXT, -- JSON array string: e.g. ["Adults Gi", "No-Gi Submission"]
  pay_type TEXT NOT NULL DEFAULT 'per_class' CHECK (pay_type IN ('per_class', 'hourly', 'monthly_fixed', 'per_student')),
  rate REAL NOT NULL DEFAULT 45.00,
  student_bonus_threshold INTEGER DEFAULT 10,
  student_bonus_amount REAL DEFAULT 0.00,
  active INTEGER NOT NULL DEFAULT 1,
  hire_date TEXT,
  bio TEXT,
  notes TEXT,
  last_promotion_date TEXT,
  next_expected_promotion_date TEXT,
  promotion_notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_coaches_active ON coaches(active);
CREATE INDEX idx_coaches_belt ON coaches(belt_rank);

-- =====================================================================
-- TABLE: members (Students)
-- =====================================================================
CREATE TABLE members (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  age_group TEXT NOT NULL DEFAULT 'Adults' CHECK (age_group IN ('Kids', 'Teens', 'Adults')),
  belt_rank TEXT NOT NULL DEFAULT 'White',
  stripes INTEGER NOT NULL DEFAULT 0,
  avatar_url TEXT,
  membership_type TEXT NOT NULL DEFAULT 'class_pack' CHECK (membership_type IN ('class_pack', 'monthly_unlimited', 'single_dropin')),
  classes_total INTEGER NOT NULL DEFAULT 10,       -- -1 indicates unlimited monthly
  classes_remaining INTEGER NOT NULL DEFAULT 10,   -- Balance available for check-in
  membership_start_date TEXT NOT NULL,
  membership_end_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'warning', 'expired', 'frozen')),
  preferred_training TEXT NOT NULL DEFAULT 'Both' CHECK (preferred_training IN ('Gi', 'No-Gi', 'Both')),
  join_date TEXT NOT NULL,
  total_classes_attended INTEGER NOT NULL DEFAULT 0,
  last_attended_date TEXT,
  classes_required_for_next INTEGER DEFAULT 30,
  last_promotion_date TEXT,
  next_expected_promotion_date TEXT,
  promotion_notes TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relation TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_members_status ON members(status);
CREATE INDEX idx_members_age_group ON members(age_group);
CREATE INDEX idx_members_belt ON members(belt_rank);
CREATE INDEX idx_members_remaining ON members(classes_remaining);

-- =====================================================================
-- TABLE: promotions
-- =====================================================================
CREATE TABLE promotions (
  id TEXT PRIMARY KEY,
  target_id TEXT NOT NULL,
  target_name TEXT NOT NULL,
  target_type TEXT NOT NULL DEFAULT 'student' CHECK (target_type IN ('student', 'coach')),
  previous_belt TEXT NOT NULL,
  previous_stripes INTEGER NOT NULL DEFAULT 0,
  new_belt TEXT NOT NULL,
  new_stripes INTEGER NOT NULL DEFAULT 0,
  promotion_date TEXT NOT NULL,
  next_expected_date TEXT,
  promoted_by TEXT NOT NULL,
  classes_at_promotion INTEGER DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_promotions_target ON promotions(target_id, target_type);
CREATE INDEX idx_promotions_date ON promotions(promotion_date);

-- =====================================================================
-- TABLE: classes
-- =====================================================================
CREATE TABLE classes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Adults' CHECK (category IN ('Kids', 'Teens', 'Adults', 'All Levels')),
  type TEXT NOT NULL DEFAULT 'Gi',
  head_coach_id TEXT,
  head_coach_name TEXT,
  head_coach_rank TEXT,
  head_coach_phone TEXT,
  head_coach_email TEXT,
  time_summary TEXT DEFAULT '07:00 PM - 08:30 PM',
  days_of_week TEXT,       -- JSON array string: e.g. ["Sat", "Mon", "Wed"]
  day_schedule TEXT,       -- JSON object string: e.g. {"Saturday": "12:00 PM - 01:30 PM"}
  duration_minutes INTEGER DEFAULT 75,
  capacity INTEGER DEFAULT 30,
  room TEXT DEFAULT 'Main Dojo Mat A',
  description TEXT,
  eligible_age_min INTEGER DEFAULT 18,
  eligible_age_max INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (head_coach_id) REFERENCES coaches (id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX idx_classes_category ON classes(category);

-- =====================================================================
-- TABLE: class_assistant_coaches
-- =====================================================================
CREATE TABLE class_assistant_coaches (
  class_id TEXT NOT NULL,
  coach_id TEXT NOT NULL,
  role_title TEXT NOT NULL DEFAULT 'Assistant Coach',
  PRIMARY KEY (class_id, coach_id),
  FOREIGN KEY (class_id) REFERENCES classes (id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (coach_id) REFERENCES coaches (id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- =====================================================================
-- TABLE: attendance_records
-- =====================================================================
CREATE TABLE attendance_records (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  member_name TEXT NOT NULL,
  belt_rank TEXT NOT NULL,
  stripes INTEGER NOT NULL DEFAULT 0,
  check_in_date TEXT NOT NULL,
  check_in_time TEXT NOT NULL,
  day_of_week TEXT,
  class_id TEXT,
  class_name TEXT NOT NULL,
  class_category TEXT NOT NULL CHECK (class_category IN ('Kids', 'Teens', 'Adults', 'All Levels')),
  coach_name TEXT,
  coach_id TEXT,
  classes_remaining_after INTEGER NOT NULL,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members (id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes (id) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (coach_id) REFERENCES coaches (id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX idx_attendance_date ON attendance_records(check_in_date);
CREATE INDEX idx_attendance_member ON attendance_records(member_id);
CREATE INDEX idx_attendance_class ON attendance_records(class_id);
CREATE INDEX idx_attendance_coach ON attendance_records(coach_id);

-- =====================================================================
-- TABLE: payments
-- =====================================================================
CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  member_name TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT '$',
  payment_date TEXT NOT NULL,
  payment_time TEXT NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'Credit Card' CHECK (payment_method IN ('Credit Card', 'Cash', 'Bank Transfer / ACH', 'Zelle', 'Apple Pay', 'Other')),
  membership_package TEXT NOT NULL,
  classes_credited INTEGER NOT NULL DEFAULT 0,
  receipt_number TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Completed' CHECK (status IN ('Completed', 'Pending', 'Refunded')),
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members (id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX idx_payments_date ON payments(payment_date);
CREATE INDEX idx_payments_member ON payments(member_id);

-- =====================================================================
-- TABLE: timetable_mats
-- =====================================================================
CREATE TABLE timetable_mats (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  bg_color TEXT NOT NULL DEFAULT '#1e293b',
  text_color TEXT NOT NULL DEFAULT '#ffffff',
  display_order INTEGER NOT NULL DEFAULT 0
);

-- =====================================================================
-- TABLE: timetable_slots
-- =====================================================================
CREATE TABLE timetable_slots (
  id TEXT PRIMARY KEY,
  time_range TEXT NOT NULL,
  mat_id TEXT NOT NULL,
  label TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (mat_id) REFERENCES timetable_mats (id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX idx_slots_mat ON timetable_slots(mat_id);

-- =====================================================================
-- TABLE: timetable_cells
-- =====================================================================
CREATE TABLE timetable_cells (
  id TEXT PRIMARY KEY,
  slot_id TEXT NOT NULL,
  day TEXT NOT NULL CHECK (day IN ('SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI')),
  class_id TEXT,
  title TEXT NOT NULL,
  subtitle TEXT,
  instructor TEXT,
  mat_id TEXT NOT NULL,
  category TEXT DEFAULT 'Adults' CHECK (category IN ('Kids', 'Teens', 'Adults', 'All Levels')),
  custom_bg_color TEXT,
  custom_text_color TEXT,
  FOREIGN KEY (slot_id) REFERENCES timetable_slots (id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (mat_id) REFERENCES timetable_mats (id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes (id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX idx_cells_day ON timetable_cells(day);
CREATE INDEX idx_cells_slot ON timetable_cells(slot_id);

-- =====================================================================
-- TABLE: timetable_board_config
-- =====================================================================
CREATE TABLE timetable_board_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  header_center_text TEXT DEFAULT 'MAT 01 & MAT 02',
  header_sub_text TEXT DEFAULT 'MARTIAL ARTS TRAINING • WEEKLY MATBOARD SCHEDULE',
  left_logo_title TEXT DEFAULT 'ARTE SUAVE BJJ ACADEMY',
  right_logo_title TEXT DEFAULT 'IBJJF REGISTERED',
  footer_slogan TEXT DEFAULT 'MEET US AT THE MAT • RESPECT • DISCIPLINE • LEVERAGE',
  footer_phone TEXT DEFAULT '+1 (555) 299-8801',
  active_days TEXT -- JSON array string
);

-- =====================================================================
-- VIEWS
-- =====================================================================
CREATE VIEW vw_student_roster AS
SELECT 
  m.id,
  m.full_name,
  m.age_group,
  m.belt_rank,
  m.stripes,
  m.membership_type,
  m.classes_total,
  m.classes_remaining,
  m.status,
  m.total_classes_attended,
  m.last_attended_date,
  CASE 
    WHEN m.classes_remaining <= 0 THEN 'NO_CLASSES_LEFT'
    WHEN m.classes_remaining <= 2 THEN 'LOW_CLASSES_WARNING'
    ELSE 'GOOD_STANDING'
  END AS attendance_balance_alert
FROM members m;

CREATE VIEW vw_coach_session_summary AS
SELECT 
  c.id AS coach_id,
  c.full_name AS coach_name,
  c.role,
  c.pay_type,
  c.rate,
  COUNT(a.id) AS total_student_attendances,
  COUNT(DISTINCT (a.check_in_date || '_' || a.class_name)) AS distinct_sessions_taught
FROM coaches c
LEFT JOIN attendance_records a ON a.coach_id = c.id
GROUP BY c.id, c.full_name, c.role, c.pay_type, c.rate;

-- =====================================================================
-- SEED DATA
-- =====================================================================
INSERT OR REPLACE INTO gym_settings (id, gym_name, slogan, currency_symbol, default_coach, low_class_warning_threshold, logo_preset)
VALUES (1, 'Arte Suave BJJ Academy', 'Where Technique Conquers Strength • Honor, Discipline & Respect', '$', 'Professor Lucas Silva (Black Belt)', 2, 'emblem-shield');

INSERT OR REPLACE INTO timetable_board_config (id, header_center_text, header_sub_text, left_logo_title, right_logo_title, footer_slogan, footer_phone, active_days)
VALUES (1, 'MAT 01 & MAT 02', 'MARTIAL ARTS TRAINING • WEEKLY MATBOARD SCHEDULE', 'ARTE SUAVE BJJ ACADEMY', 'IBJJF REGISTERED', 'MEET US AT THE MAT • RESPECT • DISCIPLINE • LEVERAGE', '+1 (555) 299-8801', '["SAT", "SUN", "MON", "TUE", "WED", "THU", "FRI"]');

INSERT OR REPLACE INTO coaches (id, full_name, nickname, role, belt_rank, stripes, email, phone, specialties, pay_type, rate, student_bonus_threshold, student_bonus_amount, active, hire_date, bio)
VALUES
('coach-lucas', 'Lucas Silva', 'Professor Lucas', 'Head Professor & Academy Founder', 'Black', 3, 'lucas.silva@artesuave.bjj', '(555) 299-8801', '["Adults Gi", "Advanced Sparring", "No-Gi Submission Grappling"]', 'per_class', 55.00, 10, 3.00, 1, '2020-01-15', '3rd Degree Black Belt under Master Carlson Gracie lineage. 2x Pan American Gold Medalist.'),
('coach-marcos', 'Marcos Oliveira', 'Coach Marcos', 'Youth Program Director & Fundamentals Coach', 'Brown', 2, 'marcos.oliveira@artesuave.bjj', '(555) 344-9922', '["Kids BJJ", "Teens BJJ", "Youth Bullyproof", "Mat Discipline"]', 'per_class', 45.00, 8, 2.50, 1, '2022-03-01', 'Brown Belt instructor specializing in youth motor development and discipline.'),
('coach-camila', 'Camila Santos', 'Professora Camila', 'Senior Competition Coach', 'Black', 1, 'camila.santos@artesuave.bjj', '(555) 477-1133', '["Competition Sparring", "Guard Passing", "No-Gi Grappling"]', 'per_class', 50.00, 10, 3.00, 1, '2021-06-15', 'Black Belt competitor with extensive submission grappling background.'),
('coach-andre', 'Andre Santos', 'Coach Andre', 'Assistant Coach & Wrestling Specialist', 'Purple', 3, 'andre.santos@artesuave.bjj', '(555) 588-2244', '["Takedowns & Wrestling", "Leg Locks", "Youth Coaching"]', 'per_class', 35.00, 12, 2.00, 1, '2023-01-10', 'Former Collegiate Wrestler and active Purple Belt competitor.');

INSERT OR REPLACE INTO classes (id, title, category, type, head_coach_id, head_coach_name, head_coach_rank, head_coach_phone, head_coach_email, time_summary, days_of_week, day_schedule, duration_minutes, room, description, eligible_age_min, eligible_age_max)
VALUES
('cls-adults-gi', 'Adults BJJ (Gi & Sparring)', 'Adults', 'Gi', 'coach-lucas', 'Lucas Silva', 'Black Belt (3 Degrees)', '(555) 299-8801', 'lucas.silva@artesuave.bjj', '07:00 PM - 08:30 PM', '["Sat", "Mon", "Wed"]', '{"Saturday": "12:00 PM - 01:30 PM", "Monday": "07:00 PM - 08:30 PM", "Wednesday": "07:00 PM - 08:30 PM"}', 90, 'Main Dojo Mat A', 'Comprehensive Gi syllabus: guard retention, passing, submissions, and timed positional sparring.', 18, NULL),
('cls-kids-bjj', 'Kids BJJ (Ages 4-15)', 'Kids', 'Kids', 'coach-marcos', 'Marcos Oliveira', 'Brown Belt (2 Degrees)', '(555) 344-9922', 'marcos.oliveira@artesuave.bjj', '04:30 PM - 05:30 PM', '["Sun", "Tue", "Thu"]', '{"Sunday": "10:00 AM - 11:00 AM", "Tuesday": "04:30 PM - 05:30 PM", "Thursday": "04:30 PM - 05:30 PM"}', 60, 'Youth Mat B', 'Strict youth IBJJF syllabus: focus on agility, balance, takedowns, anti-bullying, and discipline.', 4, 15),
('cls-teens-bjj', 'Teens BJJ (Ages 16-17)', 'Teens', 'Fundamentals', 'coach-marcos', 'Marcos Oliveira', 'Brown Belt (2 Degrees)', '(555) 344-9922', 'marcos.oliveira@artesuave.bjj', '05:30 PM - 06:45 PM', '["Sun", "Tue", "Thu"]', '{"Sunday": "11:15 AM - 12:30 PM", "Tuesday": "05:30 PM - 06:45 PM", "Thursday": "05:30 PM - 06:45 PM"}', 75, 'Youth Mat B', 'Juvenile division training bridging youth and adult techniques with controlled sparring.', 16, 17),
('cls-nogi-submission', 'No-Gi Submission Grappling', 'Adults', 'No-Gi', 'coach-camila', 'Camila Santos', 'Black Belt (1 Degree)', '(555) 477-1133', 'camila.santos@artesuave.bjj', '06:00 PM - 07:15 PM', '["Tue", "Thu"]', '{"Tuesday": "06:00 PM - 07:15 PM", "Thursday": "06:00 PM - 07:15 PM"}', 75, 'Main Dojo Mat A', 'Modern No-Gi control, leg-lock systems, front headlocks, and submission chains.', 18, NULL),
('cls-wrestling-takedowns', 'Wrestling & Takedowns', 'Adults', 'Wrestling', 'coach-andre', 'Andre Santos', 'Purple Belt (3 Degrees)', '(555) 588-2244', 'andre.santos@artesuave.bjj', '06:00 PM - 07:00 PM', '["Mon", "Wed"]', '{"Monday": "06:00 PM - 07:00 PM", "Wednesday": "06:00 PM - 07:00 PM"}', 60, 'Main Dojo Mat A', 'Takedown fundamentals, underhooks, sprawl defense, and mat returns for Brazilian Jiu-Jitsu.', 18, NULL);

INSERT OR REPLACE INTO class_assistant_coaches (class_id, coach_id, role_title)
VALUES
('cls-adults-gi', 'coach-andre', 'Assistant Coach'),
('cls-kids-bjj', 'coach-andre', 'Youth Assistant Coach'),
('cls-nogi-submission', 'coach-andre', 'Assistant Coach');

INSERT OR REPLACE INTO timetable_mats (id, name, bg_color, text_color, display_order)
VALUES
('mat-1', 'MAT 01 (Main Dojo)', '#1c1917', '#facc15', 1),
('mat-2', 'MAT 02 (Youth / No-Gi)', '#1e293b', '#38bdf8', 2);

INSERT OR REPLACE INTO timetable_slots (id, time_range, mat_id, label, display_order)
VALUES
('slot-1', '7:00 - 8:00 AM', 'mat-1', 'Morning Session', 1),
('slot-2', '4:30 - 5:30 PM', 'mat-2', 'Youth Mat', 2),
('slot-3', '5:30 - 6:45 PM', 'mat-2', 'Teens Mat', 3),
('slot-4', '6:00 - 7:00 PM', 'mat-1', 'Wrestling / Takedowns', 4),
('slot-5', '7:00 - 8:30 PM', 'mat-1', 'Evening Main Class', 5);

INSERT OR REPLACE INTO timetable_cells (id, slot_id, day, class_id, title, subtitle, instructor, mat_id, category)
VALUES
('cell-1', 'slot-5', 'MON', 'cls-adults-gi', 'Adults BJJ (Gi & Sparring)', 'Gi • Main Dojo Mat A', 'Lucas Silva', 'mat-1', 'Adults'),
('cell-2', 'slot-5', 'WED', 'cls-adults-gi', 'Adults BJJ (Gi & Sparring)', 'Gi • Main Dojo Mat A', 'Lucas Silva', 'mat-1', 'Adults'),
('cell-3', 'slot-2', 'TUE', 'cls-kids-bjj', 'Kids BJJ (Ages 4-15)', 'Kids • Youth Mat B', 'Marcos Oliveira', 'mat-2', 'Kids'),
('cell-4', 'slot-2', 'THU', 'cls-kids-bjj', 'Kids BJJ (Ages 4-15)', 'Kids • Youth Mat B', 'Marcos Oliveira', 'mat-2', 'Kids'),
('cell-5', 'slot-3', 'TUE', 'cls-teens-bjj', 'Teens BJJ (Ages 16-17)', 'Fundamentals • Youth Mat B', 'Marcos Oliveira', 'mat-2', 'Teens');

INSERT OR REPLACE INTO members (id, full_name, email, phone, age_group, belt_rank, stripes, membership_type, classes_total, classes_remaining, membership_start_date, membership_end_date, status, preferred_training, join_date, total_classes_attended, last_attended_date, emergency_contact_name, emergency_contact_phone, emergency_contact_relation)
VALUES
('mem-1', 'Gabriel Ramos', 'gabriel.ramos@gmail.com', '(555) 234-5678', 'Adults', 'Blue', 2, 'class_pack', 10, 6, '2024-01-10', '2024-07-10', 'active', 'Both', '2023-03-15', 38, '2024-03-01', 'Elena Ramos', '(555) 234-9999', 'Spouse'),
('mem-2', 'Leo Tanaka', 'parent.tanaka@gmail.com', '(555) 345-6789', 'Kids', 'Yellow', 1, 'class_pack', 20, 14, '2024-02-01', '2024-08-01', 'active', 'Gi', '2023-08-20', 22, '2024-02-28', 'Ken Tanaka', '(555) 345-0000', 'Father'),
('mem-3', 'Maya Lin', 'maya.lin@student.org', '(555) 456-7890', 'Teens', 'Blue', 0, 'monthly_unlimited', -1, -1, '2024-01-01', '2024-12-31', 'active', 'Both', '2022-11-05', 74, '2024-03-02', 'David Lin', '(555) 456-1111', 'Father');

INSERT OR REPLACE INTO payments (id, member_id, member_name, amount, currency, payment_date, payment_time, payment_method, membership_package, classes_credited, receipt_number, status)
VALUES
('pay-1', 'mem-1', 'Gabriel Ramos', 150.00, '$', '2024-01-10', '14:20:00', 'Credit Card', '10 Class Punch Card', 10, 'RCP-2024-001', 'Completed'),
('pay-2', 'mem-2', 'Leo Tanaka', 220.00, '$', '2024-02-01', '10:15:00', 'Credit Card', '20 Class Youth Punch Card', 20, 'RCP-2024-002', 'Completed'),
('pay-3', 'mem-3', 'Maya Lin', 130.00, '$', '2024-01-01', '09:00:00', 'Bank Transfer / ACH', 'Monthly Unlimited', 0, 'RCP-2024-003', 'Completed');

INSERT OR REPLACE INTO attendance_records (id, member_id, member_name, belt_rank, stripes, check_in_date, check_in_time, day_of_week, class_id, class_name, class_category, coach_name, coach_id, classes_remaining_after)
VALUES
('att-1', 'mem-1', 'Gabriel Ramos', 'Blue', 2, '2024-03-01', '19:02:00', 'Friday', 'cls-adults-gi', 'Adults BJJ (Gi & Sparring)', 'Adults', 'Lucas Silva', 'coach-lucas', 6),
('att-2', 'mem-2', 'Leo Tanaka', 'Yellow', 1, '2024-02-28', '16:31:00', 'Wednesday', 'cls-kids-bjj', 'Kids BJJ (Ages 4-15)', 'Kids', 'Marcos Oliveira', 'coach-marcos', 14);

INSERT OR REPLACE INTO promotions (id, target_id, target_name, target_type, previous_belt, previous_stripes, new_belt, new_stripes, promotion_date, next_expected_date, promoted_by, classes_at_promotion, notes)
VALUES
('pro-1', 'mem-1', 'Gabriel Ramos', 'student', 'White', 4, 'Blue', 0, '2023-09-15', '2024-09-15', 'Professor Lucas Silva', 120, 'Awarded Blue Belt following solid guard retention and tournament participation.'),
('pro-2', 'mem-2', 'Leo Tanaka', 'student', 'Grey-Black', 4, 'Yellow-White', 0, '2023-12-10', '2024-06-10', 'Coach Marcos Oliveira', 65, 'Promoted to Yellow-White belt in youth IBJJF graduation ceremony.');
