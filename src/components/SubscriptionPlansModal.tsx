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
  AlertCircle
} from 'lucide-react';
import { SubscriptionPlan, ClassCategory } from '../types';
import { INITIAL_SUBSCRIPTION_PLANS } from '../data/sampleData';
import { formatCurrency } from '../utils/currencyUtils';

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
  const [activeTab, setActiveTab] = useState<'ALL' | ClassCategory>('ALL');
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<SubscriptionPlan | null>(null);
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<ClassCategory>('Adults');
  const [formClassesCount, setFormClassesCount] = useState<number>(8);
  const [formPrice, setFormPrice] = useState<number>(85);
  const [formBillingPeriod, setFormBillingPeriod] = useState<'monthly' | 'quarterly' | 'annual' | 'punch_card'>('monthly');
  const [formDurationDays, setFormDurationDays] = useState<number>(30);
  const [formDescription, setFormDescription] = useState('');
  const [formFeaturesText, setFormFeaturesText] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [formIsPopular, setFormIsPopular] = useState(false);

  if (!isOpen) return null;

  const handleOpenAdd = (defaultCategory?: ClassCategory) => {
    setEditingPlan(null);
    setFormCategory(defaultCategory || (activeTab === 'ALL' ? 'Adults' : activeTab));
    setFormName('8 Classes / Month');
    setFormClassesCount(8);
    setFormPrice(85);
    setFormBillingPeriod('monthly');
    setFormDurationDays(30);
    setFormDescription('2 sessions per week. Valid for 30 days.');
    setFormFeaturesText('2 Classes per week\nBelt testing eligibility\nFull mat access');
    setFormActive(true);
    setFormIsPopular(false);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setFormCategory(plan.category);
    setFormName(plan.name);
    setFormClassesCount(plan.classesCount);
    setFormPrice(plan.price);
    setFormBillingPeriod(plan.billingPeriod);
    setFormDurationDays(plan.durationDays);
    setFormDescription(plan.description || '');
    setFormFeaturesText(plan.features?.join('\n') || '');
    setFormActive(plan.active);
    setFormIsPopular(!!plan.isPopular);
    setIsFormOpen(true);
  };

  const handleApplyPreset = (type: '8_classes' | '12_classes' | 'unlimited') => {
    if (type === '8_classes') {
      setFormName(`${formCategory} 8 Classes / Month`);
      setFormClassesCount(8);
      setFormPrice(formCategory === 'Kids' ? 65 : formCategory === 'Teens' ? 75 : 85);
      setFormDescription('2 sessions per week. Great for steady progress and consistency.');
      setFormFeaturesText('2 Classes per week\nBelt progression tracking\n30-day validity');
    } else if (type === '12_classes') {
      setFormName(`${formCategory} 12 Classes / Month`);
      setFormClassesCount(12);
      setFormPrice(formCategory === 'Kids' ? 85 : formCategory === 'Teens' ? 95 : 115);
      setFormDescription('3 sessions per week. Ideal for dedicated grapplers and competitors.');
      setFormFeaturesText('3 Classes per week\nCompetition & sparring prep\nPriority stripe testing');
    } else if (type === 'unlimited') {
      setFormName(`${formCategory} Unlimited Monthly`);
      setFormClassesCount(-1);
      setFormPrice(formCategory === 'Kids' ? 110 : formCategory === 'Teens' ? 125 : 145);
      setFormDescription('Full unmetered access to all classes, sparring, and open mat.');
      setFormFeaturesText('Unlimited monthly training\nAll Gi, No-Gi & Open Mat\nGuest pass privileges');
    }
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const features = formFeaturesText
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean);

    const saved: SubscriptionPlan = {
      id: editingPlan?.id || `plan-${formCategory.toLowerCase()}-${Date.now()}`,
      name: formName.trim(),
      category: formCategory,
      classesCount: Number(formClassesCount),
      price: Number(formPrice) || 0,
      currency: currencySymbol,
      billingPeriod: formBillingPeriod,
      durationDays: Number(formDurationDays) || 30,
      description: formDescription.trim(),
      features,
      active: formActive,
      isPopular: formIsPopular,
    };

    onSavePlan(saved);
    setIsFormOpen(false);
    setEditingPlan(null);
  };

  const filteredPlans = plans.filter((p) => {
    if (activeTab === 'ALL') return true;
    return p.category === activeTab;
  });

  const getCategoryColor = (cat: ClassCategory) => {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 border-b border-stone-800 flex items-center justify-between bg-stone-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-950 border border-red-800/60 flex items-center justify-center text-red-400">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">Subscription Plans & Pricing</h2>
                <span className="px-2 py-0.5 rounded-full bg-stone-800 border border-stone-700 text-[10px] font-mono font-bold text-stone-300">
                  {plans.length} Active Plans
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Configure 8-class, 12-class, and Unlimited memberships for Kids, Teens, and Adults.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleOpenAdd()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-colors shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Plan</span>
            </button>
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
          <div className="flex items-center gap-1.5 bg-stone-900 p-1 rounded-xl border border-stone-800">
            {(['ALL', 'Kids', 'Teens', 'Adults'] as const).map((tab) => {
              const count = tab === 'ALL' ? plans.length : plans.filter((p) => p.category === tab).length;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === tab
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-stone-400 hover:text-white hover:bg-stone-800'
                  }`}
                >
                  <span>{tab === 'ALL' ? 'All Programs' : `${tab} Program`}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      activeTab === tab ? 'bg-red-950/80 text-white' : 'bg-stone-800 text-stone-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setIsConfirmingReset(true)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-400 hover:text-amber-400 transition-colors cursor-pointer"
            title="Restore standard 8, 12, and Unlimited plans"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Default Plans</span>
          </button>
        </div>

        {/* PLANS GRID */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {filteredPlans.length === 0 ? (
            <div className="text-center py-12 bg-stone-950/50 rounded-2xl border border-dashed border-stone-800 p-6">
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
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPlans.map((plan) => {
                const color = getCategoryColor(plan.category);
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
                      <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 text-[10px] font-black uppercase tracking-wider py-1 text-center font-mono">
                        ★ Most Popular Plan
                      </div>
                    )}

                    <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                      <div>
                        {/* Header: Category Badge & Active Indicator */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${color.badge}`}
                          >
                            {plan.category} Program
                          </span>

                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                              plan.active ? 'text-emerald-400' : 'text-stone-500'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                plan.active ? 'bg-emerald-400 animate-pulse' : 'bg-stone-600'
                              }`}
                            />
                            {plan.active ? 'Active' : 'Archived'}
                          </span>
                        </div>

                        {/* Title & Price */}
                        <h3 className="text-base font-extrabold text-white leading-snug">{plan.name}</h3>

                        <div className="mt-2.5 flex items-baseline gap-1.5">
                          <span className="text-2xl sm:text-3xl font-black text-white font-mono-digits">
                            {formatCurrency(plan.price, plan.currency || currencySymbol)}
                          </span>
                          <span className="text-xs text-stone-400 font-semibold">
                            / {plan.billingPeriod === 'monthly' ? 'month' : plan.billingPeriod}
                          </span>
                        </div>

                        {/* Allowance Tag */}
                        <div className="mt-3 flex items-center gap-2">
                          <div
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                              isUnlimited
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-stone-800 text-stone-200 border border-stone-700'
                            }`}
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>
                              {isUnlimited ? 'Unlimited Mat Access' : `${plan.classesCount} Classes / Month`}
                            </span>
                          </div>
                          <span className="text-[11px] text-stone-400">{plan.durationDays} Days</span>
                        </div>

                        {/* Description */}
                        {plan.description && (
                          <p className="mt-3 text-xs text-stone-400 leading-relaxed">{plan.description}</p>
                        )}

                        {/* Features List */}
                        {plan.features && plan.features.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-stone-850 space-y-1.5">
                            {plan.features.map((feat, idx) => (
                              <div key={idx} className="flex items-start gap-2 text-xs text-stone-300">
                                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
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
                            className="flex-1 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
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
                            title="Edit Plan Pricing & Classes"
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
            <span className="font-semibold text-stone-300">Standard Tier System:</span>
            <span>8 Classes (~2x/wk) • 12 Classes (~3x/wk) • Unlimited Access</span>
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

      {/* SUB-MODAL: ADD / EDIT PLAN FORM */}
      {isFormOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-950 border border-red-800/60 flex items-center justify-center text-red-400">
                  <Tag className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-white text-sm">
                  {editingPlan ? `Edit Plan: ${editingPlan.name}` : 'Create Subscription Plan'}
                </h3>
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
              {/* Program Category */}
              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1">
                  Program Category <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Kids', 'Teens', 'Adults'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setFormCategory(cat);
                      }}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        formCategory === cat
                          ? cat === 'Kids'
                            ? 'bg-emerald-600 text-white border-emerald-500'
                            : cat === 'Teens'
                            ? 'bg-indigo-600 text-white border-indigo-500'
                            : 'bg-red-600 text-white border-red-500'
                          : 'bg-stone-800/80 text-stone-400 border-stone-700 hover:text-white'
                      }`}
                    >
                      {cat} Program
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Template Presets */}
              <div>
                <label className="block text-[11px] font-semibold text-stone-400 mb-1">
                  Quick Standard Presets:
                </label>
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
                  placeholder="e.g. Adults 12 Classes / Month"
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 font-bold"
                />
              </div>

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
                      className="w-full bg-stone-950 border border-stone-700 rounded-xl pl-7 pr-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 font-mono-digits font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1">
                    Class Allowance <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={formClassesCount}
                    onChange={(e) => setFormClassesCount(Number(e.target.value))}
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 font-bold"
                  >
                    <option value={8}>8 Classes / Month (2x per week)</option>
                    <option value={12}>12 Classes / Month (3x per week)</option>
                    <option value={-1}>Unlimited Classes (Unmetered)</option>
                    <option value={1}>1 Class (Single Drop-in)</option>
                    <option value={10}>10 Classes (Punch Card)</option>
                    <option value={16}>16 Classes (4x per week)</option>
                    <option value={20}>20 Classes (5x per week)</option>
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
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly (3 Months)</option>
                    <option value="annual">Annual (12 Months)</option>
                    <option value="punch_card">Punch Card / Class Pack</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Validity (Days)</label>
                  <input
                    type="number"
                    min={1}
                    value={formDurationDays}
                    onChange={(e) => setFormDurationDays(Number(e.target.value))}
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
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
                  placeholder="e.g. 2 sessions per week. Valid for 30 days."
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>

              {/* Features List */}
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Features (One per line)
                </label>
                <textarea
                  rows={3}
                  value={formFeaturesText}
                  onChange={(e) => setFormFeaturesText(e.target.value)}
                  placeholder="2 Classes per week&#10;Belt promotion tracking&#10;Full mat access"
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
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-colors shadow-md cursor-pointer"
                >
                  {editingPlan ? 'Save Changes' : 'Create Plan'}
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
                <p className="text-xs text-stone-400">Restore 8, 12, and Unlimited plans.</p>
              </div>
            </div>

            <p className="text-xs text-stone-400 leading-relaxed">
              This will restore the standard default subscription pricing matrix (8 classes, 12 classes, and Unlimited tiers for Kids, Teens, and Adults).
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
