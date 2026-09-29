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
  CreditCard,
  AlertCircle,
  TrendingUp,
  Receipt
} from 'lucide-react';
import { Coach, AttendanceRecord, ClassSession, CoachPayType, BeltRank, StripeCount, CoachSalarySummary, CoachSessionItem } from '../types';
import { BeltBadge } from '../utils/bjjBelts';
import { formatCurrency } from '../utils/currencyUtils';
import { loadCoachPaidMap, saveCoachPaidMap } from '../utils/storage';

interface CoachesDirectoryViewProps {
  coaches: Coach[];
  attendance: AttendanceRecord[];
  classes: ClassSession[];
  onAddCoach: (newCoach: Coach) => void;
  onUpdateCoach: (updatedCoach: Coach) => void;
  onDeleteCoach: (coachId: string) => void;
  theme?: 'light' | 'dark';
}

export const CoachesDirectoryView: React.FC<CoachesDirectoryViewProps> = ({
  coaches,
  attendance,
  classes,
  onAddCoach,
  onUpdateCoach,
  onDeleteCoach,
  theme = 'dark',
}) => {
  // Period filter
  const [periodPreset, setPeriodPreset] = useState<'this_month' | 'last_month' | 'last_30_days' | 'custom'>('this_month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Status Filter: ALL vs NEEDED_END_OF_MONTH (Pending) vs PAID
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'PAID'>('ALL');

  // Search query
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingCoach, setEditingCoach] = useState<Coach | null>(null);
  const [coachToDelete, setCoachToDelete] = useState<Coach | null>(null);
  const [selectedPaySlipCoach, setSelectedPaySlipCoach] = useState<CoachSalarySummary | null>(null);

  // Pay Coach Modal
  const [coachToPay, setCoachToPay] = useState<{ summary: CoachSalarySummary; pendingAmount: number } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Cliq' | 'Bank Transfer' | 'Credit Card'>('Cash');
  const [paymentNote, setPaymentNote] = useState('');

  // Paid status & payments tracker in state
  const [paidCoachesMap, setPaidCoachesMap] = useState<Record<string, { isPaid: boolean; paidAmount?: number; paidDate?: string; paymentMethod?: string; notes?: string }>>(() => loadCoachPaidMap());

  // Reference date: September 2026
  const referenceDate = useMemo(() => new Date('2026-09-21T12:00:00'), []);

  // Compute date bounds
  const { startDateStr, endDateStr, periodLabel, monthEndDeadlineStr } = useMemo(() => {
    const end = new Date(referenceDate);
    const start = new Date(referenceDate);

    if (periodPreset === 'this_month') {
      start.setDate(1);
      const sStr = start.toISOString().split('T')[0];
      const eStr = end.toISOString().split('T')[0];
      return {
        startDateStr: sStr,
        endDateStr: eStr,
        periodLabel: 'September 2026 (Current Month)',
        monthEndDeadlineStr: 'Sep 30, 2026',
      };
    } else if (periodPreset === 'last_month') {
      start.setMonth(start.getMonth() - 1, 1);
      end.setDate(0);
      const sStr = start.toISOString().split('T')[0];
      const eStr = end.toISOString().split('T')[0];
      return {
        startDateStr: sStr,
        endDateStr: eStr,
        periodLabel: 'August 2026 (Previous Month)',
        monthEndDeadlineStr: 'Aug 31, 2026',
      };
    } else if (periodPreset === 'last_30_days') {
      start.setDate(start.getDate() - 30);
      const sStr = start.toISOString().split('T')[0];
      const eStr = end.toISOString().split('T')[0];
      return {
        startDateStr: sStr,
        endDateStr: eStr,
        periodLabel: 'Last 30 Days',
        monthEndDeadlineStr: 'Month End',
      };
    } else {
      return {
        startDateStr: customStartDate || '2020-01-01',
        endDateStr: customEndDate || '2030-12-31',
        periodLabel: `${customStartDate || 'Start'} to ${customEndDate || 'End'}`,
        monthEndDeadlineStr: 'Custom Period End',
      };
    }
  }, [periodPreset, referenceDate, customStartDate, customEndDate]);

  // Aggregate sessions taught and student count per coach in the selected period
  const coachSalarySummaries: CoachSalarySummary[] = useMemo(() => {
    // 1. Filter attendance records in date range
    const periodAttendance = attendance.filter(
      (a) => a.date >= startDateStr && a.date <= endDateStr
    );

    // Group attendance records by unique session: `${date}__${className}__${coach}`
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

  // Enriched salary items with paid & month-end pending amounts
  const enrichedCoachSummaries = useMemo(() => {
    return coachSalarySummaries.map((summary) => {
      const paidInfo = paidCoachesMap[summary.coach.id];
      const isPaid = !!paidInfo?.isPaid;
      const paidAmount = isPaid ? (paidInfo?.paidAmount ?? summary.totalEarnings) : 0;
      const pendingAmount = Math.max(0, summary.totalEarnings - paidAmount);

      return {
        ...summary,
        isPaid,
        paidAmount,
        pendingAmount,
        paidDate: paidInfo?.paidDate,
        paymentMethod: paidInfo?.paymentMethod,
        notes: paidInfo?.notes,
      };
    });
  }, [coachSalarySummaries, paidCoachesMap]);

  // Overall Financial Totals
  const totalPayrollDue = useMemo(
    () => enrichedCoachSummaries.reduce((acc, s) => acc + s.totalEarnings, 0),
    [enrichedCoachSummaries]
  );

  const totalPaidAmount = useMemo(
    () => enrichedCoachSummaries.reduce((acc, s) => acc + s.paidAmount, 0),
    [enrichedCoachSummaries]
  );

  const totalPendingMonthEnd = useMemo(
    () => enrichedCoachSummaries.reduce((acc, s) => acc + s.pendingAmount, 0),
    [enrichedCoachSummaries]
  );

  const totalClassesTaught = useMemo(
    () => enrichedCoachSummaries.reduce((acc, s) => acc + s.sessionsCount, 0),
    [enrichedCoachSummaries]
  );

  // Filtered summaries by status & search query
  const filteredSummaries = useMemo(() => {
    return enrichedCoachSummaries.filter((s) => {
      // Status filter
      if (statusFilter === 'PENDING' && s.pendingAmount <= 0) return false;
      if (statusFilter === 'PAID' && !s.isPaid) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          s.coach.fullName.toLowerCase().includes(q) ||
          (s.coach.nickname && s.coach.nickname.toLowerCase().includes(q)) ||
          s.coach.role.toLowerCase().includes(q) ||
          s.coach.beltRank.toLowerCase().includes(q) ||
          s.coach.specialty.some((spec) => spec.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [enrichedCoachSummaries, statusFilter, searchQuery]);

  const pendingCoachesCount = useMemo(
    () => enrichedCoachSummaries.filter((s) => s.pendingAmount > 0).length,
    [enrichedCoachSummaries]
  );

  const paidCoachesCount = useMemo(
    () => enrichedCoachSummaries.filter((s) => s.isPaid).length,
    [enrichedCoachSummaries]
  );

  // Handle Recording Payment / Marking as Paid
  const handleOpenPayModal = (summary: CoachSalarySummary, pendingAmount: number) => {
    setCoachToPay({ summary, pendingAmount });
    setPaymentAmount(pendingAmount > 0 ? pendingAmount : summary.totalEarnings);
    setPaymentMethod('Cash');
    setPaymentNote(`Month-end salary payment for ${periodLabel}`);
  };

  const handleConfirmPayment = () => {
    if (!coachToPay) return;
    const coachId = coachToPay.summary.coach.id;
    const todayStr = new Date().toISOString().split('T')[0];

    const updatedMap = {
      ...paidCoachesMap,
      [coachId]: {
        isPaid: true,
        paidAmount: Number(paymentAmount) || coachToPay.summary.totalEarnings,
        paidDate: todayStr,
        paymentMethod,
        notes: paymentNote.trim(),
      },
    };

    setPaidCoachesMap(updatedMap);
    saveCoachPaidMap(updatedMap);
    setCoachToPay(null);
  };

  const handleTogglePaidQuick = (coachId: string, currentPaid: boolean, totalAmount: number) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const updatedMap = {
      ...paidCoachesMap,
      [coachId]: currentPaid
        ? { isPaid: false, paidAmount: 0 }
        : {
            isPaid: true,
            paidAmount: totalAmount,
            paidDate: todayStr,
            paymentMethod: 'Cash',
            notes: `Full payout marked on ${todayStr}`,
          },
    };
    setPaidCoachesMap(updatedMap);
    saveCoachPaidMap(updatedMap);
  };

  // Export payroll to CSV
  const handleExportPayrollCSV = () => {
    const headers = [
      'Coach ID',
      'Coach Name',
      'Belt Rank',
      'Academy Role',
      'Pay Model',
      'Base Rate',
      'Sessions Coached',
      'Students Taught',
      'Avg Class Size',
      'Gross Salary (JOD)',
      'Paid Amount (JOD)',
      'Pending Needed at Month End (JOD)',
      'Payout Status',
      'Paid Date',
      'Payment Method',
      'Period',
    ];

    const rows = enrichedCoachSummaries.map((s) => [
      s.coach.id,
      `"${s.coach.fullName}${s.coach.nickname ? ` (${s.coach.nickname})` : ''}"`,
      s.coach.beltRank,
      `"${s.coach.role}"`,
      s.coach.payType,
      s.coach.rate,
      s.sessionsCount,
      s.totalStudentsTaught,
      s.averageClassSize,
      s.totalEarnings.toFixed(2),
      s.paidAmount.toFixed(2),
      s.pendingAmount.toFixed(2),
      s.isPaid ? 'PAID' : 'PENDING_MONTH_END',
      s.paidDate || '—',
      s.paymentMethod || '—',
      `"${periodLabel}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Coach_Salaries_Payroll_${periodPreset}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* 1. SEARCH COACH SPACE */}
      <div className="relative w-full">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search coach by name, specialty, or phone..."
          className="w-full bg-stone-900 border border-stone-800 rounded-2xl pl-10 pr-10 py-2.5 sm:py-3 text-xs sm:text-sm text-white placeholder-stone-500 focus:outline-hidden focus:border-amber-500 shadow-sm transition-all"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            title="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 2. MAIN TABLE: COACH SALARIES, PAYMENTS PAID & PAYMENTS NEEDED AT MONTH END */}
      <div className="bg-stone-900 rounded-2xl border border-stone-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-950 text-stone-400 text-[10px] uppercase tracking-wider font-black border-b border-stone-800">
              <tr>
                <th className="py-3.5 px-4">Coach / Instructor</th>
                <th className="py-3.5 px-3">Belt Rank</th>
                <th className="py-3.5 px-3">Pay Structure</th>
                <th className="py-3.5 px-3 text-center">Sessions Coached</th>
                <th className="py-3.5 px-3 text-right">Total Month Salary</th>
                <th className="py-3.5 px-3 text-right">Paid Amount</th>
                <th className="py-3.5 px-3 text-right">Needed at Month End</th>
                <th className="py-3.5 px-3 text-center">Payout Status</th>
                <th className="py-3.5 px-4 text-right">Payment Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/70 font-sans">
              {filteredSummaries.map((summary) => {
                const isPaid = summary.isPaid;
                const pending = summary.pendingAmount;

                return (
                  <tr key={summary.coach.id} className="hover:bg-stone-850/50 transition-colors">
                    {/* Coach Info */}
                    <td className="py-3.5 px-4">
                      <div className="font-black text-white text-sm">
                        {summary.coach.fullName}
                      </div>
                      <div className="text-[11px] text-stone-400 mt-0.5 flex items-center gap-1.5">
                        {summary.coach.nickname && (
                          <span className="text-amber-400 font-medium">"{summary.coach.nickname}"</span>
                        )}
                        <span>•</span>
                        <span>{summary.coach.role}</span>
                      </div>
                    </td>

                    {/* Belt */}
                    <td className="py-3.5 px-3">
                      <BeltBadge
                        belt={summary.coach.beltRank}
                        stripes={summary.coach.stripes}
                        size="sm"
                      />
                    </td>

                    {/* Pay Model */}
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-stone-950 text-stone-300 border border-stone-800">
                        {summary.coach.payType === 'per_class' && `${formatCurrency(summary.coach.rate, 'JOD')} / class`}
                        {summary.coach.payType === 'hourly' && `${formatCurrency(summary.coach.rate, 'JOD')} / hr`}
                        {summary.coach.payType === 'monthly_fixed' && `${formatCurrency(summary.coach.rate, 'JOD')} / mo fixed`}
                        {summary.coach.payType === 'per_student' && `${formatCurrency(summary.coach.rate, 'JOD')} / student`}
                      </span>
                    </td>

                    {/* Sessions & Headcount */}
                    <td className="py-3.5 px-3 text-center">
                      <span className="font-bold text-white text-sm">
                        {summary.sessionsCount}
                      </span>
                      <span className="text-[10px] text-stone-500 block">
                        {summary.totalStudentsTaught} students (avg {summary.averageClassSize})
                      </span>
                    </td>

                    {/* Total Month Salary */}
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-white text-sm">
                      {formatCurrency(summary.totalEarnings, 'JOD')}
                    </td>

                    {/* Paid Amount */}
                    <td className="py-3.5 px-3 text-right font-mono text-sm">
                      {summary.paidAmount > 0 ? (
                        <span className="text-emerald-400 font-bold">
                          {formatCurrency(summary.paidAmount, 'JOD')}
                        </span>
                      ) : (
                        <span className="text-stone-500">0.00 JOD</span>
                      )}
                      {summary.paidDate && (
                        <span className="text-[10px] text-stone-500 block font-sans">
                          {summary.paidDate} ({summary.paymentMethod || 'Cash'})
                        </span>
                      )}
                    </td>

                    {/* Needed at End of Month (Pending Balance) */}
                    <td className="py-3.5 px-3 text-right font-mono font-black text-sm">
                      {pending > 0 ? (
                        <div className="inline-flex flex-col items-end">
                          <span className="px-2 py-0.5 rounded-lg bg-amber-950 text-amber-300 border border-amber-800 text-xs font-black">
                            {formatCurrency(pending, 'JOD')}
                          </span>
                          <span className="text-[10px] text-amber-400/80 font-sans mt-0.5">
                            Due {monthEndDeadlineStr}
                          </span>
                        </div>
                      ) : (
                        <span className="text-emerald-400 font-bold text-xs inline-flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>0.00 (Settled)</span>
                        </span>
                      )}
                    </td>

                    {/* Payout Status Badge */}
                    <td className="py-3.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleTogglePaidQuick(summary.coach.id, isPaid, summary.totalEarnings)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black inline-flex items-center gap-1 transition-all cursor-pointer ${
                          isPaid
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 hover:bg-emerald-900'
                            : 'bg-amber-950/80 text-amber-300 border border-amber-800 hover:bg-amber-900'
                        }`}
                        title="Click to quickly toggle paid status"
                      >
                        {isPaid ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Paid in Full</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3 text-amber-400" />
                            <span>Pending Pay</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Payment Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {pending > 0 ? (
                          <button
                            type="button"
                            onClick={() => handleOpenPayModal(summary, pending)}
                            className="px-2.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 rounded-lg text-xs font-black inline-flex items-center gap-1 transition-all shadow-xs cursor-pointer active:scale-95"
                            title="Record salary payment disbursement"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Pay Coach</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenPayModal(summary, 0)}
                            className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-750 text-stone-300 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                            title="Update payment details"
                          >
                            <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Receipt</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setSelectedPaySlipCoach(summary)}
                          className="p-1.5 bg-stone-800 hover:bg-stone-750 text-stone-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          title="View itemized pay slip & session breakdown"
                        >
                          <FileText className="w-3.5 h-3.5 text-amber-400" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingCoach(summary.coach);
                            setIsAddEditModalOpen(true);
                          }}
                          className="p-1.5 bg-stone-800 hover:bg-stone-750 text-stone-300 rounded-lg transition-colors cursor-pointer"
                          title="Edit Coach Details & Salary Rate"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setCoachToDelete(summary.coach)}
                          className="p-1.5 bg-stone-800 hover:bg-red-950 hover:text-red-400 text-stone-400 rounded-lg transition-colors cursor-pointer"
                          title="Delete Coach"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredSummaries.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-stone-500 italic">
                    {coaches.filter((c) => !c.isDeleted).length === 0
                      ? 'No coaches registered on the roster. Click "+ Add Coach" to register professors and compensation structures.'
                      : 'No coach records match the current status and search filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: RECORD SALARY PAYMENT DISBURSEMENT */}
      {coachToPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 border-b border-stone-800 bg-stone-950 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-white text-base">
                    Disburse Coach Salary
                  </h3>
                  <p className="text-xs text-stone-400">
                    To: <strong className="text-amber-300">{coachToPay.summary.coach.fullName}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCoachToPay(null)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <div className="p-5 space-y-4">
              {/* Summary Card */}
              <div className="p-3.5 bg-stone-950 rounded-2xl border border-stone-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-stone-400 block">Total Month Obligation:</span>
                  <span className="font-bold text-white text-sm">
                    {formatCurrency(coachToPay.summary.totalEarnings, 'JOD')}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-amber-400 block font-bold">Needed at Month End:</span>
                  <span className="font-black text-amber-300 text-sm font-mono">
                    {formatCurrency(coachToPay.pendingAmount, 'JOD')}
                  </span>
                </div>
              </div>

              {/* Amount to Disburse */}
              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1.5">
                  Payment Amount to Disburse (JOD) *
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-white font-mono font-black text-base focus:outline-hidden focus:border-amber-500"
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1.5">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Cash', 'Cliq', 'Bank Transfer', 'Credit Card'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        paymentMethod === method
                          ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-sm'
                          : 'bg-stone-950 text-stone-300 border-stone-800 hover:border-stone-700'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {/* Receipt Note */}
              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1.5">
                  Payment Notes / Reference #
                </label>
                <input
                  type="text"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="e.g. Month-end payroll cash envelope"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white placeholder-stone-500 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setCoachToPay(null)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPayment}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-xl text-xs font-black transition-all shadow-md inline-flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm Payout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ITEMIZE PAY SLIP MODAL */}
      {selectedPaySlipCoach && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Pay Slip Header */}
            <div className="p-5 border-b border-stone-800 bg-stone-950 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-white text-base">
                    Coach Compensation Statement & Pay Slip
                  </h3>
                  <p className="text-xs text-stone-400">Period: {periodLabel}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPaySlipCoach(null)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Pay Slip Body */}
            <div className="p-5 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
              {/* Coach Summary Banner */}
              <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 flex items-center justify-between">
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
                  <div className="text-2xl font-black text-amber-300 font-mono">
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
                <div className="border border-stone-800 rounded-2xl overflow-hidden bg-stone-950">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-900 text-stone-400 text-[10px] uppercase tracking-wider font-bold">
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
                          <tr key={idx} className="hover:bg-stone-900/40">
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
            <div className="p-4 border-t border-stone-800 bg-stone-950 flex items-center justify-between">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Statement</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPaySlipCoach(null)}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD / EDIT COACH MODAL */}
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

      {/* MODAL 4: IN-APP COACH DELETE CONFIRMATION MODAL */}
      {coachToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-stone-900 border border-red-500/40 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Remove Coach?</h3>
                <p className="text-xs text-stone-400">Remove instructor from academy roster.</p>
              </div>
            </div>

            <div className="p-3.5 bg-stone-950 rounded-2xl border border-stone-800 space-y-1.5 text-xs">
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
      <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 sm:p-5 border-b border-stone-800 flex items-center justify-between bg-stone-950">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-red-950 border border-red-800 flex items-center justify-center text-red-400">
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
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
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
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white mb-1">Mat Title / Nickname</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Professor Lucas"
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-red-500"
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
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-red-500"
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
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-red-500"
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
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white mb-1">Avatar / Photo URL</label>
              <input
                type="url"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                placeholder="https://..."
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-red-500"
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
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white mb-1">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 000-0000"
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-red-500"
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
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-red-500"
                >
                  <option value="per_class">Per Class Session (JOD / class)</option>
                  <option value="hourly">Hourly Rate (JOD / hour)</option>
                  <option value="monthly_fixed">Fixed Monthly Stipend (JOD / month)</option>
                  <option value="per_student">Per Student Check-in (JOD / student)</option>
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
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-red-500 font-bold"
                />
              </div>
            </div>

            {payType === 'per_class' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-stone-950/50 p-3 rounded-2xl border border-stone-800">
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
                    className="w-full bg-stone-900 border border-stone-800 rounded-xl px-2.5 py-1 text-xs text-white"
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
                    className="w-full bg-stone-900 border border-stone-800 rounded-xl px-2.5 py-1 text-xs text-white"
                  />
                  <span className="text-[10px] text-stone-500 mt-0.5 block">
                    e.g. +2.50 JOD per student above threshold
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
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-red-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white mb-1">Instructor Bio & Notes</label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Master Carlson Gracie lineage, 10+ years coaching..."
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-red-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="coach-active-check"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="rounded bg-stone-950 border-stone-800 text-red-600 focus:ring-red-500 w-4 h-4"
            />
            <label htmlFor="coach-active-check" className="text-xs text-stone-300 font-semibold cursor-pointer">
              Active Instructor (available for class check-ins)
            </label>
          </div>

          <div className="pt-3 border-t border-stone-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-colors shadow-md cursor-pointer"
            >
              {coach ? 'Save Changes' : 'Register Coach'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
