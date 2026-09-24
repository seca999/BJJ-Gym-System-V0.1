import React, { useState, useMemo } from 'react';
import { 
  Award, 
  Search, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  UserCheck, 
  Users, 
  Filter, 
  Plus, 
  History, 
  Edit3, 
  Sparkles, 
  Shield, 
  ChevronRight, 
  Check, 
  X, 
  Camera, 
  GraduationCap, 
  Download,
  Flame,
  ArrowUpRight
} from 'lucide-react';
import { Member, Coach, BeltRank, StripeCount, PromotionRecord } from '../types';
import { 
  KIDS_BELT_RANKS, 
  TEENS_BELT_RANKS, 
  ADULT_BELT_RANKS, 
  ALL_BELT_RANKS,
  getBeltsForAgeGroup,
  getNextBeltInHierarchy
} from '../utils/bjjBelts';

interface PromotionsTrackerViewProps {
  members: Member[];
  coaches: Coach[];
  onUpdateMember: (updatedMember: Member) => void;
  onUpdateCoach: (updatedCoach: Coach) => void;
  defaultCoachName?: string;
}

const BELT_COLORS: Record<BeltRank, { bg: string; text: string; border: string; barBg: string; sleeveBg: string }> = {
  // Adult Belts
  White: {
    bg: 'bg-stone-100 text-stone-900',
    text: 'text-stone-900',
    border: 'border-stone-300',
    barBg: '#f5f5f4',
    sleeveBg: '#1c1917', // black bar
  },
  Blue: {
    bg: 'bg-blue-600 text-white',
    text: 'text-blue-400',
    border: 'border-blue-500',
    barBg: '#2563eb',
    sleeveBg: '#1c1917',
  },
  Purple: {
    bg: 'bg-purple-600 text-white',
    text: 'text-purple-400',
    border: 'border-purple-500',
    barBg: '#9333ea',
    sleeveBg: '#1c1917',
  },
  Brown: {
    bg: 'bg-amber-900 text-amber-100',
    text: 'text-amber-600',
    border: 'border-amber-800',
    barBg: '#78350f',
    sleeveBg: '#1c1917',
  },
  Black: {
    bg: 'bg-stone-950 text-red-400',
    text: 'text-red-500',
    border: 'border-red-600',
    barBg: '#09090b',
    sleeveBg: '#dc2626', // Red bar for black belt
  },

  // IBJJF Youth Grey Belts (Ages 4-15)
  'Grey-White': {
    bg: 'bg-stone-400 text-stone-950 font-bold',
    text: 'text-stone-900',
    border: 'border-stone-500',
    barBg: '#a8a29e',
    sleeveBg: '#1c1917',
  },
  Grey: {
    bg: 'bg-stone-500 text-white',
    text: 'text-stone-200',
    border: 'border-stone-600',
    barBg: '#78716c',
    sleeveBg: '#1c1917',
  },
  'Grey-Black': {
    bg: 'bg-stone-600 text-white',
    text: 'text-stone-200',
    border: 'border-stone-700',
    barBg: '#57534e',
    sleeveBg: '#1c1917',
  },

  // IBJJF Youth Yellow Belts (Ages 7-15)
  'Yellow-White': {
    bg: 'bg-amber-300 text-amber-950 font-bold',
    text: 'text-amber-900',
    border: 'border-amber-400',
    barBg: '#fcd34d',
    sleeveBg: '#1c1917',
  },
  Yellow: {
    bg: 'bg-amber-400 text-amber-950 font-bold',
    text: 'text-amber-900',
    border: 'border-amber-500',
    barBg: '#fbbf24',
    sleeveBg: '#1c1917',
  },
  'Yellow-Black': {
    bg: 'bg-amber-500 text-white font-bold',
    text: 'text-amber-950',
    border: 'border-amber-600',
    barBg: '#f59e0b',
    sleeveBg: '#1c1917',
  },

  // IBJJF Youth Orange Belts (Ages 10-15)
  'Orange-White': {
    bg: 'bg-orange-400 text-orange-950 font-bold',
    text: 'text-orange-900',
    border: 'border-orange-500',
    barBg: '#fb923c',
    sleeveBg: '#1c1917',
  },
  Orange: {
    bg: 'bg-orange-500 text-white font-bold',
    text: 'text-orange-100',
    border: 'border-orange-600',
    barBg: '#f97316',
    sleeveBg: '#1c1917',
  },
  'Orange-Black': {
    bg: 'bg-orange-600 text-white font-bold',
    text: 'text-orange-100',
    border: 'border-orange-700',
    barBg: '#ea580c',
    sleeveBg: '#1c1917',
  },

  // IBJJF Youth Green Belts (Ages 13-15)
  'Green-White': {
    bg: 'bg-emerald-400 text-emerald-950 font-bold',
    text: 'text-emerald-900',
    border: 'border-emerald-500',
    barBg: '#34d399',
    sleeveBg: '#1c1917',
  },
  Green: {
    bg: 'bg-emerald-500 text-white font-bold',
    text: 'text-emerald-100',
    border: 'border-emerald-600',
    barBg: '#10b981',
    sleeveBg: '#1c1917',
  },
  'Green-Black': {
    bg: 'bg-emerald-600 text-white font-bold',
    text: 'text-emerald-100',
    border: 'border-emerald-700',
    barBg: '#059669',
    sleeveBg: '#1c1917',
  },
};

const BELT_ORDER: BeltRank[] = ['White', 'Blue', 'Purple', 'Brown', 'Black'];

