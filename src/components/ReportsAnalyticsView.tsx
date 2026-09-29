import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  ShoppingBag, 
  DollarSign, 
  Calendar, 
  Download, 
  Printer, 
  Filter, 
  FileText, 
  PlusCircle, 
  UserPlus, 
  CreditCard, 
  X, 
  PieChart, 
  Layers,
  Award,
  CheckCircle2,
  Building2,
  Zap,
  Tag,
  MessageCircle,
  Activity,
  Sparkles,
  Clock,
  ChevronRight,
  Eye,
  RefreshCw,
  Scale,
  Search
} from 'lucide-react';
import { 
  Member, 
  PaymentRecord, 
  GymSettings, 
  MerchSaleRecord, 
  ExpenseRecord, 
  ExpenseCategory, 
  AttendanceRecord, 
  Coach, 
  ClassSession, 
  SubscriptionPlan 
} from '../types';
import { formatCurrency } from '../utils/currencyUtils';

interface ReportsAnalyticsViewProps {
  theme?: 'dark' | 'light';
  settings: GymSettings;
  members: Member[];
  payments: PaymentRecord[];
  sales: MerchSaleRecord[];
  expenses: ExpenseRecord[];
  attendance?: AttendanceRecord[];
  coaches?: Coach[];
  classes?: ClassSession[];
  subscriptionPlans?: SubscriptionPlan[];
  onAddExpense?: (expense: ExpenseRecord) => void;
  onNavigateTab?: (tab: any) => void;
}

type TimeRangePreset = 
  | 'today'
  | 'this_week'
  | 'this_month' 
  | 'last_month' 
  | 'last_3_months' 
  | 'last_6_months' 
  | 'ytd' 
  | 'all' 
  | 'custom';

type ReportTab = 
  | 'filter_all'
  | 'summary' 
  | 'pl_statement' 
  | 'new_students' 
  | 'gear_sales' 
  | 'expenses' 
  | 'attendance';

type MasterRecordType = 'all' | 'new_students' | 'expenses' | 'gear_sales' | 'tuition_payments' | 'attendance';

interface UnifiedBusinessRecord {
  id: string;
  type: 'new_student' | 'expense' | 'gear_sale' | 'tuition_payment' | 'attendance';
  typeLabel: string;
  date: string;
  time: string;
  title: string;
  subtitle: string;
  category: string;
  amount: number;
  flow: 'inflow' | 'outflow' | 'neutral';
  paymentMethod: string;
  refCode?: string;
  raw: any;
}

interface MonthlyPerformanceMetric {
  monthKey: string; // YYYY-MM
  label: string; // e.g. "Sep 2026"
  fullLabel: string; // e.g. "September 2026"
  year: number;
  monthIndex: number; // 0-11
  startDate: string;
  endDate: string;
  tuitionRevenue: number;
  merchRevenue: number;
  totalGrossRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMarginPercent: number;
  newStudentsCount: number;
  newStudentsRevenue: number;
  activeMembersCount: number;
  attendanceCheckInsCount: number;
  momRevenueGrowthPercent?: number;
  momExpenseGrowthPercent?: number;
  momNetProfitGrowthPercent?: number;
}

