import React, { useState, useMemo } from 'react';
import {
  Award,
  DollarSign,
  Calendar,
  Users,
  Plus,
  Edit2,
  FileText,
  Download,
  CheckCircle2,
  Clock,
  Phone,
  Mail,
  Shield,
  Trash2,
  Sparkles,
  Search,
  Filter,
  Check,
  Printer,
  X,
} from 'lucide-react';
import { Coach, AttendanceRecord, ClassSession, CoachPayType, BeltRank, StripeCount, CoachSalarySummary, CoachSessionItem } from '../types';
import { BeltBadge } from '../utils/bjjBelts';
import { formatCurrency } from '../utils/currencyUtils';

interface CoachesDirectoryViewProps {
  coaches: Coach[];
  attendance: AttendanceRecord[];
  classes: ClassSession[];
  onAddCoach: (newCoach: Coach) => void;
  onUpdateCoach: (updatedCoach: Coach) => void;
  onDeleteCoach: (coachId: string) => void;
}

export const CoachesDirectoryView: React.FC<CoachesDirectoryViewProps> = ({
  coaches,
  attendance,
  classes,
  onAddCoach,
  onUpdateCoach,
  onDeleteCoach,
}) => {
  // Period filter
  const [periodPreset, setPeriodPreset] = useState<'this_month' | 'last_month' | 'last_30_days' | 'custom'>('this_month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Active view: Directory Cards vs Payroll Salary Table vs Sessions Log
  const [viewMode, setViewMode] = useState<'DIRECTORY' | 'PAYROLL_TABLE' | 'SESSIONS_FEED'>('DIRECTORY');

  // Search query
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingCoach, setEditingCoach] = useState<Coach | null>(null);
  const [coachToDelete, setCoachToDelete] = useState<Coach | null>(null);
  const [selectedPaySlipCoach, setSelectedPaySlipCoach] = useState<CoachSalarySummary | null>(null);

  // Paid status tracker in state
  const [paidCoachesMap, setPaidCoachesMap] = useState<Record<string, boolean>>({});

  // Reference date: September 2026
  const referenceDate = useMemo(() => new Date('2026-09-21T12:00:00'), []);

  // Compute date bounds
  const { startDateStr, endDateStr, periodLabel } = useMemo(() => {
    const end = new Date(referenceDate);
    const start = new Date(referenceDate);

    if (periodPreset === 'this_month') {
      start.setDate(1);
      const sStr = start.toISOString().split('T')[0];
      const eStr = end.toISOString().split('T')[0];
      return {
        startDateStr: sStr,
        endDateStr: eStr,
        periodLabel: 'September 2026 (Month to Date)',
      };
    } else if (periodPreset === 'last_month') {
      start.setMonth(start.getMonth() - 1, 1);
      end.setDate(0);
      const sStr = start.toISOString().split('T')[0];
      const eStr = end.toISOString().split('T')[0];
      return {
        startDateStr: sStr,
        endDateStr: eStr,
        periodLabel: 'August 2026 (Full Month)',
      };
    } else if (periodPreset === 'last_30_days') {
      start.setDate(start.getDate() - 30);
      const sStr = start.toISOString().split('T')[0];
      const eStr = end.toISOString().split('T')[0];
      return {
        startDateStr: sStr,
        endDateStr: eStr,
        periodLabel: 'Last 30 Days',
      };
    } else {
      return {
        startDateStr: customStartDate || '2020-01-01',
        endDateStr: customEndDate || '2030-12-31',
        periodLabel: `${customStartDate || 'Start'} to ${customEndDate || 'End'}`,
      };
    }
  }, [periodPreset, referenceDate, customStartDate, customEndDate]);

  // Aggregate sessions taught and student count per coach in the selected period
  const coachSalarySummaries: CoachSalarySummary[] = useMemo(() => {
    // 1. Filter attendance records in date range
    const periodAttendance = attendance.filter(
      (a) => a.date >= startDateStr && a.date <= endDateStr
    );

    // Group attendance records by unique session: `${date}__${className}`
    const sessionMap = new Map<string, { date: string; className: string; coachName: string; records: AttendanceRecord[] }>();

    periodAttendance.forEach((rec) => {
      const key = `${rec.date}__${rec.className}__${rec.coach || ''}`;
      if (!sessionMap.has(key)) {
        sessionMap.set(key, {
          date: rec.date,
          className: rec.className,
          coachName: rec.coach || '',
          records: [],
        });
      }
      sessionMap.get(key)!.records.push(rec);
    });

    return coaches.filter((coach) => !coach.isDeleted).map((coach) => {
      // Match sessions by coach full name or nickname
      const matchedSessions: CoachSessionItem[] = [];

      sessionMap.forEach((session) => {
        const coachLower = session.coachName.toLowerCase();
        const fullLower = coach.fullName.toLowerCase();
        const nickLower = (coach.nickname || '').toLowerCase();

        const isMatch =
          (nickLower && coachLower.includes(nickLower)) ||
          (fullLower && coachLower.includes(fullLower)) ||
          (coachLower && fullLower.includes(coachLower));

        if (isMatch) {
          const studentCount = session.records.length;
          const firstRec = session.records[0];

          let basePay = 0;
          let bonusPay = 0;

          if (coach.payType === 'per_class') {
            basePay = coach.rate;
            if (coach.studentBonusThreshold && studentCount > coach.studentBonusThreshold) {
              const extraStudents = studentCount - coach.studentBonusThreshold;
              bonusPay = extraStudents * (coach.studentBonusAmount || 0);
            }
          } else if (coach.payType === 'hourly') {
            // Assume 1.25 hours per class
            basePay = coach.rate * 1.25;
          } else if (coach.payType === 'monthly_fixed') {
            // Distributed or lump sum
            basePay = 0; // handled in summary total
          } else if (coach.payType === 'per_student') {
            basePay = studentCount * coach.rate;
          }

          matchedSessions.push({
            date: session.date,
            time: firstRec?.time || '18:00',
            dayOfWeek: firstRec?.dayOfWeek,
            className: session.className,
            classCategory: firstRec?.classCategory || 'Adults',
            studentCount,
            basePay,
            bonusPay,
            totalPay: basePay + bonusPay,
            attendanceIds: session.records.map((r) => r.id),
          });
        }
      });

      // Sort sessions descending by date
      matchedSessions.sort((a, b) => b.date.localeCompare(a.date));

      const sessionsCount = matchedSessions.length;
      const totalStudentsTaught = matchedSessions.reduce((acc, s) => acc + s.studentCount, 0);
      const averageClassSize = sessionsCount > 0 ? Math.round((totalStudentsTaught / sessionsCount) * 10) / 10 : 0;

      let baseEarnings = matchedSessions.reduce((acc, s) => acc + s.basePay, 0);
      const bonusEarnings = matchedSessions.reduce((acc, s) => acc + s.bonusPay, 0);

      if (coach.payType === 'monthly_fixed') {
        baseEarnings = coach.rate;
      }

      const totalEarnings = baseEarnings + bonusEarnings;

      return {
        coach,
        sessionsCount,
        totalStudentsTaught,
        averageClassSize,
        baseEarnings,
        bonusEarnings,
        totalEarnings,
        sessions: matchedSessions,
      };
    });
  }, [coaches, attendance, startDateStr, endDateStr]);

  // Filtered summaries by search query
  const filteredSummaries = useMemo(() => {
    if (!searchQuery.trim()) return coachSalarySummaries;
    const q = searchQuery.toLowerCase();
    return coachSalarySummaries.filter(
      (s) =>
        s.coach.fullName.toLowerCase().includes(q) ||
        (s.coach.nickname && s.coach.nickname.toLowerCase().includes(q)) ||
        s.coach.role.toLowerCase().includes(q) ||
        s.coach.specialty.some((spec) => spec.toLowerCase().includes(q))
    );
  }, [coachSalarySummaries, searchQuery]);

  // Overall totals
  const totalPayrollDue = useMemo(
    () => coachSalarySummaries.reduce((acc, s) => acc + s.totalEarnings, 0),
    [coachSalarySummaries]
  );
  const totalClassesTaught = useMemo(
    () => coachSalarySummaries.reduce((acc, s) => acc + s.sessionsCount, 0),
    [coachSalarySummaries]
  );
  const totalStudentCheckIns = useMemo(
    () => coachSalarySummaries.reduce((acc, s) => acc + s.totalStudentsTaught, 0),
    [coachSalarySummaries]
  );

  // Export payroll to CSV
  const handleExportPayrollCSV = () => {
    const headers = [
      'Coach ID',
      'Coach Name',
      'Belt Rank',
      'Pay Model',
      'Base Rate',
      'Sessions Taught',
      'Students Coached',
      'Avg Class Size',
      'Base Earnings (JOD)',
      'Bonus Earnings (JOD)',
      'Total Salary (JOD)',
      'Period',
    ];

    const rows = coachSalarySummaries.map((s) => [
      s.coach.id,
      `"${s.coach.fullName}${s.coach.nickname ? ` (${s.coach.nickname})` : ''}"`,
      s.coach.beltRank,
      s.coach.payType,
      s.coach.rate,
      s.sessionsCount,
      s.totalStudentsTaught,
      s.averageClassSize,
      s.baseEarnings.toFixed(2),
      s.bonusEarnings.toFixed(2),
      s.totalEarnings.toFixed(2),
      `"${periodLabel}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Coach_Payroll_${periodPreset}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Action Controls */}
      <div className="bg-stone-900 rounded-2xl p-5 border border-stone-800 shadow-sm text-stone-100">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-950/80 border border-amber-700/60 flex items-center justify-center text-amber-400 shadow-inner">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white tracking-tight">
                  Coaches Directory & Salary Calculator
                </h2>
                <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider bg-red-950 text-red-300 rounded-full border border-red-800">
                  Payroll Engine
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-1">
                Track instructors giving classes, analyze coaching attendance headcounts, and calculate itemized salaries.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleExportPayrollCSV}
              className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shadow-xs"
              title="Download spreadsheet report of coach salaries"
            >
              <Download className="w-3.5 h-3.5 text-stone-400" />
              <span>Export Payroll CSV</span>
            </button>

            <button
              onClick={() => {
                setEditingCoach(null);
                setIsAddEditModalOpen(true);
              }}
              className="px-3.5 py-2 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add New Coach</span>
            </button>
          </div>
        </div>

        {/* Time Period Filter Bar & Search */}
        <div className="mt-5 pt-4 border-t border-stone-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          {/* Period selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-stone-400 font-medium inline-flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              Payroll Period:
            </span>
            {[
              { id: 'this_month', label: 'This Month (Sep 2026)' },
              { id: 'last_month', label: 'Last Month (Aug 2026)' },
              { id: 'last_30_days', label: 'Last 30 Days' },
              { id: 'custom', label: 'Custom Dates' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriodPreset(p.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  periodPreset === p.id
                    ? 'bg-amber-500 text-black font-bold shadow-xs'
                    : 'bg-stone-800/80 text-stone-300 hover:bg-stone-700 border border-stone-700/60'
                }`}
              >
                {p.label}
              </button>
            ))}

            {periodPreset === 'custom' && (
              <div className="flex items-center gap-2 pl-2">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-stone-950 border border-stone-700 rounded-lg px-2.5 py-1 text-xs text-white"
                />
                <span className="text-stone-500 text-xs">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-stone-950 border border-stone-700 rounded-lg px-2.5 py-1 text-xs text-white"
                />
              </div>
            )}
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search coach, belt, specialty..."
              className="w-full bg-stone-950 border border-stone-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500 placeholder-stone-500"
            />
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-stone-800 overflow-x-auto">
          <button
            onClick={() => setViewMode('DIRECTORY')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-2 transition-all whitespace-nowrap ${
              viewMode === 'DIRECTORY'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Coaches Directory Cards ({coaches.length})</span>
          </button>

          <button
            onClick={() => setViewMode('PAYROLL_TABLE')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-2 transition-all whitespace-nowrap ${
              viewMode === 'PAYROLL_TABLE'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Salary & Compensation Breakdown</span>
          </button>

          <button
            onClick={() => setViewMode('SESSIONS_FEED')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-2 transition-all whitespace-nowrap ${
              viewMode === 'SESSIONS_FEED'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Coaching Class Log ({totalClassesTaught} sessions)</span>
          </button>
        </div>
      </div>

      {/* KPI METRICS SUMMARY ROW */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-stone-900 border border-stone-800 p-4 rounded-xl shadow-xs">
          <div className="text-xs text-stone-400 flex items-center justify-between mb-1">
            <span>Active Instructors</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {coaches.filter((c) => c.active && !c.isDeleted).length}
          </div>
          <div className="text-[11px] text-stone-500 mt-1">Teaching BJJ programs</div>
        </div>

        <div className="bg-stone-900 border border-stone-800 p-4 rounded-xl shadow-xs">
          <div className="text-xs text-stone-400 flex items-center justify-between mb-1">
            <span>Sessions Taught ({periodPreset === 'this_month' ? 'Sep' : 'Period'})</span>
            <Calendar className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white">{totalClassesTaught}</div>
          <div className="text-[11px] text-purple-400 font-medium mt-1">
            Sat, Mon & Wed classes
          </div>
        </div>

        <div className="bg-stone-900 border border-stone-800 p-4 rounded-xl shadow-xs">
          <div className="text-xs text-stone-400 flex items-center justify-between mb-1">
            <span>Students Coached</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">{totalStudentCheckIns}</div>
          <div className="text-[11px] text-emerald-400 font-medium mt-1">
            {totalClassesTaught > 0
              ? `Avg ${(totalStudentCheckIns / totalClassesTaught).toFixed(1)} / class`
              : '0 avg'}
          </div>
        </div>

        <div className="bg-stone-900 border border-amber-900/60 p-4 rounded-xl shadow-xs bg-gradient-to-br from-stone-900 to-amber-950/20">
          <div className="text-xs text-amber-400 flex items-center justify-between mb-1 font-semibold">
            <span>Total Payroll Due</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-300 font-mono-digits">
            {formatCurrency(totalPayrollDue, 'JOD')}
          </div>
          <div className="text-[11px] text-stone-400 mt-1">Base + Student head bonuses</div>
        </div>
      </div>

      {/* VIEW 1: COACHES DIRECTORY CARDS */}
      {viewMode === 'DIRECTORY' && (
        filteredSummaries.length === 0 ? (
          <div className="bg-stone-900/60 border border-dashed border-stone-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-stone-800/80 flex items-center justify-center mb-3 text-stone-400">
              <Award className="w-6 h-6 text-amber-500" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">
              {coaches.filter((c) => !c.isDeleted).length === 0 ? 'No Instructors Registered' : 'No Instructors Match Filter'}
            </h3>
            <p className="text-xs text-stone-400 max-w-md mb-4">
              {coaches.filter((c) => !c.isDeleted).length === 0
                ? 'Your coaching directory is clean following factory reset. Add your head professor and assistant instructors with their ranks and pay structures.'
                : 'No coaches match your search query.'}
            </p>
            {coaches.filter((c) => !c.isDeleted).length === 0 && (
              <button
                type="button"
                onClick={() => {
                  setEditingCoach(null);
                  setIsAddEditModalOpen(true);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add First Coach / Instructor</span>
              </button>
            )}
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {filteredSummaries.map(({ coach, sessionsCount, totalStudentsTaught, totalEarnings, sessions }) => {
            const isPaid = paidCoachesMap[coach.id];

            return (
              <div
                key={coach.id}
                className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-sm hover:border-stone-700 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Coach Photo, Name & Belt */}
                  <div className="flex items-start gap-3.5">
                    <div className="relative flex-shrink-0">
                      <img
                        src={coach.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&h=240&q=80'}
                        alt={coach.fullName}
                        className="w-14 h-14 rounded-2xl object-cover border-2 border-stone-700 shadow-md"
                      />
                      <span
                        className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-stone-900 ${
                          coach.active ? 'bg-emerald-400' : 'bg-stone-500'
                        }`}
                        title={coach.active ? 'Active Instructor' : 'Inactive'}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <h3 className="font-bold text-white text-base leading-tight truncate">
                          {coach.fullName}
                        </h3>
                      </div>
                      {coach.nickname && (
                        <p className="text-xs text-amber-400 font-medium">"{coach.nickname}"</p>
                      )}
                      <p className="text-[11px] text-stone-400 truncate mt-0.5">{coach.role}</p>

                      <div className="mt-1.5">
                        <BeltBadge belt={coach.beltRank} stripes={coach.stripes} size="sm" />
                      </div>
                    </div>
                  </div>

                  {/* Compensation Badge */}
                  <div className="mt-4 p-2.5 rounded-xl bg-stone-950/80 border border-stone-800/80 flex items-center justify-between text-xs">
                    <span className="text-stone-400">Pay Structure:</span>
                    <span className="font-bold text-emerald-400">
                      {coach.payType === 'per_class' && `${formatCurrency(coach.rate, 'JOD')} / class session`}
                      {coach.payType === 'hourly' && `${formatCurrency(coach.rate, 'JOD')} / hour`}
                      {coach.payType === 'monthly_fixed' && `${formatCurrency(coach.rate, 'JOD')} / month`}
                      {coach.payType === 'per_student' && `${formatCurrency(coach.rate, 'JOD')} / student check-in`}
                    </span>
                  </div>

                  {/* Period Performance Stats */}
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="bg-stone-800/50 p-2 rounded-lg border border-stone-800">
                      <div className="text-[10px] text-stone-400 uppercase font-bold">Sessions</div>
                      <div className="text-sm font-black text-white mt-0.5">{sessionsCount}</div>
                    </div>
                    <div className="bg-stone-800/50 p-2 rounded-lg border border-stone-800">
                      <div className="text-[10px] text-stone-400 uppercase font-bold">Students</div>
                      <div className="text-sm font-black text-white mt-0.5">{totalStudentsTaught}</div>
                    </div>
                    <div className="bg-amber-950/40 p-2 rounded-lg border border-amber-800/40">
                      <div className="text-[10px] text-amber-400 uppercase font-bold">Payout</div>
                      <div className="text-sm font-black text-amber-300 mt-0.5 font-mono-digits">
                        {formatCurrency(totalEarnings, 'JOD')}
                      </div>
                    </div>
                  </div>

                  {/* Specialties Pills */}
                  {coach.specialty && coach.specialty.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {coach.specialty.map((spec, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded text-[10px] bg-stone-800 text-stone-300 border border-stone-700/60"
                        >
                          {spec}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Bio / Notes */}
                  {coach.bio && (
                    <p className="text-xs text-stone-400 mt-2.5 line-clamp-2 italic">
                      "{coach.bio}"
                    </p>
                  )}
                </div>

                {/* Card Actions Footer */}
                <div className="mt-4 pt-3 border-t border-stone-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() =>
                      setSelectedPaySlipCoach({
                        coach,
                        sessionsCount,
                        totalStudentsTaught,
                        averageClassSize:
                          sessionsCount > 0
                            ? Math.round((totalStudentsTaught / sessionsCount) * 10) / 10
                            : 0,
                        baseEarnings:
                          coach.payType === 'monthly_fixed'
                            ? coach.rate
                            : sessions.reduce((acc, s) => acc + s.basePay, 0),
                        bonusEarnings: sessions.reduce((acc, s) => acc + s.bonusPay, 0),
                        totalEarnings,
                        sessions,
                      })
                    }
                    className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    <span>Pay Slip</span>
                  </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setEditingCoach(coach);
                          setIsAddEditModalOpen(true);
                        }}
                        className="p-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg transition-colors cursor-pointer"
                        title="Edit Coach Details & Salary Rate"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setCoachToDelete(coach)}
                        className="p-1.5 bg-stone-800 hover:bg-red-950 hover:text-red-400 text-stone-400 hover:border-red-800/60 rounded-lg transition-colors cursor-pointer"
                        title="Delete Coach"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                </div>
              </div>
            );
          })}
        </div>
        )
      )}

      {/* VIEW 2: SALARY & COMPENSATION BREAKDOWN TABLE */}
      {viewMode === 'PAYROLL_TABLE' && (
        <div className="bg-stone-900 rounded-2xl border border-stone-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-stone-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Itemized Coach Salary Ledger</h3>
              <p className="text-xs text-stone-400">
                Calculated based on verified attendance logs for: <strong className="text-amber-400">{periodLabel}</strong>
              </p>
            </div>
            <span className="text-xs font-mono text-stone-400">
              {filteredSummaries.length} Instructors
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-950 text-stone-400 text-[10px] uppercase tracking-wider font-semibold border-b border-stone-800">
                <tr>
                  <th className="py-3 px-4">Coach / Instructor</th>
                  <th className="py-3 px-3">Belt Rank</th>
                  <th className="py-3 px-3">Pay Structure</th>
                  <th className="py-3 px-3 text-center">Sessions</th>
                  <th className="py-3 px-3 text-center">Students Coached</th>
                  <th className="py-3 px-3 text-right">Base Salary</th>
                  <th className="py-3 px-3 text-right">Bonus / Commissions</th>
                  <th className="py-3 px-4 text-right">Gross Total</th>
                  <th className="py-3 px-3 text-center">Payout Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                {filteredSummaries.map((summary) => {
                  const isPaid = paidCoachesMap[summary.coach.id];

                  return (
                    <tr key={summary.coach.id} className="hover:bg-stone-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-sm">
                          {summary.coach.fullName}
                        </div>
                        <div className="text-[11px] text-stone-400">
                          {summary.coach.nickname && `"${summary.coach.nickname}" • `}
                          {summary.coach.role}
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <BeltBadge
                          belt={summary.coach.beltRank}
                          stripes={summary.coach.stripes}
                          size="sm"
                        />
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-stone-800 text-stone-200 border border-stone-700">
                          {summary.coach.payType === 'per_class' && `${formatCurrency(summary.coach.rate, 'JOD')} / class`}
                          {summary.coach.payType === 'hourly' && `${formatCurrency(summary.coach.rate, 'JOD')} / hr`}
                          {summary.coach.payType === 'monthly_fixed' && `${formatCurrency(summary.coach.rate, 'JOD')} / mo fixed`}
                          {summary.coach.payType === 'per_student' && `${formatCurrency(summary.coach.rate, 'JOD')} / student`}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-center font-bold text-white">
                        {summary.sessionsCount}
                      </td>

                      <td className="py-3.5 px-3 text-center font-medium text-stone-300">
                        {summary.totalStudentsTaught}
                        <span className="text-[10px] text-stone-500 block">
                          avg {summary.averageClassSize}/cls
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono text-stone-300">
                        {formatCurrency(summary.baseEarnings, 'JOD')}
                      </td>

                      <td className="py-3.5 px-3 text-right font-mono text-emerald-400">
                        {summary.bonusEarnings > 0 ? `+${formatCurrency(summary.bonusEarnings, 'JOD')}` : '—'}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-black text-amber-300 text-sm">
                        {formatCurrency(summary.totalEarnings, 'JOD')}
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <button
                          onClick={() =>
                            setPaidCoachesMap((prev) => ({
                              ...prev,
                              [summary.coach.id]: !isPaid,
                            }))
                          }
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 transition-all ${
                            isPaid
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-amber-950/60 text-amber-400 border border-amber-800 hover:bg-amber-900/60'
                          }`}
                          title="Click to toggle paid status"
                        >
                          {isPaid ? (
                            <>
                              <Check className="w-3 h-3" />
                              <span>Paid</span>
                            </>
                          ) : (
                            <span>Pending Pay</span>
                          )}
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedPaySlipCoach(summary)}
                          className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                        >
                          <FileText className="w-3 h-3 text-amber-400" />
                          <span>Pay Slip</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: SESSIONS FEED (ALL CLASSES LED BY COACHES) */}
      {viewMode === 'SESSIONS_FEED' && (
        <div className="bg-stone-900 rounded-2xl border border-stone-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-stone-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Class & Mat Sessions Log</h3>
              <p className="text-xs text-stone-400">
                Itemized classes taught with student headcount verification.
              </p>
            </div>
            <span className="text-xs text-stone-400 font-mono">
              {totalClassesTaught} sessions in {periodLabel}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-950 text-stone-400 text-[10px] uppercase tracking-wider font-semibold border-b border-stone-800">
                <tr>
                  <th className="py-3 px-4">Date & Day</th>
                  <th className="py-3 px-3">Class Session</th>
                  <th className="py-3 px-3">Coach</th>
                  <th className="py-3 px-3 text-center">Student Headcount</th>
                  <th className="py-3 px-3 text-right">Base Pay</th>
                  <th className="py-3 px-3 text-right">Bonus</th>
                  <th className="py-3 px-4 text-right">Session Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                {coachSalarySummaries.flatMap((summary) =>
                  summary.sessions.map((sess, idx) => (
                    <tr
                      key={`${summary.coach.id}-${sess.date}-${sess.className}-${idx}`}
                      className="hover:bg-stone-800/40 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{sess.date}</div>
                        <div className="text-[10px] text-stone-400">
                          {sess.dayOfWeek || 'Academy Session'} • {sess.time}
                        </div>
                      </td>

                      <td className="py-3 px-3 font-semibold text-stone-200">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] ${
                            sess.classCategory === 'Kids'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : sess.classCategory === 'Teens'
                              ? 'bg-blue-950 text-blue-300 border border-blue-800'
                              : 'bg-stone-800 text-stone-200'
                          }`}
                        >
                          {sess.className}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-bold text-white">{summary.coach.fullName}</div>
                        <div className="text-[10px] text-stone-400">
                          {summary.coach.nickname || summary.coach.role}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center font-bold text-emerald-400">
                        {sess.studentCount} students
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-stone-300">
                        {formatCurrency(sess.basePay, 'JOD')}
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-emerald-400">
                        {sess.bonusPay > 0 ? `+${formatCurrency(sess.bonusPay, 'JOD')}` : '—'}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold text-amber-300">
                        {formatCurrency(sess.totalPay, 'JOD')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ITEMIZE PAY SLIP MODAL */}
      {selectedPaySlipCoach && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Pay Slip Header */}
            <div className="p-5 border-b border-stone-800 bg-stone-950/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-950 border border-amber-800 flex items-center justify-center text-amber-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">
                    Coach Compensation Statement & Pay Slip
                  </h3>
                  <p className="text-xs text-stone-400">Period: {periodLabel}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPaySlipCoach(null)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Pay Slip Body */}
            <div className="p-5 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
              {/* Coach Summary Banner */}
              <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-between">
                <div>
                  <div className="text-lg font-black text-white">
                    {selectedPaySlipCoach.coach.fullName}
                  </div>
                  <div className="text-xs text-amber-400 font-medium">
                    {selectedPaySlipCoach.coach.nickname && `"${selectedPaySlipCoach.coach.nickname}" • `}
                    {selectedPaySlipCoach.coach.role}
                  </div>
                  <div className="mt-1.5">
                    <BeltBadge
                      belt={selectedPaySlipCoach.coach.beltRank}
                      stripes={selectedPaySlipCoach.coach.stripes}
                      size="sm"
                    />
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-stone-400 uppercase font-bold">Total Earnings</div>
                  <div className="text-2xl font-black text-amber-300 font-mono-digits">
                    {formatCurrency(selectedPaySlipCoach.totalEarnings, 'JOD')}
                  </div>
                  <div className="text-[11px] text-stone-400 mt-0.5">
                    {selectedPaySlipCoach.sessionsCount} classes taught
                  </div>
                </div>
              </div>

              {/* Sessions Table */}
              <div>
                <h4 className="text-xs font-bold text-stone-300 uppercase tracking-wider mb-2">
                  Itemized Class Sessions ({selectedPaySlipCoach.sessions.length})
                </h4>
                <div className="border border-stone-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-950 text-stone-400 text-[10px] uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Class Session</th>
                        <th className="py-2.5 px-3 text-center">Students</th>
                        <th className="py-2.5 px-3 text-right">Base</th>
                        <th className="py-2.5 px-3 text-right">Bonus</th>
                        <th className="py-2.5 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-800">
                      {selectedPaySlipCoach.sessions.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-stone-500 text-xs">
                            No classes taught in this period.
                          </td>
                        </tr>
                      ) : (
                        selectedPaySlipCoach.sessions.map((sess, idx) => (
                          <tr key={idx} className="hover:bg-stone-800/30">
                            <td className="py-2.5 px-3 font-mono text-stone-300">{sess.date}</td>
                            <td className="py-2.5 px-3 text-white font-medium">{sess.className}</td>
                            <td className="py-2.5 px-3 text-center font-bold text-emerald-400">
                              {sess.studentCount}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-stone-300">
                              {formatCurrency(sess.basePay, 'JOD')}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-emerald-400">
                              {sess.bonusPay > 0 ? `+${formatCurrency(sess.bonusPay, 'JOD')}` : formatCurrency(0, 'JOD')}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-300">
                              {formatCurrency(sess.totalPay, 'JOD')}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Pay Slip Footer */}
            <div className="p-4 border-t border-stone-800 bg-stone-950/80 flex items-center justify-between">
              <button
                onClick={() => window.print()}
                className="px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Print Statement</span>
              </button>

              <button
                onClick={() => setSelectedPaySlipCoach(null)}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT COACH MODAL */}
      {isAddEditModalOpen && (
        <AddEditCoachModal
          coach={editingCoach}
          isOpen={isAddEditModalOpen}
          onClose={() => {
            setIsAddEditModalOpen(false);
            setEditingCoach(null);
          }}
          onSave={(coachData) => {
            if (editingCoach) {
              onUpdateCoach(coachData);
            } else {
              onAddCoach(coachData);
            }
            setIsAddEditModalOpen(false);
            setEditingCoach(null);
          }}
        />
      )}

      {/* IN-APP COACH DELETE CONFIRMATION MODAL */}
      {coachToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-stone-900 border border-red-500/40 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Remove Coach?</h3>
                <p className="text-xs text-stone-400">Remove instructor from academy roster.</p>
              </div>
            </div>

            <div className="p-3.5 bg-stone-950/90 rounded-xl border border-stone-800 space-y-1.5 text-xs">
              <p className="font-black text-white text-sm">{coachToDelete.fullName}</p>
              <p className="text-stone-400">
                Rank: <strong className="text-stone-200">{coachToDelete.beltRank} Belt ({coachToDelete.stripes} Stripes)</strong>
              </p>
              <p className="text-stone-400">
                Role: <strong className="text-stone-200">{coachToDelete.role}</strong>
              </p>
            </div>

            <p className="text-xs text-stone-400 leading-relaxed">
              Are you sure you want to delete <strong>{coachToDelete.fullName}</strong> from the coaching staff? This will remove them from the instructor directory and payroll ledger.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setCoachToDelete(null)}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteCoach(coachToDelete.id);
                  setCoachToDelete(null);
                }}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Confirm & Remove</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// SUBCOMPONENT: ADD / EDIT COACH MODAL
interface AddEditCoachModalProps {
  coach: Coach | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (coach: Coach) => void;
}

const AddEditCoachModal: React.FC<AddEditCoachModalProps> = ({
  coach,
  isOpen,
  onClose,
  onSave,
}) => {
  const [fullName, setFullName] = useState(coach?.fullName || '');
  const [nickname, setNickname] = useState(coach?.nickname || '');
  const [role, setRole] = useState(coach?.role || 'BJJ Instructor');
  const [beltRank, setBeltRank] = useState<BeltRank>(coach?.beltRank || 'Black');
  const [stripes, setStripes] = useState<StripeCount>(coach?.stripes || 1);
  const [email, setEmail] = useState(coach?.email || '');
  const [phone, setPhone] = useState(coach?.phone || '');
  const [avatar, setAvatar] = useState(coach?.avatar || '');
  const [payType, setPayType] = useState<CoachPayType>(coach?.payType || 'per_class');
  const [rate, setRate] = useState<number>(coach?.rate || 45);
  const [studentBonusThreshold, setStudentBonusThreshold] = useState<number>(
    coach?.studentBonusThreshold || 10
  );
  const [studentBonusAmount, setStudentBonusAmount] = useState<number>(
    coach?.studentBonusAmount || 2.5
  );
  const [specialtiesText, setSpecialtiesText] = useState(
    coach?.specialty?.join(', ') || 'Adults Gi, Kids BJJ'
  );
  const [bio, setBio] = useState(coach?.bio || '');
  const [active, setActive] = useState(coach ? coach.active : true);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    const specialties = specialtiesText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const updatedCoach: Coach = {
      id: coach?.id || 'coach-' + Date.now(),
      fullName: fullName.trim(),
      nickname: nickname.trim() || undefined,
      role: role.trim() || 'Instructor',
      beltRank,
      stripes,
      email: email.trim(),
      phone: phone.trim(),
      avatar: avatar.trim() || undefined,
      specialty: specialties,
      payType,
      rate: Number(rate) || 0,
      studentBonusThreshold: Number(studentBonusThreshold) || undefined,
      studentBonusAmount: Number(studentBonusAmount) || undefined,
      active,
      bio: bio.trim() || undefined,
    };

    onSave(updatedCoach);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 sm:p-5 border-b border-stone-800 flex items-center justify-between bg-stone-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-950 border border-red-800 flex items-center justify-center text-red-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                {coach ? `Edit Coach: ${coach.fullName}` : 'Register New Coach'}
              </h3>
              <p className="text-xs text-stone-400">
                Configure profile, belt rank, and salary compensation rates.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[calc(100vh-180px)] overflow-y-auto">
          {/* Names */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-white mb-1">Full Legal Name *</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Lucas Silva"
                className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white mb-1">Mat Title / Nickname</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Professor Lucas"
                className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          {/* Belt & Stripes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-white mb-1">Belt Rank</label>
              <select
                value={beltRank}
                onChange={(e) => setBeltRank(e.target.value as BeltRank)}
                className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
              >
                <option value="Black">Black Belt</option>
                <option value="Brown">Brown Belt</option>
                <option value="Purple">Purple Belt</option>
                <option value="Blue">Blue Belt</option>
                <option value="White">White Belt</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white mb-1">Stripes / Degrees</label>
              <select
                value={stripes}
                onChange={(e) => setStripes(Number(e.target.value) as StripeCount)}
                className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
              >
                <option value={0}>0 Stripes</option>
                <option value={1}>1 Stripe</option>
                <option value={2}>2 Stripes</option>
                <option value={3}>3 Stripes</option>
                <option value={4}>4 Stripes</option>
              </select>
            </div>
          </div>

          {/* Role & Avatar URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-white mb-1">Academy Role</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Head Professor / Youth Director"
                className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white mb-1">Avatar / Photo URL</label>
              <input
                type="url"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                placeholder="https://..."
                className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          {/* Contact Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-white mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="coach@artesuave.bjj"
                className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white mb-1">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 000-0000"
                className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          {/* SALARY & COMPENSATION SECTION */}
          <div className="pt-2 border-t border-stone-800 space-y-3">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-4 h-4" />
              <span>Salary & Pay Structure</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-white mb-1">Pay Model</label>
                <select
                  value={payType}
                  onChange={(e) => setPayType(e.target.value as CoachPayType)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
                >
                  <option value="per_class">Per Class Session ($/class)</option>
                  <option value="hourly">Hourly Rate ($/hour)</option>
                  <option value="monthly_fixed">Fixed Monthly Stipend ($/mo)</option>
                  <option value="per_student">Per Student Check-in ($/student)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white mb-1">
                  Base Pay Rate (JOD)
                </label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={rate}
                  onChange={(e) => setRate(Number(e.target.value))}
                  placeholder="45"
                  className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500 font-bold"
                />
              </div>
            </div>

            {payType === 'per_class' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-stone-950/50 p-3 rounded-xl border border-stone-800">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-300 mb-1">
                    Student Headcount Bonus Threshold
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={studentBonusThreshold}
                    onChange={(e) => setStudentBonusThreshold(Number(e.target.value))}
                    placeholder="10"
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1 text-xs text-white"
                  />
                  <span className="text-[10px] text-stone-500 mt-0.5 block">
                    e.g. When class exceeds 10 students
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-300 mb-1">
                    Bonus per Additional Student (JOD)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={studentBonusAmount}
                    onChange={(e) => setStudentBonusAmount(Number(e.target.value))}
                    placeholder="2.5"
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1 text-xs text-white"
                  />
                  <span className="text-[10px] text-stone-500 mt-0.5 block">
                    e.g. +$2.50 per student above threshold
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Specialties & Bio */}
          <div>
            <label className="block text-xs font-semibold text-white mb-1">
              Programs & Specialties (Comma separated)
            </label>
            <input
              type="text"
              value={specialtiesText}
              onChange={(e) => setSpecialtiesText(e.target.value)}
              placeholder="Kids BJJ, Teens BJJ, Adult Gi, No-Gi Sparring"
              className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white mb-1">Instructor Bio & Notes</label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Master Carlson Gracie lineage, 10+ years coaching..."
              className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="coach-active-check"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="rounded bg-stone-950 border-stone-700 text-red-600 focus:ring-red-500 w-4 h-4"
            />
            <label htmlFor="coach-active-check" className="text-xs text-stone-300 font-semibold cursor-pointer">
              Active Instructor (available for class check-ins)
            </label>
          </div>

          <div className="pt-3 border-t border-stone-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-colors shadow-md"
            >
              {coach ? 'Save Changes' : 'Register Coach'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
