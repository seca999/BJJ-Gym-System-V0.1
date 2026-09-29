import React, { useState } from 'react';
import {
  X,
  Tag,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Sparkles,
  RotateCcw,
  Check,
  Shield,
  Layers,
  HelpCircle,
  Clock,
  DollarSign,
  AlertCircle,
  Crown,
  UserCheck,
  MapPin,
  Flame,
  Award
} from 'lucide-react';
import { SubscriptionPlan, ClassCategory } from '../types';
import { INITIAL_SUBSCRIPTION_PLANS, INITIAL_COACHES } from '../data/sampleData';
import { formatCurrency } from '../utils/currencyUtils';

type PlanTab = 'ALL' | 'Adults' | 'Kids' | 'Teens' | 'VIP';

interface SubscriptionPlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  plans: SubscriptionPlan[];
  onSavePlan: (plan: SubscriptionPlan) => void;
  onDeletePlan: (planId: string) => void;
  onResetPlans: () => void;
  currencySymbol?: string;
  onSelectPlanForEnrollment?: (plan: SubscriptionPlan) => void;
}

export const SubscriptionPlansModal: React.FC<SubscriptionPlansModalProps> = ({
  isOpen,
  onClose,
  plans,
  onSavePlan,
  onDeletePlan,
  onResetPlans,
  currencySymbol = 'JOD',
  onSelectPlanForEnrollment,
}) => {
  const [activeTab, setActiveTab] = useState<PlanTab>('ALL');
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<SubscriptionPlan | null>(null);
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<ClassCategory | 'VIP'>('Adults');
  const [formIsVip, setFormIsVip] = useState(false);
  const [formClassesCount, setFormClassesCount] = useState<number>(8);
  const [formPrice, setFormPrice] = useState<number>(85);
  const [formBillingPeriod, setFormBillingPeriod] = useState<'monthly' | 'quarterly' | 'annual' | 'punch_card' | 'private_session'>('monthly');
  const [formDurationDays, setFormDurationDays] = useState<number>(30);
  const [formDescription, setFormDescription] = useState('');
  const [formFeaturesText, setFormFeaturesText] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [formIsPopular, setFormIsPopular] = useState(false);
  const [formVipCoachName, setFormVipCoachName] = useState('Lucas Silva (Head Professor)');
  const [formVipDurationMinutes, setFormVipDurationMinutes] = useState<number>(60);
  const [formVipLocation, setFormVipLocation] = useState('Private Mat Room A');

  if (!isOpen) return null;

  const handleOpenAdd = (targetCategory?: ClassCategory | 'VIP') => {
    setEditingPlan(null);
    const cat = targetCategory || (activeTab === 'ALL' ? 'Adults' : activeTab);
    const isVipMode = cat === 'VIP';
    
    setFormCategory(cat);
    setFormIsVip(isVipMode);

    if (isVipMode) {
      setFormName('VIP Private 1-on-1 (5-Session Pack)');
      setFormClassesCount(5);
      setFormPrice(180);
      setFormBillingPeriod('punch_card');
      setFormDurationDays(60);
      setFormVipCoachName('Lucas Silva (Head Professor)');
      setFormVipDurationMinutes(60);
      setFormVipLocation('Private Mat Room A');
      setFormDescription('Exclusive 1-on-1 private Brazilian Jiu-Jitsu coaching tailored to your competition and skill goals.');
      setFormFeaturesText('5 Dedicated 60-Min 1-on-1 Private Sessions\nPersonalized gameplan & video breakdown\nComplimentary clean Gi towel & locker\nPriority reservation & flexible rescheduling');
      setFormActive(true);
      setFormIsPopular(true);
    } else {
      setFormName(cat === 'Kids' ? 'Youth & Kids Monthly (8 Classes)' : cat === 'Teens' ? 'Juvenile & Teens Monthly' : '8 Classes / Month');
      setFormClassesCount(8);
      setFormPrice(cat === 'Kids' ? 65 : cat === 'Teens' ? 75 : 85);
      setFormBillingPeriod('monthly');
      setFormDurationDays(30);
      setFormDescription('2 sessions per week. Valid for 30 days.');
      setFormFeaturesText('2 Classes per week\nBelt testing eligibility\nFull mat access');
      setFormActive(true);
      setFormIsPopular(false);
    }
    setIsFormOpen(true);
  };

  const handleOpenEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    const isVipMode = plan.category === 'VIP' || !!plan.isVip || plan.id.includes('vip');
    setFormCategory(plan.category);
    setFormIsVip(isVipMode);
    setFormName(plan.name);
    setFormClassesCount(plan.classesCount);
    setFormPrice(plan.price);
    setFormBillingPeriod(plan.billingPeriod);
    setFormDurationDays(plan.durationDays);
    setFormDescription(plan.description || '');
    setFormFeaturesText(plan.features?.join('\n') || '');
    setFormActive(plan.active);
    setFormIsPopular(!!plan.isPopular);
    setFormVipCoachName(plan.vipCoachName || 'Lucas Silva (Head Professor)');
    setFormVipDurationMinutes(plan.vipDurationMinutes || 60);
    setFormVipLocation(plan.vipLocation || 'Private Mat Room A');
    setIsFormOpen(true);
  };

  const handleApplyPreset = (type: '8_classes' | '12_classes' | 'unlimited' | 'vip_single' | 'vip_5pack' | 'vip_10pack' | 'vip_elite') => {
    if (type === '8_classes') {
      setFormName(`${formCategory === 'VIP' ? 'Adults' : formCategory} 8 Classes / Month`);
      setFormCategory(formCategory === 'VIP' ? 'Adults' : formCategory);
      setFormIsVip(false);
      setFormClassesCount(8);
      setFormPrice(formCategory === 'Kids' ? 65 : formCategory === 'Teens' ? 75 : 85);
      setFormBillingPeriod('monthly');
      setFormDurationDays(30);
      setFormDescription('2 sessions per week. Great for steady progress and consistency.');
      setFormFeaturesText('2 Classes per week\nBelt progression tracking\n30-day validity');
    } else if (type === '12_classes') {
      setFormName(`${formCategory === 'VIP' ? 'Adults' : formCategory} 12 Classes / Month`);
      setFormCategory(formCategory === 'VIP' ? 'Adults' : formCategory);
      setFormIsVip(false);
      setFormClassesCount(12);
      setFormPrice(formCategory === 'Kids' ? 85 : formCategory === 'Teens' ? 95 : 110);
      setFormBillingPeriod('monthly');
      setFormDurationDays(30);
      setFormDescription('3 sessions per week. Ideal for dedicated grapplers and competitors.');
      setFormFeaturesText('3 Classes per week\nCompetition & sparring prep\nPriority stripe testing');
    } else if (type === 'unlimited') {
      setFormName(`${formCategory === 'VIP' ? 'Adults' : formCategory} Unlimited Monthly`);
      setFormCategory(formCategory === 'VIP' ? 'Adults' : formCategory);
      setFormIsVip(false);
      setFormClassesCount(-1);
      setFormPrice(formCategory === 'Kids' ? 110 : formCategory === 'Teens' ? 125 : 135);
      setFormBillingPeriod('monthly');
      setFormDurationDays(30);
      setFormDescription('Full unmetered access to all classes, sparring, and open mat.');
      setFormFeaturesText('Unlimited monthly training\nAll Gi, No-Gi & Open Mat\nGuest pass privileges');
    } else if (type === 'vip_single') {
      setFormCategory('VIP');
      setFormIsVip(true);
      setFormName('VIP Private 1-on-1 (Single Session)');
      setFormClassesCount(1);
      setFormPrice(40);
      setFormBillingPeriod('private_session');
      setFormDurationDays(30);
      setFormVipDurationMinutes(60);
      setFormVipLocation('Private Mat Room A');
      setFormDescription('1-on-1 private Brazilian Jiu-Jitsu session with video breakdown and personalized technique corrections.');
      setFormFeaturesText('60-Min 1-on-1 Private Mat Session\nVideo technique analysis\nComplimentary Gi towel service');
    } else if (type === 'vip_5pack') {
      setFormCategory('VIP');
      setFormIsVip(true);
      setFormName('VIP Private 5-Session Pack');
      setFormClassesCount(5);
      setFormPrice(180);
      setFormBillingPeriod('punch_card');
      setFormDurationDays(60);
      setFormVipDurationMinutes(60);
      setFormVipLocation('Private Mat Room A');
      setFormDescription('Package of 5 private one-on-one sessions for accelerated learning and competition prep.');
      setFormFeaturesText('5 Dedicated 1-on-1 Private Sessions\nPersonalized training roadmap\nFlexible appointment scheduling\nPriority sparring reservation');
    } else if (type === 'vip_10pack') {
      setFormCategory('VIP');
      setFormIsVip(true);
      setFormName('VIP Private 10-Session Master Pack');
      setFormClassesCount(10);
      setFormPrice(340);
      setFormBillingPeriod('punch_card');
      setFormDurationDays(90);
      setFormVipDurationMinutes(60);
      setFormVipLocation('Private Mat Room A');
      setFormDescription('Comprehensive 10-session private package for rapid belt promotion mastery.');
      setFormFeaturesText('10 Dedicated 1-on-1 Private Sessions\nCompetition scouting & strategy plan\nFull curriculum tape review\nReserved VIP locker');
    } else if (type === 'vip_elite') {
      setFormCategory('VIP');
      setFormIsVip(true);
      setFormName('VIP Elite Unlimited & 1:1 Package');
      setFormClassesCount(-1);
      setFormPrice(280);
      setFormBillingPeriod('monthly');
      setFormDurationDays(30);
      setFormVipDurationMinutes(60);
      setFormVipLocation('Full Facility Access');
      setFormDescription('All-inclusive VIP membership: Unlimited academy group mat access plus 4 monthly 1-on-1 private sessions.');
      setFormFeaturesText('Unlimited Gi & No-Gi Mat Classes\n4 Monthly 1-on-1 Private Sessions\nReserved locker & Gi laundry\nDirect WhatsApp coach access');
    }
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const features = formFeaturesText
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean);

    const isVip = formCategory === 'VIP' || formIsVip;

    const saved: SubscriptionPlan = {
      id: editingPlan?.id || `plan-${formCategory.toLowerCase()}-${Date.now()}`,
      name: formName.trim(),
      category: formCategory,
      isVip,
      classesCount: Number(formClassesCount),
      price: Number(formPrice) || 0,
      currency: currencySymbol,
      billingPeriod: formBillingPeriod,
      durationDays: Number(formDurationDays) || 30,
      description: formDescription.trim(),
      features,
      active: formActive,
      isPopular: formIsPopular,
      vipCoachName: isVip ? formVipCoachName : undefined,
      vipDurationMinutes: isVip ? Number(formVipDurationMinutes) : undefined,
      vipLocation: isVip ? formVipLocation : undefined,
    };

    onSavePlan(saved);
    setIsFormOpen(false);
    setEditingPlan(null);
  };

  const filteredPlans = plans.filter((p) => {
    const isVipPlan = p.category === 'VIP' || !!p.isVip || p.id.includes('vip');
    if (activeTab === 'ALL') return true;
    if (activeTab === 'VIP') return isVipPlan;
    if (isVipPlan) return false; // hide VIP from standard kids/teens/adults tabs to keep clean separation
    return p.category === activeTab;
  });

  const getCategoryColor = (cat: ClassCategory | 'VIP' | undefined, isVip?: boolean) => {
    if (cat === 'VIP' || isVip) {
      return {
        badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        accent: 'border-amber-500/50 hover:border-amber-400 ring-1 ring-amber-500/20 shadow-amber-950/30',
        header: 'from-amber-950/60 via-stone-900 to-stone-900',
      };
    }
    switch (cat) {
      case 'Kids':
        return {
          badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
          accent: 'border-emerald-500/40 hover:border-emerald-500/70',
          header: 'from-emerald-950/40 to-stone-900',
        };
      case 'Teens':
        return {
          badge: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
          accent: 'border-indigo-500/40 hover:border-indigo-500/70',
          header: 'from-indigo-950/40 to-stone-900',
        };
      case 'Adults':
      default:
        return {
          badge: 'bg-red-500/20 text-red-400 border-red-500/30',
          accent: 'border-red-500/40 hover:border-red-500/70',
          header: 'from-red-950/40 to-stone-900',
        };
    }
  };

  const vipPlansCount = plans.filter((p) => p.category === 'VIP' || p.isVip || p.id.includes('vip')).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 border-b border-stone-800 flex items-center justify-between bg-stone-950/70">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              activeTab === 'VIP' ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400' : 'bg-red-950 border border-red-800/60 text-red-400'
            }`}>
              {activeTab === 'VIP' ? <Crown className="w-5 h-5" /> : <Tag className="w-5 h-5 text-red-400" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  {activeTab === 'VIP' ? 'VIP 1-on-1 Private Plans & Pricing' : 'Subscription Plans & Pricing'}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-stone-800 border border-stone-700 text-[10px] font-mono font-bold text-stone-300">
                  {plans.length} Total Plans ({vipPlansCount} VIP)
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Configure separated tuition plans for Adults, Kids, Teens, and dedicated VIP 1-on-1 private coaching.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'VIP' ? (
              <button
                type="button"
                onClick={() => handleOpenAdd('VIP')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 rounded-xl text-xs font-black transition-all shadow-lg shadow-amber-950/40 cursor-pointer"
              >
                <Crown className="w-4 h-4" />
                <span>+ Create New VIP Plan</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleOpenAdd(activeTab === 'ALL' ? 'Adults' : activeTab)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-colors shadow-md cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Plan</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PROGRAM CATEGORY TABS & ACTIONS */}
        <div className="p-3 sm:px-5 bg-stone-950 border-b border-stone-800/80 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 bg-stone-900 p-1 rounded-xl border border-stone-800 flex-wrap">
            {([
              { id: 'ALL' as const, label: 'All Plans', isVip: false },
              { id: 'Adults' as const, label: 'Adults', isVip: false },
              { id: 'Kids' as const, label: 'Kids', isVip: false },
              { id: 'Teens' as const, label: 'Teens', isVip: false },
              { id: 'VIP' as const, label: '★ VIP 1-on-1', isVip: true },
            ]).map((tab) => {
              const count = tab.id === 'ALL'
                ? plans.length
                : tab.id === 'VIP'
                ? vipPlansCount
                : plans.filter((p) => p.category === tab.id && !p.isVip && !p.id.includes('vip')).length;
              const isCurrent = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as PlanTab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isCurrent
                      ? tab.isVip
                        ? 'bg-amber-500 text-stone-950 font-black shadow-md shadow-amber-950/50'
                        : 'bg-red-600 text-white shadow-xs'
                      : tab.isVip
                      ? 'text-amber-400/90 hover:text-amber-300 hover:bg-amber-950/30'
                      : 'text-stone-400 hover:text-white hover:bg-stone-800'
                  }`}
                >
                  {tab.isVip && <Crown className="w-3.5 h-3.5" />}
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isCurrent
                        ? tab.isVip
                          ? 'bg-stone-950 text-amber-400 font-bold'
                          : 'bg-red-950/80 text-white'
                        : 'bg-stone-800 text-stone-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsConfirmingReset(true)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-400 hover:text-amber-400 transition-colors cursor-pointer"
              title="Restore standard 8, 12, Unlimited, and VIP plans"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Default Plans</span>
            </button>
          </div>
        </div>

        {/* VIP BANNER CALLOUT WHEN ON VIP TAB */}
        {activeTab === 'VIP' && (
          <div className="mx-4 sm:mx-5 mt-4 p-3.5 bg-gradient-to-r from-amber-950/70 via-stone-900 to-amber-950/40 border border-amber-500/40 rounded-xl flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 border border-amber-500/40 rounded-lg text-amber-400 shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-amber-300 uppercase tracking-wider">
                Dedicated VIP 1-on-1 Private Packages
              </h4>
              <p className="text-[11px] text-stone-300">
                Customized private mat training, flexible coach bookings, private locker & gi laundry privileges.
              </p>
            </div>
          </div>
        )}

        {/* PLANS GRID */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {filteredPlans.length === 0 ? (
            <div className="text-center py-12 bg-stone-950/50 rounded-2xl border border-dashed border-stone-800 p-6">
              {activeTab === 'VIP' ? (
                <>
                  <Crown className="w-12 h-12 text-amber-500 mx-auto mb-2 opacity-80" />
                  <p className="text-sm font-black text-amber-300">No VIP 1-on-1 plans configured</p>
                  <p className="text-xs text-stone-400 mt-1">Create dedicated 1:1 private session packs and VIP memberships.</p>
                  <button
                    type="button"
                    onClick={() => handleOpenAdd('VIP')}
                    className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl text-xs font-black cursor-pointer shadow-lg"
                  >
                    <Crown className="w-4 h-4" />
                    <span>+ Create New VIP Plan</span>
                  </button>
                </>
              ) : (
                <>
                  <Tag className="w-10 h-10 text-stone-600 mx-auto mb-2" />
                  <p className="text-sm font-bold text-stone-300">No plans found in this program</p>
                  <p className="text-xs text-stone-500 mt-1">Create an 8-class, 12-class, or unlimited membership plan.</p>
                  <button
                    type="button"
                    onClick={() => handleOpenAdd(activeTab === 'ALL' ? 'Adults' : activeTab)}
                    className="mt-3 inline-flex items-center gap-1 px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create {activeTab === 'ALL' ? '' : activeTab} Plan</span>
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPlans.map((plan) => {
                const isVipPlan = plan.category === 'VIP' || !!plan.isVip || plan.id.includes('vip');
                const color = getCategoryColor(plan.category, isVipPlan);
                const isUnlimited = plan.classesCount === -1;

                return (
                  <div
                    key={plan.id}
                    className={`bg-stone-950 rounded-2xl border transition-all flex flex-col justify-between overflow-hidden relative group ${
                      plan.active ? color.accent : 'border-stone-800 opacity-60'
                    }`}
                  >
                    {/* Top Ribbon & Popular Badge */}
                    {plan.isPopular && (
                      <div className={`text-[10px] font-black uppercase tracking-wider py-1 text-center font-mono ${
                        isVipPlan
                          ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950'
                          : 'bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950'
                      }`}>
                        ★ Most Popular Plan
                      </div>
                    )}

                    <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                      <div>
                        {/* Header: Category Badge & Active Indicator */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center gap-1 ${color.badge}`}
                          >
                            {isVipPlan && <Crown className="w-3 h-3 text-amber-400" />}
                            <span>{isVipPlan ? 'VIP 1-on-1 Plan' : `${plan.category} Program`}</span>
                          </span>

                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                              plan.active ? (isVipPlan ? 'text-amber-400' : 'text-emerald-400') : 'text-stone-500'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                plan.active ? (isVipPlan ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400 animate-pulse') : 'bg-stone-600'
                              }`}
                            />
                            {plan.active ? 'Active' : 'Archived'}
                          </span>
                        </div>

                        {/* Title & Price */}
                        <h3 className="text-base font-extrabold text-white leading-snug">{plan.name}</h3>

                        <div className="mt-2.5 flex items-baseline gap-1.5">
                          <span className={`text-2xl sm:text-3xl font-black font-mono-digits ${
                            isVipPlan ? 'text-amber-400' : 'text-white'
                          }`}>
                            {formatCurrency(plan.price, plan.currency || currencySymbol)}
                          </span>
                          <span className="text-xs text-stone-400 font-semibold">
                            / {plan.billingPeriod === 'private_session' ? 'session' : plan.billingPeriod === 'punch_card' ? 'package' : 'month'}
                          </span>
                        </div>

                        {/* Allowance Tag */}
                        <div className="mt-3 flex items-center gap-2 flex-wrap">
                          <div
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                              isVipPlan
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : isUnlimited
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-stone-800 text-stone-200 border border-stone-700'
                            }`}
                          >
                            {isVipPlan ? <Crown className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                            <span>
                              {isVipPlan
                                ? isUnlimited
                                  ? 'Unlimited Mat + VIP Privates'
                                  : `${plan.classesCount} 1-on-1 Private Sessions`
                                : isUnlimited
                                ? 'Unlimited Mat Access'
                                : `${plan.classesCount} Classes / Month`}
                            </span>
                          </div>
                          <span className="text-[11px] text-stone-400">{plan.durationDays} Days</span>
                        </div>

                        {/* VIP Details */}
                        {isVipPlan && (
                          <div className="mt-2.5 p-2 bg-stone-900/90 rounded-lg border border-stone-800/90 space-y-1 text-[11px] text-stone-300">
                            {plan.vipCoachName && (
                              <div className="flex items-center gap-1.5 text-amber-300/90 font-medium">
                                <UserCheck className="w-3 h-3 text-amber-400" />
                                <span>Coach: <strong>{plan.vipCoachName}</strong></span>
                              </div>
                            )}
                            {plan.vipLocation && (
                              <div className="flex items-center gap-1.5 text-stone-400">
                                <MapPin className="w-3 h-3 text-stone-500" />
                                <span>Zone: {plan.vipLocation}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Description */}
                        {plan.description && (
                          <p className="mt-3 text-xs text-stone-400 leading-relaxed">{plan.description}</p>
                        )}

                        {/* Features List */}
                        {plan.features && plan.features.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-stone-850 space-y-1.5">
                            {plan.features.map((feat, idx) => (
                              <div key={idx} className="flex items-start gap-2 text-xs text-stone-300">
                                <Check className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isVipPlan ? 'text-amber-400' : 'text-emerald-400'}`} />
                                <span>{feat}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Card Action Footer */}
                      <div className="mt-5 pt-3 border-t border-stone-850 flex items-center justify-between gap-2">
                        {onSelectPlanForEnrollment ? (
                          <button
                            type="button"
                            onClick={() => onSelectPlanForEnrollment(plan)}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                              isVipPlan
                                ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 font-black'
                                : 'bg-red-600 hover:bg-red-500 text-white'
                            }`}
                          >
                            Select Plan
                          </button>
                        ) : (
                          <div className="text-[10px] text-stone-500 font-mono">ID: {plan.id}</div>
                        )}

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(plan)}
                            className="p-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                            title="Edit Plan Pricing & Details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPlanToDelete(plan)}
                            className="p-1.5 bg-stone-800 hover:bg-red-950 hover:text-red-400 text-stone-400 rounded-lg transition-colors cursor-pointer"
                            title="Delete Plan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 border-t border-stone-800 bg-stone-950/80 flex items-center justify-between text-xs text-stone-400">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-stone-300">Academy Tier Matrix:</span>
            <span>Kids • Teens • Adults Group • VIP 1-on-1 Private Sessions</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-white rounded-xl font-bold cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* SUB-MODAL: ADD / EDIT PLAN FORM (DEDICATED VIP / STANDARD MODES) */}
      {isFormOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Form Header */}
            <div className={`p-4 border-b flex items-center justify-between ${
              formCategory === 'VIP' || formIsVip
                ? 'bg-gradient-to-r from-amber-950/80 via-stone-950 to-amber-950/50 border-amber-500/40'
                : 'bg-stone-950/70 border-stone-800'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  formCategory === 'VIP' || formIsVip
                    ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400'
                    : 'bg-red-950 border border-red-800/60 text-red-400'
                }`}>
                  {formCategory === 'VIP' || formIsVip ? <Crown className="w-4 h-4" /> : <Tag className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                    {editingPlan
                      ? `Edit Plan: ${editingPlan.name}`
                      : formCategory === 'VIP' || formIsVip
                      ? '★ Create VIP 1-on-1 Private Plan'
                      : 'Create Subscription Plan'}
                  </h3>
                  {formCategory === 'VIP' && (
                    <p className="text-[10px] text-amber-300/80">Tailored 1:1 private coaching registration</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-5 space-y-4 max-h-[calc(90vh-120px)] overflow-y-auto">
              {/* Program Category Selection */}
              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1">
                  Plan Category & Program <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {([
                    { id: 'Kids', label: 'Kids' },
                    { id: 'Teens', label: 'Teens' },
                    { id: 'Adults', label: 'Adults' },
                    { id: 'VIP', label: '★ VIP 1:1', isVip: true },
                  ] as const).map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setFormCategory(cat.id);
                        setFormIsVip(cat.id === 'VIP');
                        if (cat.id === 'VIP') {
                          setFormClassesCount(5);
                          setFormBillingPeriod('punch_card');
                          setFormPrice(180);
                        }
                      }}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        formCategory === cat.id
                          ? cat.id === 'Kids'
                            ? 'bg-emerald-600 text-white border-emerald-500'
                            : cat.id === 'Teens'
                            ? 'bg-indigo-600 text-white border-indigo-500'
                            : cat.id === 'VIP'
                            ? 'bg-amber-500 text-stone-950 font-black border-amber-400 shadow-md'
                            : 'bg-red-600 text-white border-red-500'
                          : 'bg-stone-800/80 text-stone-400 border-stone-700 hover:text-white'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Template Presets */}
              <div>
                <label className="block text-[11px] font-semibold text-stone-400 mb-1">
                  {formCategory === 'VIP' || formIsVip ? 'VIP 1-on-1 Presets:' : 'Standard Class Presets:'}
                </label>
                {formCategory === 'VIP' || formIsVip ? (
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('vip_single')}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 text-xs font-bold border border-amber-500/40 cursor-pointer text-left"
                    >
                      Single 1:1 Session (40 JOD)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('vip_5pack')}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 text-xs font-bold border border-amber-500/40 cursor-pointer text-left"
                    >
                      5-Session Pack (180 JOD)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('vip_10pack')}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 text-xs font-bold border border-amber-500/40 cursor-pointer text-left"
                    >
                      10-Session Master (340 JOD)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('vip_elite')}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 text-xs font-bold border border-amber-500/40 cursor-pointer text-left"
                    >
                      VIP Elite Monthly (280 JOD)
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('8_classes')}
                      className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-xs font-semibold border border-stone-700 cursor-pointer"
                    >
                      8 Classes / Mo (2x/wk)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('12_classes')}
                      className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-xs font-semibold border border-stone-700 cursor-pointer"
                    >
                      12 Classes / Mo (3x/wk)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('unlimited')}
                      className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-xs font-semibold border border-stone-700 cursor-pointer"
                    >
                      Unlimited Monthly
                    </button>
                  </div>
                )}
              </div>

              {/* Plan Name */}
              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1">
                  Plan Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={formCategory === 'VIP' ? 'e.g. VIP 1-on-1 Private 5-Pack' : 'e.g. Adults 12 Classes / Month'}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 font-bold"
                />
              </div>

              {/* VIP Dedicated Options */}
              {(formCategory === 'VIP' || formIsVip) && (
                <div className="p-3.5 bg-stone-950 rounded-xl border border-amber-500/30 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                    <Crown className="w-4 h-4 text-amber-400" />
                    <span>VIP Private Session Configuration</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-300 mb-1">
                        Designated VIP Coach
                      </label>
                      <select
                        value={formVipCoachName}
                        onChange={(e) => setFormVipCoachName(e.target.value)}
                        className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                      >
                        <option value="Lucas Silva (Head Professor)">Lucas Silva (Head Professor - 3rd Degree)</option>
                        <option value="Ismat Al-Masri (Senior Instructor)">Ismat Al-Masri (Senior Black Belt)</option>
                        <option value="Any Available Black Belt Professor">Any Available Black Belt Professor</option>
                        <option value="Student Choice (Flexible Coach)">Student Choice (Flexible Coach)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-300 mb-1">
                        Session Length
                      </label>
                      <select
                        value={formVipDurationMinutes}
                        onChange={(e) => setFormVipDurationMinutes(Number(e.target.value))}
                        className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                      >
                        <option value={60}>60 Minutes (Standard Private)</option>
                        <option value={90}>90 Minutes (Intensive / Competition Prep)</option>
                        <option value={45}>45 Minutes (Express Focus)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-300 mb-1">
                      Private Mat Zone / Location
                    </label>
                    <input
                      type="text"
                      value={formVipLocation}
                      onChange={(e) => setFormVipLocation(e.target.value)}
                      placeholder="e.g. Private Mat Room A / VIP Cage"
                      className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              )}

              {/* Price & Class Count */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1">
                    Price ({currencySymbol}) <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs text-stone-400 font-bold">{currencySymbol}</span>
                    <input
                      type="number"
                      required
                      min={0}
                      step={1}
                      value={formPrice}
                      onChange={(e) => setFormPrice(Number(e.target.value))}
                      className="w-full bg-stone-950 border border-stone-700 rounded-xl pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 font-mono-digits font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1">
                    {formCategory === 'VIP' ? 'Private Sessions Included' : 'Class Allowance'} <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={formClassesCount}
                    onChange={(e) => setFormClassesCount(Number(e.target.value))}
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 font-bold"
                  >
                    {formCategory === 'VIP' ? (
                      <>
                        <option value={1}>1 Session (Single 1:1 Private)</option>
                        <option value={5}>5 Sessions (5-Pack Package)</option>
                        <option value={10}>10 Sessions (10-Pack Package)</option>
                        <option value={20}>20 Sessions (Pro Season Package)</option>
                        <option value={-1}>Unlimited Mat + VIP Privates</option>
                      </>
                    ) : (
                      <>
                        <option value={8}>8 Classes / Month (2x per week)</option>
                        <option value={12}>12 Classes / Month (3x per week)</option>
                        <option value={-1}>Unlimited Classes (Unmetered)</option>
                        <option value={1}>1 Class (Single Drop-in)</option>
                        <option value={10}>10 Classes (Punch Card)</option>
                        <option value={16}>16 Classes (4x per week)</option>
                        <option value={20}>20 Classes (5x per week)</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Billing Period & Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Billing Interval</label>
                  <select
                    value={formBillingPeriod}
                    onChange={(e) => setFormBillingPeriod(e.target.value as any)}
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                  >
                    {formCategory === 'VIP' && <option value="private_session">Per Private Session</option>}
                    <option value="monthly">Monthly</option>
                    <option value="punch_card">Punch Card / Session Pack</option>
                    <option value="quarterly">Quarterly (3 Months)</option>
                    <option value="annual">Annual (12 Months)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Validity (Days)</label>
                  <input
                    type="number"
                    min={1}
                    value={formDurationDays}
                    onChange={(e) => setFormDurationDays(Number(e.target.value))}
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 font-bold"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">Description / Summary</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder={formCategory === 'VIP' ? 'e.g. 1-on-1 private Brazilian Jiu-Jitsu session.' : 'e.g. 2 sessions per week. Valid for 30 days.'}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>

              {/* Features List */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-stone-300">
                    {formCategory === 'VIP' || formIsVip ? 'VIP Perks & Exclusive Amenities' : 'Included Plan Features'} (One per line)
                  </label>
                  <span className="text-[10px] text-stone-400">Click quick tags below to add</span>
                </div>
                
                {/* Quick Feature Add Buttons */}
                <div className="flex flex-wrap gap-1 mb-2">
                  {(formCategory === 'VIP' || formIsVip ? [
                    '60-Min 1-on-1 Private Mat Session',
                    'Personalized gameplan & video breakdown',
                    'Complimentary clean Gi towel & locker',
                    'Priority reservation & flexible rescheduling',
                    'Direct WhatsApp coach access',
                    'Post-workout recovery beverage'
                  ] : [
                    'Belt progression tracking',
                    'Full mat & sparring access',
                    'Gi & No-Gi eligible',
                    'Free open mat on weekends',
                    'Guest pass discount'
                  ]).map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        const currentLines = formFeaturesText.split('\n').map(l => l.trim()).filter(Boolean);
                        if (!currentLines.includes(tag)) {
                          setFormFeaturesText([...currentLines, tag].join('\n'));
                        }
                      }}
                      className="px-2 py-0.5 rounded text-[10px] bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white border border-stone-700 transition-colors cursor-pointer"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={3}
                  value={formFeaturesText}
                  onChange={(e) => setFormFeaturesText(e.target.value)}
                  placeholder={formCategory === 'VIP' ? '60-Min 1-on-1 Private Mat Session\nVideo technique analysis\nComplimentary Gi towel service' : '2 Classes per week\nBelt promotion tracking\nFull mat access'}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 font-mono text-[11px]"
                />
              </div>

              {/* Flags */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                    className="rounded bg-stone-950 border-stone-700 text-red-600 focus:ring-red-500 w-4 h-4"
                  />
                  <span className="text-xs text-stone-200 font-semibold">Active for Signups & Renewals</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsPopular}
                    onChange={(e) => setFormIsPopular(e.target.checked)}
                    className="rounded bg-stone-950 border-stone-700 text-amber-500 focus:ring-amber-400 w-4 h-4"
                  />
                  <span className="text-xs text-amber-400 font-semibold">Highlight as Most Popular</span>
                </label>
              </div>

              {/* Form Buttons */}
              <div className="pt-3 border-t border-stone-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
                    formCategory === 'VIP' || formIsVip
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black shadow-amber-950/50'
                      : 'bg-red-600 hover:bg-red-500 text-white'
                  }`}
                >
                  {editingPlan ? 'Save Changes' : formCategory === 'VIP' ? 'Create VIP Plan' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IN-APP DELETE CONFIRMATION MODAL */}
      {planToDelete && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-stone-900 border border-red-500/40 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Delete Subscription Plan?</h3>
                <p className="text-xs text-stone-400">Remove plan from academy catalog.</p>
              </div>
            </div>

            <div className="p-3.5 bg-stone-950/90 rounded-xl border border-stone-800 space-y-1.5 text-xs">
              <p className="font-bold text-white text-sm">{planToDelete.name}</p>
              <p className="text-stone-400">
                Category: <strong className="text-stone-200">{planToDelete.category} Program</strong>
              </p>
              <p className="text-stone-400">
                Price:{' '}
                <strong className="text-amber-400">
                  {currencySymbol}
                  {planToDelete.price}
                </strong>{' '}
                • Allowance:{' '}
                <strong className="text-stone-200">
                  {planToDelete.classesCount === -1 ? 'Unlimited' : `${planToDelete.classesCount} Classes`}
                </strong>
              </p>
            </div>

            <p className="text-xs text-stone-400 leading-relaxed">
              Are you sure you want to delete this subscription plan? Existing members enrolled under this plan will preserve their current class balances.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setPlanToDelete(null)}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeletePlan(planToDelete.id);
                  setPlanToDelete(null);
                }}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Confirm & Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IN-APP RESET PLANS CONFIRMATION MODAL */}
      {isConfirmingReset && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-stone-900 border border-amber-500/40 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Reset Plans to Factory Defaults?</h3>
                <p className="text-xs text-stone-400">Restore 8, 12, Unlimited, and VIP plans.</p>
              </div>
            </div>

            <p className="text-xs text-stone-400 leading-relaxed">
              This will restore the standard default subscription pricing matrix (8 classes, 12 classes, Unlimited tiers for Kids, Teens, Adults, and VIP 1-on-1 private packages).
            </p>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsConfirmingReset(false)}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onResetPlans();
                  setIsConfirmingReset(false);
                }}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl text-xs font-black transition-colors inline-flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Confirm Reset</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