// Visual BJJ Belt Bar with Stripes
export const BeltDisplay: React.FC<{ belt: BeltRank; stripes: StripeCount; size?: 'sm' | 'md' | 'lg' }> = ({
  belt,
  stripes,
  size = 'md',
}) => {
  const config = BELT_COLORS[belt] || BELT_COLORS.White;
  const isBlack = belt === 'Black';

  const heightClass = size === 'sm' ? 'h-5 text-[10px]' : size === 'lg' ? 'h-8 text-sm' : 'h-6 text-xs';
  const sleeveWidth = size === 'sm' ? 'w-8' : size === 'lg' ? 'w-14' : 'w-11';
  const stripeWidth = size === 'sm' ? 'w-1' : size === 'lg' ? 'w-2' : 'w-1.5';

  return (
    <div
      className={`relative inline-flex items-center rounded-sm overflow-hidden shadow-xs border ${config.border} ${heightClass} min-w-[110px] max-w-[150px] select-none`}
      style={{ backgroundColor: config.barBg }}
      title={`${belt} Belt with ${stripes} Stripe${stripes === 1 ? '' : 's'}`}
    >
      {/* Belt rank text */}
      <span
        className={`px-2 font-black uppercase tracking-wider flex-1 truncate ${
          belt === 'White' ? 'text-stone-900' : 'text-white'
        }`}
      >
        {belt}
      </span>

      {/* Rank Sleeve (Black bar or Red bar for Black Belt) */}
      <div
        className={`${sleeveWidth} h-full flex items-center justify-around px-1 relative`}
        style={{ backgroundColor: config.sleeveBg }}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={`${stripeWidth} h-4/5 rounded-xs transition-all ${
              i < stripes
                ? 'bg-white shadow-xs'
                : isBlack
                ? 'bg-red-950/40'
                : 'bg-stone-900/40'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export const PromotionsTrackerView: React.FC<PromotionsTrackerViewProps> = ({
  members,
  coaches,
  onUpdateMember,
  onUpdateCoach,
  defaultCoachName = 'Professor Lucas Silva',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'students' | 'coaches'>('all');
  const [divisionFilter, setDivisionFilter] = useState<'all' | 'Kids' | 'Teens' | 'Adults'>('all');
  const [beltFilter, setBeltFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'due' | 'next30' | 'next90'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modal states
  const [selectedPromoteTarget, setSelectedPromoteTarget] = useState<{
    id: string;
    type: 'student' | 'coach';
    name: string;
    currentBelt: BeltRank;
    currentStripes: StripeCount;
    ageGroup?: string;
    avatar?: string;
    classesAttended?: number;
    lastPromotionDate?: string;
    nextExpectedPromotionDate?: string;
  } | null>(null);

  const [historyTarget, setHistoryTarget] = useState<{
    name: string;
    type: 'student' | 'coach';
    currentBelt: BeltRank;
    currentStripes: StripeCount;
    history: PromotionRecord[];
  } | null>(null);

  const [editDatesTarget, setEditDatesTarget] = useState<{
    id: string;
    type: 'student' | 'coach';
    name: string;
    lastPromotionDate: string;
    nextExpectedPromotionDate: string;
    notes: string;
  } | null>(null);

  // Avatar upload modal
  const [avatarUploadTarget, setAvatarUploadTarget] = useState<{
    id: string;
    type: 'student' | 'coach';
    name: string;
    avatar?: string;
  } | null>(null);

  const [customAvatarUrl, setCustomAvatarUrl] = useState('');

  // Form states for promotion modal
  const [promoBelt, setPromoBelt] = useState<BeltRank>('White');
  const [promoStripes, setPromoStripes] = useState<StripeCount>(0);
  const [promoDate, setPromoDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [promoNextDate, setPromoNextDate] = useState<string>('');
  const [promotedBy, setPromotedBy] = useState<string>(defaultCoachName);
  const [promoNotes, setPromoNotes] = useState<string>('');

  // Form states for quick dates edit
  const [editLastDate, setEditLastDate] = useState('');
  const [editNextDate, setEditNextDate] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Helper to calculate days difference
  const getDaysUntil = (targetDateStr?: string): number | null => {
    if (!targetDateStr) return null;
    const target = new Date(targetDateStr);
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Helper to calculate default next promotion date (approx 3-6 months based on rank)
  const calculateDefaultNextPromotion = (belt: BeltRank, stripes: StripeCount): string => {
    const nextDate = new Date();
    if (belt === 'White') {
      // 2-3 months per stripe
      nextDate.setMonth(nextDate.getMonth() + 3);
    } else if (belt === 'Blue') {
      // 4-6 months per stripe
      nextDate.setMonth(nextDate.getMonth() + 5);
    } else if (belt === 'Purple') {
      nextDate.setMonth(nextDate.getMonth() + 6);
    } else {
      nextDate.setMonth(nextDate.getMonth() + 8);
    }
    return nextDate.toISOString().split('T')[0];
  };

  // Combined Practitioners List (Students + Coaches)
  const unifiedPractitioners = useMemo(() => {
    const list: Array<{
      id: string;
      type: 'student' | 'coach';
      name: string;
      email: string;
      phone: string;
      avatar?: string;
      beltRank: BeltRank;
      stripes: StripeCount;
      ageGroup?: string;
      roleTitle?: string;
      totalClassesAttended: number;
      lastPromotionDate?: string;
      nextExpectedPromotionDate?: string;
      promotionNotes?: string;
      promotionHistory: PromotionRecord[];
      classesRequiredForNext?: number;
      daysUntilNext: number | null;
      isDue: boolean;
      isUpcoming30: boolean;
      isUpcoming90: boolean;
    }> = [];

    // Add Students
    members.forEach((m) => {
      // Compute default fallback dates if none exist
      const lastPromo = m.lastPromotionDate || m.joinDate || '2026-01-01';
      const nextPromo = m.nextExpectedPromotionDate || calculateDefaultNextPromotion(m.beltRank, m.stripes);
      const days = getDaysUntil(nextPromo);
      const isDue = days !== null && days <= 0;
      const isUpcoming30 = days !== null && days > 0 && days <= 30;
      const isUpcoming90 = days !== null && days > 0 && days <= 90;

      list.push({
        id: m.id,
        type: 'student',
        name: m.fullName,
        email: m.email,
        phone: m.phone,
        avatar: m.avatar,
        beltRank: m.beltRank,
        stripes: m.stripes,
        ageGroup: m.ageGroup || 'Adults',
        totalClassesAttended: m.totalClassesAttended || 0,
        lastPromotionDate: lastPromo,
        nextExpectedPromotionDate: nextPromo,
        promotionNotes: m.promotionNotes || m.notes,
        promotionHistory: m.promotionHistory || [],
        classesRequiredForNext: m.classesRequiredForNext || (m.beltRank === 'White' ? 30 : 50),
        daysUntilNext: days,
        isDue,
        isUpcoming30,
        isUpcoming90,
      });
    });

    // Add Coaches
    coaches.forEach((c) => {
      const lastPromo = c.lastPromotionDate || c.hireDate || '2025-01-01';
      const nextPromo = c.nextExpectedPromotionDate || calculateDefaultNextPromotion(c.beltRank, c.stripes);
      const days = getDaysUntil(nextPromo);
      const isDue = days !== null && days <= 0;
      const isUpcoming30 = days !== null && days > 0 && days <= 30;
      const isUpcoming90 = days !== null && days > 0 && days <= 90;

      list.push({
        id: c.id,
        type: 'coach',
        name: c.fullName,
        email: c.email,
        phone: c.phone,
        avatar: c.avatar,
        beltRank: c.beltRank,
        stripes: c.stripes,
        roleTitle: c.role || 'Instructor',
        totalClassesAttended: 250, // Coaches have high mat time
        lastPromotionDate: lastPromo,
        nextExpectedPromotionDate: nextPromo,
        promotionNotes: c.promotionNotes || c.bio,
        promotionHistory: c.promotionHistory || [],
        classesRequiredForNext: 80,
        daysUntilNext: days,
        isDue,
        isUpcoming30,
        isUpcoming90,
      });
    });

    return list;
  }, [members, coaches, todayStr]);

  // Filtered practitioners
  const filteredPractitioners = useMemo(() => {
    return unifiedPractitioners.filter((p) => {
      // Role filter
      if (roleFilter === 'students' && p.type !== 'student') return false;
      if (roleFilter === 'coaches' && p.type !== 'coach') return false;

      // Division filter (Kids, Teens, Adults)
      if (divisionFilter !== 'all') {
        if (p.type === 'coach') {
          if (divisionFilter !== 'Adults') return false;
        } else {
          const studentDiv = p.ageGroup || 'Adults';
          if (studentDiv !== divisionFilter) return false;
        }
      }

      // Belt filter
      if (beltFilter !== 'all' && p.beltRank !== beltFilter) return false;

      // Status filter
      if (statusFilter === 'due' && !p.isDue) return false;
      if (statusFilter === 'next30' && !p.isUpcoming30 && !p.isDue) return false;
      if (statusFilter === 'next90' && !p.isUpcoming90 && !p.isUpcoming30 && !p.isDue) return false;

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchName = p.name.toLowerCase().includes(term);
        const matchBelt = p.beltRank.toLowerCase().includes(term);
        const matchEmail = p.email.toLowerCase().includes(term);
        const matchPhone = p.phone.toLowerCase().includes(term);
        const matchRole = (p.roleTitle || p.ageGroup || '').toLowerCase().includes(term);
        return matchName || matchBelt || matchEmail || matchPhone || matchRole;
      }

      return true;
    });
  }, [unifiedPractitioners, roleFilter, divisionFilter, beltFilter, statusFilter, searchTerm]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = unifiedPractitioners.length;
    const dueCount = unifiedPractitioners.filter((p) => p.isDue).length;
    const upcoming30Count = unifiedPractitioners.filter((p) => p.isUpcoming30).length;
    const blackBeltsCount = unifiedPractitioners.filter((p) => p.beltRank === 'Black').length;
    const coachesCount = coaches.length;
    const studentsCount = members.length;

    return {
      total,
      dueCount,
      upcoming30Count,
      blackBeltsCount,
      coachesCount,
      studentsCount,
    };
  }, [unifiedPractitioners, coaches, members]);

  // Open Promotion Modal
  const handleOpenPromote = (p: typeof unifiedPractitioners[0]) => {
    setSelectedPromoteTarget({
      id: p.id,
      type: p.type,
      name: p.name,
      currentBelt: p.beltRank,
      currentStripes: p.stripes,
      ageGroup: p.ageGroup,
      avatar: p.avatar,
      classesAttended: p.totalClassesAttended,
      lastPromotionDate: p.lastPromotionDate,
      nextExpectedPromotionDate: p.nextExpectedPromotionDate,
    });

    // Auto calculate next logical promotion
    let nextBelt = p.beltRank;
    let nextStripes: StripeCount = ((p.stripes + 1) % 5) as StripeCount;

    if (p.stripes === 4) {
      const targetDiv = (p.ageGroup || (p.type === 'coach' ? 'Adults' : 'Adults')) as any;
      nextBelt = getNextBeltInHierarchy(p.beltRank, targetDiv);
      nextStripes = 0;
    }

    setPromoBelt(nextBelt);
    setPromoStripes(nextStripes);
    setPromoDate(new Date().toISOString().split('T')[0]);
    setPromoNextDate(calculateDefaultNextPromotion(nextBelt, nextStripes));
    setPromotedBy(defaultCoachName);
    setPromoNotes(`Graduation evaluation completed. Demonstrates consistent technique.`);
  };

  // Submit Promotion
  const handleSavePromotion = () => {
    if (!selectedPromoteTarget) return;

    const newRecord: PromotionRecord = {
      id: `promo-${Date.now()}`,
      targetId: selectedPromoteTarget.id,
      targetName: selectedPromoteTarget.name,
      targetType: selectedPromoteTarget.type,
      previousBelt: selectedPromoteTarget.currentBelt,
      previousStripes: selectedPromoteTarget.currentStripes,
      newBelt: promoBelt,
      newStripes: promoStripes,
      promotionDate: promoDate,
      nextExpectedDate: promoNextDate || calculateDefaultNextPromotion(promoBelt, promoStripes),
      promotedBy,
      notes: promoNotes,
      classesAtPromotion: selectedPromoteTarget.classesAttended || 0,
    };

    if (selectedPromoteTarget.type === 'student') {
      const member = members.find((m) => m.id === selectedPromoteTarget.id);
      if (member) {
        const history = member.promotionHistory || [];
        const updated: Member = {
          ...member,
          beltRank: promoBelt,
          stripes: promoStripes,
          lastPromotionDate: promoDate,
          nextExpectedPromotionDate: promoNextDate,
          promotionNotes: promoNotes,
          promotionHistory: [newRecord, ...history],
        };
        onUpdateMember(updated);
      }
    } else {
      const coach = coaches.find((c) => c.id === selectedPromoteTarget.id);
      if (coach) {
        const history = coach.promotionHistory || [];
        const updated: Coach = {
          ...coach,
          beltRank: promoBelt,
          stripes: promoStripes,
          lastPromotionDate: promoDate,
          nextExpectedPromotionDate: promoNextDate,
          promotionNotes: promoNotes,
          promotionHistory: [newRecord, ...history],
        };
        onUpdateCoach(updated);
      }
    }

    setSelectedPromoteTarget(null);
  };

  // Open Edit Dates Modal
  const handleOpenEditDates = (p: typeof unifiedPractitioners[0]) => {
    setEditDatesTarget({
      id: p.id,
      type: p.type,
      name: p.name,
      lastPromotionDate: p.lastPromotionDate || '',
      nextExpectedPromotionDate: p.nextExpectedPromotionDate || '',
      notes: p.promotionNotes || '',
    });
    setEditLastDate(p.lastPromotionDate || '');
    setEditNextDate(p.nextExpectedPromotionDate || '');
    setEditNotes(p.promotionNotes || '');
  };

  // Save Edit Dates
  const handleSaveEditDates = () => {
    if (!editDatesTarget) return;

    if (editDatesTarget.type === 'student') {
      const member = members.find((m) => m.id === editDatesTarget.id);
      if (member) {
        const updated: Member = {
          ...member,
          lastPromotionDate: editLastDate,
          nextExpectedPromotionDate: editNextDate,
          promotionNotes: editNotes,
        };
        onUpdateMember(updated);
      }
    } else {
      const coach = coaches.find((c) => c.id === editDatesTarget.id);
      if (coach) {
        const updated: Coach = {
          ...coach,
          lastPromotionDate: editLastDate,
          nextExpectedPromotionDate: editNextDate,
          promotionNotes: editNotes,
        };
        onUpdateCoach(updated);
      }
    }

    setEditDatesTarget(null);
  };

  // Handle Avatar Update
  const handleSaveAvatar = (newAvatarUrl: string) => {
    if (!avatarUploadTarget) return;

    if (avatarUploadTarget.type === 'student') {
      const member = members.find((m) => m.id === avatarUploadTarget.id);
      if (member) {
        onUpdateMember({ ...member, avatar: newAvatarUrl });
      }
    } else {
      const coach = coaches.find((c) => c.id === avatarUploadTarget.id);
      if (coach) {
        onUpdateCoach({ ...coach, avatar: newAvatarUrl });
      }
    }

    setAvatarUploadTarget(null);
    setCustomAvatarUrl('');
  };

  // File Upload to Data URL
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        handleSaveAvatar(result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Export Promotions CSV
  const handleExportCSV = () => {
    const headers = ['Name', 'Role', 'Belt', 'Stripes', 'Last Promotion Date', 'Next Expected Date', 'Days Remaining', 'Status', 'Notes'];
    const rows = unifiedPractitioners.map((p) => [
      `"${p.name}"`,
      `"${p.type === 'coach' ? 'Coach (' + (p.roleTitle || 'Coach') + ')' : 'Student (' + (p.ageGroup || 'Adults') + ')'}"`,
      `"${p.beltRank}"`,
      p.stripes,
      `"${p.lastPromotionDate || ''}"`,
      `"${p.nextExpectedPromotionDate || ''}"`,
      p.daysUntilNext !== null ? p.daysUntilNext : '',
      `"${p.isDue ? 'Due for Promotion' : p.isUpcoming30 ? 'Upcoming in 30 Days' : 'On Track'}"`,
      `"${(p.promotionNotes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bjj_promotions_schedule_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 border border-stone-800 rounded-xl p-5 sm:p-6 text-white shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-950/80 border border-red-700/60 rounded-xl text-red-400 shadow-md flex-shrink-0">
              <Award className="w-8 h-8 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Promotions & Belt Progression Directory
                </h2>
                <span className="px-2 py-0.5 text-xs font-bold bg-amber-950 text-amber-300 rounded border border-amber-800">
                  {metrics.total} Practitioners
                </span>
              </div>
              <p className="text-stone-300 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
                Track graduation dates, belt & stripe milestones, mat hours, and upcoming evaluation eligibility for every student and coach in your academy.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap self-start lg:self-center">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs sm:text-sm font-semibold transition-colors shadow-xs"
              title="Download promotions ledger as CSV spreadsheet"
            >
              <Download className="w-4 h-4 text-stone-400" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-stone-800/80">
          <div 
            onClick={() => { setStatusFilter('all'); setRoleFilter('all'); }}
            className="bg-stone-800/60 hover:bg-stone-800 border border-stone-700/60 rounded-lg p-3.5 cursor-pointer transition-all hover:border-stone-500"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-stone-400 font-medium">All Ranks</span>
              <Users className="w-4 h-4 text-stone-400" />
            </div>
            <div className="text-2xl font-black text-white mt-1">{metrics.total}</div>
            <div className="text-[11px] text-stone-400 mt-0.5">
              {metrics.studentsCount} Students • {metrics.coachesCount} Coaches
            </div>
          </div>

          <div 
            onClick={() => setStatusFilter('due')}
            className={`rounded-lg p-3.5 cursor-pointer transition-all border ${
              statusFilter === 'due'
                ? 'bg-amber-950/70 border-amber-500 ring-1 ring-amber-500'
                : 'bg-stone-800/60 hover:bg-stone-800 border-amber-900/50 hover:border-amber-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-amber-300 font-bold flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-400" /> Due for Promotion
              </span>
              <AlertCircle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-400 mt-1">{metrics.dueCount}</div>
            <div className="text-[11px] text-amber-300/80 mt-0.5">
              Target date reached or past due
            </div>
          </div>

          <div 
            onClick={() => setStatusFilter('next30')}
            className={`rounded-lg p-3.5 cursor-pointer transition-all border ${
              statusFilter === 'next30'
                ? 'bg-emerald-950/70 border-emerald-500 ring-1 ring-emerald-500'
                : 'bg-stone-800/60 hover:bg-stone-800 border-emerald-900/50 hover:border-emerald-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-emerald-300 font-bold">Upcoming (30 Days)</span>
              <Calendar className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400 mt-1">{metrics.upcoming30Count}</div>
            <div className="text-[11px] text-emerald-300/80 mt-0.5">
              Eligible in next 4 weeks
            </div>
          </div>

          <div 
            onClick={() => { setBeltFilter('Black'); setStatusFilter('all'); }}
            className={`rounded-lg p-3.5 cursor-pointer transition-all border ${
              beltFilter === 'Black'
                ? 'bg-red-950/70 border-red-500 ring-1 ring-red-500'
                : 'bg-stone-800/60 hover:bg-stone-800 border-stone-700/60 hover:border-red-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-red-300 font-medium">Black Belts</span>
              <Shield className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-2xl font-black text-red-400 mt-1">{metrics.blackBeltsCount}</div>
            <div className="text-[11px] text-stone-400 mt-0.5">
              Professors & Black Belts
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-white dark:bg-stone-900 rounded-xl p-4 border border-stone-200 dark:border-stone-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by student or coach name, phone, belt rank..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-stone-50 dark:bg-stone-800/80 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-red-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* View mode toggle */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            <div className="flex bg-stone-100 dark:bg-stone-800 p-1 rounded-lg border border-stone-200 dark:border-stone-700">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-xs'
                    : 'text-stone-500 dark:text-stone-400 hover:text-stone-800'
                }`}
              >
                Cards View
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-xs'
                    : 'text-stone-500 dark:text-stone-400 hover:text-stone-800'
                }`}
              >
                Table Directory
              </button>
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
          {/* Role Filter */}
          <div className="flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400 mr-2 font-medium">
            <Filter className="w-3.5 h-3.5" />
            <span>Role:</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['all', 'students', 'coaches'] as const).map((role) => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-colors capitalize ${
                  roleFilter === role
                    ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 shadow-xs'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                }`}
              >
                {role === 'all' ? 'All Roles' : role}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-stone-200 dark:bg-stone-700 mx-1 hidden sm:block" />

          {/* Division Filter: Kids, Teens, Adults */}
          <div className="flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400 mr-1 font-medium">
            <span>Division:</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['all', 'Kids', 'Teens', 'Adults'] as const).map((div) => (
              <button
                key={div}
                onClick={() => {
                  setDivisionFilter(div);
                  setBeltFilter('all');
                }}
                className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-colors ${
                  divisionFilter === div
                    ? div === 'Kids'
                      ? 'bg-amber-500 text-stone-950 font-bold shadow-xs'
                      : div === 'Teens'
                      ? 'bg-purple-600 text-white font-bold shadow-xs'
                      : 'bg-red-600 text-white font-bold shadow-xs'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                }`}
              >
                {div === 'all' ? 'All Divisions' : div === 'Kids' ? '🧒 Kids' : div === 'Teens' ? '🥋 Teens' : '👤 Adults'}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-stone-200 dark:bg-stone-700 mx-1 hidden sm:block" />

          {/* Belt Rank Filter */}
          <div className="flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400 mr-1 font-medium">
            <span>Belt:</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {(divisionFilter === 'Kids'
              ? ['all', ...KIDS_BELT_RANKS]
              : divisionFilter === 'Teens'
              ? ['all', ...TEENS_BELT_RANKS]
              : ['all', 'White', 'Blue', 'Purple', 'Brown', 'Black']
            ).map((belt) => (
              <button
                key={belt}
                onClick={() => setBeltFilter(belt)}
                className={`px-2 py-0.5 text-xs rounded-md font-semibold transition-colors ${
                  beltFilter === belt
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                }`}
              >
                {belt === 'all' ? 'All Belts' : belt}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-stone-200 dark:bg-stone-700 mx-1 hidden sm:block" />

          {/* Status Filter */}
          <div className="flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400 mr-1 font-medium">
            <span>Status:</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'all', label: 'All Status' },
              { id: 'due', label: 'Due / Ready' },
              { id: 'next30', label: 'Next 30 Days' },
              { id: 'next90', label: 'Next 90 Days' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setStatusFilter(s.id as any)}
                className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-colors ${
                  statusFilter === s.id
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Practitioner List Display */}
      {filteredPractitioners.length === 0 ? (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-12 text-center">
          <Award className="w-12 h-12 text-stone-400 mx-auto mb-3 opacity-60" />
          <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">No practitioners matched your filters</h3>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1 max-w-md mx-auto">
            Try adjusting your search criteria or resetting your belt/status filter options.
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setRoleFilter('all');
              setBeltFilter('all');
              setStatusFilter('all');
            }}
            className="mt-4 px-4 py-2 bg-stone-800 hover:bg-stone-700 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* CARDS GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredPractitioners.map((p) => {
            const isCoach = p.type === 'coach';

            return (
              <div
                key={`${p.type}-${p.id}`}
                className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between relative group"
              >
                {/* Due badge banner if ready for promotion */}
                {p.isDue && (
                  <div className="absolute -top-2.5 right-4 bg-amber-500 text-stone-950 font-black text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1 border border-amber-300">
                    <Flame className="w-3 h-3 text-stone-950" />
                    Due for Promotion
                  </div>
                )}

                <div>
                  {/* Top Profile Header */}
                  <div className="flex items-start gap-3.5">
                    {/* Avatar with photo update button */}
                    <div className="relative group/avatar">
                      {p.avatar ? (
                        <img
                          src={p.avatar}
                          alt={p.name}
                          className="w-14 h-14 rounded-full object-cover border-2 border-stone-300 dark:border-stone-700 shadow-xs"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-stone-700 to-stone-900 text-amber-400 font-black text-xl flex items-center justify-center border-2 border-stone-600 shadow-xs">
                          {p.name.charAt(0)}
                        </div>
                      )}
                      <button
                        onClick={() => setAvatarUploadTarget({ id: p.id, type: p.type, name: p.name, avatar: p.avatar })}
                        className="absolute inset-0 bg-stone-950/70 text-white rounded-full flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity"
                        title="Upload / Change Profile Picture"
                      >
                        <Camera className="w-4 h-4 text-amber-400" />
                      </button>
                    </div>

                    {/* Name & Role */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-stone-900 dark:text-white text-base truncate">
                          {p.name}
                        </h4>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            isCoach
                              ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                              : 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                          }`}
                        >
                          {isCoach ? 'Coach' : p.ageGroup || 'Student'}
                        </span>
                      </div>

                      {/* Current Belt Bar */}
                      <div className="mt-1.5 flex items-center gap-2">
                        <BeltDisplay belt={p.beltRank} stripes={p.stripes} size="sm" />
                      </div>
                    </div>
                  </div>

                  {/* Dates & Timeline Box */}
                  <div className="mt-4 bg-stone-50 dark:bg-stone-850/60 rounded-lg p-3 border border-stone-200 dark:border-stone-800/80 space-y-2.5">
                    {/* Last Promotion */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-stone-500 dark:text-stone-400 font-medium flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-stone-400" />
                        Last Promoted:
                      </span>
                      <span className="font-semibold text-stone-800 dark:text-stone-200">
                        {p.lastPromotionDate || 'No record'}
                      </span>
                    </div>

                    {/* Next Expected Promotion */}
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-stone-200 dark:border-stone-800">
                      <span className="text-stone-500 dark:text-stone-400 font-medium flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-amber-500" />
                        Next Expected:
                      </span>
                      <div className="text-right">
                        <span className="font-bold text-stone-900 dark:text-stone-100 block">
                          {p.nextExpectedPromotionDate || 'Not set'}
                        </span>
                        {p.daysUntilNext !== null && (
                          <span
                            className={`text-[10px] font-bold ${
                              p.isDue
                                ? 'text-amber-600 dark:text-amber-400'
                                : p.isUpcoming30
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-stone-500 dark:text-stone-400'
                            }`}
                          >
                            {p.daysUntilNext <= 0
                              ? `Ready Now (${Math.abs(p.daysUntilNext)}d ago)`
                              : `In ${p.daysUntilNext} days`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Classes / Mat time indicator */}
                    <div className="pt-1.5">
                      <div className="flex justify-between text-[11px] text-stone-500 dark:text-stone-400 mb-1">
                        <span>Classes Attended:</span>
                        <span className="font-bold text-stone-700 dark:text-stone-300">
                          {p.totalClassesAttended} classes
                        </span>
                      </div>
                      <div className="w-full bg-stone-200 dark:bg-stone-700 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-red-600 to-amber-500 h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, Math.round((p.totalClassesAttended / (p.classesRequiredForNext || 40)) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Notes snippet if present */}
                    {p.promotionNotes && (
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 italic truncate pt-1">
                        "{p.promotionNotes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Card Actions */}
                <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEditDates(p)}
                      className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-md transition-colors"
                      title="Edit Last Promotion & Next Target Dates"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() =>
                        setHistoryTarget({
                          name: p.name,
                          type: p.type,
                          currentBelt: p.beltRank,
                          currentStripes: p.stripes,
                          history: p.promotionHistory,
                        })
                      }
                      className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-md transition-colors relative"
                      title="View Promotion History"
                    >
                      <History className="w-4 h-4" />
                      {p.promotionHistory.length > 0 && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500" />
                      )}
                    </button>
                  </div>

                  <button
                    onClick={() => handleOpenPromote(p)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>Promote</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE DIRECTORY VIEW */
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50 dark:bg-stone-800/70 border-b border-stone-200 dark:border-stone-800 text-stone-500 dark:text-stone-400 text-xs font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Practitioner</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Current Belt</th>
                  <th className="py-3 px-4">Last Promoted</th>
                  <th className="py-3 px-4">Next Expected</th>
                  <th className="py-3 px-4">Classes</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800 text-sm">
                {filteredPractitioners.map((p) => {
                  const isCoach = p.type === 'coach';

                  return (
                    <tr
                      key={`${p.type}-${p.id}`}
                      className="hover:bg-stone-50/80 dark:hover:bg-stone-800/40 transition-colors"
                    >
                      {/* Practitioner Name & Avatar */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div 
                            onClick={() => setAvatarUploadTarget({ id: p.id, type: p.type, name: p.name, avatar: p.avatar })}
                            className="cursor-pointer group relative"
                            title="Click to edit picture"
                          >
                            {p.avatar ? (
                              <img
                                src={p.avatar}
                                alt={p.name}
                                className="w-9 h-9 rounded-full object-cover border border-stone-300 dark:border-stone-700"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-stone-800 text-amber-400 font-bold text-xs flex items-center justify-center border border-stone-700">
                                {p.name.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-stone-900 dark:text-white">
                              {p.name}
                            </div>
                            <div className="text-xs text-stone-500 dark:text-stone-400">
                              {p.phone}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3 px-4">
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            isCoach
                              ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
                              : 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300'
                          }`}
                        >
                          {isCoach ? 'Coach' : p.ageGroup || 'Student'}
                        </span>
                      </td>

                      {/* Current Belt */}
                      <td className="py-3 px-4">
                        <BeltDisplay belt={p.beltRank} stripes={p.stripes} size="sm" />
                      </td>

                      {/* Last Promoted */}
                      <td className="py-3 px-4 text-xs font-semibold text-stone-700 dark:text-stone-300">
                        {p.lastPromotionDate || '—'}
                      </td>

                      {/* Next Expected */}
                      <td className="py-3 px-4">
                        <div className="text-xs font-bold text-stone-900 dark:text-stone-100">
                          {p.nextExpectedPromotionDate || '—'}
                        </div>
                        {p.daysUntilNext !== null && (
                          <div
                            className={`text-[10px] font-semibold ${
                              p.isDue
                                ? 'text-amber-600 dark:text-amber-400'
                                : p.isUpcoming30
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-stone-400'
                            }`}
                          >
                            {p.daysUntilNext <= 0
                              ? `Ready Now (${Math.abs(p.daysUntilNext)}d ago)`
                              : `In ${p.daysUntilNext} days`}
                          </div>
                        )}
                      </td>

                      {/* Total Classes */}
                      <td className="py-3 px-4 text-xs font-bold text-stone-800 dark:text-stone-200">
                        {p.totalClassesAttended}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {p.isDue ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                            <Flame className="w-3 h-3 text-amber-500" />
                            Due Now
                          </span>
                        ) : p.isUpcoming30 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            <Clock className="w-3 h-3 text-emerald-500" />
                            Next 30d
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                            On Track
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditDates(p)}
                            className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded transition-colors"
                            title="Edit Promotion Dates"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              setHistoryTarget({
                                name: p.name,
                                type: p.type,
                                currentBelt: p.beltRank,
                                currentStripes: p.stripes,
                                history: p.promotionHistory,
                              })
                            }
                            className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded transition-colors"
                            title="View History"
                          >
                            <History className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenPromote(p)}
                            className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold transition-colors shadow-xs"
                          >
                            Promote
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= MODALS ================= */}

      {/* 1. RECORD PROMOTION GRADUATION MODAL */}
      {selectedPromoteTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-950 text-red-400 rounded-xl border border-red-800">
                  <Award className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-stone-900 dark:text-white">
                    Award Belt / Stripe Promotion
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {selectedPromoteTarget.name} ({selectedPromoteTarget.type === 'coach' ? 'Coach' : 'Student'})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPromoteTarget(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current vs New Rank Preview */}
            <div className="bg-stone-50 dark:bg-stone-850 p-4 rounded-xl border border-stone-200 dark:border-stone-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-stone-500 dark:text-stone-400 uppercase font-bold block mb-1">
                  Current Rank
                </span>
                <BeltDisplay
                  belt={selectedPromoteTarget.currentBelt}
                  stripes={selectedPromoteTarget.currentStripes}
                  size="md"
                />
              </div>

              <div className="flex flex-col items-center px-2">
                <ChevronRight className="w-6 h-6 text-amber-500" />
                <span className="text-[10px] font-bold text-amber-500 uppercase">Graduating</span>
              </div>

              <div>
                <span className="text-[10px] text-stone-500 dark:text-stone-400 uppercase font-bold block mb-1">
                  New Rank
                </span>
                <BeltDisplay belt={promoBelt} stripes={promoStripes} size="md" />
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4 text-sm">
              {/* Belt & Stripes Selectors */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    New Belt Rank
                  </label>
                  <select
                    value={promoBelt}
                    onChange={(e) => setPromoBelt(e.target.value as BeltRank)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-900 dark:text-white font-medium"
                  >
                    {getBeltsForAgeGroup((selectedPromoteTarget?.ageGroup || 'Adults') as any).map((b) => (
                      <option key={b} value={b}>
                        {b} Belt {selectedPromoteTarget?.ageGroup === 'Kids' && b !== 'White' ? '(Youth)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    New Stripe Count
                  </label>
                  <select
                    value={promoStripes}
                    onChange={(e) => setPromoStripes(Number(e.target.value) as StripeCount)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-900 dark:text-white font-medium"
                  >
                    {[0, 1, 2, 3, 4].map((s) => (
                      <option key={s} value={s}>
                        {s} {s === 1 ? 'Stripe' : 'Stripes'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dates: Promotion Date & Next Expected Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    Promotion Date
                  </label>
                  <input
                    type="date"
                    value={promoDate}
                    onChange={(e) => setPromoDate(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-900 dark:text-white text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    Next Expected Target
                  </label>
                  <input
                    type="date"
                    value={promoNextDate}
                    onChange={(e) => setPromoNextDate(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-900 dark:text-white text-xs font-medium"
                  />
                </div>
              </div>

              {/* Promoted By */}
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Promoted By (Professor / Examiner)
                </label>
                <input
                  type="text"
                  value={promotedBy}
                  onChange={(e) => setPromotedBy(e.target.value)}
                  placeholder="e.g. Professor Lucas Silva"
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-900 dark:text-white text-sm"
                />
              </div>

              {/* Evaluation Notes */}
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Promotion Remarks & Evaluation Notes
                </label>
                <textarea
                  value={promoNotes}
                  onChange={(e) => setPromoNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. Demonstrated exceptional guard passing and leadership on the mat."
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-900 dark:text-white text-xs"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedPromoteTarget(null)}
                className="px-4 py-2 text-xs font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePromotion}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider rounded-lg transition-colors shadow-md"
              >
                <Check className="w-4 h-4" />
                Confirm Graduation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. EDIT PROMOTION DATES QUICK MODAL */}
      {editDatesTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
              <div>
                <h3 className="text-base font-black text-stone-900 dark:text-white">
                  Edit Promotion Schedule
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {editDatesTarget.name}
                </p>
              </div>
              <button
                onClick={() => setEditDatesTarget(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Last Promotion Date
                </label>
                <input
                  type="date"
                  value={editLastDate}
                  onChange={(e) => setEditLastDate(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-900 dark:text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Next Expected Promotion Date
                </label>
                <input
                  type="date"
                  value={editNextDate}
                  onChange={(e) => setEditNextDate(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-900 dark:text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Notes / Goals
                </label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-900 dark:text-white text-xs"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditDatesTarget(null)}
                className="px-4 py-2 text-xs font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEditDates}
                className="px-4 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs font-bold rounded-lg transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. PROMOTION HISTORY TIMELINE MODAL */}
      {historyTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-950 text-amber-400 rounded-lg border border-amber-800">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900 dark:text-white">
                    Promotion History & Timeline
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {historyTarget.name} • Current Rank: {historyTarget.currentBelt} Belt ({historyTarget.currentStripes} Stripes)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setHistoryTarget(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
              {historyTarget.history && historyTarget.history.length > 0 ? (
                historyTarget.history.map((h, i) => (
                  <div
                    key={h.id || i}
                    className="bg-stone-50 dark:bg-stone-850 p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 flex items-start gap-3"
                  >
                    <div className="p-2 bg-red-600 text-white rounded-lg flex-shrink-0 mt-0.5">
                      <Award className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-bold text-stone-900 dark:text-white text-sm">
                          {h.newBelt} Belt • {h.newStripes} {h.newStripes === 1 ? 'Stripe' : 'Stripes'}
                        </div>
                        <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                          {h.promotionDate}
                        </span>
                      </div>
                      <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                        Promoted by: <span className="font-semibold text-stone-700 dark:text-stone-300">{h.promotedBy || 'Professor'}</span>
                      </div>
                      {h.notes && (
                        <p className="text-xs text-stone-600 dark:text-stone-300 italic mt-1 bg-stone-100 dark:bg-stone-800 p-2 rounded">
                          "{h.notes}"
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-stone-400">
                  <Award className="w-10 h-10 mx-auto mb-2 opacity-50 text-amber-500" />
                  <p className="text-sm font-semibold text-stone-600 dark:text-stone-300">
                    No historical promotions logged yet
                  </p>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Click the "Promote" button to log their next belt or stripe graduation.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex justify-end">
              <button
                type="button"
                onClick={() => setHistoryTarget(null)}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-white text-xs font-bold rounded-lg"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. AVATAR / PROFILE PHOTO UPLOAD MODAL */}
      {avatarUploadTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
              <div>
                <h3 className="text-base font-black text-stone-900 dark:text-white">
                  Update Profile Photo
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {avatarUploadTarget.name}
                </p>
              </div>
              <button
                onClick={() => setAvatarUploadTarget(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* File Upload Box */}
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-2">
                  Upload Image from Device
                </label>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-stone-300 dark:border-stone-700 hover:border-red-500 rounded-xl p-6 cursor-pointer bg-stone-50 dark:bg-stone-800/50 transition-colors">
                  <Camera className="w-8 h-8 text-stone-400 mb-2" />
                  <span className="text-xs font-bold text-stone-700 dark:text-stone-200">
                    Click or Drag Image Here
                  </span>
                  <span className="text-[10px] text-stone-400 mt-1">PNG, JPG, WEBP up to 5MB</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Or Paste Image URL */}
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  Or Paste Photo URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={customAvatarUrl}
                    onChange={(e) => setCustomAvatarUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="flex-1 px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-stone-900 dark:text-white text-xs"
                  />
                  <button
                    onClick={() => {
                      if (customAvatarUrl.trim()) {
                        handleSaveAvatar(customAvatarUrl.trim());
                      }
                    }}
                    className="px-4 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs font-bold rounded-lg"
                  >
                    Save URL
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex justify-end">
              <button
                type="button"
                onClick={() => setAvatarUploadTarget(null)}
                className="px-4 py-2 text-xs font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
