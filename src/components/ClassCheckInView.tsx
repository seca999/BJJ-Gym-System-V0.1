import React, { useState, useMemo } from 'react';
import { addAuditLog } from '../utils/auditLogger';
import { 
  Calendar, 
  Clock, 
  Users, 
  User,
  UserCheck, 
  Check, 
  Search, 
  Filter, 
  Edit3, 
  Plus, 
  Award, 
  AlertCircle, 
  RotateCcw, 
  ChevronRight, 
  ChevronLeft,
  ChevronDown,
  CalendarDays,
  CalendarRange,
  CheckCircle2, 
  Sparkles,
  Flame,
  Shield,
  Layers,
  MapPin,
  CalendarCheck2,
  Trash2,
  CreditCard,
  UserPlus,
  ArrowRight,
  X,
  Phone,
  Mail,
  ShieldAlert,
  Lock,
  Info,
  UserX,
  CheckCircle,
  AlertTriangle,
  BookOpen,
  Tag,
  Crosshair,
  Copy
} from 'lucide-react';
import { Member, ClassSession, AttendanceRecord, Coach, ClassCategory, TimetableConfig, TimetableDay } from '../types';
import { BeltBadge, checkStudentClassEligibility, ClassEligibilityCheck } from '../utils/bjjBelts';
import { EditClassModal } from './EditClassModal';
import { MatVisionAttendanceModal } from './MatVisionAttendanceModal';
import { getMatboardClassesForDay, resolveTimetableDay, TIMETABLE_DAY_TO_FULL } from '../utils/matboardSchedule';
import { parseTimeToMinutes, parseSlotStartMinutes, parseSlotEndMinutes, getJordanCurrentMinutes } from '../utils/timeUtils';
import {
  GymWeek,
  GymDayInfo,
  generate52WeeksForYear,
  findWeekForDate,
  formatDateToISO,
  parseISODate,
  getTodayDateStr,
  getRelativeDateLabel,
  MONTH_NAMES_SHORT,
  MONTH_NAMES_FULL,
} from '../utils/weekUtils';

interface ClassCheckInViewProps {
  theme?: 'dark' | 'light';
  classes: ClassSession[];
  timetableConfig?: TimetableConfig;
  members: Member[];
  attendance: AttendanceRecord[];
  coaches: Coach[];
  onCheckIn: (
    memberId: string,
    className: string,
    coach: string,
    category?: ClassCategory,
    dateStr?: string
  ) => { success: boolean; message: string; remainingAfter: number };
  onUndoCheckIn: (attendanceId: string) => void;
  onSaveClass: (savedClass: ClassSession) => void;
  onDeleteClass: (classId: string) => void;
  onSelectMember?: (member: Member) => void;
  onOpenPaymentForMember?: (memberId: string) => void;
  onOpenSubscriptionPlans?: () => void;
  initialClassId?: string | null;
  initialSubSection?: 'group' | 'vip';
  onSubSectionChange?: (sub: 'group' | 'vip') => void;
}

// Sound feedback for check-in using Web Audio API
const TRAINING_DAYS: { full: string; short: string }[] = [
  { full: 'Saturday', short: 'Sat' },
  { full: 'Sunday', short: 'Sun' },
  { full: 'Monday', short: 'Mon' },
  { full: 'Tuesday', short: 'Tue' },
  { full: 'Wednesday', short: 'Wed' },
  { full: 'Thursday', short: 'Thu' },
];

function playCheckInChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {
    // Ignore audio error
  }
}

// Error buzzer sound for blocked student
function playBlockBuzzer() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, ctx.currentTime); // A3
    osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.25);

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {
    // Ignore audio error
  }
}