export const ReportsAnalyticsView: React.FC<ReportsAnalyticsViewProps> = ({
  theme = 'dark',
  settings,
  members,
  payments,
  sales,
  expenses,
  attendance = [],
  coaches = [],
  classes = [],
  subscriptionPlans = [],
  onAddExpense,
  onNavigateTab,
}) => {
  const isLight = theme === 'light';
  const currency = settings.currencySymbol || 'JOD';

  // Active Report Category Tab
  const [activeTab, setActiveTab] = useState<ReportTab>('summary');

  // Time Range Preset & Custom Picker State
  const [timePreset, setTimePreset] = useState<TimeRangePreset>('this_month');
  
  // Selected Closed Month for P&L Statement Tab (defaults to Current Month: September 2026)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth(); // 0-indexed (8 for Sep)
  
  const defaultCurrentMonthKey = useMemo(() => {
    const mStr = String(currentMonthIdx + 1).padStart(2, '0');
    return `${currentYear}-${mStr}`;
  }, [currentYear, currentMonthIdx]);

  const [selectedPlMonthKey, setSelectedPlMonthKey] = useState<string>(defaultCurrentMonthKey);

  // Helper date strings
  const todayStr = now.toISOString().split('T')[0];

  const getFirstDayOfMonth = (d: Date) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  };

  const getLastDayOfMonth = (d: Date) => {
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
  };

  // Preset Dates Computed
  const [customStartDate, setCustomStartDate] = useState(() => getFirstDayOfMonth(now));
  const [customEndDate, setCustomEndDate] = useState(() => todayStr);

  // Quick Month Select Action Helper
  const handleSelectSpecificMonth = (monthKey: string) => {
    const [yStr, mStr] = monthKey.split('-');
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10) - 1;
    const firstDay = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const lastDay = getLastDayOfMonth(new Date(y, m, 15));
    
    setCustomStartDate(firstDay);
    setCustomEndDate(lastDay);
    setTimePreset('custom');
    setSelectedPlMonthKey(monthKey);
  };

  // Compute Active Date Range [startDate, endDate]
  const dateRange = useMemo<[string, string]>(() => {
    if (timePreset === 'today') {
      return [todayStr, todayStr];
    }
    if (timePreset === 'this_week') {
      const d = new Date(now);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday or Saturday
      const startOfWeek = new Date(d.setDate(diff));
      const wStart = startOfWeek.toISOString().split('T')[0];
      return [wStart < todayStr ? wStart : todayStr, todayStr];
    }
    if (timePreset === 'this_month') {
      return [getFirstDayOfMonth(now), todayStr];
    }
    if (timePreset === 'last_month') {
      const prevMonthDate = new Date(currentYear, currentMonthIdx - 1, 1);
      return [getFirstDayOfMonth(prevMonthDate), getLastDayOfMonth(prevMonthDate)];
    }
    if (timePreset === 'last_3_months') {
      const d3m = new Date(currentYear, currentMonthIdx - 2, 1);
      return [getFirstDayOfMonth(d3m), todayStr];
    }
    if (timePreset === 'last_6_months') {
      const d6m = new Date(currentYear, currentMonthIdx - 5, 1);
      return [getFirstDayOfMonth(d6m), todayStr];
    }
    if (timePreset === 'ytd') {
      return [`${currentYear}-01-01`, todayStr];
    }
    if (timePreset === 'all') {
      return ['2020-01-01', '2030-12-31'];
    }
    return [customStartDate || '2026-01-01', customEndDate || todayStr];
  }, [timePreset, customStartDate, customEndDate, todayStr, currentYear, currentMonthIdx, now]);

  const [startDate, endDate] = dateRange;

  // Universal Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMasterType, setSelectedMasterType] = useState<MasterRecordType>('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string>('all');
  const [selectedExpenseCategory, setSelectedExpenseCategory] = useState<string>('all');
  const [selectedGearCategory, setSelectedGearCategory] = useState<string>('all');
  const [masterSort, setMasterSort] = useState<'DATE_DESC' | 'DATE_ASC' | 'AMOUNT_DESC' | 'AMOUNT_ASC'>('DATE_DESC');

  // New Expense Modal State
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [expTitle, setExpTitle] = useState('');
  const [expCategory, setExpCategory] = useState<ExpenseCategory>('Utilities (Water & Electricity)');
  const [expAmount, setExpAmount] = useState<number>(100);
  const [expDate, setExpDate] = useState(todayStr);
  const [expMethod, setExpMethod] = useState<'Cash' | 'Credit Card' | 'Cliq' | 'Bank Transfer'>('Bank Transfer');
  const [expVendor, setExpVendor] = useState('');
  const [expNotes, setExpNotes] = useState('');

  // =========================================================================
  // 1. DYNAMIC MULTI-MONTH HISTORICAL PERFORMANCE AGGREGATOR
  // Computes unified performance across all historical months (e.g. Sep, Aug, Jul, Jun, May...)
  // =========================================================================
  const monthlyPerformanceHistory = useMemo<MonthlyPerformanceMetric[]>(() => {
    // Generate array of past 6-12 months up to current
    const monthsList: MonthlyPerformanceMetric[] = [];
    const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthNamesFull = [
      'January', 'February', 'March', 'April', 'May', 'June', 
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonthIdx - i, 1);
      const y = d.getFullYear();
      const mIdx = d.getMonth();
      const mStr = String(mIdx + 1).padStart(2, '0');
      const monthKey = `${y}-${mStr}`;
      const mStart = `${y}-${mStr}-01`;
      const mEnd = getLastDayOfMonth(d);

      // 1. Tuition Payments in Month (excluding pro shop purchases which are aggregated in merchRevenue)
      const monthPayments = payments.filter((p) => 
        p.date >= mStart && 
        p.date <= mEnd && 
        p.status !== 'Refunded' &&
        !p.id.startsWith('pay_merch') &&
        !p.id.startsWith('pay-merch') &&
        !p.membershipPackage?.startsWith('Pro Shop:')
      );
      const tuitionRevenue = monthPayments.reduce((sum, p) => sum + p.amount, 0);

      // 2. Merch Sales in Month
      const monthSales = sales.filter((s) => s.date >= mStart && s.date <= mEnd);
      const merchRevenue = monthSales.reduce((sum, s) => sum + s.totalAmount, 0);

      // Total Gross
      const totalGrossRevenue = tuitionRevenue + merchRevenue;

      // 3. Expenses in Month
      const monthExpenses = expenses.filter((e) => e.date >= mStart && e.date <= mEnd);
      const totalExpenses = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

      // Net Profit & Margin
      const netProfit = totalGrossRevenue - totalExpenses;
      const profitMarginPercent = totalGrossRevenue > 0 ? (netProfit / totalGrossRevenue) * 100 : 0;

      // 4. New Students in Month
      const monthNewStudents = members.filter((m) => {
        if (m.isDeleted) return false;
        const jDate = m.joinDate || m.membershipStartDate;
        return jDate >= mStart && jDate <= mEnd;
      });
      const newStudentsCount = monthNewStudents.length;

      const newStudentIds = new Set(monthNewStudents.map((s) => s.id));
      const newStudentsRevenue = monthPayments
        .filter((p) => newStudentIds.has(p.memberId))
        .reduce((sum, p) => sum + p.amount, 0);

      // 5. Active Members at end of Month
      const activeMembersCount = members.filter((m) => {
        if (m.isDeleted) return false;
        const jDate = m.joinDate || m.membershipStartDate;
        return jDate <= mEnd && m.status !== 'expired';
      }).length;

      // 6. Mat Attendance Check-ins in Month
      const attendanceCheckInsCount = attendance.filter((a) => a.date >= mStart && a.date <= mEnd).length;

      monthsList.push({
        monthKey,
        label: `${monthNamesShort[mIdx]} ${y}`,
        fullLabel: `${monthNamesFull[mIdx]} ${y}`,
        year: y,
        monthIndex: mIdx,
        startDate: mStart,
        endDate: mEnd,
        tuitionRevenue,
        merchRevenue,
        totalGrossRevenue,
        totalExpenses,
        netProfit,
        profitMarginPercent,
        newStudentsCount,
        newStudentsRevenue,
        activeMembersCount: activeMembersCount || members.length,
        attendanceCheckInsCount,
      });
    }

    // Calculate Month-over-Month (MoM) Growth Deltas
    for (let idx = 0; idx < monthsList.length; idx++) {
      if (idx > 0) {
        const prev = monthsList[idx - 1];
        const curr = monthsList[idx];

        if (prev.totalGrossRevenue > 0) {
          curr.momRevenueGrowthPercent = ((curr.totalGrossRevenue - prev.totalGrossRevenue) / prev.totalGrossRevenue) * 100;
        }
        if (prev.totalExpenses > 0) {
          curr.momExpenseGrowthPercent = ((curr.totalExpenses - prev.totalExpenses) / prev.totalExpenses) * 100;
        }
        if (prev.netProfit !== 0) {
          curr.momNetProfitGrowthPercent = ((curr.netProfit - prev.netProfit) / Math.abs(prev.netProfit)) * 100;
        }
      }
    }

    return monthsList;
  }, [currentYear, currentMonthIdx, payments, sales, expenses, members, attendance]);

  // Current Month & Last Month metrics objects for quick side-by-side comparison
  const currentMonthMetric = monthlyPerformanceHistory[monthlyPerformanceHistory.length - 1];
  const lastMonthMetric = monthlyPerformanceHistory[monthlyPerformanceHistory.length - 2] || currentMonthMetric;

  // =========================================================================
  // 2. FILTERED DATASETS BASED ON ACTIVE DATE RANGE
  // =========================================================================
  
  // A. New Students Enrolled in Date Range
  const filteredNewStudents = useMemo(() => {
    return members.filter((m) => {
      if (m.isDeleted) return false;
      const jDate = m.joinDate || m.membershipStartDate;
      const inRange = jDate >= startDate && jDate <= endDate;
      const matchesAge = selectedAgeGroup === 'all' || m.ageGroup === selectedAgeGroup;
      const matchesSearch = !searchQuery.trim() || 
        m.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.phone.includes(searchQuery);
      return inRange && matchesAge && matchesSearch;
    });
  }, [members, startDate, endDate, selectedAgeGroup, searchQuery]);

  // Total New Student Enrollments Payment Revenue
  const newStudentsRevenue = useMemo(() => {
    const studentIds = new Set(filteredNewStudents.map((s) => s.id));
    return payments
      .filter((p) => studentIds.has(p.memberId) && p.date >= startDate && p.date <= endDate)
      .reduce((sum, p) => sum + p.amount, 0);
  }, [filteredNewStudents, payments, startDate, endDate]);

  // B. Pro Shop Gear Sales in Date Range
  const filteredGearSales = useMemo(() => {
    return sales.filter((s) => {
      const inRange = s.date >= startDate && s.date <= endDate;
      const matchesSearch = !searchQuery.trim() ||
        s.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.buyerName.toLowerCase().includes(searchQuery.toLowerCase());
      return inRange && matchesSearch;
    });
  }, [sales, startDate, endDate, searchQuery]);

  const totalGearSalesRevenue = useMemo(() => {
    return filteredGearSales.reduce((sum, s) => sum + s.totalAmount, 0);
  }, [filteredGearSales]);

  const totalGearUnitsSold = useMemo(() => {
    return filteredGearSales.reduce((sum, s) => sum + s.quantity, 0);
  }, [filteredGearSales]);

  // Gear sales by category
  const gearSalesByCategory = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    filteredGearSales.forEach((s) => {
      const cat = s.category || 'other';
      if (!map[cat]) map[cat] = { count: 0, total: 0 };
      map[cat].count += s.quantity;
      map[cat].total += s.totalAmount;
    });
    return map;
  }, [filteredGearSales]);

  // C. Expenses & Outflows in Date Range
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const inRange = e.date >= startDate && e.date <= endDate;
      const matchesCategory = selectedExpenseCategory === 'all' || e.category === selectedExpenseCategory;
      const matchesSearch = !searchQuery.trim() ||
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.recipientOrVendor?.toLowerCase().includes(searchQuery.toLowerCase());
      return inRange && matchesCategory && matchesSearch;
    });
  }, [expenses, startDate, endDate, selectedExpenseCategory, searchQuery]);

  const totalExpensesOutflow = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  // Expenses grouped by Category
  const expensesByCategory = useMemo(() => {
    const acc: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
    });
    return acc;
  }, [filteredExpenses]);

  // D. Membership Tuition Payments in Date Range (excluding pro shop sales)
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => 
      p.date >= startDate && 
      p.date <= endDate && 
      p.status !== 'Refunded' &&
      !p.id.startsWith('pay_merch') &&
      !p.id.startsWith('pay-merch') &&
      !p.membershipPackage?.startsWith('Pro Shop:')
    );
  }, [payments, startDate, endDate]);

  const totalMembershipRevenue = useMemo(() => {
    return filteredPayments.reduce((sum, p) => sum + p.amount, 0);
  }, [filteredPayments]);

  // E. Mat Attendance Check-ins in Date Range
  const filteredAttendance = useMemo(() => {
    return attendance.filter((a) => a.date >= startDate && a.date <= endDate);
  }, [attendance, startDate, endDate]);

  // F. Total Gross Revenue, Net Profit & Efficiency Ratios
  const totalGrossRevenue = totalMembershipRevenue + totalGearSalesRevenue;
  const netProfit = totalGrossRevenue - totalExpensesOutflow;
  const profitMargin = totalGrossRevenue > 0 ? (netProfit / totalGrossRevenue) * 100 : 0;
  
  const activeMembersCount = members.filter((m) => !m.isDeleted && m.status !== 'expired').length || 1;
  const arpu = totalGrossRevenue / activeMembersCount; // Average Revenue Per Active User

  // =========================================================================
  // G. UNIFIED BUSINESS & FINANCIAL ACTIVITY RECORDS (FILTER EVERYTHING)
  // =========================================================================
  const allBusinessRecords = useMemo<UnifiedBusinessRecord[]>(() => {
    const list: UnifiedBusinessRecord[] = [];

    // 1. New Student Enrollments
    members.forEach((m) => {
      if (m.isDeleted) return;
      const jDate = m.joinDate || m.membershipStartDate;
      list.push({
        id: `stu_${m.id}`,
        type: 'new_student',
        typeLabel: 'New Student Registration',
        date: jDate,
        time: '09:00',
        title: m.fullName,
        subtitle: `${m.ageGroup || 'Adults'} Division · ${m.beltRank} Belt (${m.stripes} stripes) · ${m.membershipType === 'class_pack' ? `${m.classesTotal} Class Pack` : 'Unlimited'}`,
        category: m.ageGroup || 'Adults',
        amount: m.membershipType === 'class_pack' ? (m.classesTotal === 12 ? 90 : 65) : 100,
        flow: 'inflow',
        paymentMethod: 'Direct / In-Person',
        refCode: m.id.slice(-6).toUpperCase(),
        raw: m,
      });
    });

    // 2. Pro Shop Gear Sales
    sales.forEach((s) => {
      list.push({
        id: s.id,
        type: 'gear_sale',
        typeLabel: 'Shop & Gear Sale',
        date: s.date,
        time: s.time || '12:00',
        title: s.itemName,
        subtitle: `Buyer: ${s.buyerName} (${s.buyerType === 'member' ? 'Student' : 'Walk-in Guest'}) · Size: ${s.size} · Qty: ${s.quantity}`,
        category: s.category || 'Gear',
        amount: s.totalAmount,
        flow: 'inflow',
        paymentMethod: s.paymentMethod,
        refCode: s.id.slice(-6).toUpperCase(),
        raw: s,
      });
    });

    // 3. Operational Expenses & Payroll
    expenses.forEach((e) => {
      list.push({
        id: e.id,
        type: 'expense',
        typeLabel: 'Expense / Outflow',
        date: e.date,
        time: '12:00',
        title: e.title,
        subtitle: `Vendor/Recipient: ${e.recipientOrVendor || 'Academy Outflow'} · ${e.notes || ''}`,
        category: e.category,
        amount: e.amount,
        flow: 'outflow',
        paymentMethod: e.paymentMethod,
        refCode: e.id.slice(-6).toUpperCase(),
        raw: e,
      });
    });

    // 4. Tuition & Membership Payments (excluding pro shop purchases)
    payments.forEach((p) => {
      if (p.id.startsWith('pay_merch') || p.id.startsWith('pay-merch') || p.membershipPackage?.startsWith('Pro Shop:')) return;
      list.push({
        id: p.id,
        type: 'tuition_payment',
        typeLabel: 'Tuition & Subscription',
        date: p.date,
        time: p.time || '12:00',
        title: p.membershipPackage || 'Tuition Payment',
        subtitle: `Student: ${p.memberName} · Credited: ${p.classesCredited} classes · Status: ${p.status}`,
        category: 'Tuition & Packages',
        amount: p.amount,
        flow: 'inflow',
        paymentMethod: p.paymentMethod,
        refCode: p.receiptNumber || p.id.slice(-6).toUpperCase(),
        raw: p,
      });
    });

    // 5. Mat Attendance Check-ins
    attendance.forEach((a) => {
      list.push({
        id: a.id,
        type: 'attendance',
        typeLabel: 'Mat Attendance',
        date: a.date,
        time: a.time || '18:00',
        title: a.className,
        subtitle: `Student: ${a.memberName} (${a.beltRank}) · Coach: ${a.coach}`,
        category: a.classCategory || 'Class Attendance',
        amount: 0,
        flow: 'neutral',
        paymentMethod: 'Punch Card',
        refCode: a.id.slice(-6).toUpperCase(),
        raw: a,
      });
    });

    return list;
  }, [members, sales, expenses, payments, attendance]);

  // Master Filtered & Sorted Business Records
  const filteredMasterRecords = useMemo(() => {
    return allBusinessRecords.filter((rec) => {
      // 1. Date Range
      const inRange = rec.date >= startDate && rec.date <= endDate;
      if (!inRange) return false;

      // 2. Type Filter
      if (selectedMasterType !== 'all') {
        if (selectedMasterType === 'new_students' && rec.type !== 'new_student') return false;
        if (selectedMasterType === 'expenses' && rec.type !== 'expense') return false;
        if (selectedMasterType === 'gear_sales' && rec.type !== 'gear_sale') return false;
        if (selectedMasterType === 'tuition_payments' && rec.type !== 'tuition_payment') return false;
        if (selectedMasterType === 'attendance' && rec.type !== 'attendance') return false;
      }

      // 3. Payment Method Filter
      if (selectedPaymentMethod !== 'all' && rec.paymentMethod !== selectedPaymentMethod) {
        return false;
      }

      // 4. Age Group / Division Filter
      if (selectedAgeGroup !== 'all') {
        if (rec.type === 'new_student') {
          const rawMember = rec.raw as Member;
          if (rawMember.ageGroup !== selectedAgeGroup) return false;
        }
      }

      // 5. Expense Category Filter
      if (selectedExpenseCategory !== 'all' && rec.type === 'expense') {
        if (rec.category !== selectedExpenseCategory) return false;
      }

      // 6. Search Query (Matches names, items, titles, vendors, receipt codes, notes)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          rec.title.toLowerCase().includes(q) ||
          rec.subtitle.toLowerCase().includes(q) ||
          rec.category.toLowerCase().includes(q) ||
          rec.typeLabel.toLowerCase().includes(q) ||
          (rec.refCode && rec.refCode.toLowerCase().includes(q)) ||
          rec.paymentMethod.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    }).sort((a, b) => {
      if (masterSort === 'DATE_DESC') {
        const diff = b.date.localeCompare(a.date);
        return diff !== 0 ? diff : b.time.localeCompare(a.time);
      }
      if (masterSort === 'DATE_ASC') {
        const diff = a.date.localeCompare(b.date);
        return diff !== 0 ? diff : a.time.localeCompare(b.time);
      }
      if (masterSort === 'AMOUNT_DESC') {
        return b.amount - a.amount;
      }
      if (masterSort === 'AMOUNT_ASC') {
        return a.amount - b.amount;
      }
      return 0;
    });
  }, [allBusinessRecords, startDate, endDate, selectedMasterType, selectedPaymentMethod, selectedAgeGroup, selectedExpenseCategory, searchQuery, masterSort]);

  // Dynamic KPI calculations for Master Filter
  const masterFilteredInflow = useMemo(() => {
    return filteredMasterRecords
      .filter((r) => r.flow === 'inflow')
      .reduce((sum, r) => sum + r.amount, 0);
  }, [filteredMasterRecords]);

  const masterFilteredOutflow = useMemo(() => {
    return filteredMasterRecords
      .filter((r) => r.flow === 'outflow')
      .reduce((sum, r) => sum + r.amount, 0);
  }, [filteredMasterRecords]);

  const masterFilteredNet = masterFilteredInflow - masterFilteredOutflow;

  const masterNewStudentsCount = useMemo(() => {
    return filteredMasterRecords.filter((r) => r.type === 'new_student').length;
  }, [filteredMasterRecords]);

  const masterGearSalesCount = useMemo(() => {
    return filteredMasterRecords.filter((r) => r.type === 'gear_sale').length;
  }, [filteredMasterRecords]);

  const masterExpensesCount = useMemo(() => {
    return filteredMasterRecords.filter((r) => r.type === 'expense').length;
  }, [filteredMasterRecords]);

  // =========================================================================
  // 3. CLOSED MONTH P&L STATEMENT GENERATION (FOR LAST MONTH / ANY MONTH)
  // =========================================================================
  const selectedPlData = useMemo(() => {
    const metric = monthlyPerformanceHistory.find((m) => m.monthKey === selectedPlMonthKey) || lastMonthMetric;
    const mStart = metric.startDate;
    const mEnd = metric.endDate;

    const mPayments = payments.filter((p) => 
      p.date >= mStart && 
      p.date <= mEnd && 
      p.status !== 'Refunded' &&
      !p.id.startsWith('pay_merch') &&
      !p.id.startsWith('pay-merch') &&
      !p.membershipPackage?.startsWith('Pro Shop:')
    );
    const mSales = sales.filter((s) => s.date >= mStart && s.date <= mEnd);
    const mExpenses = expenses.filter((e) => e.date >= mStart && e.date <= mEnd);

    // Revenue by Package type with Student Names & Details
    const tuitionByPackage: Record<string, { total: number; payments: PaymentRecord[]; studentNames: string[] }> = {};
    mPayments.forEach((p) => {
      const pkg = p.membershipPackage || 'Standard Monthly';
      if (!tuitionByPackage[pkg]) {
        tuitionByPackage[pkg] = { total: 0, payments: [], studentNames: [] };
      }
      tuitionByPackage[pkg].total += p.amount;
      tuitionByPackage[pkg].payments.push(p);
      if (p.memberName && !tuitionByPackage[pkg].studentNames.includes(p.memberName)) {
        tuitionByPackage[pkg].studentNames.push(p.memberName);
      }
    });

    // Expenses by Category
    const expensesByCat: Record<string, { total: number; items: ExpenseRecord[] }> = {};
    mExpenses.forEach((e) => {
      if (!expensesByCat[e.category]) {
        expensesByCat[e.category] = { total: 0, items: [] };
      }
      expensesByCat[e.category].total += e.amount;
      expensesByCat[e.category].items.push(e);
    });

    const tuitionRevenue = Object.values(tuitionByPackage).reduce((sum, v) => sum + v.total, 0);
    const merchRevenue = mSales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalUnitsSold = mSales.reduce((sum, s) => sum + s.quantity, 0);
    const totalRev = tuitionRevenue + merchRevenue;
    const totalExp = Object.values(expensesByCat).reduce((sum, v) => sum + v.total, 0);
    const net = totalRev - totalExp;
    const margin = totalRev > 0 ? (net / totalRev) * 100 : 0;

    return {
      metric,
      mPayments,
      mSales,
      mExpenses,
      tuitionByPackage,
      expensesByCat,
      tuitionRevenue,
      merchRevenue,
      totalUnitsSold,
      totalRev,
      totalExp,
      net,
      margin,
    };
  }, [monthlyPerformanceHistory, selectedPlMonthKey, lastMonthMetric, payments, sales, expenses]);

  // Handle Add Expense Submit
  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expTitle.trim() || expAmount <= 0) return;

    const newExp: ExpenseRecord = {
      id: `exp_${Date.now()}`,
      title: expTitle.trim(),
      category: expCategory,
      amount: expAmount,
      currency: currency,
      date: expDate,
      paymentMethod: expMethod as any,
      recipientOrVendor: expVendor.trim() || undefined,
      status: 'Paid',
      notes: expNotes.trim() || undefined,
    };

    if (onAddExpense) {
      onAddExpense(newExp);
    }
    setIsAddExpenseModalOpen(false);
    setExpTitle('');
    setExpAmount(100);
    setExpVendor('');
    setExpNotes('');
  };

  // CSV Export Generator
  const handleExportCSV = () => {
    let csvContent = '';
    let fileName = `ravens_bjj_unified_report_${timePreset}_${startDate}_to_${endDate}.csv`;

    if (activeTab === 'filter_all') {
      fileName = `ravens_bjj_all_records_filtered_${timePreset}_${startDate}_to_${endDate}.csv`;
      csvContent = 'Record Type,Date,Time,Title / Entity,Details / Subtitle,Category,Amount,Cashflow Type,Payment Method,Reference Code\n';
      filteredMasterRecords.forEach((r) => {
        csvContent += `"${r.typeLabel}","${r.date}","${r.time}","${r.title.replace(/"/g, '""')}","${r.subtitle.replace(/"/g, '""')}","${r.category}",${r.amount},"${r.flow}","${r.paymentMethod}","${r.refCode || ''}"\n`;
      });
    } else if (activeTab === 'pl_statement') {
      fileName = `ravens_bjj_closed_pl_statement_${selectedPlData.metric.monthKey}.csv`;
      csvContent = `Ravens BJJ Academy - Official Monthly P&L Statement (${selectedPlData.metric.fullLabel})\n`;
      csvContent += `Generated: ${todayStr}\n\n`;
      csvContent += `Category,Item / Description,Amount (${currency})\n`;
      csvContent += `I. OPERATING REVENUE,Membership & Class Pack Tuition,${selectedPlData.metric.tuitionRevenue}\n`;
      csvContent += `I. OPERATING REVENUE,Pro Shop & Merch Sales,${selectedPlData.metric.merchRevenue}\n`;
      csvContent += `TOTAL GROSS REVENUE,,${selectedPlData.totalRev}\n\n`;
      csvContent += `II. OPERATING EXPENSES\n`;
      Object.entries(selectedPlData.expensesByCat).forEach(([cat, data]) => {
        csvContent += `Operating Expense,"${cat}",${data.total}\n`;
      });
      csvContent += `TOTAL OPERATING EXPENSES,,${selectedPlData.totalExp}\n\n`;
      csvContent += `NET OPERATING PROFIT / EBITDA,,${selectedPlData.net}\n`;
      csvContent += `NET PROFIT MARGIN,,${selectedPlData.margin.toFixed(1)}%\n`;
    } else if (activeTab === 'new_students') {
      csvContent = 'Student ID,Full Name,Age Category,Belt Rank,Stripes,Join Date,Membership Type,Phone,Status\n';
      filteredNewStudents.forEach((s) => {
        csvContent += `"${s.id}","${s.fullName}","${s.ageGroup || 'Adults'}","${s.beltRank}",${s.stripes},"${s.joinDate}","${s.membershipType}","${s.phone}","${s.status}"\n`;
      });
    } else if (activeTab === 'gear_sales') {
      csvContent = 'Sale ID,Date,Time,Item Name,Category,Size,Quantity,Unit Price,Total Amount,Buyer Name,Buyer Type,Payment Method\n';
      filteredGearSales.forEach((s) => {
        csvContent += `"${s.id}","${s.date}","${s.time}","${s.itemName}","${s.category}","${s.size}",${s.quantity},${s.unitPrice},${s.totalAmount},"${s.buyerName}","${s.buyerType}","${s.paymentMethod}"\n`;
      });
    } else if (activeTab === 'expenses') {
      csvContent = 'Expense ID,Date,Title,Category,Amount,Currency,Vendor/Recipient,Payment Method,Status,Notes\n';
      filteredExpenses.forEach((e) => {
        csvContent += `"${e.id}","${e.date}","${e.title}","${e.category}",${e.amount},"${e.currency}","${e.recipientOrVendor || ''}","${e.paymentMethod}","${e.status}","${e.notes || ''}"\n`;
      });
    } else {
      // Unified Multi-Month Statement Matrix
      csvContent = 'Month,Tuition Revenue,Pro Shop Revenue,Total Gross Revenue,Operating Expenses,Net Profit,Margin %,New Students,Check-Ins\n';
      monthlyPerformanceHistory.forEach((m) => {
        csvContent += `"${m.fullLabel}",${m.tuitionRevenue},${m.merchRevenue},${m.totalGrossRevenue},${m.totalExpenses},${m.netProfit},${m.profitMarginPercent.toFixed(1)}%,${m.newStudentsCount},${m.attendanceCheckInsCount}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Print Report Handler
  const handlePrintReport = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  // Max Revenue in History for bar chart scaling
  const maxMonthlyRevenue = useMemo(() => {
    return Math.max(...monthlyPerformanceHistory.map((m) => Math.max(m.totalGrossRevenue, m.totalExpenses)), 1000);
  }, [monthlyPerformanceHistory]);

  return (
    <div className="space-y-6 animate-in fade-in duration-150 print:p-0">
      {/* Top Banner & Academy Reporting Header */}
      <div className={`p-4 sm:p-6 rounded-2xl border transition-all ${
        isLight ? 'bg-white border-stone-200 shadow-xs' : 'bg-stone-900 border-stone-800'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md shrink-0">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${isLight ? 'text-stone-950' : 'text-white'}`}>
                  Unified Reporting & Analytics Center
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  Past Months & Real-Time Financials
                </span>
              </div>
              <p className={`text-xs mt-1 ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
                Unified multi-month intelligence: track tuition, gear sales, operational expenses, closed month P&L statements, and student retention.
              </p>
            </div>
          </div>

          {/* Top Actions: Direct Month Jump, Add Expense, Print & CSV Export */}
          <div className="flex items-center gap-2 flex-wrap print:hidden">
            {/* Quick Month Jump Select */}
            <div className="flex items-center gap-1.5 bg-stone-950/80 px-2.5 py-1.5 rounded-xl border border-stone-800">
              <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <select
                value={timePreset === 'custom' ? selectedPlMonthKey : timePreset}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.startsWith('202')) {
                    handleSelectSpecificMonth(val);
                  } else {
                    setTimePreset(val as TimeRangePreset);
                  }
                }}
                className={`text-xs font-bold bg-transparent outline-none cursor-pointer ${
                  isLight ? 'text-stone-200' : 'text-stone-200'
                }`}
              >
                <option value="this_month" className="bg-stone-900 text-white">This Month ({monthlyPerformanceHistory[monthlyPerformanceHistory.length - 1]?.label})</option>
                <option value="last_month" className="bg-stone-900 text-white">Last Month ({monthlyPerformanceHistory[monthlyPerformanceHistory.length - 2]?.label})</option>
                <option value="last_3_months" className="bg-stone-900 text-white">Last 3 Months (Q3)</option>
                <option value="last_6_months" className="bg-stone-900 text-white">Last 6 Months</option>
                <option value="ytd" className="bg-stone-900 text-white">Year-to-Date 2026</option>
                <optgroup label="── Direct Month Jump ──" className="bg-stone-900 text-indigo-400">
                  {monthlyPerformanceHistory.slice().reverse().map((m) => (
                    <option key={m.monthKey} value={m.monthKey} className="bg-stone-900 text-white">
                      {m.fullLabel} ({formatCurrency(m.totalGrossRevenue, currency)})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <button
              type="button"
              onClick={handlePrintReport}
              className={`px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                isLight
                  ? 'bg-stone-100 hover:bg-stone-200 text-stone-900 border border-stone-300'
                  : 'bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700'
              }`}
            >
              <Printer className="w-4 h-4 text-indigo-400" />
              <span>Print / PDF</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black inline-flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Time Range Selector Bar */}
        <div className={`mt-5 p-3 rounded-xl border flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${
          isLight ? 'bg-stone-50 border-stone-200' : 'bg-stone-950/80 border-stone-800'
        }`}>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-xs font-black uppercase tracking-wider mr-1 flex items-center gap-1 ${
              isLight ? 'text-stone-600' : 'text-stone-400'
            }`}>
              <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Filter Period:
            </span>

            {[
              { id: 'this_month', label: `This Month (${currentMonthMetric?.label})` },
              { id: 'last_month', label: `Last Month (${lastMonthMetric?.label})` },
              { id: 'last_3_months', label: 'Last 3 Months' },
              { id: 'last_6_months', label: 'Last 6 Months' },
              { id: 'ytd', label: 'YTD 2026' },
              { id: 'all', label: 'All History' },
              { id: 'custom', label: 'Custom Range' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setTimePreset(p.id as TimeRangePreset)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  timePreset === p.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : isLight
                    ? 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-300'
                    : 'bg-stone-900 text-stone-400 hover:text-white border border-stone-800'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom Date Inputs if Custom is selected */}
          {timePreset === 'custom' && (
            <div className="flex items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-stone-800">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className={`px-2.5 py-1 text-xs rounded-lg border font-mono ${
                  isLight ? 'bg-white border-stone-300 text-stone-900' : 'bg-stone-900 border-stone-700 text-white'
                }`}
              />
              <span className="text-xs text-stone-500">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className={`px-2.5 py-1 text-xs rounded-lg border font-mono ${
                  isLight ? 'bg-white border-stone-300 text-stone-900' : 'bg-stone-900 border-stone-700 text-white'
                }`}
              />
            </div>
          )}

          {/* Active Range Display Badge */}
          <div className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-lg border border-indigo-500/20 shrink-0 flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            <span>Active: <span className="font-mono">{startDate}</span> → <span className="font-mono">{endDate}</span></span>
          </div>
        </div>
      </div>

      {/* 4 HERO KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1: Gross Revenue */}
        <div className={`p-4 rounded-xl border flex flex-col justify-between ${
          isLight ? 'bg-white border-stone-200' : 'bg-stone-900 border-stone-800'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider block ${isLight ? 'text-stone-500' : 'text-stone-400'}`}>
              Total Gross Revenue
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          <div className="my-2">
            <div className="text-2xl font-black text-emerald-500 font-mono">
              {formatCurrency(totalGrossRevenue, currency)}
            </div>
            <span className={`text-[10px] mt-0.5 block ${isLight ? 'text-stone-500' : 'text-stone-400'}`}>
              {formatCurrency(totalMembershipRevenue, currency)} tuition + {formatCurrency(totalGearSalesRevenue, currency)} gear
            </span>
          </div>
        </div>

        {/* KPI 2: Total Operating Expenses */}
        <div className={`p-4 rounded-xl border flex flex-col justify-between ${
          isLight ? 'bg-white border-stone-200' : 'bg-stone-900 border-stone-800'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider block ${isLight ? 'text-stone-500' : 'text-stone-400'}`}>
              Expenses & Outflows
            </span>
            <div className="p-2 rounded-xl bg-red-500/10 text-red-500">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>

          <div className="my-2">
            <div className="text-2xl font-black text-red-500 font-mono">
              {formatCurrency(totalExpensesOutflow, currency)}
            </div>
            <span className={`text-[10px] mt-0.5 block ${isLight ? 'text-stone-500' : 'text-stone-400'}`}>
              {filteredExpenses.length} expense transactions recorded
            </span>
          </div>
        </div>

        {/* KPI 3: Net Operating Profit */}
        <div className={`p-4 rounded-xl border flex flex-col justify-between ${
          isLight ? 'bg-white border-stone-200' : 'bg-stone-900 border-stone-800'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider block ${isLight ? 'text-stone-500' : 'text-stone-400'}`}>
              Net Operating Profit
            </span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>

          <div className="my-2">
            <div className={`text-2xl font-black font-mono ${
              netProfit >= 0 ? 'text-indigo-400' : 'text-amber-500'
            }`}>
              {formatCurrency(netProfit, currency)}
            </div>
            <span className={`text-[10px] mt-0.5 block ${isLight ? 'text-stone-500' : 'text-stone-400'}`}>
              Profit Margin: <span className="font-bold text-indigo-300 font-mono">{profitMargin.toFixed(1)}%</span>
            </span>
          </div>
        </div>

        {/* KPI 4: Students & ARPU */}
        <div className={`p-4 rounded-xl border flex flex-col justify-between ${
          isLight ? 'bg-white border-stone-200' : 'bg-stone-900 border-stone-800'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider block ${isLight ? 'text-stone-500' : 'text-stone-400'}`}>
              Active Base & New Students
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <Users className="w-4 h-4" />
            </div>
          </div>

          <div className="my-2">
            <div className={`text-2xl font-black font-mono ${isLight ? 'text-stone-900' : 'text-white'}`}>
              {activeMembersCount} <span className="text-xs font-normal text-stone-400">active</span>
            </div>
            <span className={`text-[10px] mt-0.5 block ${isLight ? 'text-stone-500' : 'text-stone-400'}`}>
              +{filteredNewStudents.length} new enrollments in selected range
            </span>
          </div>
        </div>
      </div>

      {/* Main Report Navigation Tabs */}
      <div className={`p-1.5 rounded-xl border flex items-center gap-1.5 overflow-x-auto ${
        isLight ? 'bg-stone-100 border-stone-200' : 'bg-stone-900 border-stone-800'
      }`}>
        <button
          type="button"
          onClick={() => setActiveTab('summary')}
          className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-lg text-xs font-black transition-all inline-flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'summary'
              ? 'bg-indigo-600 text-white shadow-xs'
              : isLight ? 'text-stone-600 hover:text-stone-900' : 'text-stone-400 hover:text-white'
          }`}
        >
          <PieChart className="w-4 h-4" />
          <span>Unified Summary & Trends</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('new_students')}
          className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-lg text-xs font-black transition-all inline-flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'new_students'
              ? 'bg-indigo-600 text-white shadow-xs'
              : isLight ? 'text-stone-600 hover:text-stone-900' : 'text-stone-400 hover:text-white'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          <span>New Students ({filteredNewStudents.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('gear_sales')}
          className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-lg text-xs font-black transition-all inline-flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'gear_sales'
              ? 'bg-indigo-600 text-white shadow-xs'
              : isLight ? 'text-stone-600 hover:text-stone-900' : 'text-stone-400 hover:text-white'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Shop Sales ({filteredGearSales.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('expenses')}
          className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-lg text-xs font-black transition-all inline-flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'expenses'
              ? 'bg-indigo-600 text-white shadow-xs'
              : isLight ? 'text-stone-600 hover:text-stone-900' : 'text-stone-400 hover:text-white'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Expenses Ledger ({filteredExpenses.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('attendance')}
          className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-lg text-xs font-black transition-all inline-flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'attendance'
              ? 'bg-indigo-600 text-white shadow-xs'
              : isLight ? 'text-stone-600 hover:text-stone-900' : 'text-stone-400 hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Mat Attendance ({filteredAttendance.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pl_statement')}
          className={`flex-1 min-w-[150px] py-2.5 px-3 rounded-lg text-xs font-black transition-all inline-flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'pl_statement'
              ? 'bg-indigo-600 text-white shadow-xs'
              : isLight ? 'text-stone-600 hover:text-stone-900' : 'text-stone-400 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>P&L Statement ({selectedPlData.metric?.label || 'Monthly'})</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 0: UNIVERSAL FILTER & MASTER FINANCIAL/ACTIVITY EXPLORER
          ========================================================================= */}
      {activeTab === 'filter_all' && (
        <div className="space-y-4">
          {/* Universal Filtering Controls Panel */}
          <div className={`p-4 rounded-2xl border space-y-3.5 ${
            isLight ? 'bg-white border-stone-200' : 'bg-stone-900 border-stone-800'
          }`}>
            {/* Row 1: Record Type Switcher Tabs */}
            <div className="flex items-center justify-between gap-2 flex-wrap pb-3 border-b border-stone-800">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider text-stone-400 mr-1 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-amber-400" />
                  <span>Filter by Event / Record Type:</span>
                </span>

                {[
                  { id: 'all', label: 'All Everything', count: allBusinessRecords.length, icon: '🌐' },
                  { id: 'new_students', label: 'New Students', count: members.filter(m => !m.isDeleted).length, icon: '👥' },
                  { id: 'gear_sales', label: 'Shop Sales', count: sales.length, icon: '🛍️' },
                  { id: 'expenses', label: 'Expenses & Payroll', count: expenses.length, icon: '💸' },
                  { id: 'tuition_payments', label: 'Tuition Payments', count: payments.length, icon: '💳' },
                  { id: 'attendance', label: 'Mat Attendance', count: attendance.length, icon: '🥋' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedMasterType(t.id as MasterRecordType)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                      selectedMasterType === t.id
                        ? 'bg-red-600 text-white shadow-sm'
                        : isLight
                        ? 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                        : 'bg-stone-950 text-stone-400 hover:text-white border border-stone-800'
                    }`}
                  >
                    <span>{t.icon}</span>
                    <span>{t.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      selectedMasterType === t.id ? 'bg-black/40 text-white' : 'bg-stone-800 text-stone-300'
                    }`}>
                      {t.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Reset Filters Shortcut */}
              {(selectedMasterType !== 'all' || selectedPaymentMethod !== 'all' || selectedAgeGroup !== 'all' || selectedExpenseCategory !== 'all' || searchQuery.trim()) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMasterType('all');
                    setSelectedPaymentMethod('all');
                    setSelectedAgeGroup('all');
                    setSelectedExpenseCategory('all');
                    setSearchQuery('');
                  }}
                  className="px-2.5 py-1 text-xs font-bold text-red-400 hover:text-red-300 bg-red-950/40 border border-red-800/60 rounded-lg inline-flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Reset Filters</span>
                </button>
              )}
            </div>

            {/* Row 2: Secondary Dropdown Filters (Payment Method, Division, Expense Category, Sort & Search) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              {/* Filter 1: Payment Method */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                  Payment Method
                </label>
                <select
                  value={selectedPaymentMethod}
                  onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                  className={`w-full p-2 text-xs rounded-xl border font-bold ${
                    isLight ? 'bg-stone-50 border-stone-300 text-stone-900' : 'bg-stone-950 border-stone-700 text-white'
                  }`}
                >
                  <option value="all">All Payment Methods</option>
                  <option value="Cash">Cash</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Cliq">CliQ</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Direct / In-Person">Direct / In-Person</option>
                  <option value="Punch Card">Punch Card / Class Credit</option>
                </select>
              </div>

              {/* Filter 2: Division / Age Group */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                  Division / Age Group
                </label>
                <select
                  value={selectedAgeGroup}
                  onChange={(e) => setSelectedAgeGroup(e.target.value)}
                  className={`w-full p-2 text-xs rounded-xl border font-bold ${
                    isLight ? 'bg-stone-50 border-stone-300 text-stone-900' : 'bg-stone-950 border-stone-700 text-white'
                  }`}
                >
                  <option value="all">All Divisions (Kids, Teens, Adults)</option>
                  <option value="Kids">🧒 Kids (Ages 4-15)</option>
                  <option value="Teens">🥋 Teens (Ages 16-17)</option>
                  <option value="Adults">🔥 Adults (Ages 18+)</option>
                </select>
              </div>

              {/* Filter 3: Expense Category */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                  Expense Category
                </label>
                <select
                  value={selectedExpenseCategory}
                  onChange={(e) => setSelectedExpenseCategory(e.target.value)}
                  className={`w-full p-2 text-xs rounded-xl border font-bold ${
                    isLight ? 'bg-stone-50 border-stone-300 text-stone-900' : 'bg-stone-950 border-stone-700 text-white'
                  }`}
                >
                  <option value="all">All Expense Categories</option>
                  <option value="Coach Salaries & Payroll">Coach Salaries & Payroll</option>
                  <option value="Rent & Facility Lease">Rent & Facility Lease</option>
                  <option value="Utilities (Water & Electricity)">Utilities (Water & Electricity)</option>
                  <option value="Maintenance & Cleaning">Maintenance & Cleaning</option>
                  <option value="Gear & Merchandise Inventory">Gear Wholesale Restock</option>
                  <option value="Equipment & Mat Upgrades">Equipment & Mat Upgrades</option>
                  <option value="Marketing & Software Subscriptions">Marketing & Subscriptions</option>
                  <option value="Other / Miscellaneous">Other / Miscellaneous</option>
                </select>
              </div>

              {/* Filter 4: Sort Order */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                  Sort Order
                </label>
                <select
                  value={masterSort}
                  onChange={(e) => setMasterSort(e.target.value as any)}
                  className={`w-full p-2 text-xs rounded-xl border font-bold ${
                    isLight ? 'bg-stone-50 border-stone-300 text-stone-900' : 'bg-stone-950 border-stone-700 text-white'
                  }`}
                >
                  <option value="DATE_DESC">Date & Time: Newest First</option>
                  <option value="DATE_ASC">Date & Time: Oldest First</option>
                  <option value="AMOUNT_DESC">Amount: Highest First</option>
                  <option value="AMOUNT_ASC">Amount: Lowest First</option>
                </select>
              </div>

              {/* Filter 5: Live Universal Keyword Search */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                  Universal Search
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Search literally anything..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full pl-8 pr-2.5 py-2 text-xs rounded-xl border focus:outline-none focus:border-red-500 font-bold ${
                      isLight ? 'bg-stone-50 border-stone-300 text-stone-900' : 'bg-stone-950 border-stone-700 text-white'
                    }`}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Real-time KPI Bar for Active Filtered Results */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className={`p-3.5 rounded-xl border ${
              isLight ? 'bg-white border-stone-200' : 'bg-stone-900 border-stone-800'
            }`}>
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                Filtered Inflows (+)
              </span>
              <div className="text-lg sm:text-xl font-black font-mono text-emerald-400 mt-0.5">
                +{formatCurrency(masterFilteredInflow, currency)}
              </div>
              <span className="text-[10px] text-stone-500 block mt-0.5">
                {filteredMasterRecords.filter(r => r.flow === 'inflow').length} revenue items
              </span>
            </div>

            <div className={`p-3.5 rounded-xl border ${
              isLight ? 'bg-white border-stone-200' : 'bg-stone-900 border-stone-800'
            }`}>
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                Filtered Outflows (-)
              </span>
              <div className="text-lg sm:text-xl font-black font-mono text-red-400 mt-0.5">
                -{formatCurrency(masterFilteredOutflow, currency)}
              </div>
              <span className="text-[10px] text-stone-500 block mt-0.5">
                {masterExpensesCount} expense items
              </span>
            </div>

            <div className={`p-3.5 rounded-xl border ${
              isLight ? 'bg-white border-stone-200' : 'bg-stone-900 border-stone-800'
            }`}>
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                Net Cash Balance
              </span>
              <div className={`text-lg sm:text-xl font-black font-mono mt-0.5 ${
                masterFilteredNet >= 0 ? 'text-indigo-400' : 'text-amber-500'
              }`}>
                {formatCurrency(masterFilteredNet, currency)}
              </div>
              <span className="text-[10px] text-stone-500 block mt-0.5">
                {masterFilteredNet >= 0 ? 'Positive net margin' : 'Deficit in period'}
              </span>
            </div>

            <div className={`p-3.5 rounded-xl border ${
              isLight ? 'bg-white border-stone-200' : 'bg-stone-900 border-stone-800'
            }`}>
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                Active Results Count
              </span>
              <div className={`text-lg sm:text-xl font-black font-mono mt-0.5 ${isLight ? 'text-stone-900' : 'text-white'}`}>
                {filteredMasterRecords.length} <span className="text-xs font-normal text-stone-400">records</span>
              </div>
              <span className="text-[10px] text-stone-500 block mt-0.5">
                {masterNewStudentsCount} signups · {masterGearSalesCount} gear sales
              </span>
            </div>
          </div>

          {/* Master Itemized Records Table */}
          <div className={`rounded-2xl border overflow-hidden shadow-xs ${
            isLight ? 'bg-white border-stone-200' : 'bg-stone-900 border-stone-800'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`uppercase text-[10px] font-black border-b ${
                  isLight ? 'bg-stone-100 text-stone-700 border-stone-200' : 'bg-stone-950 text-stone-300 border-stone-800'
                }`}>
                  <tr>
                    <th className="p-3.5">Date & Time</th>
                    <th className="p-3.5">Record Type</th>
                    <th className="p-3.5">Title / Primary Entity</th>
                    <th className="p-3.5">Details & Category</th>
                    <th className="p-3.5">Payment Method</th>
                    <th className="p-3.5 text-right">Amount ({currency})</th>
                    <th className="p-3.5 text-center">Ref</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isLight ? 'divide-stone-200' : 'divide-stone-800/60'}`}>
                  {filteredMasterRecords.map((r, idx) => {
                    const isNewStudent = r.type === 'new_student';
                    const isGearSale = r.type === 'gear_sale';
                    const isExpense = r.type === 'expense';
                    const isTuition = r.type === 'tuition_payment';
                    const isAttendance = r.type === 'attendance';

                    return (
                      <tr
                        key={`${r.id}-${idx}`}
                        className={`transition-colors ${
                          isLight ? 'hover:bg-stone-50' : 'hover:bg-stone-850/60'
                        }`}
                      >
                        {/* 1. Date & Time */}
                        <td className="p-3.5 font-mono">
                          <div className="font-bold">{r.date}</div>
                          <div className="text-[10px] text-stone-400">{r.time}</div>
                        </td>

                        {/* 2. Type Badge */}
                        <td className="p-3.5">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1.5 ${
                            isNewStudent
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              : isGearSale
                              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                              : isExpense
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : isTuition
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            <span>
                              {isNewStudent ? '👥' : isGearSale ? '🛍️' : isExpense ? '💸' : isTuition ? '💳' : '🥋'}
                            </span>
                            <span>{r.typeLabel}</span>
                          </span>
                        </td>

                        {/* 3. Title / Primary Entity */}
                        <td className="p-3.5 font-bold">
                          <div className={`text-sm ${isLight ? 'text-stone-950' : 'text-white'}`}>
                            {r.title}
                          </div>
                        </td>

                        {/* 4. Details & Category */}
                        <td className="p-3.5">
                          <div className="text-stone-300 text-xs">{r.subtitle}</div>
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded mt-0.5 inline-block ${
                            isLight ? 'bg-stone-100 text-stone-600' : 'bg-stone-800 text-stone-400'
                          }`}>
                            {r.category}
                          </span>
                        </td>

                        {/* 5. Payment Method */}
                        <td className="p-3.5 font-medium">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            r.paymentMethod === 'Cash'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : r.paymentMethod === 'Credit Card'
                              ? 'bg-blue-500/10 text-blue-400'
                              : r.paymentMethod === 'Cliq'
                              ? 'bg-purple-500/10 text-purple-400'
                              : 'bg-stone-800 text-stone-300'
                          }`}>
                            {r.paymentMethod}
                          </span>
                        </td>

                        {/* 6. Amount */}
                        <td className="p-3.5 text-right font-mono font-bold">
                          {r.flow === 'inflow' ? (
                            <span className="text-emerald-400 font-black text-sm">
                              +{formatCurrency(r.amount, currency)}
                            </span>
                          ) : r.flow === 'outflow' ? (
                            <span className="text-red-400 font-black text-sm">
                              -{formatCurrency(r.amount, currency)}
                            </span>
                          ) : (
                            <span className="text-stone-500 text-xs italic">
                              Free / Punch Card
                            </span>
                          )}
                        </td>

                        {/* 7. Reference Code */}
                        <td className="p-3.5 text-center font-mono text-[10px] text-stone-400">
                          {r.refCode || '──'}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredMasterRecords.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-stone-500 space-y-2">
                        <div className="w-12 h-12 rounded-full bg-stone-800 text-stone-400 mx-auto flex items-center justify-center">
                          <Search className="w-6 h-6" />
                        </div>
                        <div className="font-bold text-sm text-stone-300">No records found matching your filters</div>
                        <p className="text-xs text-stone-500 max-w-md mx-auto">
                          Try changing your event type filter, date range, payment method, or clearing your search term.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 1: UNIFIED EXECUTIVE SUMMARY & MULTI-MONTH PERFORMANCE MATRIX
          ========================================================================= */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          {/* Historical Month-by-Month Statement Matrix Table */}
          <div className={`p-5 rounded-2xl border space-y-4 ${
            isLight ? 'bg-white border-stone-200' : 'bg-stone-900 border-stone-800'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-800">
              <div>
                <h3 className="text-sm font-black flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-400" />
                  <span>Month-by-Month Consolidated Financial Ledger</span>
                </h3>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  Complete historic ledger covering last months to present day with growth indicators.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`uppercase text-[10px] font-black border-b ${
                  isLight ? 'bg-stone-100 text-stone-600 border-stone-200' : 'bg-stone-950 text-stone-400 border-stone-800'
                }`}>
                  <tr>
                    <th className="p-3">Month</th>
                    <th className="p-3 text-right">Tuition Inflow</th>
                    <th className="p-3 text-right">Pro Shop Sales</th>
                    <th className="p-3 text-right">Total Gross</th>
                    <th className="p-3 text-right">Expenses</th>
                    <th className="p-3 text-right">Net Profit</th>
                    <th className="p-3 text-center">Margin</th>
                    <th className="p-3 text-center">New Enrolls</th>
                    <th className="p-3 text-center">Check-Ins</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isLight ? 'divide-stone-200' : 'divide-stone-800/60'}`}>
                  {monthlyPerformanceHistory.slice().reverse().map((m) => (
                    <tr key={m.monthKey} className={isLight ? 'hover:bg-stone-50' : 'hover:bg-stone-800/40'}>
                      <td className="p-3 font-bold flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{m.fullLabel}</span>
                      </td>
                      <td className="p-3 text-right font-mono">{formatCurrency(m.tuitionRevenue, currency)}</td>
                      <td className="p-3 text-right font-mono text-purple-400">{formatCurrency(m.merchRevenue, currency)}</td>
                      <td className="p-3 text-right font-mono font-black text-emerald-400">{formatCurrency(m.totalGrossRevenue, currency)}</td>
                      <td className="p-3 text-right font-mono text-red-400">{formatCurrency(m.totalExpenses, currency)}</td>
                      <td className="p-3 text-right font-mono font-black text-indigo-400">{formatCurrency(m.netProfit, currency)}</td>
                      <td className="p-3 text-center font-mono">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          m.profitMarginPercent >= 40 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-500/20 text-indigo-300'
                        }`}>
                          {m.profitMarginPercent.toFixed(1)}%
                        </span>
                      </td>
                      <td className="p-3 text-center font-bold">{m.newStudentsCount}</td>
                      <td className="p-3 text-center font-bold text-stone-400">{m.attendanceCheckInsCount}</td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPlMonthKey(m.monthKey);
                            setActiveTab('pl_statement');
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white transition-all cursor-pointer inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>P&L Statement</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: CLOSED MONTH P&L STATEMENT (FOR LAST MONTH / ANY CLOSED MONTH)
          ========================================================================= */}
      {activeTab === 'pl_statement' && (
        <div className="space-y-6">
          {/* Statement Header Card & Month Switcher */}
          <div className={`p-5 rounded-2xl border ${
            isLight ? 'bg-white border-stone-200' : 'bg-stone-900 border-stone-800'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Closed Financial Statement
                  </span>
                  <span className="text-xs text-stone-400">Accountant Ready</span>
                </div>
                <h2 className="text-xl font-black mt-1">
                  Profit & Loss (P&L) Statement: {selectedPlData.metric.fullLabel}
                </h2>
                <p className="text-xs text-stone-400">
                  Formal financial reconciliation for {selectedPlData.metric.fullLabel} ({selectedPlData.metric.startDate} to {selectedPlData.metric.endDate})
                </p>
              </div>

              {/* Select Closed Month & Jump Button */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <span className="text-xs font-bold text-stone-400">Select Month:</span>
                <select
                  value={selectedPlMonthKey}
                  onChange={(e) => setSelectedPlMonthKey(e.target.value)}
                  className={`p-2 rounded-xl text-xs font-bold border ${
                    isLight ? 'bg-white border-stone-300 text-stone-900' : 'bg-stone-950 border-stone-700 text-white'
                  }`}
                >
                  {monthlyPerformanceHistory.slice().reverse().map((m) => (
                    <option key={m.monthKey} value={m.monthKey}>
                      {m.fullLabel}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setSelectedPlMonthKey(defaultCurrentMonthKey)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                    selectedPlMonthKey === defaultCurrentMonthKey
                      ? isLight ? 'bg-stone-100 text-stone-500 border border-stone-200 cursor-default opacity-70' : 'bg-stone-900 text-stone-500 border border-stone-800 cursor-default opacity-70'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs active:scale-95'
                  }`}
                  title="Jump to Current Active Month"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Jump to Current Month</span>
                </button>
              </div>
            </div>

            {/* P&L Statement Formal Table */}
            <div className="mt-6 border border-stone-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-950 text-stone-300 uppercase text-[10px] font-black border-b border-stone-800">
                  <tr>
                    <th className="p-3.5">Financial Line Item / Category</th>
                    <th className="p-3.5">Details & Notes</th>
                    <th className="p-3.5 text-right">Amount ({currency})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60 font-sans">
                  {/* I. Operating Revenue */}
                  <tr className="bg-stone-950/40 font-black text-emerald-400">
                    <td colSpan={2} className="p-3.5">I. GROSS OPERATING REVENUE</td>
                    <td className="p-3.5 text-right font-mono text-sm">{formatCurrency(selectedPlData.totalRev, currency)}</td>
                  </tr>
                  
                  {Object.entries(selectedPlData.tuitionByPackage).map(([pkg, data]) => {
                    const namesStr = data.studentNames.join(', ');
                    return (
                      <tr key={pkg} className="text-stone-300">
                        <td className="p-3 pl-8 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          <span className="font-bold">{pkg}</span>
                        </td>
                        <td className="p-3 text-stone-300">
                          <div className="flex flex-col gap-0.5">
                            <div className="font-semibold text-stone-200">
                              {data.studentNames.length === 1 ? (
                                <span>Student: <strong className="text-emerald-400">{data.studentNames[0]}</strong></span>
                              ) : (
                                <span>Students ({data.studentNames.length}): <strong className="text-emerald-400">{namesStr}</strong></span>
                              )}
                            </div>
                            <span className="text-[10px] text-stone-400">
                              {data.payments.length} payment{data.payments.length !== 1 ? 's' : ''} ({data.payments.map(p => `${p.memberName}: ${p.amount} ${currency}`).join(', ')})
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-right font-mono text-emerald-300 font-bold">{formatCurrency(data.total, currency)}</td>
                      </tr>
                    );
                  })}

                  <tr className="text-stone-300">
                    <td className="p-3 pl-8 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                      <span className="font-bold">Pro Shop & Fighting Gear Sales</span>
                    </td>
                    <td className="p-3 text-stone-300">
                      <div className="flex flex-col gap-0.5">
                        {selectedPlData.mSales.length > 0 ? (
                          <>
                            <div className="font-semibold text-stone-200">
                              Buyer{new Set(selectedPlData.mSales.map(s => s.buyerName)).size > 1 ? 's' : ''}:{' '}
                              <strong className="text-purple-400">
                                {Array.from(new Set(selectedPlData.mSales.map(s => s.buyerName))).join(', ')}
                              </strong>
                            </div>
                            <span className="text-[10px] text-stone-400">
                              {selectedPlData.totalUnitsSold} unit{selectedPlData.totalUnitsSold !== 1 ? 's' : ''} sold · {selectedPlData.mSales.map(s => `${s.buyerName} (${s.itemName})`).join(', ')}
                            </span>
                          </>
                        ) : (
                          <span className="text-stone-400">0 items sold at academy store</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-right font-mono text-purple-300 font-bold">{formatCurrency(selectedPlData.merchRevenue, currency)}</td>
                  </tr>

                  {/* II. Operating Expenses */}
                  <tr className="bg-stone-950/40 font-black text-red-400">
                    <td colSpan={2} className="p-3.5">II. OPERATING EXPENSES & OVERHEADS</td>
                    <td className="p-3.5 text-right font-mono text-sm">{formatCurrency(selectedPlData.totalExp, currency)}</td>
                  </tr>

                  {Object.entries(selectedPlData.expensesByCat).map(([cat, data]) => (
                    <tr key={cat} className="text-stone-300">
                      <td className="p-3 pl-8 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                        <span>{cat}</span>
                      </td>
                      <td className="p-3 text-stone-400">{data.items.length} itemized payments ({data.items.map(i => i.title).slice(0, 2).join(', ')})</td>
                      <td className="p-3 text-right font-mono text-red-300">{formatCurrency(data.total, currency)}</td>
                    </tr>
                  ))}

                  {/* III. Net Operating Income */}
                  <tr className="bg-indigo-950/40 font-black text-white border-t-2 border-indigo-500">
                    <td colSpan={2} className="p-4 text-sm uppercase tracking-wide">
                      NET OPERATING INCOME (EBITDA) & NET PROFIT
                    </td>
                    <td className="p-4 text-right font-mono text-lg text-indigo-300">
                      {formatCurrency(selectedPlData.net, currency)}
                    </td>
                  </tr>

                  <tr className="bg-stone-950/80 font-bold text-stone-400">
                    <td colSpan={2} className="p-3 text-xs">
                      NET OPERATING PROFIT MARGIN %
                    </td>
                    <td className="p-3 text-right font-mono font-black text-sm text-indigo-400">
                      {selectedPlData.margin.toFixed(2)}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: NEW STUDENTS REPORT
          ========================================================================= */}
      {activeTab === 'new_students' && (
        <div className="space-y-4">
          <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            isLight ? 'bg-white border-stone-200' : 'bg-stone-900 border-stone-800'
          }`}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-stone-400">Age Filter:</span>
              {['all', 'Kids', 'Teens', 'Adults'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedAgeGroup(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedAgeGroup === cat
                      ? 'bg-indigo-600 text-white'
                      : isLight ? 'bg-stone-100 text-stone-700' : 'bg-stone-950 text-stone-400 border border-stone-800'
                  }`}
                >
                  {cat === 'all' ? 'All Groups' : cat}
                </button>
              ))}
            </div>

            <div className="text-xs font-bold text-purple-400">
              Showing {filteredNewStudents.length} new student enrollment{filteredNewStudents.length !== 1 ? 's' : ''} (Revenue: {formatCurrency(newStudentsRevenue, currency)})
            </div>
          </div>

          <div className={`rounded-2xl border overflow-hidden ${
            isLight ? 'bg-white border-stone-200' : 'bg-stone-900 border-stone-800'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`uppercase text-[10px] font-black border-b ${
                  isLight ? 'bg-stone-100 text-stone-600 border-stone-200' : 'bg-stone-950 text-stone-400 border-stone-800'
                }`}>
                  <tr>
                    <th className="p-3.5">Student Name</th>
                    <th className="p-3.5">Age / Group</th>
                    <th className="p-3.5">Belt Rank</th>
                    <th className="p-3.5">Join Date</th>
                    <th className="p-3.5">Package</th>
                    <th className="p-3.5">Phone</th>
                    <th className="p-3.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isLight ? 'divide-stone-200' : 'divide-stone-800/60'}`}>
                  {filteredNewStudents.map((s, idx) => (
                    <tr key={`${s.id}-${idx}`} className={isLight ? 'hover:bg-stone-50' : 'hover:bg-stone-800/40'}>
                      <td className="p-3.5 font-bold">{s.fullName}</td>
                      <td className="p-3.5">{s.ageGroup || 'Adults'}</td>
                      <td className="p-3.5">{s.beltRank} Belt ({s.stripes} stripes)</td>
                      <td className="p-3.5 font-mono text-stone-400">{s.joinDate || s.membershipStartDate}</td>
                      <td className="p-3.5">{s.membershipType === 'class_pack' ? 'Class Pack' : 'Unlimited'}</td>
                      <td className="p-3.5 font-mono">{s.phone}</td>
                      <td className="p-3.5 text-right font-bold text-emerald-400">{s.status}</td>
                    </tr>
                  ))}
                  {filteredNewStudents.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-stone-500 italic">
                        No new student enrollments registered in the selected time range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: GEAR SALES REPORT
          ========================================================================= */}
      {activeTab === 'gear_sales' && (
        <div className="space-y-4">
          <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            isLight ? 'bg-white border-stone-200' : 'bg-stone-900 border-stone-800'
          }`}>
            <div className="text-xs font-bold text-stone-300">
              Pro Shop Sales Ledger: {filteredGearSales.length} items sold ({totalGearUnitsSold} total units)
            </div>
            <div className="text-xs font-mono font-black text-purple-400">
              Total Revenue: {formatCurrency(totalGearSalesRevenue, currency)}
            </div>
          </div>

          <div className={`rounded-2xl border overflow-hidden ${
            isLight ? 'bg-white border-stone-200' : 'bg-stone-900 border-stone-800'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`uppercase text-[10px] font-black border-b ${
                  isLight ? 'bg-stone-100 text-stone-600 border-stone-200' : 'bg-stone-950 text-stone-400 border-stone-800'
                }`}>
                  <tr>
                    <th className="p-3.5">Date & Time</th>
                    <th className="p-3.5">Gear Item</th>
                    <th className="p-3.5">Size</th>
                    <th className="p-3.5">Buyer</th>
                    <th className="p-3.5">Buyer Type</th>
                    <th className="p-3.5">Method</th>
                    <th className="p-3.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isLight ? 'divide-stone-200' : 'divide-stone-800/60'}`}>
                  {filteredGearSales.map((sale, idx) => (
                    <tr key={`${sale.id}-${idx}`} className={isLight ? 'hover:bg-stone-50' : 'hover:bg-stone-800/40'}>
                      <td className="p-3.5 font-mono text-stone-400">{sale.date} {sale.time}</td>
                      <td className="p-3.5 font-bold">{sale.itemName}</td>
                      <td className="p-3.5">{sale.size}</td>
                      <td className="p-3.5">{sale.buyerName}</td>
                      <td className="p-3.5 uppercase text-[10px] font-bold text-purple-400">{sale.buyerType}</td>
                      <td className="p-3.5">{sale.paymentMethod}</td>
                      <td className="p-3.5 text-right font-mono font-bold text-emerald-400">
                        {formatCurrency(sale.totalAmount, currency)}
                      </td>
                    </tr>
                  ))}
                  {filteredGearSales.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-stone-500 italic">
                        No gear sales completed in the selected time range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 5: EXPENSES REPORT
          ========================================================================= */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            isLight ? 'bg-white border-stone-200' : 'bg-stone-900 border-stone-800'
          }`}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-stone-400">Category Filter:</span>
              <select
                value={selectedExpenseCategory}
                onChange={(e) => setSelectedExpenseCategory(e.target.value)}
                className={`p-1.5 rounded-lg text-xs font-bold border ${
                  isLight ? 'bg-white border-stone-300 text-stone-900' : 'bg-stone-950 border-stone-700 text-white'
                }`}
              >
                <option value="all">All Categories</option>
                <option value="Utilities (Water & Electricity)">Utilities (Water & Electricity)</option>
                <option value="Rent & Facility Lease">Rent & Facility Lease</option>
                <option value="Coach Salaries & Payroll">Coach Salaries & Payroll</option>
                <option value="Maintenance & Cleaning">Maintenance & Cleaning</option>
                <option value="Gear & Merchandise Inventory">Gear & Merchandise Restock</option>
                <option value="Equipment & Mat Upgrades">Equipment & Mat Upgrades</option>
                <option value="Marketing & Software Subscriptions">Marketing & Software</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setIsAddExpenseModalOpen(true)}
              className="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Add Expense / Outflow</span>
            </button>
          </div>

          <div className={`rounded-2xl border overflow-hidden ${
            isLight ? 'bg-white border-stone-200' : 'bg-stone-900 border-stone-800'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`uppercase text-[10px] font-black border-b ${
                  isLight ? 'bg-stone-100 text-stone-600 border-stone-200' : 'bg-stone-950 text-stone-400 border-stone-800'
                }`}>
                  <tr>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Title / Expense</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Vendor / Recipient</th>
                    <th className="p-3.5">Method</th>
                    <th className="p-3.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isLight ? 'divide-stone-200' : 'divide-stone-800/60'}`}>
                  {filteredExpenses.map((e, idx) => (
                    <tr key={`${e.id}-${idx}`} className={isLight ? 'hover:bg-stone-50' : 'hover:bg-stone-800/40'}>
                      <td className="p-3.5 font-mono text-stone-400">{e.date}</td>
                      <td className="p-3.5 font-bold">{e.title}</td>
                      <td className="p-3.5">{e.category}</td>
                      <td className="p-3.5">{e.recipientOrVendor || 'Academy Outflow'}</td>
                      <td className="p-3.5">{e.paymentMethod}</td>
                      <td className="p-3.5 text-right font-mono font-bold text-red-500">
                        {formatCurrency(e.amount, currency)}
                      </td>
                    </tr>
                  ))}
                  {filteredExpenses.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-stone-500 italic">
                        No expense records registered in the selected time range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 6: ATTENDANCE & MAT CAPACITY REPORT
          ========================================================================= */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            isLight ? 'bg-white border-stone-200' : 'bg-stone-900 border-stone-800'
          }`}>
            <div className="text-xs font-bold text-stone-300">
              Mat Attendance Logs: {filteredAttendance.length} check-ins in selected period
            </div>
            <div className="text-xs font-mono font-bold text-indigo-400">
              Active Member Base: {activeMembersCount} students
            </div>
          </div>

          <div className={`rounded-2xl border overflow-hidden ${
            isLight ? 'bg-white border-stone-200' : 'bg-stone-900 border-stone-800'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`uppercase text-[10px] font-black border-b ${
                  isLight ? 'bg-stone-100 text-stone-600 border-stone-200' : 'bg-stone-950 text-stone-400 border-stone-800'
                }`}>
                  <tr>
                    <th className="p-3.5">Date & Time</th>
                    <th className="p-3.5">Student Name</th>
                    <th className="p-3.5">Belt Rank</th>
                    <th className="p-3.5">Class Name</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Coach</th>
                    <th className="p-3.5 text-right">Balance After</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isLight ? 'divide-stone-200' : 'divide-stone-800/60'}`}>
                  {filteredAttendance.map((a, idx) => (
                    <tr key={`${a.id}-${idx}`} className={isLight ? 'hover:bg-stone-50' : 'hover:bg-stone-800/40'}>
                      <td className="p-3.5 font-mono text-stone-400">{a.date} {a.time}</td>
                      <td className="p-3.5 font-bold">{a.memberName}</td>
                      <td className="p-3.5">{a.beltRank} ({a.stripes} str)</td>
                      <td className="p-3.5 font-bold text-indigo-300">{a.className}</td>
                      <td className="p-3.5">{a.classCategory || a.category || 'Adults'}</td>
                      <td className="p-3.5 text-stone-300">{a.coach}</td>
                      <td className="p-3.5 text-right font-mono">
                        {a.classesRemainingAfter === -1 ? (
                          <span className="text-emerald-400">Unlimited</span>
                        ) : (
                          <span>{a.classesRemainingAfter} left</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredAttendance.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-stone-500 italic">
                        No mat attendance records registered in the selected time range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ADD NEW EXPENSE MODAL */}
      {isAddExpenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className={`w-full max-w-md rounded-2xl border p-5 shadow-2xl space-y-4 ${
            isLight ? 'bg-white border-stone-300 text-stone-900' : 'bg-stone-900 border-stone-800 text-white'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <h3 className="text-sm font-black">Record Academy Expense</h3>
              <button type="button" onClick={() => setIsAddExpenseModalOpen(false)} className="cursor-pointer">
                <X className="w-4 h-4 text-stone-400 hover:text-white" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-stone-400 block mb-1">Expense Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Water & Utility Bill, Mat Cleaner, Rent..."
                  value={expTitle}
                  onChange={(e) => setExpTitle(e.target.value)}
                  className={`w-full p-2.5 rounded-xl text-xs font-bold border ${
                    isLight ? 'bg-white border-stone-300 text-stone-900' : 'bg-stone-950 border-stone-700 text-white'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-400 block mb-1">Category</label>
                  <select
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value as ExpenseCategory)}
                    className={`w-full p-2.5 rounded-xl text-xs font-bold border ${
                      isLight ? 'bg-white border-stone-300 text-stone-900' : 'bg-stone-950 border-stone-700 text-white'
                    }`}
                  >
                    <option value="Utilities (Water & Electricity)">Utilities (Water & Electricity)</option>
                    <option value="Rent & Facility Lease">Rent & Facility Lease</option>
                    <option value="Coach Salaries & Payroll">Coach Salaries & Payroll</option>
                    <option value="Maintenance & Cleaning">Maintenance & Cleaning</option>
                    <option value="Gear & Merchandise Inventory">Gear Wholesale Restock</option>
                    <option value="Equipment & Mat Upgrades">Equipment & Mat Upgrades</option>
                    <option value="Marketing & Software Subscriptions">Marketing & Subscriptions</option>
                    <option value="Other / Miscellaneous">Other / Miscellaneous</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-400 block mb-1">Amount ({currency})</label>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    required
                    value={expAmount}
                    onChange={(e) => setExpAmount(parseFloat(e.target.value) || 0)}
                    className={`w-full p-2.5 rounded-xl text-xs font-bold border ${
                      isLight ? 'bg-white border-stone-300 text-stone-900' : 'bg-stone-950 border-stone-700 text-white'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-400 block mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className={`w-full p-2.5 rounded-xl text-xs font-bold border ${
                      isLight ? 'bg-white border-stone-300 text-stone-900' : 'bg-stone-950 border-stone-700 text-white'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-400 block mb-1">Payment Method</label>
                  <select
                    value={expMethod}
                    onChange={(e) => setExpMethod(e.target.value as any)}
                    className={`w-full p-2.5 rounded-xl text-xs font-bold border ${
                      isLight ? 'bg-white border-stone-300 text-stone-900' : 'bg-stone-950 border-stone-700 text-white'
                    }`}
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Cash">Cash</option>
                    <option value="Cliq">Cliq</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-400 block mb-1">Vendor / Recipient</label>
                <input
                  type="text"
                  placeholder="e.g. Electric Utility Corp, Real Estate Lease..."
                  value={expVendor}
                  onChange={(e) => setExpVendor(e.target.value)}
                  className={`w-full p-2.5 rounded-xl text-xs border ${
                    isLight ? 'bg-white border-stone-300 text-stone-900' : 'bg-stone-950 border-stone-700 text-white'
                  }`}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-400 block mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Invoice #, period covered, itemized receipt details..."
                  value={expNotes}
                  onChange={(e) => setExpNotes(e.target.value)}
                  className={`w-full p-2.5 rounded-xl text-xs border ${
                    isLight ? 'bg-white border-stone-300 text-stone-900' : 'bg-stone-950 border-stone-700 text-white'
                  }`}
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddExpenseModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-stone-800 hover:bg-stone-700 text-stone-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-md cursor-pointer"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
