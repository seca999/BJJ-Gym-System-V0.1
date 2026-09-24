-- =====================================================================
-- BJJ ACADEMY MANAGEMENT SYSTEM - MYSQL / MARIADB / CLOUD SQL SCHEMA
-- =====================================================================

CREATE DATABASE IF NOT EXISTS `bjj_academy` 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE `bjj_academy`;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `timetable_cells`;
DROP TABLE IF EXISTS `timetable_slots`;
DROP TABLE IF EXISTS `timetable_mats`;
DROP TABLE IF EXISTS `timetable_board_config`;
DROP TABLE IF EXISTS `class_assistant_coaches`;
DROP TABLE IF EXISTS `attendance_records`;
DROP TABLE IF EXISTS `payments`;
DROP TABLE IF EXISTS `promotions`;
DROP TABLE IF EXISTS `classes`;
DROP TABLE IF EXISTS `members`;
DROP TABLE IF EXISTS `coaches`;
DROP TABLE IF EXISTS `gym_settings`;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE `gym_settings` (
  `id` INT NOT NULL DEFAULT 1,
  `gym_name` VARCHAR(150) NOT NULL DEFAULT 'Arte Suave BJJ Academy',
  `slogan` VARCHAR(255) DEFAULT 'Where Technique Conquers Strength • Honor, Discipline & Respect',
  `currency_symbol` VARCHAR(10) NOT NULL DEFAULT '$',
  `default_coach` VARCHAR(150) DEFAULT 'Professor Lucas Silva (Black Belt)',
  `low_class_warning_threshold` INT NOT NULL DEFAULT 2,
  `logo_preset` VARCHAR(50) DEFAULT 'emblem-shield',
  `logo_url` TEXT,
  `logo_width` INT DEFAULT 76,
  `logo_height` INT DEFAULT 76,
  `logo_border_radius` INT DEFAULT 12,
  `logo_fit` ENUM('contain', 'cover') DEFAULT 'contain',
  `logo_border_width` INT DEFAULT 1,
  `logo_border_color` VARCHAR(20) DEFAULT '#dc2626',
  `logo_bg_color` VARCHAR(20) DEFAULT '#7f1d1d',
  `show_emblem_fallback` BOOLEAN DEFAULT TRUE,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `coaches` (
  `id` VARCHAR(64) NOT NULL,
  `full_name` VARCHAR(150) NOT NULL,
  `nickname` VARCHAR(100),
  `role` VARCHAR(150) NOT NULL DEFAULT 'BJJ Instructor',
  `belt_rank` ENUM(
    'White', 'Grey-White', 'Grey', 'Grey-Black',
    'Yellow-White', 'Yellow', 'Yellow-Black',
    'Orange-White', 'Orange', 'Orange-Black',
    'Green-White', 'Green', 'Green-Black',
    'Blue', 'Purple', 'Brown', 'Black'
  ) NOT NULL DEFAULT 'Black',
  `stripes` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `avatar_url` VARCHAR(500),
  `email` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(50),
  `specialties` JSON,
  `pay_type` ENUM('per_class', 'hourly', 'monthly_fixed', 'per_student') NOT NULL DEFAULT 'per_class',
  `rate` DECIMAL(10, 2) NOT NULL DEFAULT 45.00,
  `student_bonus_threshold` INT DEFAULT 10,
  `student_bonus_amount` DECIMAL(10, 2) DEFAULT 0.00,
  `active` BOOLEAN NOT NULL DEFAULT TRUE,
  `hire_date` DATE,
  `bio` TEXT,
  `notes` TEXT,
  `last_promotion_date` DATE,
  `next_expected_promotion_date` DATE,
  `promotion_notes` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_coaches_active` (`active`),
  INDEX `idx_coaches_belt` (`belt_rank`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `members` (
  `id` VARCHAR(64) NOT NULL,
  `full_name` VARCHAR(150) NOT NULL,
  `email` VARCHAR(150),
  `phone` VARCHAR(50),
  `age_group` ENUM('Kids', 'Teens', 'Adults') NOT NULL DEFAULT 'Adults',
  `belt_rank` ENUM(
    'White', 'Grey-White', 'Grey', 'Grey-Black',
    'Yellow-White', 'Yellow', 'Yellow-Black',
    'Orange-White', 'Orange', 'Orange-Black',
    'Green-White', 'Green', 'Green-Black',
    'Blue', 'Purple', 'Brown', 'Black'
  ) NOT NULL DEFAULT 'White',
  `stripes` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `avatar_url` VARCHAR(500),
  `membership_type` ENUM('class_pack', 'monthly_unlimited', 'single_dropin') NOT NULL DEFAULT 'class_pack',
  `classes_total` INT NOT NULL DEFAULT 10,
  `classes_remaining` INT NOT NULL DEFAULT 10,
  `membership_start_date` DATE NOT NULL,
  `membership_end_date` DATE NOT NULL,
  `status` ENUM('active', 'warning', 'expired', 'frozen') NOT NULL DEFAULT 'active',
  `preferred_training` ENUM('Gi', 'No-Gi', 'Both') NOT NULL DEFAULT 'Both',
  `join_date` DATE NOT NULL,
  `total_classes_attended` INT UNSIGNED NOT NULL DEFAULT 0,
  `last_attended_date` DATE,
  `classes_required_for_next` INT DEFAULT 30,
  `last_promotion_date` DATE,
  `next_expected_promotion_date` DATE,
  `promotion_notes` TEXT,
  `emergency_contact_name` VARCHAR(150),
  `emergency_contact_phone` VARCHAR(50),
  `emergency_contact_relation` VARCHAR(100),
  `notes` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_members_status` (`status`),
  INDEX `idx_members_age_group` (`age_group`),
  INDEX `idx_members_belt` (`belt_rank`),
  INDEX `idx_members_remaining` (`classes_remaining`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `promotions` (
  `id` VARCHAR(64) NOT NULL,
  `target_id` VARCHAR(64) NOT NULL,
  `target_name` VARCHAR(150) NOT NULL,
  `target_type` ENUM('student', 'coach') NOT NULL DEFAULT 'student',
  `previous_belt` VARCHAR(50) NOT NULL,
  `previous_stripes` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `new_belt` VARCHAR(50) NOT NULL,
  `new_stripes` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `promotion_date` DATE NOT NULL,
  `next_expected_date` DATE,
  `promoted_by` VARCHAR(150) NOT NULL,
  `classes_at_promotion` INT DEFAULT 0,
  `notes` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_promotions_target` (`target_id`, `target_type`),
  INDEX `idx_promotions_date` (`promotion_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `classes` (
  `id` VARCHAR(64) NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `category` ENUM('Kids', 'Teens', 'Adults', 'All Levels') NOT NULL DEFAULT 'Adults',
  `type` VARCHAR(100) NOT NULL DEFAULT 'Gi',
  `head_coach_id` VARCHAR(64),
  `head_coach_name` VARCHAR(150),
  `head_coach_rank` VARCHAR(50),
  `head_coach_phone` VARCHAR(50),
  `head_coach_email` VARCHAR(150),
  `time_summary` VARCHAR(100) DEFAULT '07:00 PM - 08:30 PM',
  `days_of_week` JSON,
  `day_schedule` JSON,
  `duration_minutes` INT DEFAULT 75,
  `capacity` INT DEFAULT 30,
  `room` VARCHAR(100) DEFAULT 'Main Dojo Mat A',
  `description` TEXT,
  `eligible_age_min` INT DEFAULT 18,
  `eligible_age_max` INT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_classes_category` (`category`),
  CONSTRAINT `fk_classes_head_coach` FOREIGN KEY (`head_coach_id`) 
    REFERENCES `coaches` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `class_assistant_coaches` (
  `class_id` VARCHAR(64) NOT NULL,
  `coach_id` VARCHAR(64) NOT NULL,
  `role_title` VARCHAR(100) NOT NULL DEFAULT 'Assistant Coach',
  PRIMARY KEY (`class_id`, `coach_id`),
  CONSTRAINT `fk_cac_class` FOREIGN KEY (`class_id`) 
    REFERENCES `classes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cac_coach` FOREIGN KEY (`coach_id`) 
    REFERENCES `coaches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `attendance_records` (
  `id` VARCHAR(64) NOT NULL,
  `member_id` VARCHAR(64) NOT NULL,
  `member_name` VARCHAR(150) NOT NULL,
  `belt_rank` VARCHAR(50) NOT NULL,
  `stripes` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `check_in_date` DATE NOT NULL,
  `check_in_time` TIME NOT NULL,
  `day_of_week` VARCHAR(20),
  `class_id` VARCHAR(64),
  `class_name` VARCHAR(150) NOT NULL,
  `class_category` ENUM('Kids', 'Teens', 'Adults', 'All Levels') NOT NULL,
  `coach_name` VARCHAR(150),
  `coach_id` VARCHAR(64),
  `classes_remaining_after` INT NOT NULL,
  `notes` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_attendance_date` (`check_in_date`),
  INDEX `idx_attendance_member` (`member_id`),
  INDEX `idx_attendance_class` (`class_id`),
  INDEX `idx_attendance_coach` (`coach_id`),
  CONSTRAINT `fk_att_member` FOREIGN KEY (`member_id`) 
    REFERENCES `members` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_att_class` FOREIGN KEY (`class_id`) 
    REFERENCES `classes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_att_coach` FOREIGN KEY (`coach_id`) 
    REFERENCES `coaches` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `payments` (
  `id` VARCHAR(64) NOT NULL,
  `member_id` VARCHAR(64) NOT NULL,
  `member_name` VARCHAR(150) NOT NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `currency` VARCHAR(10) NOT NULL DEFAULT '$',
  `payment_date` DATE NOT NULL,
  `payment_time` TIME NOT NULL,
  `payment_method` ENUM(
    'Credit Card', 'Cash', 'Bank Transfer / ACH', 'Zelle', 'Apple Pay', 'Other'
  ) NOT NULL DEFAULT 'Credit Card',
  `membership_package` VARCHAR(150) NOT NULL,
  `classes_credited` INT NOT NULL DEFAULT 0,
  `receipt_number` VARCHAR(50) NOT NULL,
  `status` ENUM('Completed', 'Pending', 'Refunded') NOT NULL DEFAULT 'Completed',
  `notes` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_receipt_number` (`receipt_number`),
  INDEX `idx_payments_date` (`payment_date`),
  INDEX `idx_payments_member` (`member_id`),
  CONSTRAINT `fk_pay_member` FOREIGN KEY (`member_id`) 
    REFERENCES `members` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `timetable_mats` (
  `id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `bg_color` VARCHAR(20) NOT NULL DEFAULT '#1e293b',
  `text_color` VARCHAR(20) NOT NULL DEFAULT '#ffffff',
  `display_order` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `timetable_slots` (
  `id` VARCHAR(64) NOT NULL,
  `time_range` VARCHAR(100) NOT NULL,
  `mat_id` VARCHAR(64) NOT NULL,
  `label` VARCHAR(100),
  `display_order` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  INDEX `idx_slots_mat` (`mat_id`),
  CONSTRAINT `fk_slots_mat` FOREIGN KEY (`mat_id`) 
    REFERENCES `timetable_mats` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `timetable_cells` (
  `id` VARCHAR(64) NOT NULL,
  `slot_id` VARCHAR(64) NOT NULL,
  `day` ENUM('SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI') NOT NULL,
  `class_id` VARCHAR(64),
  `title` VARCHAR(150) NOT NULL,
  `subtitle` VARCHAR(150),
  `instructor` VARCHAR(150),
  `mat_id` VARCHAR(64) NOT NULL,
  `category` ENUM('Kids', 'Teens', 'Adults', 'All Levels') DEFAULT 'Adults',
  `custom_bg_color` VARCHAR(20),
  `custom_text_color` VARCHAR(20),
  PRIMARY KEY (`id`),
  INDEX `idx_cells_day` (`day`),
  INDEX `idx_cells_slot` (`slot_id`),
  CONSTRAINT `fk_cells_slot` FOREIGN KEY (`slot_id`) 
    REFERENCES `timetable_slots` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cells_mat` FOREIGN KEY (`mat_id`) 
    REFERENCES `timetable_mats` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cells_class` FOREIGN KEY (`class_id`) 
    REFERENCES `classes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `timetable_board_config` (
  `id` INT NOT NULL DEFAULT 1,
  `header_center_text` VARCHAR(150) DEFAULT 'MAT 01 & MAT 02',
  `header_sub_text` VARCHAR(255) DEFAULT 'MARTIAL ARTS TRAINING • WEEKLY MATBOARD SCHEDULE',
  `left_logo_title` VARCHAR(150) DEFAULT 'ARTE SUAVE BJJ ACADEMY',
  `right_logo_title` VARCHAR(150) DEFAULT 'IBJJF REGISTERED',
  `footer_slogan` VARCHAR(255) DEFAULT 'MEET US AT THE MAT • RESPECT • DISCIPLINE • LEVERAGE',
  `footer_phone` VARCHAR(100) DEFAULT '+1 (555) 299-8801',
  `active_days` JSON,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