export const ClassCheckInView: React.FC<ClassCheckInViewProps> = ({
  theme = 'dark',
  classes,
  timetableConfig,
  members,
  attendance,
  coaches,
  onCheckIn,
  onUndoCheckIn,
  onSaveClass,
  onDeleteClass,
  onSelectMember,
  onOpenPaymentForMember,
  onOpenSubscriptionPlans,
  initialClassId,
  initialSubSection,
  onSubSectionChange,
}) => {
  const isLight = theme === 'light';

  // Section switcher: 'group' for scheduled mat classes, 'vip' for private 1-on-1 sessions
  const [activeSection, setActiveSection] = useState<'group' | 'vip'>(initialSubSection || 'group');
  const [vipStudentSearch, setVipStudentSearch] = useState('');
  const [isMatVisionModalOpen, setIsMatVisionModalOpen] = useState(false);

  const handleSwitchSection = (sub: 'group' | 'vip') => {
    setActiveSection(sub);
    onSubSectionChange?.(sub);
  };

  React.useEffect(() => {
    if (initialSubSection) {
      setActiveSection(initialSubSection);
    }
  }, [initialSubSection]);

  // Current date in local time
  const todayStr = useMemo(() => getTodayDateStr(), []);
  const initialYear = useMemo(() => parseISODate(todayStr).getFullYear(), [todayStr]);

  const [selectedYear, setSelectedYear] = useState<number>(initialYear);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Generate all 52 (or 53) weeks of the selected year
  const allWeeks = useMemo(() => {
    return generate52WeeksForYear(selectedYear, todayStr);
  }, [selectedYear, todayStr]);

  // Find initial current week in the active year
  const currentWeekObj = useMemo(() => {
    return allWeeks.find((w) => w.isCurrentWeek) || allWeeks[0];
  }, [allWeeks]);

  const [selectedWeekNumber, setSelectedWeekNumber] = useState<number>(() => {
    const found = generate52WeeksForYear(initialYear, todayStr).find((w) => w.isCurrentWeek);
    return found ? found.weekNumber : 1;
  });

  // Active selected week object
  const activeWeek: GymWeek = useMemo(() => {
    return allWeeks.find((w) => w.weekNumber === selectedWeekNumber) || allWeeks[0] || currentWeekObj;
  }, [allWeeks, selectedWeekNumber, currentWeekObj]);

  // Day filter tabs: 'TODAY' or 'ALL' or specific day name ('Saturday', 'Sunday', etc.)
  const [activeDayFilter, setActiveDayFilter] = useState<string>('TODAY');

  // Real-time ticking clock for session countdowns/status
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const todayTimetableDay = useMemo(() => resolveTimetableDay(todayStr), [todayStr]);
  const liveTodayDayFull = useMemo(() => TIMETABLE_DAY_TO_FULL[todayTimetableDay] || 'Today', [todayTimetableDay]);

  // 52-Week Selector Modal State
  const [is52WeeksModalOpen, setIs52WeeksModalOpen] = useState(false);
  const [weekSearchQuery, setWeekSearchQuery] = useState('');
  const [weekMonthFilter, setWeekMonthFilter] = useState<string>('ALL');

  // Compute selected day info with future/past status
  const selectedDayInfo = useMemo(() => {
    const d = parseISODate(selectedDate);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const shortNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayIdx = d.getDay();
    const isToday = selectedDate === todayStr;
    const isFuture = selectedDate > todayStr;
    const isPast = selectedDate < todayStr;
    const relativeLabel = getRelativeDateLabel(selectedDate, todayStr);

    return {
      dayIdx,
      dayFull: dayNames[dayIdx],
      dayShort: shortNames[dayIdx],
      isToday,
      isFuture,
      isPast,
      relativeLabel,
    };
  }, [selectedDate, todayStr]);

  // Handlers for Week Navigation
  const handleSelectWeek = (week: GymWeek, targetDayName?: string) => {
    setSelectedWeekNumber(week.weekNumber);
    if (week.isCurrentWeek) {
      setSelectedDate(todayStr);
      setActiveDayFilter('TODAY');
    } else {
      const match = week.days.find((d) => d.dayFull === targetDayName) || week.days[0];
      setSelectedDate(match.dateStr);
      setActiveDayFilter(match.dayFull);
    }
    setIs52WeeksModalOpen(false);
  };

  const handlePrevWeek = () => {
    if (selectedWeekNumber > 1) {
      const prev = allWeeks.find((w) => w.weekNumber === selectedWeekNumber - 1);
      if (prev) handleSelectWeek(prev, activeDayFilter === 'TODAY' ? selectedDayInfo.dayFull : activeDayFilter);
    } else {
      // Transition to previous year's last week
      const prevYear = selectedYear - 1;
      const prevYearWeeks = generate52WeeksForYear(prevYear, todayStr);
      const lastWeek = prevYearWeeks[prevYearWeeks.length - 1];
      setSelectedYear(prevYear);
      setSelectedWeekNumber(lastWeek.weekNumber);
      setSelectedDate(lastWeek.days[0].dateStr);
      setActiveDayFilter(lastWeek.days[0].dayFull);
    }
  };

  const handleNextWeek = () => {
    if (selectedWeekNumber < allWeeks.length) {
      const next = allWeeks.find((w) => w.weekNumber === selectedWeekNumber + 1);
      if (next) handleSelectWeek(next, activeDayFilter === 'TODAY' ? selectedDayInfo.dayFull : activeDayFilter);
    } else {
      // Transition to next year's first week
      const nextYear = selectedYear + 1;
      const nextYearWeeks = generate52WeeksForYear(nextYear, todayStr);
      const firstWeek = nextYearWeeks[0];
      setSelectedYear(nextYear);
      setSelectedWeekNumber(firstWeek.weekNumber);
      setSelectedDate(firstWeek.days[0].dateStr);
      setActiveDayFilter(firstWeek.days[0].dayFull);
    }
  };

  const handleJumpToCurrentWeek = () => {
    const today = parseISODate(todayStr);
    const currY = today.getFullYear();
    if (selectedYear !== currY) {
      setSelectedYear(currY);
    }
    const currWeeks = currY === selectedYear ? allWeeks : generate52WeeksForYear(currY, todayStr);
    const curr = currWeeks.find((w) => w.isCurrentWeek) || currWeeks[0];
    setSelectedWeekNumber(curr.weekNumber);
    setSelectedDate(todayStr);
    setActiveDayFilter('TODAY');
    setIs52WeeksModalOpen(false);
  };

  const handleSelectDay = (day: GymDayInfo) => {
    setSelectedDate(day.dateStr);
    setActiveDayFilter(day.dayFull);
  };

  const handleDateInputChange = (newDateStr: string) => {
    if (!newDateStr) return;
    const d = parseISODate(newDateStr);
    const y = d.getFullYear();
    if (y !== selectedYear) {
      setSelectedYear(y);
      const newWeeks = generate52WeeksForYear(y, todayStr);
      const match = findWeekForDate(newDateStr, newWeeks);
      if (match) setSelectedWeekNumber(match.weekNumber);
    } else {
      const match = findWeekForDate(newDateStr, allWeeks);
      if (match) setSelectedWeekNumber(match.weekNumber);
    }
    setSelectedDate(newDateStr);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    setActiveDayFilter(dayNames[d.getDay()]);
  };

  // Filtered weeks for the 52-weeks modal/drawer
  const filtered52Weeks = useMemo(() => {
    return allWeeks.filter((w) => {
      // Month filter
      if (weekMonthFilter !== 'ALL' && !w.monthLabel.toLowerCase().startsWith(weekMonthFilter.toLowerCase())) {
        return false;
      }
      // Search query
      if (weekSearchQuery.trim()) {
        const q = weekSearchQuery.toLowerCase();
        const matchesWeek = `week ${w.weekNumber}`.includes(q) || `w${w.weekNumber}`.includes(q) || `${w.weekNumber}` === q;
        const matchesLabel = w.label.toLowerCase().includes(q);
        const matchesMonth = w.monthLabel.toLowerCase().includes(q);
        const matchesDates = w.days.some((d) => d.dateStr.includes(q) || `${d.monthShort} ${d.dayOfMonth}`.toLowerCase().includes(q));
        return matchesWeek || matchesLabel || matchesMonth || matchesDates;
      }
      return true;
    });
  }, [allWeeks, weekMonthFilter, weekSearchQuery]);

  // Currently selected class for active check-in
  const [selectedClassId, setSelectedClassId] = useState<string | null>(initialClassId || null);

  React.useEffect(() => {
    if (initialClassId) {
      setSelectedClassId(initialClassId);
    }
  }, [initialClassId]);

  // Search & Filters for adding students
  const [studentSearch, setStudentSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'Adults' | 'Teens' | 'Kids'>('ALL');
  const [eligibilityFilter, setEligibilityFilter] = useState<'ALL' | 'ELIGIBLE_ONLY' | 'INELIGIBLE_ONLY'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'NOT_CHECKED_IN' | 'CHECKED_IN' | 'LOW_BALANCE'>('ALL');

  // Multi-select for batch check-in
  const [batchSelectedIds, setBatchSelectedIds] = useState<string[]>([]);
  const [checkInFeedback, setCheckInFeedback] = useState<{ memberName: string; remaining: number; action?: 'checkin' | 'refund' } | null>(null);
  const [copiedStudentId, setCopiedStudentId] = useState<string | null>(null);

  const handleCopyName = (e: React.MouseEvent, fullName: string, targetId: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(fullName);
    setCopiedStudentId(targetId);
    setTimeout(() => {
      setCopiedStudentId((prev) => (prev === targetId ? null : prev));
    }, 1800);
  };

  // Modal for explaining ineligibility reason
  const [ineligibleModalInfo, setIneligibleModalInfo] = useState<{
    studentName: string;
    studentBelt: string;
    studentAgeGroup: string;
    classTitle: string;
    classCategory: string;
    reason: string;
  } | null>(null);

  // Class Edit Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [classToEdit, setClassToEdit] = useState<ClassSession | null>(null);
  const [classToDelete, setClassToDelete] = useState<ClassSession | null>(null);

  // Private 1-on-1 Classes & 121 Personal Training State
  const [isPrivateModalOpen, setIsPrivateModalOpen] = useState(false);
  const [privateStudentId, setPrivateStudentId] = useState('');
  const [privateCoachName, setPrivateCoachName] = useState('');
  const [privateFocus, setPrivateFocus] = useState('');
  const [privateTime, setPrivateTime] = useState('14:00');
  const [privateStudentSearch, setPrivateStudentSearch] = useState('');

  // Filter attendance records that belong to Private 1-on-1 sessions
  const privateAttendanceRecords = useMemo(() => {
    return attendance.filter((a) => {
      const isPriv =
        a.className.toLowerCase().includes('private') ||
        a.className.toLowerCase().includes('1:1') ||
        a.className.toLowerCase().includes('121') ||
        a.className.toLowerCase().includes('vip') ||
        a.notes?.toLowerCase().includes('private') ||
        a.notes?.toLowerCase().includes('vip');
      return isPriv;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [attendance]);

  const privateAttendanceForSelectedDate = useMemo(() => {
    return privateAttendanceRecords.filter((a) => a.date === selectedDate);
  }, [privateAttendanceRecords, selectedDate]);

  const handleRecordPrivateSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!privateStudentId) {
      alert('Please select a student for the private 1-on-1 session.');
      return;
    }
    const student = members.find((m) => m.id === privateStudentId);
    if (!student) return;

    const coachToUse = privateCoachName || (coaches.find((c) => c.active)?.fullName || 'Head Coach');
    const topicToUse = privateFocus.trim() || 'Personal 1-on-1 Technique Lesson';
    const dateToUse = selectedDate || todayStr;

    const res = onCheckIn(
      student.id,
      `Private 1:1 Session (${topicToUse})`,
      coachToUse,
      student.ageGroup || 'Adults',
      dateToUse
    );

    playCheckInChime();
    setCheckInFeedback({
      memberName: student.fullName,
      remaining: res.remainingAfter,
      action: 'checkin',
    });

    setIsPrivateModalOpen(false);
    setPrivateStudentId('');
    setPrivateFocus('');
    setPrivateStudentSearch('');
  };

  // Active Day of Week: strictly resolved to TimetableDay ('SAT' | 'SUN' | 'MON' | ...)
  const activeDayOfWeek: TimetableDay = useMemo(() => {
    if (activeDayFilter && activeDayFilter !== 'TODAY' && activeDayFilter !== 'ALL') {
      return resolveTimetableDay(activeDayFilter);
    }
    return resolveTimetableDay(selectedDate || todayStr);
  }, [activeDayFilter, selectedDate, todayStr]);

  const currentDayName = useMemo(() => {
    return TIMETABLE_DAY_TO_FULL[activeDayOfWeek] || selectedDayInfo.dayFull || 'Today';
  }, [activeDayOfWeek, selectedDayInfo]);

  // STAGE 1 LOGIC: Matboard is the official reference for what is scheduled each day!
  const rawMatboardClassesForDay = useMemo(() => {
    return getMatboardClassesForDay(activeDayOfWeek, timetableConfig, classes, coaches);
  }, [activeDayOfWeek, timetableConfig, classes, coaches]);

  // Group classes: strictly non-VIP classes
  const groupClassesForDay = useMemo(() => {
    return rawMatboardClassesForDay.filter((c) => {
      if (c.isVip || c.type === 'VIP') return false;
      const matched = classes.find(
        (rc) => rc.id === (c as any).registeredClassId || rc.id === c.id
      );
      if (matched?.isVip || matched?.type === 'VIP') return false;
      return true;
    });
  }, [rawMatboardClassesForDay, classes]);

  // VIP classes: strictly VIP 121 classes for this day (from matboard or registered classes matching this day)
  const vipClassesForDay = useMemo(() => {
    const dayFull = currentDayName.toLowerCase();
    const dayShort = selectedDayInfo.dayShort.toLowerCase();
    const dayCode = activeDayOfWeek.toLowerCase();

    // From matboard
    const fromMatboard = rawMatboardClassesForDay
      .filter((c) => {
        if (c.isVip || c.type === 'VIP') return true;
        const matched = classes.find(
          (rc) => rc.id === (c as any).registeredClassId || rc.id === c.id
        );
        return Boolean(matched?.isVip || matched?.type === 'VIP');
      })
      .map((c) => ({ ...c, isVip: true, type: 'VIP' }));

    // From registered classes matching this day
    const fromRegistered: ClassSession[] = [];
    classes.forEach((rc) => {
      if (!rc.isVip && rc.type !== 'VIP') return;
      const days = (rc.daysOfWeek || []).map((d) => d.toLowerCase());
      const hasDay =
        days.includes(dayFull) ||
        days.includes(dayShort) ||
        days.includes(dayCode) ||
        (rc.daySchedule &&
          Object.keys(rc.daySchedule).some((k) => k.toLowerCase() === dayFull || k.toLowerCase() === dayShort));

      const alreadyOnMatboard = fromMatboard.some(
        (mc) => (mc as any).registeredClassId === rc.id || mc.id === rc.id
      );
      if (hasDay && !alreadyOnMatboard) {
        fromRegistered.push({
          ...rc,
          id: rc.id,
          isVip: true,
          type: 'VIP',
        });
      }
    });

    return [...fromMatboard, ...fromRegistered];
  }, [rawMatboardClassesForDay, classes, currentDayName, selectedDayInfo, activeDayOfWeek]);

  // Active classes for check-in: strictly group classes in Group section, VIP in VIP section
  const classesForDay = activeSection === 'vip' ? vipClassesForDay : groupClassesForDay;

  // Set initial selected class if none is selected, strictly from classesForDay
  React.useEffect(() => {
    if (classesForDay.length === 0) {
      setSelectedClassId(null);
    } else if (!selectedClassId || !classesForDay.some((c) => c.id === selectedClassId)) {
      // Support matching by registeredClassId if navigated with a canonical class ID
      const matchByRegistered = classesForDay.find(
        (c) => (c as any).registeredClassId === selectedClassId
      );
      if (matchByRegistered) {
        setSelectedClassId(matchByRegistered.id);
      } else {
        setSelectedClassId(classesForDay[0].id);
      }
    }
  }, [classesForDay, selectedClassId]);

  const selectedClass = useMemo(() => {
    if (classesForDay.length === 0) return null;
    return (
      classesForDay.find((c) => c.id === selectedClassId) ||
      classesForDay.find((c) => (c as any).registeredClassId === selectedClassId) ||
      classesForDay[0] ||
      null
    );
  }, [classesForDay, selectedClassId]);

  // Filter attendance records for selectedDate and selectedClass
  const attendeesForClass = useMemo(() => {
    if (!selectedClass) return [];
    return attendance.filter(
      (a) =>
        a.date === selectedDate &&
        (a.className.toLowerCase() === selectedClass.title.toLowerCase() ||
          (a.notes &&
            (a.notes.includes(selectedClass.id) ||
              ((selectedClass as any).registeredClassId &&
                a.notes.includes((selectedClass as any).registeredClassId)))))
    );
  }, [attendance, selectedDate, selectedClass]);

  const checkedInMemberIds = useMemo(() => {
    return new Set(attendeesForClass.map((a) => a.memberId));
  }, [attendeesForClass]);

  // Filter & Smart-Sort students for the check-in list
  const filteredStudents = useMemo(() => {
    const list = members.filter((m) => {
      if (m.isDeleted) return false;

      // Category match
      if (categoryFilter !== 'ALL' && m.ageGroup !== categoryFilter) {
        return false;
      }

      // Check-in status filter
      const isChecked = checkedInMemberIds.has(m.id);
      if (statusFilter === 'NOT_CHECKED_IN' && isChecked) return false;
      if (statusFilter === 'CHECKED_IN' && !isChecked) return false;
      if (statusFilter === 'LOW_BALANCE') {
        const isUnlimited = m.membershipType === 'monthly_unlimited';
        if (isUnlimited || m.classesRemaining > 2) return false;
      }

      // Eligibility filter
      if (selectedClass) {
        const eligibility = checkStudentClassEligibility(m, selectedClass);
        if (eligibilityFilter === 'ELIGIBLE_ONLY' && !eligibility.isEligible) return false;
        if (eligibilityFilter === 'INELIGIBLE_ONLY' && eligibility.isEligible) return false;
      }

      // Search match
      if (studentSearch.trim()) {
        const q = studentSearch.toLowerCase();
        const matchesName = m.fullName.toLowerCase().includes(q);
        const matchesBelt = m.beltRank.toLowerCase().includes(q);
        const matchesPhone = m.phone.toLowerCase().includes(q);
        if (!matchesName && !matchesBelt && !matchesPhone) return false;
      }

      return true;
    });

    if (!selectedClass) {
      return list.sort((a, b) => a.fullName.localeCompare(b.fullName));
    }

    // Smart Sorting when checking into a specific class:
    // 1. Eligible students first, Ineligible / Blocked students at the bottom
    // 2. Exact class division match boost (e.g., Kids in Kids Class, Adults in Adult Class)
    // 3. Unchecked students above checked-in students
    // 4. Alphabetical by full name
    return list.sort((a, b) => {
      const eligA = checkStudentClassEligibility(a, selectedClass);
      const eligB = checkStudentClassEligibility(b, selectedClass);

      if (eligA.isEligible && !eligB.isEligible) return -1;
      if (!eligA.isEligible && eligB.isEligible) return 1;

      const categoryMatchA = a.ageGroup === selectedClass.category;
      const categoryMatchB = b.ageGroup === selectedClass.category;
      if (categoryMatchA && !categoryMatchB) return -1;
      if (!categoryMatchA && categoryMatchB) return 1;

      const checkedA = checkedInMemberIds.has(a.id);
      const checkedB = checkedInMemberIds.has(b.id);
      if (!checkedA && checkedB) return -1;
      if (checkedA && !checkedB) return 1;

      return a.fullName.localeCompare(b.fullName);
    });
  }, [members, categoryFilter, eligibilityFilter, statusFilter, studentSearch, checkedInMemberIds, selectedClass]);

  // Check In Handler with strict eligibility enforcement
  const handleStudentCheckIn = (member: Member) => {
    if (!selectedClass) return;

    // Strict validation
    const eligibility = checkStudentClassEligibility(member, selectedClass);
    if (!eligibility.isEligible) {
      playBlockBuzzer();
      setIneligibleModalInfo({
        studentName: member.fullName,
        studentBelt: member.beltRank,
        studentAgeGroup: member.ageGroup || 'Adults',
        classTitle: selectedClass.title,
        classCategory: selectedClass.category,
        reason: eligibility.reason || 'This student does not meet IBJJF age or belt requirements for this class.',
      });
      return;
    }

    playCheckInChime();
    const res = onCheckIn(
      member.id,
      selectedClass.title,
      selectedClass.coach,
      selectedClass.category,
      selectedDate
    );

    if (res.success) {
      setCheckInFeedback({
        memberName: member.fullName,
        remaining: res.remainingAfter,
      });
      setTimeout(() => setCheckInFeedback(null), 3500);
    }
  };

  // Batch Check In Handler
  const handleBatchCheckIn = () => {
    if (!selectedClass || batchSelectedIds.length === 0) return;

    let checkedCount = 0;
    let blockedCount = 0;

    batchSelectedIds.forEach((id) => {
      const mem = members.find((m) => m.id === id);
      if (mem && !checkedInMemberIds.has(id)) {
        const eligibility = checkStudentClassEligibility(mem, selectedClass);
        if (eligibility.isEligible) {
          onCheckIn(mem.id, selectedClass.title, selectedClass.coach, selectedClass.category, selectedDate);
          checkedCount++;
        } else {
          blockedCount++;
        }
      }
    });

    if (checkedCount > 0) {
      playCheckInChime();
      setBatchSelectedIds([]);
      setCheckInFeedback({
        memberName: `${checkedCount} Students`,
        remaining: 0,
      });
      setTimeout(() => setCheckInFeedback(null), 3500);
    }

    if (blockedCount > 0) {
      alert(`${blockedCount} student(s) could not be checked in due to strict IBJJF age or belt requirements.`);
    }
  };

  // Get specific time for selected day
  const getClassTimeForCurrentDay = (c: ClassSession) => {
    // If the class comes from the matboard with a scheduled time range, prioritize that time
    if (c.time && c.time !== 'Scheduled') {
      return c.time;
    }
    const day = activeDayFilter === 'TODAY' ? selectedDayInfo.dayFull : activeDayFilter;
    if (c.daySchedule && c.daySchedule[day]) {
      return c.daySchedule[day];
    }
    return c.time;
  };

  // Helper for badge color by class type
  const getClassTypeColor = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('wrestl')) {
      return 'bg-stone-800 text-stone-200 border-stone-700';
    }
    if (t.includes('morning')) {
      return 'bg-sky-950 text-sky-300 border-sky-800/90';
    }
    if (t.includes('no-gi')) {
      return 'bg-purple-950 text-purple-300 border-purple-800/90';
    }
    if (t.includes('sparring') || t.includes('comp')) {
      return 'bg-red-950 text-red-300 border-red-800/90';
    }
    if (t.includes('kids')) {
      return 'bg-emerald-950 text-emerald-300 border-emerald-800/90';
    }
    return 'bg-stone-800 text-stone-200 border-stone-700';
  };

  // Check live session status for today's classes
  const getSessionStatus = (timeStr: string) => {
    if (!timeStr) return { status: 'SCHEDULED', label: 'Scheduled', badgeClass: 'bg-stone-800 text-stone-300' };

    const startMinutes = parseSlotStartMinutes(timeStr);
    const endMinutes = parseSlotEndMinutes(timeStr);
    const { totalMinutes: currentMinutes } = getJordanCurrentMinutes(currentTime);

    if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
      const remainingMinutes = endMinutes - currentMinutes;
      return {
        status: 'IN_SESSION',
        label: `In Session (${remainingMinutes}m left)`,
        badgeClass: 'bg-emerald-950 text-emerald-300 border-emerald-600/80 animate-pulse',
      };
    } else if (currentMinutes < startMinutes) {
      const minUntil = startMinutes - currentMinutes;
      const hours = Math.floor(minUntil / 60);
      const mins = minUntil % 60;
      const timeLabel = hours > 0 ? `Starts in ${hours}h ${mins}m` : `Starts in ${mins}m`;
      return {
        status: 'UPCOMING',
        label: timeLabel,
        badgeClass: 'bg-stone-800 text-stone-300 border-stone-600/70',
      };
    } else {
      const elapsed = currentMinutes - endMinutes;
      const hours = Math.floor(elapsed / 60);
      const mins = elapsed % 60;
      const elapsedLabel = hours > 0 ? `Concluded ${hours}h ${mins}m ago` : `Concluded ${mins}m ago`;
      return {
        status: 'COMPLETED',
        label: elapsedLabel,
        badgeClass: 'bg-stone-850 text-stone-400 border-stone-700/60',
      };
    }
  };

  // Find attendance for any class on the selected date
  const getClassRosterCount = (classItem: ClassSession) => {
    return attendance.filter(
      (a) =>
        a.date === selectedDate &&
        (a.className.toLowerCase() === classItem.title.toLowerCase() ||
          (classItem.id && a.notes?.includes(classItem.id)) ||
          ((classItem as any).registeredClassId && a.notes?.includes((classItem as any).registeredClassId)))
    ).length;
  };

  return (
    <div className="space-y-6">
      {/* Top Header Bar: Date Selector & Quick Indicators */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        {/* Row 1: Title, Session Badge, and Academy Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <CalendarCheck2 className="w-5 h-5 text-red-500" />
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Mat Attendance & Class Check-In
              </h1>
            </div>
          </div>

          {/* Action Buttons: Manage Classes & Subscription Plans */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Tap-Less Mat Vision Attendance Kiosk */}
            <button
              type="button"
              onClick={() => setIsMatVisionModalOpen(true)}
              className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black inline-flex items-center gap-1.5 transition-all shadow-md hover:shadow-lg active:scale-95 cursor-pointer"
              title="Open AI Face Recognition & Mat ROI Vision Attendance Kiosk"
            >
              <Crosshair className="w-4 h-4 text-emerald-200 animate-pulse" />
              <span>🥋 Tap-Less Mat Vision Kiosk</span>
            </button>

            {/* Manage Classes */}
            <button
              type="button"
              onClick={() => {
                setClassToEdit(null);
                setIsEditModalOpen(true);
              }}
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-sm hover:shadow-md cursor-pointer"
              title="View all academy classes, edit schedules & coaches, or add new classes"
            >
              <BookOpen className="w-4 h-4" />
              <span>Manage Classes</span>
            </button>

            {/* Subscription Plans & Pricing */}
            {onOpenSubscriptionPlans && (
              <button
                type="button"
                onClick={onOpenSubscriptionPlans}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-sm hover:shadow-md cursor-pointer ${
                  isLight
                    ? 'bg-stone-800 hover:bg-stone-900 text-white border border-stone-700'
                    : 'bg-stone-800 hover:bg-stone-750 text-stone-200 hover:text-white border border-stone-700'
                }`}
                title="Edit 8-class, 12-class, and Unlimited subscription plans for Kids, Teens, and Adults"
              >
                <Tag className="w-4 h-4 text-red-400" />
                <span>Subscription Plans & Pricing</span>
              </button>
            )}
          </div>
        </div>

        {/* Section Switcher Tabs: Separated Mat Check-in vs Dedicated VIP 121 Section */}
        <div className={`pt-3 border-t flex items-center justify-between gap-3 flex-wrap ${
          isLight ? 'border-stone-200' : 'border-stone-800/80'
        }`}>
          <div className={`flex items-center gap-2 p-1.5 border rounded-2xl w-full sm:w-auto shadow-inner ${
            isLight ? 'bg-stone-100 border-stone-200' : 'bg-stone-950/90 border border-stone-800'
          }`}>
            <button
              type="button"
              onClick={() => handleSwitchSection('group')}
              className={`flex-1 sm:flex-initial px-5 py-2 rounded-xl font-black text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeSection === 'group'
                  ? 'bg-red-600 text-white shadow-md'
                  : isLight
                  ? 'text-stone-700 hover:text-stone-950 hover:bg-stone-200/80 font-bold'
                  : 'text-stone-400 hover:text-white hover:bg-stone-900 font-bold'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Group Classes</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
                activeSection === 'group'
                  ? 'bg-black/30 text-white'
                  : isLight
                  ? 'bg-stone-200 text-stone-800'
                  : 'bg-black/40 text-white'
              }`}>
                {groupClassesForDay.length} Classes
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchSection('vip')}
              className={`flex-1 sm:flex-initial px-5 py-2 rounded-xl font-black text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeSection === 'vip'
                  ? 'bg-red-700 text-white shadow-md font-black'
                  : isLight
                  ? 'text-stone-800 bg-stone-100 hover:bg-stone-200 border border-stone-300 font-bold'
                  : 'text-stone-300 hover:text-white hover:bg-stone-850 border border-stone-700 font-bold'
              }`}
            >
              <Sparkles className={`w-4 h-4 ${activeSection === 'vip' ? 'text-white fill-current' : 'text-red-400 fill-current'}`} />
              <span>VIP 121 Section</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
                activeSection === 'vip'
                  ? 'bg-black/40 text-white'
                  : isLight
                  ? 'bg-stone-200 text-stone-800 border border-stone-300 font-bold'
                  : 'bg-stone-900 text-stone-300 border border-stone-800'
              }`}>
                {vipClassesForDay.length} Scheduled • {privateAttendanceForSelectedDate.length} Today
              </span>
            </button>
          </div>

          <div className={`text-xs font-medium ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
            {activeSection === 'group' ? (
              <span>Viewing: <strong className={isLight ? 'text-stone-900' : 'text-white'}>Group Classes Timetable & Roster</strong></span>
            ) : (
              <span className={isLight ? 'text-red-900 font-bold' : 'text-red-400 font-bold'}>Viewing: VIP 1:1 Hub</span>
            )}
          </div>
        </div>

        {/* Row 2: Training Days Navigation Bar (Matboard Reference) - Only in Group Section */}
        {activeSection === 'group' && (
          <div className={`pt-3 border-t flex items-center justify-between gap-2 flex-wrap ${
            isLight ? 'border-stone-200' : 'border-stone-800/80'
          }`}>
          <div className="flex items-center gap-1 text-xs font-semibold">
            <CalendarDays className={`w-3.5 h-3.5 ${isLight ? 'text-stone-700' : 'text-red-400'}`} />
            <span className={`text-[11px] uppercase tracking-wider font-bold ${isLight ? 'text-stone-800' : 'text-stone-300'}`}>Schedule Day (Matboard):</span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {(['SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI'] as TimetableDay[]).map((d) => {
              const isSelected = activeDayOfWeek === d;
              const isLiveToday = resolveTimetableDay(todayStr) === d;
              const dayClasses = getMatboardClassesForDay(d, timetableConfig, classes, coaches);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setActiveDayFilter(TIMETABLE_DAY_TO_FULL[d]);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    isSelected
                      ? 'bg-red-600 text-white shadow-md'
                      : isLight
                      ? 'bg-stone-100 text-stone-700 hover:text-stone-950 hover:bg-stone-200 border border-stone-200 font-semibold'
                      : 'bg-stone-950 text-stone-400 hover:text-white hover:bg-stone-800 border border-stone-800'
                  }`}
                >
                  <span>{TIMETABLE_DAY_TO_FULL[d]}</span>
                  {isLiveToday && (
                    <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-black uppercase ${
                      isSelected ? 'bg-black/30 text-white' : isLight ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      Today
                    </span>
                  )}
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : dayClasses.length > 0
                        ? isLight
                          ? 'bg-stone-200 text-stone-900 border border-stone-300'
                          : 'bg-stone-800 text-stone-300'
                        : isLight
                        ? 'bg-stone-200 text-stone-500'
                        : 'bg-stone-900 text-stone-600'
                    }`}
                    title={`${dayClasses.length} sessions on Matboard for ${TIMETABLE_DAY_TO_FULL[d]}`}
                  >
                    {dayClasses.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        )}
      </div>

      {/* GROUP CLASSES MAT CHECK-IN SECTION */}
      {activeSection === 'group' && (
        <div className="space-y-6">
          {/* TODAY'S & SELECTED DAY'S CLASSES GALLERY (MATBOARD SINGLE SOURCE OF TRUTH) */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-800/80">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-red-950/80 border border-red-800/80 flex items-center justify-center text-red-400">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                <span>{selectedDayInfo.isToday ? "Today's Scheduled Classes" : `${currentDayName}'s Scheduled Classes`}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 font-bold border border-stone-700">
                  {classesForDay.length} {classesForDay.length === 1 ? 'Session' : 'Sessions'}
                </span>
              </h2>
            </div>
          </div>
          <p className="text-xs text-stone-400">
            {selectedDayInfo.isToday ? (
              <span>Select any class below to activate its live roster and check students in:</span>
            ) : (
              <span>Viewing timetable for <strong className="text-white">{currentDayName} ({selectedDate})</strong></span>
            )}
          </p>
        </div>

        {classesForDay.length === 0 ? (
          <div className="p-6 rounded-xl bg-stone-950/60 border border-dashed border-stone-800 text-center flex flex-col items-center justify-center">
            <CalendarDays className="w-8 h-8 text-stone-600 mb-2" />
            <h4 className="text-sm font-bold text-white mb-0.5">No Classes Scheduled for {currentDayName}</h4>
            <p className="text-xs text-stone-400 max-w-sm mb-3">
              The Academy Matboard has no sessions programmed on this day. Mats are open for open drilling or rest.
            </p>
            {liveTodayDayFull !== currentDayName && (
              <button
                type="button"
                onClick={() => {
                  setSelectedDate(todayStr);
                  setActiveDayFilter('TODAY');
                }}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Switch to Today ({liveTodayDayFull})
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {classesForDay.map((classItem) => {
              const isSelected = selectedClass?.id === classItem.id;
              const sessionTime = getClassTimeForCurrentDay(classItem);
              const sessionStatus = selectedDayInfo.isToday ? getSessionStatus(sessionTime) : null;
              const rosterCount = getClassRosterCount(classItem);
              
              // Resolve coach
              const assignedCoach = coaches.find(
                (c) => !c.isDeleted && (c.id === classItem.headCoachId || (classItem.headCoachName && c.fullName.toLowerCase() === classItem.headCoachName.toLowerCase()) || (classItem.coach && c.fullName.toLowerCase() === classItem.coach.toLowerCase()))
              );

              return (
                <div
                  key={classItem.id}
                  onClick={() => setSelectedClassId(classItem.id)}
                  className={`group relative rounded-xl p-3.5 border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-gradient-to-b from-stone-900 to-red-950/30 border-red-500 shadow-md ring-2 ring-red-500/20'
                      : 'bg-stone-950/80 hover:bg-stone-950 border-stone-800 hover:border-stone-700'
                  }`}
                >
                  <div>
                    {/* Top Row: Time & Live Status */}
                    <div className="flex items-center justify-between gap-1.5 mb-2">
                      <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-white bg-stone-900 px-2 py-0.5 rounded-md border border-stone-800">
                        <Clock className="w-3 h-3 text-red-500 shrink-0" />
                        <span>{sessionTime || 'TBA'}</span>
                      </div>

                      {sessionStatus ? (
                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${sessionStatus.badgeClass}`}>
                          {sessionStatus.label}
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-900 text-stone-400 border border-stone-800 font-semibold">
                          {classItem.category}
                        </span>
                      )}
                    </div>

                    {/* Class Title */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className={`text-sm font-black transition-colors ${
                          isSelected ? 'text-white' : 'text-stone-200 group-hover:text-white'
                        }`}>
                          {classItem.title}
                        </h3>
                        <div className="flex items-center gap-1.5 text-[11px] text-stone-400 mt-0.5 flex-wrap">
                          <span className="text-red-400 font-semibold">{classItem.type || 'Gi'}</span>
                          <span className="text-stone-600">•</span>
                          <span className={
                            classItem.category === 'Kids'
                              ? 'text-emerald-400 font-semibold'
                              : classItem.category === 'Teens'
                              ? 'text-blue-400 font-semibold'
                              : 'text-stone-300 font-medium'
                          }>
                            {classItem.category}
                          </span>
                          {classItem.room && (
                            <>
                              <span className="text-stone-600">•</span>
                              <span className="text-stone-400 text-[10px]">{classItem.room}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {isSelected && (
                        <span className="shrink-0 px-2 py-0.5 rounded-md bg-red-600 text-white font-bold text-[10px] uppercase tracking-wider shadow-xs">
                          Active
                        </span>
                      )}
                    </div>

                    {/* Coach Info */}
                    <div className="mt-3 pt-2.5 border-t border-stone-900 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-5 h-5 rounded-full bg-stone-800 text-stone-300 font-bold text-[9px] flex items-center justify-center border border-stone-700 shrink-0">
                          <User className="w-3 h-3 text-stone-400" />
                        </div>
                        <span className="text-stone-300 font-medium text-[11px] truncate">
                          {classItem.headCoachName || classItem.coach || 'Head Coach'}
                        </span>
                      </div>

                      {assignedCoach?.beltRank && (
                        <BeltBadge belt={assignedCoach.beltRank} stripes={assignedCoach.stripes || 0} size="sm" />
                      )}
                    </div>
                  </div>

                  {/* Card Bottom: Check-In Status & Action */}
                  <div className="mt-3 pt-2.5 border-t border-stone-900/80 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[11px] text-stone-400">
                      <Users className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="font-bold text-white">{rosterCount}</span>
                      <span>checked in</span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedClassId(classItem.id);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1 ${
                        isSelected
                          ? 'bg-red-600 text-white shadow-xs'
                          : 'bg-stone-850 hover:bg-red-600 text-stone-300 hover:text-white border border-stone-750 hover:border-red-600'
                      }`}
                    >
                      <UserCheck className="w-3 h-3" />
                      <span>{isSelected ? 'Checking In' : 'Select Class'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ACTIVE CLASS CHECK-IN STATION */}
      {selectedClass ? (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-2xl">
          {/* Feedback banner if checked in or refunded */}
          {checkInFeedback && (
            <div className={`px-4 py-2.5 border-b text-xs sm:text-sm font-semibold flex items-center justify-between animate-fadeIn ${
              checkInFeedback.action === 'refund'
                ? 'bg-blue-950/90 border-blue-800 text-blue-200'
                : checkInFeedback.remaining < 0
                ? 'bg-red-950/90 border-red-800 text-red-200'
                : 'bg-emerald-950/80 border-emerald-800 text-emerald-200'
            }`}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className={`w-4 h-4 shrink-0 ${checkInFeedback.action === 'refund' ? 'text-blue-400' : checkInFeedback.remaining < 0 ? 'text-red-400' : 'text-emerald-400'}`} />
                <span>
                  {checkInFeedback.action === 'refund' ? (
                    <span>
                      <strong>{checkInFeedback.memberName}</strong> was removed from {selectedClass.title} roster — <strong>1 class returned to balance</strong>!
                    </span>
                  ) : (
                    <span>
                      <strong>{checkInFeedback.memberName}</strong> was added to roster (consumed 1 class)!
                      {checkInFeedback.remaining < 0 && (
                        <span className="ml-1.5 font-bold text-red-300">
                          (Class Debt: {Math.abs(checkInFeedback.remaining)} class{Math.abs(checkInFeedback.remaining) > 1 ? 'es' : ''} — will be deducted upon renewal)
                        </span>
                      )}
                    </span>
                  )}
                </span>
              </div>
              <span className="text-xs font-bold">
                {checkInFeedback.remaining < 0 ? (
                  <span className="px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800">
                    Debt: {Math.abs(checkInFeedback.remaining)}
                  </span>
                ) : checkInFeedback.remaining >= 0 ? (
                  <span className={checkInFeedback.action === 'refund' ? 'text-blue-300' : 'text-emerald-300'}>
                    {checkInFeedback.remaining} classes remaining
                  </span>
                ) : (
                  <span className="text-blue-300">Unlimited</span>
                )}
              </span>
            </div>
          )}

          {/* Dual Panel: Left = Student Directory to Check In; Right = Current Mat Roster */}
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-stone-800">
            {/* LEFT COLUMN: Add Students to Class (8 cols on lg) */}
            <div className="lg:col-span-7 xl:col-span-8 p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4 text-red-400" />
                    <span>Add Students to This Class</span>
                  </h3>
                  <p className="text-xs text-stone-400">
                    System verifies that student age and belt match {selectedClass.category} requirements
                  </p>
                </div>

                {/* Batch Action Button */}
                {batchSelectedIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleBatchCheckIn}
                    className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-md animate-pulse cursor-pointer"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>
                      {selectedDayInfo.isFuture
                        ? `Pre-Check In Selected (${batchSelectedIds.length})`
                        : `Check In Selected (${batchSelectedIds.length})`}
                    </span>
                  </button>
                )}
              </div>

              {/* Search & Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                {/* Search Bar */}
                <div className="sm:col-span-6 relative">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Search by student name, belt, or phone..."
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-stone-500 focus:outline-hidden focus:border-red-500"
                  />
                  {studentSearch && (
                    <button
                      type="button"
                      onClick={() => setStudentSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Category Dropdown */}
                <div className="sm:col-span-3">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value as any)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-2.5 py-1.5 text-xs text-stone-300 focus:outline-hidden focus:border-red-500"
                  >
                    <option value="ALL">All Divisions</option>
                    <option value="Kids">Kids (Youth Belts)</option>
                    <option value="Teens">Teens (16-17)</option>
                    <option value="Adults">Adults (18+)</option>
                  </select>
                </div>

                {/* Eligibility Filter Dropdown */}
                <div className="sm:col-span-3">
                  <select
                    value={eligibilityFilter}
                    onChange={(e) => setEligibilityFilter(e.target.value as any)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-2.5 py-1.5 text-xs text-amber-300 font-bold focus:outline-hidden focus:border-red-500"
                  >
                    <option value="ALL">All Students</option>
                    <option value="ELIGIBLE_ONLY">✓ Eligible Only</option>
                    <option value="INELIGIBLE_ONLY">⚠️ Ineligible Only</option>
                  </select>
                </div>
              </div>

              {/* Status Quick Pills */}
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                <span className="text-stone-400 text-[11px] font-medium mr-1">Status:</span>
                <button
                  type="button"
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                    statusFilter === 'ALL'
                      ? 'bg-stone-700 text-white'
                      : 'bg-stone-950 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  All ({filteredStudents.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('NOT_CHECKED_IN')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                    statusFilter === 'NOT_CHECKED_IN'
                      ? 'bg-red-900/60 text-red-200 border border-red-700'
                      : 'bg-stone-950 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Not Checked In
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('CHECKED_IN')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                    statusFilter === 'CHECKED_IN'
                      ? 'bg-emerald-900/60 text-emerald-200 border border-emerald-700'
                      : 'bg-stone-950 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Checked In ({attendeesForClass.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('LOW_BALANCE')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                    statusFilter === 'LOW_BALANCE'
                      ? 'bg-stone-700 text-white'
                      : 'bg-stone-950 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Low Remaining (&le; 2)
                </button>
              </div>

              {/* Students List */}
              <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
                {filteredStudents.length === 0 ? (
                  <div className="p-8 text-center bg-stone-950/60 rounded-xl border border-stone-800 text-stone-400 text-xs">
                    No students matching your filter criteria.
                  </div>
                ) : (
                  filteredStudents.map((m, index) => {
                    const isCheckedIn = checkedInMemberIds.has(m.id);
                    const isUnlimited = m.membershipType === 'monthly_unlimited';
                    const isDebt = !isUnlimited && m.classesRemaining < 0;
                    const isZero = !isUnlimited && m.classesRemaining === 0;
                    const isLow = !isUnlimited && m.classesRemaining > 0 && m.classesRemaining <= 2;
                    const isSelectedInBatch = batchSelectedIds.includes(m.id);

                    // Check eligibility against the active class
                    const eligibility: ClassEligibilityCheck = selectedClass 
                      ? checkStudentClassEligibility(m, selectedClass)
                      : { isEligible: true };

                    const isFirstIneligible = Boolean(
                      selectedClass && 
                      !eligibility.isEligible && 
                      (index === 0 || checkStudentClassEligibility(filteredStudents[index - 1], selectedClass).isEligible)
                    );

                    return (
                      <React.Fragment key={m.id}>
                        {isFirstIneligible && (
                          <div className="pt-4 pb-2 my-1 border-t border-stone-800">
                            <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-800/80 flex items-center justify-between text-xs">
                              <span className="font-extrabold text-red-300 flex items-center gap-1.5">
                                <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                                <span>Ineligible / Division Blocked / Out of Credits ({filteredStudents.filter(s => selectedClass && !checkStudentClassEligibility(s, selectedClass).isEligible).length})</span>
                              </span>
                              <span className="text-[10px] text-red-400 font-semibold hidden sm:inline">Sorted to bottom per IBJJF rules</span>
                            </div>
                          </div>
                        )}

                        <div
                          className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isCheckedIn
                              ? 'bg-emerald-950/20 border-emerald-800/50'
                              : !eligibility.isEligible
                              ? 'bg-red-950/15 border-red-900/60'
                              : isDebt
                              ? 'bg-red-950/25 border-red-800/70'
                              : isZero
                              ? 'bg-amber-950/20 border-amber-800/60'
                              : 'bg-stone-950/80 hover:bg-stone-950 border-stone-800 hover:border-stone-700'
                          }`}
                        >
                        <div className="flex items-start gap-3 min-w-0">
                          {/* Checkbox for batch: disabled if ineligible */}
                          {!isCheckedIn && (
                            <input
                              type="checkbox"
                              disabled={!eligibility.isEligible}
                              checked={isSelectedInBatch}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setBatchSelectedIds([...batchSelectedIds, m.id]);
                                } else {
                                  setBatchSelectedIds(batchSelectedIds.filter((id) => id !== m.id));
                                }
                              }}
                              className={`rounded border-stone-700 mt-1 w-4 h-4 ${
                                eligibility.isEligible 
                                  ? 'text-red-600 focus:ring-0 cursor-pointer' 
                                  : 'opacity-40 cursor-not-allowed'
                              }`}
                              title={eligibility.isEligible ? 'Select for batch check-in' : eligibility.reason}
                            />
                          )}

                          {/* Info */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span 
                                onClick={() => onSelectMember && onSelectMember(m)}
                                className="font-bold text-white text-xs sm:text-sm truncate cursor-pointer hover:text-red-400 transition-colors"
                              >
                                {m.fullName}
                              </span>

                              <button
                                type="button"
                                onClick={(e) => handleCopyName(e, m.fullName, m.id)}
                                title={copiedStudentId === m.id ? 'Copied name to clipboard!' : `Copy "${m.fullName}"`}
                                className={`p-1 rounded-md transition-all inline-flex items-center gap-1 text-[11px] cursor-pointer active:scale-95 ${
                                  copiedStudentId === m.id
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-xs'
                                    : 'text-stone-400 hover:text-white hover:bg-stone-800 border border-transparent'
                                }`}
                              >
                                {copiedStudentId === m.id ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="font-mono text-[10px] font-bold">Copied</span>
                                  </>
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => onSelectMember && onSelectMember(m)}
                                className="text-stone-400 hover:text-blue-400 transition-colors p-0.5"
                                title="Edit student details & emergency contact"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              
                              {/* Age group badge */}
                              {m.ageGroup && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                                  m.ageGroup === 'Kids' 
                                    ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800' 
                                    : m.ageGroup === 'Teens'
                                    ? 'bg-blue-950/70 text-blue-300 border-blue-800'
                                    : 'bg-stone-800 text-stone-300 border-stone-700'
                                }`}>
                                  {m.ageGroup}
                                </span>
                              )}

                              {/* Ineligibility indicator */}
                              {!eligibility.isEligible && (
                                <span 
                                  onClick={() => setIneligibleModalInfo({
                                    studentName: m.fullName,
                                    studentBelt: m.beltRank,
                                    studentAgeGroup: m.ageGroup || 'Adults',
                                    classTitle: selectedClass?.title || '',
                                    classCategory: selectedClass?.category || '',
                                    reason: eligibility.reason || '',
                                  })}
                                  className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-950 text-red-300 border border-red-800 cursor-pointer inline-flex items-center gap-1"
                                  title="Click to view IBJJF safety reason"
                                >
                                  <Lock className="w-2.5 h-2.5 text-red-400" />
                                  <span>{eligibility.badgeText || 'Ineligible for Class'}</span>
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <BeltBadge belt={m.beltRank} stripes={m.stripes} size="sm" />
                              
                              {/* Balance badge */}
                              {isUnlimited ? (
                                <span className="text-[10px] text-emerald-400 font-semibold">
                                  Unlimited
                                </span>
                              ) : isDebt ? (
                                <span className="text-[10px] text-red-300 font-bold bg-red-950 px-2 py-0.5 rounded border border-red-700 inline-flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3 text-red-400" />
                                  <span>Debt: {Math.abs(m.classesRemaining)} class{Math.abs(m.classesRemaining) > 1 ? 'es' : ''} (Deducted on renewal)</span>
                                </span>
                              ) : isZero ? (
                                <span className="text-[10px] text-stone-300 font-bold bg-stone-800 px-1.5 py-0.5 rounded border border-stone-700">
                                  0 Classes (Will record debt)
                                </span>
                              ) : isLow ? (
                                <span className="text-[10px] text-stone-300 font-semibold bg-stone-800 px-1.5 py-0.2 rounded border border-stone-700">
                                  {m.classesRemaining} left
                                </span>
                              ) : (
                                <span className="text-[10px] text-stone-400 font-medium">
                                  {m.classesRemaining} classes left
                                </span>
                              )}

                              {m.emergencyContact?.name && (
                                <span
                                  className="text-[10px] text-stone-400 truncate hidden md:inline"
                                  title={`Emergency Contact: ${m.emergencyContact.name} (${m.emergencyContact.phone}) - ${m.emergencyContact.relation || 'Emergency Contact'}`}
                                >
                                  • ICE: <span className="text-stone-300">{m.emergencyContact.name}</span>{' '}
                                  <span className="text-red-400 font-semibold">({m.emergencyContact.relation || 'Contact'})</span>
                                </span>
                              )}
                            </div>

                            {/* Ineligible explanation text right on the card */}
                            {!eligibility.isEligible && (
                              <p className="text-[11px] text-red-400/90 mt-1 leading-snug flex items-start gap-1 font-medium">
                                <AlertTriangle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />
                                <span>{eligibility.reason}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
                          {isCheckedIn ? (
                            <div className="flex items-center gap-1.5">
                              <span className="px-2.5 py-1 bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs font-bold rounded-lg inline-flex items-center gap-1 shadow-xs">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span>{selectedDayInfo.isFuture ? 'Pre-Registered' : 'Checked In'}</span>
                              </span>
                              
                              {/* Undo checkin button */}
                              {(() => {
                                const record = attendeesForClass.find((a) => a.memberId === m.id);
                                if (record) {
                                  return (
                                    <button
                                      type="button"
                                      onClick={() => onUndoCheckIn(record.id)}
                                      className="p-1.5 text-stone-400 hover:text-red-400 hover:bg-stone-800 rounded transition-colors"
                                      title="Cancel attendance / Undo check-in"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                    </button>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          ) : !eligibility.isEligible ? (
                            <button
                              type="button"
                              onClick={() => setIneligibleModalInfo({
                                studentName: m.fullName,
                                studentBelt: m.beltRank,
                                studentAgeGroup: m.ageGroup || 'Adults',
                                classTitle: selectedClass?.title || '',
                                classCategory: selectedClass?.category || '',
                                reason: eligibility.reason || '',
                              })}
                              className="px-3 py-1.5 bg-red-950/70 hover:bg-red-900/80 text-red-300 border border-red-800/80 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                              title={eligibility.reason}
                            >
                              <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                              <span>Blocked (IBJJF)</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleStudentCheckIn(m)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer ${
                                isDebt || isZero
                                  ? 'bg-amber-600 hover:bg-amber-500 text-stone-950 font-black'
                                  : 'bg-red-600 hover:bg-red-500 text-white'
                              }`}
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>
                                {selectedDayInfo.isFuture
                                  ? isDebt || isZero
                                    ? '+ Pre-Check In (Debt)'
                                    : '+ Pre-Check In'
                                  : isDebt || isZero
                                  ? '+ Check In (Debt)'
                                  : '+ Check In'}
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Current Attendees on the Mat (4 cols on lg) */}
            <div className="lg:col-span-5 xl:col-span-4 p-4 sm:p-5 bg-stone-950/40 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span>Current Mat Roster</span>
                  </h3>
                  <p className="text-xs text-stone-400">
                    Students checked in to this session
                  </p>
                </div>

                <span className="px-2.5 py-1 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-lg text-xs font-black">
                  {attendeesForClass.length} on mat
                </span>
              </div>

              {attendeesForClass.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-stone-800 rounded-2xl">
                  <div className="w-12 h-12 rounded-full bg-stone-800 flex items-center justify-center text-stone-500 mx-auto mb-2">
                    <Users className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-stone-300">No students checked in yet</p>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Use the list on the left to add eligible students to this class.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
                  {attendeesForClass.map((a, idx) => {
                    const student = members.find((m) => m.id === a.memberId);
                    return (
                      <div
                        key={a.id}
                        className="p-2.5 bg-stone-900 border border-stone-800 rounded-xl flex items-center justify-between gap-2 shadow-xs group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-[10px] text-stone-500 font-bold w-4 text-right">
                            #{idx + 1}
                          </span>

                          <div className="min-w-0">
                            <span 
                              onClick={() => student && onSelectMember && onSelectMember(student)}
                              className="font-bold text-white text-xs block truncate cursor-pointer hover:text-red-400"
                            >
                              {a.memberName}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <BeltBadge belt={a.beltRank} stripes={a.stripes} size="sm" />
                              <span className="text-[10px] text-stone-400 flex items-center gap-0.5">
                                <Clock className="w-2.5 h-2.5" />
                                {a.time}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              onUndoCheckIn(a.id);
                              const currentBalance = student ? student.classesRemaining : 0;
                              const refundedBalance = currentBalance === -1 ? -1 : currentBalance + 1;
                              setCheckInFeedback({
                                memberName: a.memberName,
                                remaining: refundedBalance,
                                action: 'refund',
                              });
                            }}
                            className="px-2 py-1 text-stone-400 hover:text-red-300 hover:bg-stone-800 rounded transition-colors inline-flex items-center gap-1 text-[11px]"
                            title="Remove student from roster and refund 1 class to balance"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-stone-400 hover:text-red-400" />
                            <span className="hidden sm:inline text-[10px] font-semibold text-stone-400">Remove & Refund</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-10 text-center flex flex-col items-center justify-center shadow-lg">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3">
            <CalendarDays className="w-7 h-7 text-amber-400" />
          </div>
          <h3 className="text-lg font-black text-white mb-1">
            No Classes Scheduled on Matboard for {currentDayName}
          </h3>
          <p className="text-xs text-stone-400 max-w-md mb-5 leading-relaxed">
            The Academy Matboard is the official reference for the gym schedule. Since no training sessions are programmed on the matboard for <strong className="text-white">{currentDayName}</strong>, there are no classes to assign students to on this day.
          </p>
          <div className="flex items-center gap-2.5 flex-wrap justify-center">
            {liveTodayDayFull !== currentDayName && (
              <button
                type="button"
                onClick={() => {
                  setSelectedDate(todayStr);
                  setActiveDayFilter('TODAY');
                }}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer border border-stone-700 shadow-sm"
              >
                Go to Today ({liveTodayDayFull})
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setClassToEdit(null);
                setIsEditModalOpen(true);
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer shadow-md transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              <span>Manage Academy Classes</span>
            </button>
          </div>
        </div>
      )}
        </div>
      )}

      {/* 👑 EXCLUSIVE VIP 121 PRIVATE SESSIONS STATION */}
      {activeSection === 'vip' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* VIP Student Directory & 1-on-1 Balances Manager */}
          <div className={`border rounded-3xl p-5 sm:p-7 shadow-xl space-y-4 ${
            isLight ? 'bg-white border-stone-200 text-stone-900' : 'bg-stone-900 border-stone-800 text-white'
          }`}>
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b ${
              isLight ? 'border-stone-200' : 'border-stone-800'
            }`}>
              <div>
                <h3 className={`text-base sm:text-lg font-black tracking-tight flex items-center gap-2 ${
                  isLight ? 'text-stone-900' : 'text-white'
                }`}>
                  <Users className="w-5 h-5 text-red-500" />
                  <span>VIP Student Directory & 1-on-1 Balances</span>
                </h3>
                <p className={`text-xs mt-0.5 ${isLight ? 'text-stone-600 font-medium' : 'text-stone-400'}`}>
                  Select any student to immediately log a private 1-on-1 session or check their remaining package balance.
                </p>
              </div>

              {/* Student Search in VIP Roster */}
              <div className="relative w-full sm:w-64">
                <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${isLight ? 'text-stone-500' : 'text-stone-400'}`} />
                <input
                  type="text"
                  value={vipStudentSearch}
                  onChange={(e) => setVipStudentSearch(e.target.value)}
                  placeholder="Search students for VIP..."
                  className={`w-full pl-9 pr-3 py-2 border rounded-xl text-xs font-medium focus:outline-none focus:border-red-500 ${
                    isLight ? 'bg-stone-100 border-stone-300 text-stone-900 placeholder-stone-500' : 'bg-stone-950 border-stone-800 text-white placeholder-stone-500'
                  }`}
                />
              </div>
            </div>

            {/* Students Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto pr-1">
              {members
                .filter((m) => {
                  if (!vipStudentSearch.trim()) return true;
                  const q = vipStudentSearch.toLowerCase();
                  return (
                    m.fullName.toLowerCase().includes(q) ||
                    m.phone.toLowerCase().includes(q) ||
                    m.beltRank.toLowerCase().includes(q)
                  );
                })
                .slice(0, 30)
                .map((m) => {
                  const isUnlimited = m.membershipType === 'monthly_unlimited';
                  return (
                    <div
                      key={m.id}
                      className={`p-3 border rounded-2xl flex items-center justify-between gap-3 transition-all ${
                        isLight
                          ? 'bg-stone-50 border-stone-200 hover:border-red-400 text-stone-900 shadow-xs'
                          : 'bg-stone-950 border-stone-800/80 hover:border-red-500/50 text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className={`text-xs font-black truncate ${isLight ? 'text-stone-900' : 'text-white'}`}>{m.fullName}</h4>
                            <button
                              type="button"
                              onClick={(e) => handleCopyName(e, m.fullName, `vip-${m.id}`)}
                              title={copiedStudentId === `vip-${m.id}` ? 'Copied name to clipboard!' : `Copy "${m.fullName}"`}
                              className={`p-1 rounded-md transition-all inline-flex items-center gap-1 text-[10px] cursor-pointer active:scale-95 ${
                                copiedStudentId === `vip-${m.id}`
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-xs'
                                  : isLight
                                  ? 'text-stone-500 hover:text-stone-900 hover:bg-stone-200 border border-transparent'
                                  : 'text-stone-400 hover:text-white hover:bg-stone-800 border border-transparent'
                              }`}
                            >
                              {copiedStudentId === `vip-${m.id}` ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span className="font-mono text-[9px] font-bold">Copied</span>
                                </>
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <BeltBadge belt={m.beltRank} stripes={m.stripes} size="sm" />
                            <span className={`text-[10px] font-bold ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
                              {isUnlimited ? 'Unlimited' : `${m.classesRemaining} left`}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setPrivateStudentId(m.id);
                          setIsPrivateModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-xl text-xs font-black transition-all inline-flex items-center gap-1 shrink-0 cursor-pointer shadow-xs bg-red-600 hover:bg-red-700 text-white"
                        title={`Record VIP 121 session for ${m.fullName}`}
                      >
                        <Sparkles className="w-3.5 h-3.5 fill-current" />
                        <span>Book 1:1</span>
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* IBJJF INELIGIBILITY EXPLANATION MODAL */}
      {ineligibleModalInfo && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-red-800/80 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl text-stone-100 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-red-950 border border-red-700 flex items-center justify-center text-red-400">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    IBJJF Class Safety Restriction
                  </h3>
                  <p className="text-xs text-red-400 font-semibold">
                    Registration & Check-In Blocked
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIneligibleModalInfo(null)}
                className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 space-y-2 text-xs">
              <div className="flex items-center justify-between text-stone-400 border-b border-stone-800/80 pb-2">
                <span>Student:</span>
                <strong className="text-white text-sm">{ineligibleModalInfo.studentName}</strong>
              </div>
              <div className="flex items-center justify-between text-stone-400 border-b border-stone-800/80 pb-2">
                <span>Rank & Division:</span>
                <span className="text-stone-300 font-bold">{ineligibleModalInfo.studentBelt} Belt ({ineligibleModalInfo.studentAgeGroup})</span>
              </div>
              <div className="flex items-center justify-between text-stone-400">
                <span>Attempted Class:</span>
                <strong className="text-white">{ineligibleModalInfo.classTitle} ({ineligibleModalInfo.classCategory})</strong>
              </div>
            </div>

            <div className="p-3.5 bg-red-950/40 border border-red-800/80 rounded-xl text-xs text-red-200 leading-relaxed space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-red-300">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span>Why this student cannot attend:</span>
              </div>
              <p>{ineligibleModalInfo.reason}</p>
            </div>

            <div className="p-3 rounded-xl bg-stone-950/70 border border-stone-800 text-[11px] text-stone-400 space-y-1">
              <span className="font-bold text-stone-300 block">IBJJF Regulatory Standard:</span>
              <p>
                • <strong>Kids (Ages 4-15):</strong> Only permitted to hold Youth Belts (White, Grey, Yellow, Orange, Green). Adults & Teens are not permitted in Kids classes for physical safety and child development.
              </p>
              <p>
                • <strong>Adult Belts (Blue, Purple, Brown, Black):</strong> Min age 16 for Blue/Purple, 18 for Brown, 19 for Black. Adult ranks can never be mixed into Kids divisions.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIneligibleModalInfo(null)}
                className="px-5 py-2 bg-stone-800 hover:bg-stone-700 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Delete Confirmation Modal (Bypasses iframe window.confirm restriction) */}
      {classToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-stone-900 border border-red-500/40 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Delete Academy Class?</h3>
                <p className="text-xs text-stone-400">This class will be permanently removed.</p>
              </div>
            </div>

            <div className="p-3.5 bg-stone-950/90 rounded-xl border border-stone-800 space-y-1.5 text-xs">
              <p className="font-black text-white text-sm">{classToDelete.title}</p>
              <div className="flex items-center gap-2 text-stone-400">
                <span>Category: <strong className="text-stone-200">{classToDelete.category}</strong></span>
                <span>•</span>
                <span>Type: <strong className="text-stone-200">{classToDelete.type}</strong></span>
              </div>
              <p className="text-stone-400">
                Head Coach: <strong className="text-stone-200">{classToDelete.headCoachName || classToDelete.coach}</strong>
              </p>
            </div>

            <p className="text-xs text-stone-400 leading-relaxed">
              Deleting this class will remove it from <strong>Mat Attendance</strong> and clear scheduled slots on the <strong>Matboard</strong>.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setClassToDelete(null)}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteClass(classToDelete.id);
                  setClassToDelete(null);
                }}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 52-WEEK YEAR SCHEDULE NAVIGATOR MODAL */}
      {is52WeeksModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-stone-800 flex items-center justify-between gap-3 bg-stone-950/70">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-black text-white">
                      Academy 52-Week Annual Schedule ({selectedYear})
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-600/30 text-red-300 border border-red-500/40">
                      Saturday – Friday Gym Cycle
                    </span>
                  </div>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Navigate through all 52 weeks of the year to view scheduled mat classes and pre-check in students for future sessions.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Year Switcher */}
                <div className="flex items-center gap-1 bg-stone-900 border border-stone-800 rounded-xl p-1 text-xs">
                  {[2025, 2026, 2027].map((yr) => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => {
                        setSelectedYear(yr);
                        const newWeeks = generate52WeeksForYear(yr, todayStr);
                        const curr = newWeeks.find((w) => w.isCurrentWeek) || newWeeks[0];
                        setSelectedWeekNumber(curr.weekNumber);
                      }}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        selectedYear === yr
                          ? 'bg-red-600 text-white shadow-xs'
                          : 'text-stone-400 hover:text-white hover:bg-stone-800'
                      }`}
                    >
                      {yr}
                    </button>
                  ))}
                </div>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setIs52WeeksModalOpen(false)}
                  className="p-2 text-stone-400 hover:text-white hover:bg-stone-800 rounded-xl transition-colors cursor-pointer"
                  title="Close 52-Week Selector"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Filter & Search Bar */}
            <div className="p-3 sm:p-4 border-b border-stone-800 bg-stone-950/40 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={weekSearchQuery}
                    onChange={(e) => setWeekSearchQuery(e.target.value)}
                    placeholder="Search by week number (e.g. 42), month (October), or date (Sep 23)..."
                    className="w-full bg-stone-900 border border-stone-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-stone-500 focus:outline-hidden focus:border-red-500"
                  />
                  {weekSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setWeekSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Jump to Current Week */}
                <button
                  type="button"
                  onClick={handleJumpToCurrentWeek}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-950/90 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/80 text-xs font-bold inline-flex items-center gap-2 transition-all shadow-xs cursor-pointer shrink-0"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Jump to Current Week (Week {currentWeekObj.weekNumber})</span>
                </button>
              </div>

              {/* Month Quick Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
                <button
                  type="button"
                  onClick={() => setWeekMonthFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-colors cursor-pointer ${
                    weekMonthFilter === 'ALL'
                      ? 'bg-amber-500 text-stone-950 font-black shadow-xs'
                      : 'bg-stone-900 text-stone-400 hover:text-stone-200 hover:bg-stone-850'
                  }`}
                >
                  All 52 Weeks ({allWeeks.length})
                </button>
                {MONTH_NAMES_SHORT.map((m) => {
                  const isSelected = weekMonthFilter.toLowerCase() === m.toLowerCase();
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setWeekMonthFilter(m)}
                      className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500 text-stone-950 font-black shadow-xs'
                          : 'bg-stone-900 text-stone-400 hover:text-stone-200 hover:bg-stone-850'
                      }`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Weeks Grid */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 max-h-[60vh]">
              {filtered52Weeks.length === 0 ? (
                <div className="p-10 text-center bg-stone-950/40 rounded-2xl border border-stone-800 text-stone-400 text-xs space-y-2">
                  <p>No weeks matching your search or month filter.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setWeekSearchQuery('');
                      setWeekMonthFilter('ALL');
                    }}
                    className="px-3 py-1 bg-stone-800 hover:bg-stone-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filtered52Weeks.map((w) => {
                    const isSelected = activeWeek.weekNumber === w.weekNumber && activeWeek.year === w.year;
                    const isCurrent = w.isCurrentWeek;
                    const isFuture = w.isFutureWeek;

                    return (
                      <div
                        key={`${w.year}-w${w.weekNumber}`}
                        onClick={() => handleSelectWeek(w)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between group ${
                          isSelected
                            ? 'bg-red-950/30 border-red-500 ring-2 ring-red-500/50 shadow-lg'
                            : isCurrent
                            ? 'bg-emerald-950/20 hover:bg-emerald-950/40 border-emerald-700/80 shadow-md'
                            : isFuture
                            ? 'bg-stone-950/80 hover:bg-stone-900 border-amber-900/30 hover:border-amber-600/60 shadow-sm'
                            : 'bg-stone-950/60 hover:bg-stone-900 border-stone-800/80 hover:border-stone-700'
                        }`}
                      >
                        {/* Top: Week Number & Status Pill */}
                        <div className="flex items-center justify-between gap-1 mb-2">
                          <span className={`text-xs font-black ${
                            isSelected ? 'text-white' : isCurrent ? 'text-emerald-300' : 'text-stone-200'
                          }`}>
                            Week {w.weekNumber}
                          </span>

                          {isCurrent ? (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-extrabold uppercase tracking-wider inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Current
                            </span>
                          ) : isFuture ? (
                            <span className="px-2 py-0.5 rounded-md bg-stone-800 text-stone-200 border border-stone-700 text-[9px] font-extrabold uppercase tracking-wider">
                              Upcoming
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-stone-800 text-stone-400 border border-stone-700 text-[9px] font-semibold uppercase tracking-wider">
                              Past
                            </span>
                          )}
                        </div>

                        {/* Middle: Date Range */}
                        <div className="mb-2.5">
                          <div className="text-xs font-bold text-white group-hover:text-red-400 transition-colors">
                            {w.days[0].monthShort} {w.days[0].dayOfMonth} – {w.days[6].monthShort} {w.days[6].dayOfMonth}, {w.year}
                          </div>
                          <div className="text-[10px] text-stone-400 mt-0.5">
                            Saturday to Friday (7 Days)
                          </div>
                        </div>

                        {/* Bottom: Mini Day Numbers Row */}
                        <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between text-[10px] text-stone-400">
                          {w.days.map((d) => (
                            <span
                              key={d.dateStr}
                              className={`px-1 py-0.5 rounded text-[10px] ${
                                d.isToday
                                  ? 'bg-emerald-500/30 text-emerald-300 font-black'
                                  : 'text-stone-400'
                              }`}
                              title={`${d.dayShort}, ${d.monthShort} ${d.dayOfMonth}`}
                            >
                              {d.dayShort[0]}{d.dayOfMonth}
                            </span>
                          ))}
                        </div>

                        {/* Action Callout */}
                        <div className="mt-2 text-right">
                          <span className={`text-[10px] font-bold inline-flex items-center gap-1 transition-colors ${
                            isSelected ? 'text-red-400' : 'text-stone-500 group-hover:text-red-400'
                          }`}>
                            <span>{isSelected ? 'Active Selection' : 'Open Schedule'}</span>
                            <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 sm:p-4 border-t border-stone-800 bg-stone-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4 text-stone-400 text-[11px] flex-wrap">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  <span>Current Active Week</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <span>Upcoming Future Weeks</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-stone-700" />
                  <span>Past Archived Weeks</span>
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIs52WeeksModalOpen(false)}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl font-bold text-xs transition-colors cursor-pointer self-end sm:self-auto"
              >
                Close Calendar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit / Manage Classes Modal */}
      <EditClassModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setClassToEdit(null);
        }}
        classes={classes}
        classSession={classToEdit}
        coaches={coaches}
        onSaveClass={onSaveClass}
        onDeleteClass={onDeleteClass}
      />

      {/* PRIVATE 1-ON-1 CLASS CHECK-IN MODAL */}
      {isPrivateModalOpen && (() => {
        const targetStudent = members.find((m) => m.id === privateStudentId);

        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className={`border rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-scaleIn ${
              isLight ? 'bg-white border-stone-300 text-stone-900' : 'bg-stone-900 border-stone-800 text-white'
            }`}>
              <div className={`p-4 sm:p-5 border-b flex items-center justify-between ${
                isLight ? 'border-stone-200 bg-stone-50' : 'border-stone-800 bg-stone-950'
              }`}>
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-red-600/20 border border-red-600/40 rounded-xl text-red-500">
                    <Sparkles className="w-5 h-5 fill-red-500/20" />
                  </div>
                  <div>
                    <h3 className={`text-base font-black ${isLight ? 'text-stone-900' : 'text-white'}`}>Record Private 1-on-1 Lesson</h3>
                    <p className={`text-xs ${isLight ? 'text-stone-600 font-medium' : 'text-stone-400'}`}>Check in a student for a 1:1 personal training session</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPrivateModalOpen(false)}
                  className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                    isLight ? 'text-stone-500 hover:text-stone-900 hover:bg-stone-200' : 'text-stone-400 hover:text-white hover:bg-stone-800'
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleRecordPrivateSession} className="p-4 sm:p-6 space-y-4 text-xs">
                {/* Pre-selected Student Banner or Student Picker */}
                {targetStudent ? (
                  <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 shadow-xs ${
                    isLight ? 'bg-stone-100 border-stone-300 text-stone-900' : 'bg-stone-950 border-stone-800 text-white'
                  }`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className={`text-sm font-black truncate ${isLight ? 'text-stone-950' : 'text-white'}`}>{targetStudent.fullName}</h4>
                          <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white font-black text-[10px] uppercase tracking-wider shadow-2xs">
                            Selected Student
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs mt-1 font-semibold flex-wrap">
                          <BeltBadge belt={targetStudent.beltRank} stripes={targetStudent.stripes} size="sm" />
                          <span>•</span>
                          <span className={isLight ? 'text-stone-700 font-bold' : 'text-stone-300 font-bold'}>
                            {targetStudent.classesRemaining < 0 ? 'Unlimited Plan' : `${targetStudent.classesRemaining} classes left`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setPrivateStudentId('')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl shrink-0 cursor-pointer border transition-colors ${
                        isLight ? 'bg-white hover:bg-stone-100 text-stone-800 border-stone-300' : 'bg-stone-800 hover:bg-stone-700 text-stone-200 border-stone-700'
                      }`}
                      title="Change selected student"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div>
                    <label className={`block text-xs font-bold mb-1 ${isLight ? 'text-stone-800' : 'text-stone-300'}`}>
                      Select Student *
                    </label>
                    <div className="relative mb-2">
                      <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${isLight ? 'text-stone-500' : 'text-stone-400'}`} />
                      <input
                        type="text"
                        value={privateStudentSearch}
                        onChange={(e) => setPrivateStudentSearch(e.target.value)}
                        placeholder="Search student by name or belt..."
                        className={`w-full border rounded-xl pl-8 pr-3 py-2 text-xs font-medium focus:outline-none focus:border-red-500 ${
                          isLight ? 'bg-stone-100 border-stone-300 text-stone-900 placeholder-stone-500' : 'bg-stone-950 border-stone-700 text-white placeholder-stone-500'
                        }`}
                      />
                    </div>
                    <select
                      required
                      value={privateStudentId}
                      onChange={(e) => setPrivateStudentId(e.target.value)}
                      className={`w-full border rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none focus:border-red-500 cursor-pointer ${
                        isLight ? 'bg-white border-stone-300 text-stone-900' : 'bg-stone-950 border-stone-700 text-white'
                      }`}
                    >
                      <option value="">-- Select Student for Private Lesson --</option>
                      {members
                        .filter((m) => !m.isDeleted)
                        .filter((m) =>
                          !privateStudentSearch.trim() ||
                          m.fullName.toLowerCase().includes(privateStudentSearch.toLowerCase()) ||
                          m.beltRank.toLowerCase().includes(privateStudentSearch.toLowerCase())
                        )
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.fullName} ({m.beltRank} Belt) — {m.classesRemaining < 0 ? 'Unlimited' : `${m.classesRemaining} classes left`}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {/* Select Coach */}
                <div>
                  <label className={`block text-xs font-bold mb-1 ${isLight ? 'text-stone-800' : 'text-stone-300'}`}>
                    Private Instructor / Coach *
                  </label>
                  <select
                    value={privateCoachName}
                    onChange={(e) => setPrivateCoachName(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none focus:border-red-500 cursor-pointer ${
                      isLight ? 'bg-white border-stone-300 text-stone-900' : 'bg-stone-950 border-stone-700 text-white'
                    }`}
                  >
                    <option value="">-- Choose Instructor --</option>
                    {coaches
                      .filter((c) => c.active && !c.isDeleted)
                      .map((c) => (
                        <option key={c.id} value={c.fullName}>
                          {c.fullName} ({c.beltRank} Belt)
                        </option>
                      ))}
                  </select>
                </div>

                {/* Private Focus / Topic */}
                <div>
                  <label className={`block text-xs font-bold mb-1 ${isLight ? 'text-stone-800' : 'text-stone-300'}`}>
                    Lesson Topic / Technique Focus
                  </label>
                  <input
                    type="text"
                    value={privateFocus}
                    onChange={(e) => setPrivateFocus(e.target.value)}
                    placeholder="e.g., De La Riva Guard Sweeps, Leg Drag, Sparring Strategy"
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-red-500 ${
                      isLight ? 'bg-stone-50 border-stone-300 text-stone-900 placeholder-stone-400' : 'bg-stone-950 border-stone-700 text-white placeholder-stone-500'
                    }`}
                  />
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-xs font-bold mb-1 ${isLight ? 'text-stone-800' : 'text-stone-300'}`}>
                      Lesson Date
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      disabled
                      className={`w-full border rounded-xl px-3 py-2 text-xs cursor-not-allowed font-mono font-bold ${
                        isLight ? 'bg-stone-100 border-stone-300 text-stone-700' : 'bg-stone-950/60 border-stone-800 text-stone-400'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-bold mb-1 ${isLight ? 'text-stone-800' : 'text-stone-300'}`}>
                      Lesson Time
                    </label>
                    <input
                      type="text"
                      value={privateTime}
                      onChange={(e) => setPrivateTime(e.target.value)}
                      placeholder="14:00"
                      className={`w-full border rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-red-500 ${
                        isLight ? 'bg-white border-stone-300 text-stone-900' : 'bg-stone-950 border-stone-700 text-white'
                      }`}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className={`pt-3 border-t flex items-center justify-end gap-2 ${isLight ? 'border-stone-200' : 'border-stone-800'}`}>
                  <button
                    type="button"
                    onClick={() => setIsPrivateModalOpen(false)}
                    className={`px-4 py-2 font-bold text-xs rounded-xl transition-colors cursor-pointer ${
                      isLight ? 'bg-stone-200 hover:bg-stone-300 text-stone-800' : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-xs transition-all shadow-md cursor-pointer active:scale-95"
                  >
                    Confirm 121 Check-In
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Tap-Less Mat Vision & Face Recognition Attendance Kiosk Modal */}
      <MatVisionAttendanceModal
        isOpen={isMatVisionModalOpen}
        onClose={() => setIsMatVisionModalOpen(false)}
        members={members}
        classes={classes}
        coaches={coaches}
        attendance={attendance}
        onCheckIn={onCheckIn}
        onUndoCheckIn={onUndoCheckIn}
        theme={theme}
      />
    </div>
  );
};
