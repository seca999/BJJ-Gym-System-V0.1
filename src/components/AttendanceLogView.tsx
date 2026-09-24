import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  RotateCcw, 
  CheckCircle2,
  Trash2,
  Download,
  Users,
  Award,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  BarChart2,
  SlidersHorizontal,
  CalendarRange,
  Layers,
  Sparkles
} from 'lucide-react';
import { AttendanceRecord, Member, ClassSession, ClassCategory } from '../types';
import { BeltBadge } from '../utils/bjjBelts';
import { WeeklyAttendanceBarChart } from './WeeklyAttendanceBarChart';

interface AttendanceLogViewProps {
  attendance: AttendanceRecord[];
  members: Member[];
  classes?: ClassSession[];
  onUndoCheckIn: (attendanceId: string) => void;
  onSelectMember?: (member: Member) => void;
  onOpenPaymentForMember?: (memberId: string) => void;
}

type PeriodPreset = '7d' | '14d' | '30d' | '60d' | '90d' | 'this_month' | 'last_month' | 'all' | 'custom';
type FrequencyPreset = 'ALL' | 'ACTIVE_1' | 'REGULAR_3' | 'HIGH_5' | 'LOW_1_2' | 'ZERO_0' | 'CUSTOM';
type CustomOperator = 'GTE' | 'LTE' | 'EQ' | 'BETWEEN';
type ViewMode = 'STUDENT_FREQUENCY' | 'CLASS_ROSTERS' | 'CHRONO_LOG';

