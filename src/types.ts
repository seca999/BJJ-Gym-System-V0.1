// IBJJF Youth Belts for Kids (Ages 4-15)
export type YouthBeltRank = 
  | 'White'
  | 'Grey-White'
  | 'Grey'
  | 'Grey-Black'
  | 'Yellow-White'
  | 'Yellow'
  | 'Yellow-Black'
  | 'Orange-White'
  | 'Orange'
  | 'Orange-Black'
  | 'Green-White'
  | 'Green'
  | 'Green-Black';

// Juvenile Belts for Teens (Ages 16-17)
export type TeenBeltRank = 'White' | 'Blue' | 'Purple';

// Adult Belts (Ages 18+)
export type AdultBeltRank = 'White' | 'Blue' | 'Purple' | 'Brown' | 'Black';

// Full Belt Rank Union
export type BeltRank =
  | 'White'
  | 'Grey-White'
  | 'Grey'
  | 'Grey-Black'
  | 'Yellow-White'
  | 'Yellow'
  | 'Yellow-Black'
  | 'Orange-White'
  | 'Orange'
  | 'Orange-Black'
  | 'Green-White'
  | 'Green'
  | 'Green-Black'
  | 'Blue'
  | 'Purple'
  | 'Brown'
  | 'Black';

export type StripeCount = 0 | 1 | 2 | 3 | 4;

export type MembershipType = 'class_pack' | 'monthly_unlimited' | 'single_dropin';

export type MemberStatus = 'active' | 'warning' | 'expired' | 'frozen';

export type PaymentMethod = 'Credit Card' | 'Cash' | 'Cliq';

export interface EmergencyContact {
  name: string;
  phone: string;
  relation: string;
}

export type ClassCategory = 'Kids' | 'Teens' | 'Adults' | 'All Levels';
export type TrainingDay = 'Saturday' | 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';

export interface PromotionRecord {
  id: string;
  targetId: string;
  targetName: string;
  targetType: 'student' | 'coach';
  previousBelt: BeltRank;
  previousStripes: StripeCount;
  newBelt: BeltRank;
  newStripes: StripeCount;
  promotionDate: string; // YYYY-MM-DD
  nextExpectedDate?: string; // YYYY-MM-DD
  promotedBy: string; // e.g. "Professor Lucas Silva"
  notes?: string;
  classesAtPromotion?: number;
}

export interface Member {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  emergencyContact: EmergencyContact;
  emergencyName?: string;
  emergencyPhone?: string;
  emergencyRelation?: string;
  beltRank: BeltRank;
  stripes: StripeCount;
  avatar?: string;
  membershipType: MembershipType;
  classesTotal: number; // e.g. 10 or 20 for class_pack, -1 for unlimited
  classesRemaining: number; // current balance
  membershipStartDate: string; // YYYY-MM-DD
  membershipEndDate: string; // YYYY-MM-DD
  status: MemberStatus;
  notes: string;
  preferredTraining: 'Gi' | 'No-Gi' | 'Both';
  joinDate: string; // YYYY-MM-DD
  totalClassesAttended: number;
  lastAttendedDate?: string;
  ageGroup?: ClassCategory; // Kids, Teens, or Adults
  birthDate?: string; // YYYY-MM-DD
  age?: number; // Calculated or recorded chronological age
  lastPromotionDate?: string; // YYYY-MM-DD
  nextExpectedPromotionDate?: string; // YYYY-MM-DD
  classesRequiredForNext?: number; // target classes to next stripe/belt
  promotionNotes?: string;
  promotionHistory?: PromotionRecord[];
  isDeleted?: boolean;
}

export interface AttendanceRecord {
  id: string;
  memberId: string;
  memberName: string;
  beltRank: BeltRank;
  stripes: StripeCount;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  className: string;
  classCategory: ClassCategory; // 'Kids' | 'Teens' | 'Adults'
  category?: ClassCategory;
  timestamp?: number;
  coach: string;
  classesRemainingAfter: number;
  notes?: string;
  dayOfWeek?: string;
}

export interface PaymentRecord {
  id: string;
  memberId: string;
  memberName: string;
  amount: number;
  currency: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  paymentMethod: PaymentMethod;
  membershipPackage: string; // e.g., '10 Class Punch Card', 'Monthly Unlimited'
  classesCredited: number; // e.g. 10 or 0 for unlimited
  receiptNumber: string;
  status: 'Completed' | 'Pending' | 'Refunded';
  notes?: string;
}

export interface ClassCoachContact {
  id: string;
  fullName: string;
  role: 'Head Coach' | 'Assistant Coach';
  rank?: string;
  phone?: string;
  email?: string;
  avatar?: string;
}

