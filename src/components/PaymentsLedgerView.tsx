import React, { useState } from 'react';
import { 
  CreditCard, 
  Search, 
  Filter, 
  Download, 
  Receipt, 
  PlusCircle, 
  DollarSign, 
  TrendingUp, 
  Calendar,
  Wallet,
  ArrowUpDown,
  Award,
  Users
} from 'lucide-react';
import { PaymentRecord, Member, PaymentMethod, Coach, AttendanceRecord, ClassSession } from '../types';
import { BeltBadge } from '../utils/bjjBelts';
import { formatCurrency } from '../utils/currencyUtils';
import { CoachesDirectoryView } from './CoachesDirectoryView';

interface PaymentsLedgerViewProps {
  payments: PaymentRecord[];
  members: Member[];
  coaches?: Coach[];
  attendance?: AttendanceRecord[];
  classes?: ClassSession[];
  onOpenPayment: () => void;
  onViewReceipt: (payment: PaymentRecord) => void;
  onAddCoach?: (coach: Coach) => void;
  onUpdateCoach?: (coach: Coach) => void;
  onDeleteCoach?: (coachId: string) => void;
}

export const PaymentsLedgerView: React.FC<PaymentsLedgerViewProps> = ({
  payments,
  members,
  coaches = [],
  attendance = [],
  classes = [],
  onOpenPayment,
  onViewReceipt,
  onAddCoach,
  onUpdateCoach,
  onDeleteCoach,
}) => {
  const [mainSubTab, setMainSubTab] = useState<'student_payments' | 'coach_salaries'>('student_payments');
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [dateRangeFilter, setDateRangeFilter] = useState<'ALL' | 'THIS_MONTH' | 'LAST_30_DAYS'>('ALL');
  const [sortOrder, setSortOrder] = useState<'DATETIME_DESC' | 'DATETIME_ASC' | 'AMOUNT_DESC' | 'AMOUNT_ASC'>('DATETIME_DESC');

  // Member map for quick lookup
  const memberMap = new Map(members.map((m) => [m.id, m]));

  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Filtered payments
  const filteredPayments = payments.filter((p) => {
    // Search
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      p.memberName.toLowerCase().includes(q) ||
      p.receiptNumber.toLowerCase().includes(q) ||
      p.membershipPackage.toLowerCase().includes(q);

    // Method
    const matchesMethod = methodFilter === 'ALL' || p.paymentMethod === methodFilter;

    // Date
    let matchesDate = true;
    if (dateRangeFilter === 'THIS_MONTH') {
      matchesDate = p.date.startsWith(currentYearMonth);
    } else if (dateRangeFilter === 'LAST_30_DAYS') {
      const pDate = new Date(p.date).getTime();
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      matchesDate = pDate >= thirtyDaysAgo;
    }

    return matchesSearch && matchesMethod && matchesDate;
  });

  // Strict sorting by date and time
  const sortedPayments = [...filteredPayments].sort((a, b) => {
    if (sortOrder === 'DATETIME_DESC' || sortOrder === 'DATETIME_ASC') {
      const timeA = new Date(`${a.date} ${a.time || '00:00'}`).getTime() || new Date(a.date).getTime() || 0;
      const timeB = new Date(`${b.date} ${b.time || '00:00'}`).getTime() || new Date(b.date).getTime() || 0;
      return sortOrder === 'DATETIME_DESC' ? timeB - timeA : timeA - timeB;
    }
    if (sortOrder === 'AMOUNT_DESC') return b.amount - a.amount;
    if (sortOrder === 'AMOUNT_ASC') return a.amount - b.amount;
    return 0;
  });

  // Financial calculations
  const totalAllTime = payments.reduce((acc, p) => acc + p.amount, 0);
  const thisMonthPayments = payments.filter((p) => p.date.startsWith(currentYearMonth));
  const totalThisMonth = thisMonthPayments.reduce((acc, p) => acc + p.amount, 0);
  const averagePayment = payments.length > 0 ? totalAllTime / payments.length : 0;

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Receipt', 'Date', 'Time', 'Student', 'Package', 'Classes Credited', 'Amount', 'Method', 'Notes'];
    const rows = sortedPayments.map((p) => [
      p.receiptNumber,
      p.date,
      p.time,
      `"${p.memberName}"`,
      `"${p.membershipPackage}"`,
      p.classesCredited,
      p.amount.toFixed(2),
      p.paymentMethod,
      `"${p.notes || ''}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bjj_payments_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Sub-Pages Navigation: Student Payments vs Coach Salaries */}
      <div className="flex items-center gap-2 bg-stone-900 p-2 rounded-2xl border border-stone-800 shadow-sm">
        <button
          type="button"
          onClick={() => setMainSubTab('student_payments')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black inline-flex items-center justify-center gap-2 transition-all cursor-pointer ${
            mainSubTab === 'student_payments'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-stone-400 hover:text-white hover:bg-stone-800'
          }`}
        >
          <CreditCard className="w-4 h-4 text-emerald-400" />
          <span>Student Payments & Tuition ({payments.length} Records)</span>
        </button>

        <button
          type="button"
          onClick={() => setMainSubTab('coach_salaries')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black inline-flex items-center justify-center gap-2 transition-all cursor-pointer ${
            mainSubTab === 'coach_salaries'
              ? 'bg-amber-600 text-stone-950 shadow-md'
              : 'text-stone-400 hover:text-white hover:bg-stone-800'
          }`}
        >
          <DollarSign className="w-4 h-4 text-amber-300" />
          <span>Coach Salaries & Payroll Engine ({coaches.length} Instructors)</span>
        </button>
      </div>

      {mainSubTab === 'coach_salaries' ? (
        <CoachesDirectoryView
          coaches={coaches}
          attendance={attendance}
          classes={classes}
          onAddCoach={onAddCoach || (() => {})}
          onUpdateCoach={onUpdateCoach || (() => {})}
          onDeleteCoach={onDeleteCoach || (() => {})}
        />
      ) : (
        <>
          {/* Top Header & Metrics Grid */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-900 p-4 rounded-xl border border-stone-800">
            <div>
              <h2 className="text-lg font-bold text-white">Payments & Tuition Ledger</h2>
              <p className="text-xs text-stone-400">
                Track student payment records, payment dates, amounts, and punch-card renewals.
              </p>
            </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 border border-stone-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={onOpenPayment}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Record New Payment</span>
          </button>
        </div>
      </div>

      {/* Financial Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Collected This Month */}
        <div className="p-4 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
              Collected This Month
            </span>
            <div className="text-2xl font-black text-emerald-400 mt-1 font-mono-digits">
              {formatCurrency(totalThisMonth, 'JOD')}
            </div>
            <div className="text-xs text-stone-400 mt-0.5">
              {thisMonthPayments.length} transactions in {now.toLocaleString('default', { month: 'short' })}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-400">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Total Revenue All-Time */}
        <div className="p-4 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
              Total Recorded Revenue
            </span>
            <div className="text-2xl font-black text-white mt-1 font-mono-digits">
              {formatCurrency(totalAllTime, 'JOD')}
            </div>
            <div className="text-xs text-stone-400 mt-0.5">
              {payments.length} total payments logged
            </div>
          </div>
          <div className="p-3 rounded-xl bg-stone-800 text-stone-300">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Average Payment */}
        <div className="p-4 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
              Average Transaction
            </span>
            <div className="text-2xl font-black text-blue-400 mt-1 font-mono-digits">
              {formatCurrency(averagePayment, 'JOD')}
            </div>
            <div className="text-xs text-stone-400 mt-0.5">
              Average renewal or registration
            </div>
          </div>
          <div className="p-3 rounded-xl bg-blue-950/60 border border-blue-800/80 text-blue-400">
            <Wallet className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-stone-900 p-3.5 rounded-xl border border-stone-800 flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search by student name, receipt #, or package..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-stone-950 border border-stone-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-stone-400 focus:outline-none focus:border-red-500"
          />
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-1.5 w-full md:w-auto">
          <span className="text-[11px] text-stone-400 whitespace-nowrap">Period:</span>
          <select
            value={dateRangeFilter}
            onChange={(e) => setDateRangeFilter(e.target.value as any)}
            className="bg-stone-950 border border-stone-700 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-red-500 w-full md:w-auto"
          >
            <option value="ALL">All Time</option>
            <option value="THIS_MONTH">This Month</option>
            <option value="LAST_30_DAYS">Last 30 Days</option>
          </select>
        </div>

        {/* Method Filter */}
        <div className="flex items-center gap-1.5 w-full md:w-auto">
          <span className="text-[11px] text-stone-400 whitespace-nowrap">Method:</span>
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="bg-stone-950 border border-stone-700 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-red-500 w-full md:w-auto font-medium"
          >
            <option value="ALL">All Methods</option>
            <option value="Credit Card">Credit Card</option>
            <option value="Cash">Cash</option>
            <option value="Cliq">Cliq</option>
          </select>
        </div>

        {/* Date & Time Sort Order Selector */}
        <div className="flex items-center gap-1.5 w-full md:w-auto">
          <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[11px] text-stone-400 whitespace-nowrap">Sort:</span>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
            className="bg-stone-950 border border-stone-700 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500 w-full md:w-auto font-semibold"
          >
            <option value="DATETIME_DESC">Date & Time: Newest First</option>
            <option value="DATETIME_ASC">Date & Time: Oldest First</option>
            <option value="AMOUNT_DESC">Amount: High to Low</option>
            <option value="AMOUNT_ASC">Amount: Low to High</option>
          </select>
        </div>
      </div>

      {/* Payments Ledger Table */}
      <div className="bg-stone-900 rounded-xl border border-stone-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-950 text-stone-400 text-[10px] uppercase tracking-wider font-semibold border-b border-stone-800">
              <tr>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-3">Student Name</th>
                <th className="py-3 px-3">Membership Package</th>
                <th className="py-3 px-3">Classes Added</th>
                <th className="py-3 px-3">Current Remaining</th>
                <th className="py-3 px-3">Method</th>
                <th className="py-3 px-3">Amount</th>
                <th className="py-3 px-4 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/80">
              {sortedPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-stone-400">
                    No payment records match your filters.
                  </td>
                </tr>
              ) : (
                sortedPayments.map((pay) => {
                  const member = memberMap.get(pay.memberId);

                  return (
                    <tr key={pay.id} className="hover:bg-stone-800/40 transition-colors">
                      {/* Date & Time */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{pay.date}</div>
                        <div className="text-[10px] text-stone-400">{pay.time}</div>
                      </td>

                      {/* Student */}
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-white">{pay.memberName}</div>
                        {member && (
                          <div className="mt-0.5">
                            <BeltBadge belt={member.beltRank} stripes={member.stripes} size="sm" showLabel={false} />
                          </div>
                        )}
                      </td>

                      {/* Package */}
                      <td className="py-3.5 px-3">
                        <div className="font-medium text-stone-200">{pay.membershipPackage}</div>
                        {pay.notes && (
                          <div className="text-[10px] text-stone-400 truncate max-w-[180px]">
                            {pay.notes}
                          </div>
                        )}
                      </td>

                      {/* Classes Added */}
                      <td className="py-3.5 px-3">
                        {pay.classesCredited > 0 ? (
                          <span className="font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                            +{pay.classesCredited} classes
                          </span>
                        ) : (
                          <span className="font-semibold text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/60">
                            Unlimited
                          </span>
                        )}
                      </td>

                      {/* Current Student Balance Right Now */}
                      <td className="py-3.5 px-3">
                        {member ? (
                          member.membershipType === 'monthly_unlimited' ? (
                            <span className="text-blue-400 font-semibold">Unlimited</span>
                          ) : (
                            <span
                              className={`font-bold ${
                                member.classesRemaining <= 1
                                  ? 'text-red-400'
                                  : member.classesRemaining <= 2
                                  ? 'text-amber-400'
                                  : 'text-stone-300'
                              }`}
                            >
                              {member.classesRemaining} left now
                            </span>
                          )
                        ) : (
                          <span className="text-stone-500">—</span>
                        )}
                      </td>

                      {/* Method */}
                      <td className="py-3.5 px-3 text-stone-300">
                        <span className="px-2 py-0.5 rounded bg-stone-800 text-[11px] font-medium border border-stone-700">
                          {pay.paymentMethod}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-3 font-black text-emerald-400 text-sm font-mono-digits whitespace-nowrap">
                        {formatCurrency(pay.amount, pay.currency || 'JOD')}
                      </td>

                      {/* Receipt Action */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => onViewReceipt(pay)}
                          className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 border border-stone-700 transition-colors"
                          title="Open official receipt"
                        >
                          <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{pay.receiptNumber}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}
    </div>
  );
};