export const AttendanceLogView: React.FC<AttendanceLogViewProps> = ({
  attendance,
  members,
  classes = [],
  onUndoCheckIn,
  onSelectMember,
  onOpenPaymentForMember,
}) => {
  // Navigation & Sub-views
  const [viewMode, setViewMode] = useState<ViewMode>('STUDENT_FREQUENCY');

  // Time Period state
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('30d');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Class & Day filters
  const [selectedClassCategory, setSelectedClassCategory] = useState<'ALL' | ClassCategory>('ALL');
  const [selectedDay, setSelectedDay] = useState<'ALL' | 'Saturday' | 'Monday' | 'Wednesday'>('ALL');

  // Student Attendance Frequency Filter
  const [frequencyPreset, setFrequencyPreset] = useState<FrequencyPreset>('ALL');
  const [customOperator, setCustomOperator] = useState<CustomOperator>('GTE');
  const [customMinCount, setCustomMinCount] = useState<number>(3);
  const [customMaxCount, setCustomMaxCount] = useState<number>(10);
  const [customExactCount, setCustomExactCount] = useState<number>(1);

  // Search and sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'COUNT_DESC' | 'COUNT_ASC' | 'NAME_ASC' | 'LAST_ATTENDED'>('COUNT_DESC');
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [pendingUndoId, setPendingUndoId] = useState<string | null>(null);
  const [showWeeklyChart, setShowWeeklyChart] = useState(true);

  // Helper to find the reference date (latest attendance date or today)
  const referenceDate = useMemo(() => {
    if (attendance.length === 0) return new Date();
    // Sort to find the latest date in the attendance records
    const dates = attendance.map((a) => new Date(a.date).getTime()).filter((t) => !isNaN(t));
    if (dates.length === 0) return new Date();
    const maxTime = Math.max(...dates, new Date().getTime());
    return new Date(maxTime);
  }, [attendance]);

  // Compute start and end date bounds based on periodPreset
  const { startDateStr, endDateStr, dateRangeLabel } = useMemo(() => {
    const end = new Date(referenceDate);
    const start = new Date(referenceDate);

    if (periodPreset === '7d') {
      start.setDate(end.getDate() - 7);
    } else if (periodPreset === '14d') {
      start.setDate(end.getDate() - 14);
    } else if (periodPreset === '30d') {
      start.setDate(end.getDate() - 30);
    } else if (periodPreset === '60d') {
      start.setDate(end.getDate() - 60);
    } else if (periodPreset === '90d') {
      start.setDate(end.getDate() - 90);
    } else if (periodPreset === 'this_month') {
      start.setDate(1);
    } else if (periodPreset === 'last_month') {
      start.setMonth(start.getMonth() - 1, 1);
      end.setDate(0); // last day of previous month
    } else if (periodPreset === 'all') {
      start.setFullYear(2020, 0, 1);
      end.setFullYear(2030, 11, 31);
    } else if (periodPreset === 'custom') {
      return {
        startDateStr: customStartDate || '2020-01-01',
        endDateStr: customEndDate || '2030-12-31',
        dateRangeLabel: `${customStartDate || 'Start'} to ${customEndDate || 'End'}`,
      };
    }

    const sStr = start.toISOString().split('T')[0];
    const eStr = end.toISOString().split('T')[0];

    return {
      startDateStr: sStr,
      endDateStr: eStr,
      dateRangeLabel: `${sStr} to ${eStr}`,
    };
  }, [periodPreset, referenceDate, customStartDate, customEndDate]);

  // Filter attendance records by date bounds, class category, and day
  const filteredRecords = useMemo(() => {
    return attendance.filter((rec) => {
      // Date range
      if (rec.date < startDateStr || rec.date > endDateStr) return false;

      // Class category
      const resolvedCategory =
        rec.classCategory ||
        (rec.className.toLowerCase().includes('kid')
          ? 'Kids'
          : rec.className.toLowerCase().includes('teen')
          ? 'Teens'
          : 'Adults');

      if (selectedClassCategory !== 'ALL' && resolvedCategory !== selectedClassCategory) {
        return false;
      }

      // Day of week
      let recDay = rec.dayOfWeek;
      if (!recDay) {
        const d = new Date(rec.date);
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        recDay = dayNames[d.getDay()];
      }

      if (selectedDay !== 'ALL' && recDay !== selectedDay) {
        return false;
      }

      return true;
    });
  }, [attendance, startDateStr, endDateStr, selectedClassCategory, selectedDay]);

  // Aggregate attendance by student
  const studentSummaries = useMemo(() => {
    const map = new Map<
      string,
      {
        member: Member;
        totalCount: number;
        kidsCount: number;
        teensCount: number;
        adultsCount: number;
        saturdayCount: number;
        mondayCount: number;
        wednesdayCount: number;
        records: AttendanceRecord[];
        lastAttendedDate?: string;
      }
    >();

    // Initialize map with all members (so we can filter 0 attendances too!)
    members.forEach((m) => {
      map.set(m.id, {
        member: m,
        totalCount: 0,
        kidsCount: 0,
        teensCount: 0,
        adultsCount: 0,
        saturdayCount: 0,
        mondayCount: 0,
        wednesdayCount: 0,
        records: [],
        lastAttendedDate: undefined,
      });
    });

    // Populate counts from filtered records
    filteredRecords.forEach((rec) => {
      let entry = map.get(rec.memberId);
      if (!entry) {
        // If student was deleted or temporary
        const placeholderMember: Member = {
          id: rec.memberId,
          fullName: rec.memberName,
          email: '',
          phone: '',
          emergencyContact: { name: '', phone: '', relation: '' },
          beltRank: rec.beltRank,
          stripes: rec.stripes,
          membershipType: 'class_pack',
          classesTotal: 0,
          classesRemaining: rec.classesRemainingAfter,
          membershipStartDate: rec.date,
          membershipEndDate: rec.date,
          status: 'active',
          notes: '',
          preferredTraining: 'Both',
          joinDate: rec.date,
          totalClassesAttended: 1,
        };
        entry = {
          member: placeholderMember,
          totalCount: 0,
          kidsCount: 0,
          teensCount: 0,
          adultsCount: 0,
          saturdayCount: 0,
          mondayCount: 0,
          wednesdayCount: 0,
          records: [],
          lastAttendedDate: undefined,
        };
        map.set(rec.memberId, entry);
      }

      entry.totalCount += 1;
      entry.records.push(rec);

      // Track class category
      const cat =
        rec.classCategory ||
        (rec.className.toLowerCase().includes('kid')
          ? 'Kids'
          : rec.className.toLowerCase().includes('teen')
          ? 'Teens'
          : 'Adults');

      if (cat === 'Kids') entry.kidsCount += 1;
      else if (cat === 'Teens') entry.teensCount += 1;
      else entry.adultsCount += 1;

      // Track days
      let day = rec.dayOfWeek;
      if (!day) {
        const d = new Date(rec.date);
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        day = dayNames[d.getDay()];
      }
      if (day === 'Saturday') entry.saturdayCount += 1;
      else if (day === 'Monday') entry.mondayCount += 1;
      else if (day === 'Wednesday') entry.wednesdayCount += 1;

      if (!entry.lastAttendedDate || rec.date > entry.lastAttendedDate) {
        entry.lastAttendedDate = rec.date;
      }
    });

    let list = Array.from(map.values());

    // Filter by student search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (item) =>
          item.member.fullName.toLowerCase().includes(q) ||
          item.member.beltRank.toLowerCase().includes(q) ||
          item.member.phone.includes(q)
      );
    }

    // Filter by Attendance Frequency Count ("filter out how many times a student was able to attent")
    list = list.filter((item) => {
      const count = item.totalCount;

      if (frequencyPreset === 'ALL') {
        return true;
      }
      if (frequencyPreset === 'ACTIVE_1') {
        return count >= 1;
      }
      if (frequencyPreset === 'REGULAR_3') {
        return count >= 3;
      }
      if (frequencyPreset === 'HIGH_5') {
        return count >= 5;
      }
      if (frequencyPreset === 'LOW_1_2') {
        return count >= 1 && count <= 2;
      }
      if (frequencyPreset === 'ZERO_0') {
        return count === 0;
      }
      if (frequencyPreset === 'CUSTOM') {
        if (customOperator === 'GTE') {
          return count >= customMinCount;
        }
        if (customOperator === 'LTE') {
          return count <= customMaxCount;
        }
        if (customOperator === 'EQ') {
          return count === customExactCount;
        }
        if (customOperator === 'BETWEEN') {
          return count >= customMinCount && count <= customMaxCount;
        }
      }
      return true;
    });

    // Sort students
    list.sort((a, b) => {
      if (sortBy === 'COUNT_DESC') return b.totalCount - a.totalCount;
      if (sortBy === 'COUNT_ASC') return a.totalCount - b.totalCount;
      if (sortBy === 'NAME_ASC') return a.member.fullName.localeCompare(b.member.fullName);
      if (sortBy === 'LAST_ATTENDED') {
        return (b.lastAttendedDate || '').localeCompare(a.lastAttendedDate || '');
      }
      return 0;
    });

    return list;
  }, [
    members,
    filteredRecords,
    searchQuery,
    frequencyPreset,
    customOperator,
    customMinCount,
    customMaxCount,
    customExactCount,
    sortBy,
  ]);

  // Overall metrics in the current time period
  const metrics = useMemo(() => {
    const totalCheckIns = filteredRecords.length;
    let kidsCheckIns = 0;
    let teensCheckIns = 0;
    let adultsCheckIns = 0;
    const uniqueKids = new Set<string>();
    const uniqueTeens = new Set<string>();
    const uniqueAdults = new Set<string>();

    filteredRecords.forEach((rec) => {
      const cat =
        rec.classCategory ||
        (rec.className.toLowerCase().includes('kid')
          ? 'Kids'
          : rec.className.toLowerCase().includes('teen')
          ? 'Teens'
          : 'Adults');

      if (cat === 'Kids') {
        kidsCheckIns++;
        uniqueKids.add(rec.memberId);
      } else if (cat === 'Teens') {
        teensCheckIns++;
        uniqueTeens.add(rec.memberId);
      } else {
        adultsCheckIns++;
        uniqueAdults.add(rec.memberId);
      }
    });

    return {
      totalCheckIns,
      kidsCheckIns,
      uniqueKidsCount: uniqueKids.size,
      teensCheckIns,
      uniqueTeensCount: uniqueTeens.size,
      adultsCheckIns,
      uniqueAdultsCount: uniqueAdults.size,
      matchingStudentsCount: studentSummaries.length,
    };
  }, [filteredRecords, studentSummaries]);

  // Class-by-Class Roster breakdown for Tab 2
  const classRosters = useMemo(() => {
    const kidsMap = new Map<string, { member: Member; count: number; dates: string[] }>();
    const teensMap = new Map<string, { member: Member; count: number; dates: string[] }>();
    const adultsMap = new Map<string, { member: Member; count: number; dates: string[] }>();

    filteredRecords.forEach((rec) => {
      const cat =
        rec.classCategory ||
        (rec.className.toLowerCase().includes('kid')
          ? 'Kids'
          : rec.className.toLowerCase().includes('teen')
          ? 'Teens'
          : 'Adults');

      const targetMap = cat === 'Kids' ? kidsMap : cat === 'Teens' ? teensMap : adultsMap;
      let item = targetMap.get(rec.memberId);
      if (!item) {
        const mem = members.find((m) => m.id === rec.memberId) || {
          id: rec.memberId,
          fullName: rec.memberName,
          email: '',
          phone: '',
          emergencyContact: { name: '', phone: '', relation: '' },
          beltRank: rec.beltRank,
          stripes: rec.stripes,
          membershipType: 'class_pack',
          classesTotal: 0,
          classesRemaining: rec.classesRemainingAfter,
          membershipStartDate: rec.date,
          membershipEndDate: rec.date,
          status: 'active',
          notes: '',
          preferredTraining: 'Both',
          joinDate: rec.date,
          totalClassesAttended: 1,
        };
        item = { member: mem, count: 0, dates: [] };
        targetMap.set(rec.memberId, item);
      }
      item.count += 1;
      item.dates.push(`${rec.date} (${rec.time})`);
    });

    return {
      kids: Array.from(kidsMap.values()).sort((a, b) => b.count - a.count),
      teens: Array.from(teensMap.values()).sort((a, b) => b.count - a.count),
      adults: Array.from(adultsMap.values()).sort((a, b) => b.count - a.count),
    };
  }, [filteredRecords, members]);

  // Export Attendance CSV
  const handleExportCSV = () => {
    if (studentSummaries.length === 0) {
      alert('No attendance data available to export with current filters.');
      return;
    }

    const headers = [
      'Student ID',
      'Student Name',
      'Belt Rank',
      'Stripes',
      'Age Group / Category',
      'Total Classes in Period',
      'Kids Class Attendances',
      'Teens Class Attendances',
      'Adults Class Attendances',
      'Saturday Count',
      'Monday Count',
      'Wednesday Count',
      'Remaining Classes Balance',
      'Membership Type',
      'Last Attended Date',
    ];

    const rows = studentSummaries.map((s) => [
      `"${s.member.id}"`,
      `"${s.member.fullName}"`,
      `"${s.member.beltRank}"`,
      s.member.stripes,
      `"${s.member.ageGroup || 'Adults'}"`,
      s.totalCount,
      s.kidsCount,
      s.teensCount,
      s.adultsCount,
      s.saturdayCount,
      s.mondayCount,
      s.wednesdayCount,
      s.member.membershipType === 'monthly_unlimited' ? 'Unlimited' : s.member.classesRemaining,
      `"${s.member.membershipType}"`,
      `"${s.lastAttendedDate || 'Never'}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bjj_attendance_report_${startDateStr}_to_${endDateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper description of current attendance count filter
  const getFrequencyFilterDescription = () => {
    switch (frequencyPreset) {
      case 'ALL':
        return 'All registered students (including 0 attendances)';
      case 'ACTIVE_1':
        return 'Students who attended at least 1 class (≥ 1)';
      case 'REGULAR_3':
        return 'Regular training students (attended ≥ 3 classes)';
      case 'HIGH_5':
        return 'Dedicated high-attendance students (attended ≥ 5 classes)';
      case 'LOW_1_2':
        return 'Low-attendance students (attended 1–2 classes)';
      case 'ZERO_0':
        return 'Zero attendance students (missed all classes in this period)';
      case 'CUSTOM':
        if (customOperator === 'GTE') return `Students who attended at least ${customMinCount} times (≥ ${customMinCount})`;
        if (customOperator === 'LTE') return `Students who attended at most ${customMaxCount} times (≤ ${customMaxCount})`;
        if (customOperator === 'EQ') return `Students who attended exactly ${customExactCount} times (= ${customExactCount})`;
        if (customOperator === 'BETWEEN') return `Students who attended between ${customMinCount} and ${customMaxCount} times`;
        return 'Custom attendance count filter';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Academy Schedule Notice */}
      <div className="bg-stone-900 p-5 rounded-2xl border border-stone-800 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-950 text-red-300 border border-red-800 inline-flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Mon, Wed & Sat Schedule
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-stone-800 text-stone-300 border border-stone-700">
                3 Sessions / Day: Kids • Teens • Adults
              </span>
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">
              Class Attendance & Student Frequency Analyzer
            </h2>
            <p className="text-xs text-stone-400 mt-1 max-w-3xl leading-relaxed">
              Track exactly who attended which class (Kids, Teens, Adults) and their frequency over any time period.
              Filter students by attendance count to celebrate regulars and re-engage inactive members.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setShowWeeklyChart((prev) => !prev)}
              className={`px-3.5 py-2 border rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shadow-xs ${
                showWeeklyChart
                  ? 'bg-stone-800 hover:bg-stone-700 text-red-400 border-red-900/60'
                  : 'bg-stone-800 hover:bg-stone-700 text-stone-300 border-stone-700'
              }`}
              title="Toggle Weekly Traffic Bar Chart"
            >
              <BarChart2 className="w-3.5 h-3.5 text-red-400" />
              <span>{showWeeklyChart ? 'Hide Weekly Chart' : 'Show Weekly Chart'}</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shadow-xs"
              title="Download CSV report of filtered attendance"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 mt-5 pt-4 border-t border-stone-800 overflow-x-auto">
          <button
            onClick={() => setViewMode('STUDENT_FREQUENCY')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-2 transition-all whitespace-nowrap ${
              viewMode === 'STUDENT_FREQUENCY'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Student Attendance & Frequency ({studentSummaries.length})</span>
          </button>

          <button
            onClick={() => setViewMode('CLASS_ROSTERS')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-2 transition-all whitespace-nowrap ${
              viewMode === 'CLASS_ROSTERS'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Class Breakdown Rosters (Kids • Teens • Adults)</span>
          </button>

          <button
            onClick={() => setViewMode('CHRONO_LOG')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-2 transition-all whitespace-nowrap ${
              viewMode === 'CHRONO_LOG'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Chronological Roll Call ({filteredRecords.length})</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Summary Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-stone-900 border border-stone-800 p-3.5 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-stone-400 text-xs mb-1">
            <span>Period Check-Ins</span>
            <Calendar className="w-3.5 h-3.5 text-stone-400" />
          </div>
          <div className="text-xl font-black text-white">{metrics.totalCheckIns}</div>
          <div className="text-[11px] text-stone-400 truncate mt-0.5">{dateRangeLabel}</div>
        </div>

        <div className="bg-stone-900 border border-stone-800 p-3.5 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-amber-400 text-xs mb-1">
            <span>Kids Class</span>
            <span className="text-[10px] px-1 rounded bg-amber-950 text-amber-300 border border-amber-800">
              {metrics.uniqueKidsCount} kids
            </span>
          </div>
          <div className="text-xl font-black text-amber-400">{metrics.kidsCheckIns}</div>
          <div className="text-[11px] text-stone-400 mt-0.5">Sat 9:30a • Mon/Wed 4:30p</div>
        </div>

        <div className="bg-stone-900 border border-stone-800 p-3.5 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-blue-400 text-xs mb-1">
            <span>Teens Class</span>
            <span className="text-[10px] px-1 rounded bg-blue-950 text-blue-300 border border-blue-800">
              {metrics.uniqueTeensCount} teens
            </span>
          </div>
          <div className="text-xl font-black text-blue-400">{metrics.teensCheckIns}</div>
          <div className="text-[11px] text-stone-400 mt-0.5">Sat 10:30a • Mon/Wed 5:30p</div>
        </div>

        <div className="bg-stone-900 border border-stone-800 p-3.5 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-red-400 text-xs mb-1">
            <span>Adults Class</span>
            <span className="text-[10px] px-1 rounded bg-red-950 text-red-300 border border-red-800">
              {metrics.uniqueAdultsCount} adults
            </span>
          </div>
          <div className="text-xl font-black text-red-400">{metrics.adultsCheckIns}</div>
          <div className="text-[11px] text-stone-400 mt-0.5">Sat 12:00p • Mon/Wed 7:00p</div>
        </div>

        <div className="col-span-2 lg:col-span-1 bg-stone-900 border border-stone-800 p-3.5 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-emerald-400 text-xs mb-1">
            <span>Filtered Students</span>
            <Users className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-black text-emerald-400">{metrics.matchingStudentsCount}</div>
          <div className="text-[11px] text-stone-400 truncate mt-0.5">Matching frequency filter</div>
        </div>
      </div>

      {/* Weekly Attendance Recharts Bar Chart - Current Week Traffic Overview */}
      {showWeeklyChart && (
        <WeeklyAttendanceBarChart
          attendance={attendance}
          classes={classes}
        />
      )}

      {/* FILTER CONTROL DECK: Time Period + Class Program + Attendance Frequency Filter */}
      <div className="bg-stone-900 p-4 rounded-2xl border border-stone-800 space-y-4 shadow-sm">
        {/* Row 1: Time Period Presets */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-stone-300 inline-flex items-center gap-1.5">
              <CalendarRange className="w-3.5 h-3.5 text-red-400" />
              <span>Select Past Period of Time</span>
            </label>
            <span className="text-[11px] text-stone-400 font-mono bg-stone-950 px-2 py-0.5 rounded border border-stone-800">
              Range: {dateRangeLabel}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { id: '7d', label: 'Past 7 Days' },
                { id: '14d', label: 'Past 14 Days' },
                { id: '30d', label: 'Past 30 Days (1 Month)' },
                { id: '60d', label: 'Past 60 Days (2 Months)' },
                { id: '90d', label: 'Past 90 Days' },
                { id: 'this_month', label: 'This Month' },
                { id: 'last_month', label: 'Last Month' },
                { id: 'all', label: 'All Time' },
                { id: 'custom', label: 'Custom Range...' },
              ] as const
            ).map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setPeriodPreset(preset.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  periodPreset === preset.id
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-stone-800/80 text-stone-300 hover:bg-stone-800 hover:text-white border border-stone-700/60'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Custom Date Range Pickers if 'custom' is active */}
          {periodPreset === 'custom' && (
            <div className="mt-3 p-3 bg-stone-950 rounded-xl border border-stone-800 flex flex-col sm:flex-row items-center gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-stone-400">Start Date:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-stone-400">End Date:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>
              <span className="text-[11px] text-stone-500">
                Filters records strictly within this date window.
              </span>
            </div>
          )}
        </div>

        {/* Row 2: Program (Kids/Teens/Adults) & Day Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-stone-800">
          <div>
            <label className="text-xs font-bold text-stone-300 block mb-1.5">
              Class Category (3 Daily Sessions)
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {(
                [
                  { id: 'ALL', label: 'All Classes' },
                  { id: 'Kids', label: 'Kids Class' },
                  { id: 'Teens', label: 'Teens Class' },
                  { id: 'Adults', label: 'Adults Class' },
                ] as const
              ).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedClassCategory(cat.id)}
                  className={`py-1.5 px-2 text-center rounded-lg text-xs font-semibold transition-all ${
                    selectedClassCategory === cat.id
                      ? 'bg-stone-700 text-white border border-stone-500 font-bold'
                      : 'bg-stone-800/60 text-stone-400 hover:text-stone-200 border border-stone-800'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-stone-300 block mb-1.5">
              Academy Training Day
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {(
                [
                  { id: 'ALL', label: 'All Days' },
                  { id: 'Saturday', label: 'Saturday' },
                  { id: 'Monday', label: 'Monday' },
                  { id: 'Wednesday', label: 'Wednesday' },
                ] as const
              ).map((day) => (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => setSelectedDay(day.id)}
                  className={`py-1.5 px-2 text-center rounded-lg text-xs font-semibold transition-all ${
                    selectedDay === day.id
                      ? 'bg-stone-700 text-white border border-stone-500 font-bold'
                      : 'bg-stone-800/60 text-stone-400 hover:text-stone-200 border border-stone-800'
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Row 3: STUDENT ATTENDANCE FREQUENCY FILTER (Direct User Requirement) */}
        <div className="pt-3 border-t border-stone-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
              <label className="text-xs font-bold text-white">
                Filter by Student Attendance Count
              </label>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-medium">
                Frequency Control
              </span>
            </div>
            <span className="text-xs text-stone-400">
              {getFrequencyFilterDescription()}
            </span>
          </div>

          {/* Quick Frequency Preset Chips */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {(
              [
                { id: 'ALL', label: 'All Students (≥ 0)' },
                { id: 'ACTIVE_1', label: 'Attended ≥ 1 time' },
                { id: 'REGULAR_3', label: 'Regulars (≥ 3 times)' },
                { id: 'HIGH_5', label: 'Dedicated (≥ 5 times)' },
                { id: 'LOW_1_2', label: 'Occasional (1–2 times)' },
                { id: 'ZERO_0', label: 'Zero Attendance (0 times / Inactive)' },
                { id: 'CUSTOM', label: 'Custom Threshold...' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFrequencyPreset(item.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  frequencyPreset === item.id
                    ? item.id === 'ZERO_0'
                      ? 'bg-amber-600 text-white shadow-xs font-bold'
                      : 'bg-emerald-600 text-white shadow-xs font-bold'
                    : 'bg-stone-800/80 text-stone-300 hover:bg-stone-800 hover:text-white border border-stone-700/60'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Custom Frequency Threshold Controls */}
          {frequencyPreset === 'CUSTOM' && (
            <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-stone-400">Condition:</span>
                <select
                  value={customOperator}
                  onChange={(e) => setCustomOperator(e.target.value as CustomOperator)}
                  className="bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1.5 text-white font-medium focus:outline-none focus:border-red-500"
                >
                  <option value="GTE">At least (≥)</option>
                  <option value="LTE">At most (≤)</option>
                  <option value="EQ">Exactly (=)</option>
                  <option value="BETWEEN">Between (Min – Max)</option>
                </select>
              </div>

              {customOperator === 'GTE' && (
                <div className="flex items-center gap-2">
                  <span className="text-stone-400">Min classes attended:</span>
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => setCustomMinCount(Math.max(0, customMinCount - 1))}
                      className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-white rounded-l border border-stone-700"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={customMinCount}
                      onChange={(e) => setCustomMinCount(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-14 text-center bg-stone-900 border-y border-stone-700 py-1 text-white font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => setCustomMinCount(customMinCount + 1)}
                      className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-white rounded-r border border-stone-700"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-stone-400">times</span>
                </div>
              )}

              {customOperator === 'LTE' && (
                <div className="flex items-center gap-2">
                  <span className="text-stone-400">Max classes attended:</span>
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => setCustomMaxCount(Math.max(0, customMaxCount - 1))}
                      className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-white rounded-l border border-stone-700"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={customMaxCount}
                      onChange={(e) => setCustomMaxCount(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-14 text-center bg-stone-900 border-y border-stone-700 py-1 text-white font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => setCustomMaxCount(customMaxCount + 1)}
                      className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-white rounded-r border border-stone-700"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-stone-400">times</span>
                </div>
              )}

              {customOperator === 'EQ' && (
                <div className="flex items-center gap-2">
                  <span className="text-stone-400">Exactly:</span>
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => setCustomExactCount(Math.max(0, customExactCount - 1))}
                      className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-white rounded-l border border-stone-700"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={customExactCount}
                      onChange={(e) => setCustomExactCount(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-14 text-center bg-stone-900 border-y border-stone-700 py-1 text-white font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => setCustomExactCount(customExactCount + 1)}
                      className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-white rounded-r border border-stone-700"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-stone-400">times</span>
                </div>
              )}

              {customOperator === 'BETWEEN' && (
                <div className="flex items-center gap-2">
                  <span className="text-stone-400">From</span>
                  <input
                    type="number"
                    min={0}
                    value={customMinCount}
                    onChange={(e) => setCustomMinCount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-14 text-center bg-stone-900 border border-stone-700 rounded py-1 text-white font-bold"
                  />
                  <span className="text-stone-400">to</span>
                  <input
                    type="number"
                    min={0}
                    value={customMaxCount}
                    onChange={(e) => setCustomMaxCount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-14 text-center bg-stone-900 border border-stone-700 rounded py-1 text-white font-bold"
                  />
                  <span className="text-stone-400">times</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Row 4: Search & Sort Bar */}
        <div className="pt-3 border-t border-stone-800 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search student by name, belt, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-stone-950 border border-stone-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-stone-400 focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-stone-400 whitespace-nowrap">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-stone-950 border border-stone-700 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-red-500 w-full sm:w-auto"
            >
              <option value="COUNT_DESC">Attendance Count (Highest First)</option>
              <option value="COUNT_ASC">Attendance Count (Lowest First)</option>
              <option value="NAME_ASC">Student Name (A – Z)</option>
              <option value="LAST_ATTENDED">Most Recent Attendance</option>
            </select>
          </div>
        </div>
      </div>

      {/* VIEW 1: STUDENT ATTENDANCE & FREQUENCY BREAKDOWN (Primary) */}
      {viewMode === 'STUDENT_FREQUENCY' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-stone-400 px-1">
            <span>
              Showing <strong className="text-white">{studentSummaries.length}</strong> students matching attendance filters
            </span>
            <span>Click any student to view their exact session dates</span>
          </div>

          {studentSummaries.length === 0 ? (
            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-12 text-center text-stone-400">
              <Users className="w-10 h-10 mx-auto mb-3 text-stone-600" />
              <h3 className="text-base font-bold text-white mb-1">No students match current attendance filters</h3>
              <p className="text-xs text-stone-400 max-w-md mx-auto mb-4">
                Try widening your attendance frequency range, selecting "All Students", or choosing a longer time period.
              </p>
              <button
                onClick={() => {
                  setFrequencyPreset('ALL');
                  setSelectedClassCategory('ALL');
                  setSelectedDay('ALL');
                  setSearchQuery('');
                }}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-white rounded-lg text-xs font-semibold border border-stone-700"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-950 text-stone-400 text-[10px] uppercase font-bold tracking-wider border-b border-stone-800">
                    <tr>
                      <th className="py-3 px-4">Student & Belt Rank</th>
                      <th className="py-3 px-3 text-center">Period Total</th>
                      <th className="py-3 px-3">Class Breakdown (Kids • Teens • Adults)</th>
                      <th className="py-3 px-3">Training Days (Sat • Mon • Wed)</th>
                      <th className="py-3 px-3">Membership / Balance</th>
                      <th className="py-3 px-3">Last Attended</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800">
                    {studentSummaries.map((item) => {
                      const isExpanded = expandedStudentId === item.member.id;
                      const hasAttended = item.totalCount > 0;

                      return (
                        <React.Fragment key={item.member.id}>
                          <tr className="hover:bg-stone-800/40 transition-colors">
                            {/* Student & Belt */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedStudentId(isExpanded ? null : item.member.id)
                                  }
                                  className="text-stone-400 hover:text-white p-0.5"
                                  title="Toggle session details"
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-red-400" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4" />
                                  )}
                                </button>
                                <div>
                                  <div className="font-bold text-white text-sm flex items-center gap-2">
                                    <span>{item.member.fullName}</span>
                                    {item.member.ageGroup && (
                                      <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-stone-800 text-stone-300 border border-stone-700">
                                        {item.member.ageGroup}
                                      </span>
                                    )}
                                  </div>
                                  <div className="mt-1">
                                    <BeltBadge
                                      belt={item.member.beltRank}
                                      stripes={item.member.stripes}
                                      size="sm"
                                    />
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Total Period Attendance Count */}
                            <td className="py-3.5 px-3 text-center">
                              <span
                                className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-black shadow-xs ${
                                  item.totalCount >= 5
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                                    : item.totalCount >= 3
                                    ? 'bg-blue-950 text-blue-300 border border-blue-800'
                                    : item.totalCount >= 1
                                    ? 'bg-stone-800 text-stone-200 border border-stone-700'
                                    : 'bg-red-950/60 text-red-400 border border-red-900/60'
                                }`}
                              >
                                {item.totalCount === 0 ? '0 times' : `${item.totalCount}x attended`}
                              </span>
                            </td>

                            {/* Class Breakdown: Kids / Teens / Adults */}
                            <td className="py-3.5 px-3">
                              <div className="flex items-center gap-2 text-xs">
                                <span
                                  className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                                    item.kidsCount > 0
                                      ? 'bg-amber-950 text-amber-300 border border-amber-800 font-bold'
                                      : 'text-stone-500 bg-stone-950/40'
                                  }`}
                                  title="Kids BJJ Class attendance"
                                >
                                  Kids: {item.kidsCount}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                                    item.teensCount > 0
                                      ? 'bg-blue-950 text-blue-300 border border-blue-800 font-bold'
                                      : 'text-stone-500 bg-stone-950/40'
                                  }`}
                                  title="Teens BJJ Class attendance"
                                >
                                  Teens: {item.teensCount}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                                    item.adultsCount > 0
                                      ? 'bg-red-950 text-red-300 border border-red-800 font-bold'
                                      : 'text-stone-500 bg-stone-950/40'
                                  }`}
                                  title="Adults BJJ Class attendance"
                                >
                                  Adults: {item.adultsCount}
                                </span>
                              </div>
                            </td>

                            {/* Days breakdown: Sat / Mon / Wed */}
                            <td className="py-3.5 px-3">
                              <div className="flex items-center gap-1.5 text-[11px]">
                                <span
                                  className={`px-1.5 py-0.5 rounded ${
                                    item.saturdayCount > 0
                                      ? 'bg-stone-800 text-stone-200 font-bold'
                                      : 'text-stone-600'
                                  }`}
                                  title="Saturday attendances"
                                >
                                  Sat: {item.saturdayCount}
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 rounded ${
                                    item.mondayCount > 0
                                      ? 'bg-stone-800 text-stone-200 font-bold'
                                      : 'text-stone-600'
                                  }`}
                                  title="Monday attendances"
                                >
                                  Mon: {item.mondayCount}
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 rounded ${
                                    item.wednesdayCount > 0
                                      ? 'bg-stone-800 text-stone-200 font-bold'
                                      : 'text-stone-600'
                                  }`}
                                  title="Wednesday attendances"
                                >
                                  Wed: {item.wednesdayCount}
                                </span>
                              </div>
                            </td>

                            {/* Remaining Classes Balance */}
                            <td className="py-3.5 px-3">
                              {item.member.membershipType === 'monthly_unlimited' ? (
                                <span className="text-blue-400 font-bold text-xs">
                                  Unlimited
                                </span>
                              ) : (
                                <span
                                  className={`font-black text-xs ${
                                    item.member.classesRemaining <= 0
                                      ? 'text-red-400'
                                      : item.member.classesRemaining <= 2
                                      ? 'text-amber-400'
                                      : 'text-emerald-400'
                                  }`}
                                >
                                  {item.member.classesRemaining <= 0
                                    ? '0 classes (Due)'
                                    : `${item.member.classesRemaining} left`}
                                </span>
                              )}
                              <div className="text-[10px] text-stone-400 capitalize truncate">
                                {item.member.membershipType.replace('_', ' ')}
                              </div>
                            </td>

                            {/* Last Attended */}
                            <td className="py-3.5 px-3">
                              {item.lastAttendedDate ? (
                                <div>
                                  <div className="text-white font-medium text-xs">
                                    {item.lastAttendedDate}
                                  </div>
                                  <div className="text-[10px] text-stone-400">
                                    {item.records[0]?.className || ''}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-stone-500 text-xs italic">
                                  None in period
                                </span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {onSelectMember && (
                                  <button
                                    onClick={() => onSelectMember(item.member)}
                                    className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-xs font-semibold transition-colors"
                                  >
                                    Profile
                                  </button>
                                )}
                                {item.member.membershipType === 'class_pack' &&
                                  item.member.classesRemaining <= 0 &&
                                  onOpenPaymentForMember && (
                                    <button
                                      onClick={() => onOpenPaymentForMember(item.member.id)}
                                      className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold transition-colors shadow-xs"
                                    >
                                      Renew
                                    </button>
                                  )}
                              </div>
                            </td>
                          </tr>

                          {/* Expandable Session Log for this student */}
                          {isExpanded && (
                            <tr className="bg-stone-950/80">
                              <td colSpan={7} className="p-4 border-t border-b border-stone-800">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="text-xs font-bold text-stone-300 inline-flex items-center gap-1.5">
                                      <Calendar className="w-3.5 h-3.5 text-red-400" />
                                      <span>
                                        Attended Sessions for {item.member.fullName} in selected period ({item.records.length} records)
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => setExpandedStudentId(null)}
                                      className="text-stone-400 hover:text-white text-xs underline"
                                    >
                                      Close
                                    </button>
                                  </div>

                                  {item.records.length === 0 ? (
                                    <div className="py-3 text-stone-500 text-xs italic">
                                      No session check-ins found for this student during the selected period.
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
                                      {item.records.map((rec) => (
                                        <div
                                          key={rec.id}
                                          className="bg-stone-900 border border-stone-800 p-2.5 rounded-lg text-xs space-y-1"
                                        >
                                          <div className="flex items-center justify-between">
                                            <span className="font-bold text-white">
                                              {rec.date} ({rec.time})
                                            </span>
                                            <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-stone-800 text-stone-300">
                                              {rec.dayOfWeek || 'Mat Session'}
                                            </span>
                                          </div>
                                          <div className="text-stone-300 font-medium">
                                            {rec.className}
                                          </div>
                                          <div className="flex items-center justify-between text-[11px] text-stone-400">
                                            <span>Coach: {rec.coach}</span>
                                            <span>
                                              Balance after:{' '}
                                              {rec.classesRemainingAfter === -1
                                                ? 'Unlimited'
                                                : `${rec.classesRemainingAfter} left`}
                                            </span>
                                          </div>
                                          {rec.notes && (
                                            <p className="text-[10px] text-stone-400 italic pt-1 border-t border-stone-800">
                                              "{rec.notes}"
                                            </p>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: CLASS-BY-CLASS BREAKDOWN ROSTERS */}
      {viewMode === 'CLASS_ROSTERS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Kids Class */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-800">
                  Kids Program (Ages 5-11)
                </span>
                <h3 className="text-base font-black text-white mt-1">Kids BJJ Class</h3>
                <p className="text-[11px] text-stone-400">
                  Sat 9:30 AM • Mon & Wed 4:30 PM
                </p>
              </div>
              <div className="text-right">
                <div className="text-lg font-black text-amber-400">
                  {classRosters.kids.reduce((acc, c) => acc + c.count, 0)}
                </div>
                <div className="text-[10px] text-stone-400">Total check-ins</div>
              </div>
            </div>

            <div className="text-xs font-semibold text-stone-300 flex items-center justify-between">
              <span>Attended Students ({classRosters.kids.length})</span>
              <span>Class Count</span>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {classRosters.kids.length === 0 ? (
                <div className="py-8 text-center text-stone-500 text-xs">
                  No attendance records for Kids Class in this period.
                </div>
              ) : (
                classRosters.kids.map(({ member, count, dates }) => (
                  <div
                    key={member.id}
                    className="bg-stone-950 p-2.5 rounded-xl border border-stone-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-white text-xs">{member.fullName}</div>
                      <div className="mt-0.5">
                        <BeltBadge belt={member.beltRank} stripes={member.stripes} size="sm" />
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded-full text-xs font-black bg-amber-950 text-amber-300 border border-amber-800">
                        {count}x attended
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Column 2: Teens Class */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-950 px-2 py-0.5 rounded border border-blue-800">
                  Teens Program (Ages 12-16)
                </span>
                <h3 className="text-base font-black text-white mt-1">Teens BJJ Class</h3>
                <p className="text-[11px] text-stone-400">
                  Sat 10:30 AM • Mon & Wed 5:30 PM
                </p>
              </div>
              <div className="text-right">
                <div className="text-lg font-black text-blue-400">
                  {classRosters.teens.reduce((acc, c) => acc + c.count, 0)}
                </div>
                <div className="text-[10px] text-stone-400">Total check-ins</div>
              </div>
            </div>

            <div className="text-xs font-semibold text-stone-300 flex items-center justify-between">
              <span>Attended Students ({classRosters.teens.length})</span>
              <span>Class Count</span>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {classRosters.teens.length === 0 ? (
                <div className="py-8 text-center text-stone-500 text-xs">
                  No attendance records for Teens Class in this period.
                </div>
              ) : (
                classRosters.teens.map(({ member, count }) => (
                  <div
                    key={member.id}
                    className="bg-stone-950 p-2.5 rounded-xl border border-stone-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-white text-xs">{member.fullName}</div>
                      <div className="mt-0.5">
                        <BeltBadge belt={member.beltRank} stripes={member.stripes} size="sm" />
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded-full text-xs font-black bg-blue-950 text-blue-300 border border-blue-800">
                        {count}x attended
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Column 3: Adults Class */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-950 px-2 py-0.5 rounded border border-red-800">
                  Adults Program (All Ranks)
                </span>
                <h3 className="text-base font-black text-white mt-1">Adults BJJ Class</h3>
                <p className="text-[11px] text-stone-400">
                  Sat 12:00 PM • Mon & Wed 7:00 PM
                </p>
              </div>
              <div className="text-right">
                <div className="text-lg font-black text-red-400">
                  {classRosters.adults.reduce((acc, c) => acc + c.count, 0)}
                </div>
                <div className="text-[10px] text-stone-400">Total check-ins</div>
              </div>
            </div>

            <div className="text-xs font-semibold text-stone-300 flex items-center justify-between">
              <span>Attended Students ({classRosters.adults.length})</span>
              <span>Class Count</span>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {classRosters.adults.length === 0 ? (
                <div className="py-8 text-center text-stone-500 text-xs">
                  No attendance records for Adults Class in this period.
                </div>
              ) : (
                classRosters.adults.map(({ member, count }) => (
                  <div
                    key={member.id}
                    className="bg-stone-950 p-2.5 rounded-xl border border-stone-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-white text-xs">{member.fullName}</div>
                      <div className="mt-0.5">
                        <BeltBadge belt={member.beltRank} stripes={member.stripes} size="sm" />
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded-full text-xs font-black bg-red-950 text-red-300 border border-red-800">
                        {count}x attended
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: CHRONOLOGICAL ROLL CALL LOG */}
      {viewMode === 'CHRONO_LOG' && (
        <div className="bg-stone-900 rounded-2xl border border-stone-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-stone-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Chronological Mat Check-In Feed</h3>
              <p className="text-xs text-stone-400">
                Every individual student check-in event in the selected time period.
              </p>
            </div>
            <span className="text-xs text-stone-400 font-mono">
              {filteredRecords.length} check-ins
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-950 text-stone-400 text-[10px] uppercase tracking-wider font-semibold border-b border-stone-800">
                <tr>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-3">Student Name</th>
                  <th className="py-3 px-3">Belt Rank</th>
                  <th className="py-3 px-3">Class Session</th>
                  <th className="py-3 px-3">Coach</th>
                  <th className="py-3 px-3">Classes Balance After</th>
                  <th className="py-3 px-3">Notes</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-stone-400">
                      No attendance records found matching filters for this period.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((rec) => (
                    <tr key={rec.id} className="hover:bg-stone-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{rec.date}</div>
                        <div className="text-[10px] text-stone-400">
                          {rec.time} • {rec.dayOfWeek || 'Mat Session'}
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-white">{rec.memberName}</div>
                      </td>
                      <td className="py-3.5 px-3">
                        <BeltBadge belt={rec.beltRank} stripes={rec.stripes} size="sm" />
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-stone-200">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] ${
                            rec.classCategory === 'Kids'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : rec.classCategory === 'Teens'
                              ? 'bg-blue-950 text-blue-300 border border-blue-800'
                              : 'bg-stone-800 text-stone-200'
                          }`}
                        >
                          {rec.className}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-stone-400">{rec.coach}</td>
                      <td className="py-3.5 px-3 font-bold">
                        {rec.classesRemainingAfter === -1 ? (
                          <span className="text-blue-400">Unlimited</span>
                        ) : (
                          <span
                            className={
                              rec.classesRemainingAfter <= 0
                                ? 'text-red-400'
                                : rec.classesRemainingAfter <= 2
                                ? 'text-amber-400'
                                : 'text-emerald-400'
                            }
                          >
                            {rec.classesRemainingAfter} left
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-stone-400 max-w-[200px] truncate text-[11px]">
                        {rec.notes || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {pendingUndoId === rec.id ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                onUndoCheckIn(rec.id);
                                setPendingUndoId(null);
                              }}
                              className="px-2 py-1 text-[10px] font-bold bg-red-600 hover:bg-red-500 text-white rounded shadow-xs transition-colors"
                              title="Confirm undo and restore class balance"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setPendingUndoId(null)}
                              className="px-1.5 py-1 text-[10px] text-stone-400 hover:text-white rounded transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setPendingUndoId(rec.id)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-stone-400 hover:text-red-400 hover:bg-stone-800 rounded transition-colors inline-flex items-center gap-1"
                            title="Undo check-in and restore class balance"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Undo</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