export interface ClassSession {
  id: string;
  title: string;
  category: ClassCategory;
  time: string;
  type: 'Gi' | 'No-Gi' | 'Open Mat' | 'Kids' | 'Fundamentals' | 'Wrestling' | 'Morning' | string;
  coach: string; // Head coach display name
  headCoachId?: string;
  headCoachName?: string;
  headCoachRank?: string;
  headCoachPhone?: string;
  headCoachEmail?: string;
  assistantCoachIds?: string[];
  assistantCoaches?: ClassCoachContact[];
  daysOfWeek: string[]; // e.g., ['Sat', 'Mon', 'Wed'] or ['Sun', 'Tue'] etc.
  daySchedule?: {
    [day: string]: string | undefined;
  };
  durationMinutes?: number;
  capacity?: number;
  room?: string;
  description?: string;
  eligibleAgeMin?: number;
  eligibleAgeMax?: number;
}

export interface GymLogoSettings {
  url?: string; // image url or base64 data url
  preset?: string; // e.g. 'emblem-shield', 'kimono-crest', 'fierce-tiger', 'octagon'
  width: number; // width in pixels (32 to 160)
  height: number; // height in pixels (32 to 160)
  borderRadius: number; // in px: 0 (square), 8 (rounded), 16 (soft), 9999 (circle)
  fit: 'contain' | 'cover';
  borderWidth: number; // 0, 1, 2, 4
  borderColor: string; // hex
  padding: number; // 0, 2, 4, 8
  backgroundColor?: string;
  showEmblemFallback?: boolean;
  iconColor?: string; // hex color of emblem icon/fallback text
  zoom?: number; // Zoom level in percentage (e.g., 50 to 250)
}


export interface HeaderBannerSettings {
  enabled?: boolean;
  url?: string; // image url or base64 data url from upload
  height?: number; // banner height in px (e.g. 80 to 400)
  bannerWidth?: 'full' | 'behind_logo' | 'custom'; // coverage area
  customWidthPercent?: number; // 20% to 100%
  opacity?: number; // 0.1 to 1.0
  blur?: number; // 0 to 20px
  positionX?: number; // 0% to 100% horizontal object position
  positionY?: number; // 0% to 100% vertical object position
  fit?: 'cover' | 'contain' | 'fill';
  overlayDarkness?: number; // 0% to 90% dark gradient overlay for text readability
  zoom?: number; // Zoom level in percentage for background picture (e.g., 100 to 300)
}

export interface GymSettings {
  gymName: string;
  slogan: string;
  currencySymbol: string;
  defaultCoach: string;
  lowClassWarningThreshold: number; // e.g. 2 classes left
  taxRate?: number;
  logo?: GymLogoSettings;
  headerBanner?: HeaderBannerSettings;
  gymNameColor?: string; // Color for gym name text
  gymNameFontSize?: number; // Font size in px for school name (e.g. 18 to 72)
  sloganColor?: string; // Color for slogan text
  sloganFontSize?: number; // Font size in px for slogan (e.g. 12 to 28)
  brandingAlignment?: 'left' | 'center' | 'right'; // move text left, right or center
  brandingVerticalOffset?: number; // move text up or down (in pixels)
  brandingHorizontalOffset?: number; // move text left or right relative to container (in pixels)
  logoAlignment?: 'left' | 'center' | 'right'; // move logo left, right or center
  logoVerticalOffset?: number; // move logo up or down (in pixels)
  logoHorizontalOffset?: number; // move logo left or right relative to container (in pixels)
}


export type CoachPayType = 'per_class' | 'hourly' | 'monthly_fixed' | 'per_student';

export interface Coach {
  id: string;
  fullName: string;
  nickname?: string;
  role: string;
  beltRank: BeltRank;
  stripes: StripeCount;
  avatar?: string;
  email: string;
  phone: string;
  specialty: string[];
  payType: CoachPayType;
  rate: number; // e.g. $45 per class, $35/hr, or $2000 fixed
  studentBonusThreshold?: number; // e.g. if attendance > 10 students
  studentBonusAmount?: number; // e.g. $2 per student exceeding threshold
  active: boolean;
  hireDate?: string;
  bio?: string;
  notes?: string;
  lastPromotionDate?: string; // YYYY-MM-DD
  nextExpectedPromotionDate?: string; // YYYY-MM-DD
  promotionNotes?: string;
  promotionHistory?: PromotionRecord[];
  isDeleted?: boolean;
}

export interface CoachSessionItem {
  date: string;
  time: string;
  dayOfWeek?: string;
  className: string;
  classCategory: ClassCategory;
  studentCount: number;
  basePay: number;
  bonusPay: number;
  totalPay: number;
  attendanceIds: string[];
}

export interface CoachSalarySummary {
  coach: Coach;
  sessionsCount: number;
  totalStudentsTaught: number;
  averageClassSize: number;
  baseEarnings: number;
  bonusEarnings: number;
  totalEarnings: number;
  sessions: CoachSessionItem[];
}

export type TimetableDay = 'SAT' | 'SUN' | 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI';

export interface TimetableMat {
  id: string; // e.g., 'mat-1', 'mat-2'
  name: string; // e.g., 'MAT 01', 'MAT 02'
  bgColor: string; // hex
  textColor: string; // hex
}

export interface TimetableSlot {
  id: string;
  timeRange: string; // e.g. '7:00-8:00 AM', '4:20-5:20 PM'
  matId: string; // which mat this row represents
  label?: string; // optional row label
}

export interface TimetableCell {
  id: string;
  slotId: string;
  day: TimetableDay;
  title: string; // e.g. 'BJJ Kids Beginner'
  subtitle?: string; // e.g. 'Kids1+ Kids2' or '7:00-8:00 AM'
  instructor?: string; // e.g. 'Ismat'
  matId: string;
  category?: ClassCategory;
  customBgColor?: string; // optional override
  customTextColor?: string;
}

export interface TimetableConfig {
  headerCenterText: string; // e.g. 'MAT 05'
  headerSubText: string; // e.g. 'MARTIAL ARTS TRAINING'
  leftLogoTitle: string; // e.g. 'SAMY AL-JAMAL BRAZILIAN JIU-JITSU'
  rightLogoTitle: string; // e.g. 'FIT JIU-JITSU'
  footerSlogan: string; // e.g. 'MEET US AT THE MAT'
  footerPhone: string; // e.g. '+962 79 628 0505'
  days: TimetableDay[];
  mats: TimetableMat[];
  slots: TimetableSlot[];
  cells: TimetableCell[];
  timeSlots?: string[];
  entries?: any[];
}

// --- SUBSCRIPTION & PRICING PLANS ---
export interface SubscriptionPlan {
  id: string;
  name: string; // e.g., 'Kids 8 Classes / Month', 'Adults Unlimited'
  category: ClassCategory; // 'Kids' | 'Teens' | 'Adults' | 'All Levels'
  classesCount: number; // 8, 12, or -1 for Unlimited
  price: number; // e.g., 65, 85, 110, 145
  currency?: string;
  billingPeriod: 'monthly' | 'quarterly' | 'annual' | 'punch_card';
  durationDays: number; // e.g., 30, 90, 365
  description?: string;
  features?: string[];
  active: boolean;
  isPopular?: boolean;
}

// --- ACADEMY EXPENSES & OUTFLOWS ---
export type ExpenseCategory =
  | 'Utilities (Water & Electricity)'
  | 'Rent & Facility Lease'
  | 'Coach Salaries & Payroll'
  | 'Maintenance & Cleaning'
  | 'Equipment & Mat Upgrades'
  | 'Gear & Merchandise Inventory'
  | 'Marketing & Software Subscriptions'
  | 'Taxes, Insurance & Legal'
  | 'Other / Miscellaneous';

export interface ExpenseRecord {
  id: string;
  title: string; // e.g. 'Electricity & AC Bill - Sept', 'Water Bill', 'Mat Sanitizer Refill'
  category: ExpenseCategory;
  amount: number;
  currency: string;
  date: string; // YYYY-MM-DD
  paymentMethod: PaymentMethod;
  recipientOrVendor?: string; // e.g., 'Electric Utility Corp', 'CleanMat Supplies'
  invoiceRef?: string; // e.g., 'INV-2026-904'
  status: 'Paid' | 'Pending' | 'Scheduled';
  notes?: string;
  isRecurring?: boolean;
  recurringInterval?: 'monthly' | 'quarterly' | 'yearly';
  coachId?: string; // optional link to a Coach profile for salary disbursements
}

// --- IBJJF AGE DIVISION AUTO-TRANSFERS ---
export interface IBJJFTransferRecord {
  id: string;
  memberId: string;
  memberName: string;
  previousCategory: ClassCategory;
  newCategory: ClassCategory;
  age: number;
  birthDate: string;
  previousBelt: BeltRank;
  newBelt: BeltRank;
  transferDate: string; // YYYY-MM-DD
  reason: string;
}

// --- SYSTEM USERS & AUTHENTICATION ---
export type UserRole = 'admin' | 'manager' | 'staff';

export interface SystemUser {
  id: string;
  username: string;
  passwordHash: string;
  salt: string;
  fullName: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  lastLogin?: string;
}

