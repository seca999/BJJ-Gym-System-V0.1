import React, { useState, useEffect } from 'react';
import { X, CreditCard, CheckCircle, ArrowRight, DollarSign, Calendar, Sparkles, Check, Tag, Crown, User, Lock } from 'lucide-react';
import { Member, PaymentMethod, PaymentRecord, SubscriptionPlan } from '../types';
import { BeltBadge } from '../utils/bjjBelts';
import { formatCurrency } from '../utils/currencyUtils';
import { getJordanDateStr, getJordanTimeStr } from '../utils/timeUtils';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  preSelectedMemberId?: string;
  subscriptionPlans?: SubscriptionPlan[];
  currencySymbol?: string;
  onRecordPayment: (
    payment: Omit<PaymentRecord, 'id' | 'receiptNumber'>,
    classesToAdd: number,
    newEndDate?: string
  ) => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  members,
  preSelectedMemberId,
  subscriptionPlans = [],
  currencySymbol = 'JOD',
  onRecordPayment,
}) => {
  const [selectedMemberId, setSelectedMemberId] = useState<string>(preSelectedMemberId || members[0]?.id || '');
  const [categoryFilterTab, setCategoryFilterTab] = useState<'AUTO' | 'Adults' | 'Kids' | 'Teens' | 'VIP'>('AUTO');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [amount, setAmount] = useState<number>(85);
  const [classesToAdd, setClassesToAdd] = useState<number>(8);
  const [isUnlimited, setIsUnlimited] = useState<boolean>(false);
  const [paymentDate, setPaymentDate] = useState<string>(getJordanDateStr());
  const [paymentTime, setPaymentTime] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Credit Card');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (preSelectedMemberId) {
      setSelectedMemberId(preSelectedMemberId);
    } else if (members.length > 0 && !selectedMemberId) {
      setSelectedMemberId(members[0].id);
    }
  }, [preSelectedMemberId, members]);

  useEffect(() => {
    setPaymentTime(getJordanTimeStr(new Date(), false));
  }, [isOpen]);

  const currentMember = members.find((m) => m.id === selectedMemberId);

  // Filter active subscription plans from Plans & Pricing
  const activePlans = subscriptionPlans.filter((p) => p.active !== false);
  const memberCategory = currentMember?.ageGroup || 'Adults';

  const activeTabFilter = categoryFilterTab === 'AUTO' ? memberCategory : categoryFilterTab;

  const availablePlans = activePlans.filter((p) => {
    const isVipPlan = p.category === 'VIP' || !!p.isVip || p.id.includes('vip');
    if (activeTabFilter === 'VIP') return isVipPlan;
    if (isVipPlan) return false;
    if (activeTabFilter === 'Adults') return p.category === 'Adults' || p.category === 'All Levels';
    if (activeTabFilter === 'Kids') return p.category === 'Kids' || p.category === 'All Levels';
    if (activeTabFilter === 'Teens') return p.category === 'Teens' || p.category === 'All Levels';
    return true;
  });

  // Sync selected plan when student changes or modal opens
  useEffect(() => {
    if (availablePlans.length > 0) {
      const match = availablePlans.find((p) => p.id === selectedPlanId) || availablePlans[0];
      if (match) {
        setSelectedPlanId(match.id);
        setAmount(match.price);
        const unlim = match.classesCount === -1;
        setIsUnlimited(unlim);
        setClassesToAdd(unlim ? -1 : match.classesCount);
      }
    }
  }, [selectedMemberId, categoryFilterTab, availablePlans.length]);

  if (!isOpen) return null;

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    setSelectedPlanId(plan.id);
    setAmount(plan.price);
    const unlim = plan.classesCount === -1;
    setIsUnlimited(unlim);
    setClassesToAdd(unlim ? -1 : plan.classesCount);
  };

  // Calculate new end date (exactly 1 month / 30 days from payment date)
  const calculateNewEndDate = () => {
    const base = paymentDate ? new Date(paymentDate) : new Date();
    base.setMonth(base.getMonth() + 1);
    return base.toISOString().split('T')[0];
  };

  // Calculate new balance considering debt
  const currentRemaining = currentMember ? currentMember.classesRemaining : 0;
  const newClassesRemaining = isUnlimited
    ? -1
    : currentRemaining < 0
    ? classesToAdd + currentRemaining
    : currentRemaining === -1
    ? classesToAdd
    : currentRemaining + classesToAdd;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMember) return;

    const chosenPlan = activePlans.find((p) => p.id === selectedPlanId);
    const packageName = chosenPlan
      ? chosenPlan.name
      : `${memberCategory} ${isUnlimited ? 'Unlimited' : `${classesToAdd} Classes`} Monthly`;

    const newEndDate = calculateNewEndDate();

    onRecordPayment(
      {
        memberId: currentMember.id,
        memberName: currentMember.fullName,
        amount: Number(amount),
        currency: currencySymbol,
        date: paymentDate,
        time: paymentTime,
        paymentMethod,
        membershipPackage: packageName,
        classesCredited: isUnlimited ? 0 : classesToAdd,
        status: 'Completed',
        notes: notes.trim(),
      },
      isUnlimited ? -1 : classesToAdd,
      newEndDate
    );

    onClose();
  };

  const isSpecificStudentPreselected = Boolean(preSelectedMemberId);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-xl shadow-2xl text-stone-100 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-600/10 border border-red-500/30 flex items-center justify-center text-red-500">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">
                {isSpecificStudentPreselected && currentMember
                  ? `Renew Membership Plan — ${currentMember.fullName}`
                  : 'Student Plan Renewal & Tuition Top-Up'}
              </h2>
              <p className="text-xs text-stone-400">
                {isSpecificStudentPreselected && currentMember
                  ? `Process renewal pass & payment for ${currentMember.fullName}.`
                  : 'Renew membership subscription, top-up punch-card classes, and log renewal tuition.'}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Member Selection: ONLY shown if NO student was preselected from card */}
          {!isSpecificStudentPreselected ? (
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                Select Student
              </label>
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-red-500"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName} — {m.beltRank} Belt ({m.membershipType === 'monthly_unlimited' ? 'Unlimited' : `${m.classesRemaining} classes left`})
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {/* Current Student Standing Card */}
          {currentMember && (
            <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-white text-sm">{currentMember.fullName}</span>
                  {currentMember.ageGroup && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                      currentMember.ageGroup === 'Kids'
                        ? 'bg-stone-800 text-stone-200 border-stone-700'
                        : currentMember.ageGroup === 'Teens'
                        ? 'bg-purple-950 text-purple-300 border-purple-800'
                        : 'bg-stone-800 text-stone-300 border-stone-700'
                    }`}>
                      {currentMember.ageGroup}
                    </span>
                  )}
                  <BeltBadge belt={currentMember.beltRank} stripes={currentMember.stripes} size="sm" showLabel={false} />
                </div>
                <div className="text-[11px] text-stone-400 mt-1">
                  Category: <strong className="text-white">{memberCategory}</strong> • Total attended:{' '}
                  <strong className="text-stone-300">{currentMember.totalClassesAttended} classes</strong>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] text-stone-400 uppercase font-semibold block">
                  Current Balance
                </span>
                <span
                  className={`text-xs font-extrabold px-2.5 py-0.5 rounded-lg inline-block ${
                    currentMember.classesRemaining === -1
                      ? 'bg-blue-950 text-blue-300 border border-blue-800'
                      : currentMember.classesRemaining < 0
                      ? 'bg-red-950 text-red-300 border border-red-800 animate-pulse'
                      : currentMember.classesRemaining === 0
                      ? 'bg-red-950 text-red-300 border border-red-800'
                      : currentMember.classesRemaining <= 2
                      ? 'bg-orange-950 text-orange-300 border border-orange-800'
                      : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  }`}
                >
                  {currentMember.classesRemaining === -1
                    ? 'Unlimited'
                    : currentMember.classesRemaining < 0
                    ? `${Math.abs(currentMember.classesRemaining)} Classes in Debt`
                    : `${currentMember.classesRemaining} Classes Left`}
                </span>
              </div>
            </div>
          )}

          {/* Subscription Plans Selection from Plans & Pricing */}
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-stone-400" />
                <span>Select Renewal Plan from Catalog</span>
              </label>
              <span className="text-[11px] text-stone-400 font-medium">
                Valid for 1 Month (30 Days)
              </span>
            </div>

            {/* Category Filter Pills (Auto, Adults, Kids, Teens, VIP) */}
            <div className="p-1 rounded-xl bg-stone-950 border border-stone-800 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCategoryFilterTab('AUTO')}
                className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  categoryFilterTab === 'AUTO'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                Auto: {memberCategory}
              </button>
              {(['Adults', 'Kids', 'Teens'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilterTab(cat)}
                  className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    categoryFilterTab === cat
                      ? 'bg-red-600 text-white font-black shadow-xs'
                      : 'text-stone-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCategoryFilterTab('VIP')}
                className={`py-1 px-2.5 rounded-lg text-[11px] font-black inline-flex items-center gap-1 transition-all cursor-pointer ${
                  categoryFilterTab === 'VIP'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-purple-400 hover:text-purple-300'
                }`}
              >
                <Crown className="w-3 h-3" />
                <span>VIP 1:1</span>
              </button>
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 max-h-40 overflow-y-auto pr-1">
              {availablePlans.map((plan) => {
                const isSelected = selectedPlanId === plan.id;
                const isVip = plan.category === 'VIP' || !!plan.isVip;

                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => handleSelectPlan(plan)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-stone-800 border-emerald-500 ring-1 ring-emerald-500 shadow-xs'
                        : 'bg-stone-950 border-stone-800 hover:border-stone-700'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-emerald-500 text-stone-950 flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                    <span className="text-[10px] uppercase font-bold text-stone-400 block truncate">
                      {plan.category}
                    </span>
                    <span className="text-xs font-bold text-white block truncate">
                      {plan.name}
                    </span>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-sm font-black text-white">
                        {formatCurrency(plan.price, currencySymbol)}
                      </span>
                    </div>
                    <span className="text-[10px] text-stone-400 block mt-0.5">
                      {plan.classesCount === -1 ? 'Unlimited' : `${plan.classesCount} Classes`} • 1 Month
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount Paid & Classes Credited */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                Amount Paid ({currencySymbol}) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-bold font-mono">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  step="0.5"
                  required
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-12 pr-3 py-2 text-xs font-black text-white font-mono focus:outline-hidden focus:border-red-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                Classes Credited to Balance
              </label>
              <input
                type="number"
                disabled={isUnlimited}
                value={isUnlimited ? '' : classesToAdd}
                placeholder={isUnlimited ? 'Unlimited Access' : 'Classes count'}
                onChange={(e) => setClassesToAdd(parseInt(e.target.value) || 0)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-hidden focus:border-red-500 disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Payment Date & Payment Method */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                Payment Date
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-red-500 cursor-pointer"
              >
                <option value="Credit Card">Credit Card</option>
                <option value="Cash">Cash</option>
                <option value="Cliq">Cliq (Instant Pay)</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
          </div>

          {/* Payment Memo */}
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1">
              Payment Memo / Reference (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Card auth #4819, Cliq reference, Paid cash to front desk"
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white placeholder-stone-500 focus:outline-hidden focus:border-red-500"
            />
          </div>

          {/* Balance Preview Calculation */}
          <div className="p-3 bg-stone-950 rounded-2xl border border-stone-800 flex items-center justify-between text-xs">
            <div>
              <span className="text-emerald-400 font-bold block">New Class Balance:</span>
              <span className="text-[11px] text-stone-400">
                {isUnlimited
                  ? 'Unlimited monthly mat training access (valid 1 month)'
                  : `${currentRemaining} current + ${classesToAdd} added = ${newClassesRemaining} classes remaining (valid 1 month)`}
              </span>
            </div>
            <div className="text-right">
              <span className="text-sm font-black text-emerald-400 font-mono">
                +{formatCurrency(amount, currencySymbol)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-stone-300 bg-stone-800 hover:bg-stone-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl text-xs font-black text-stone-950 bg-emerald-500 hover:bg-emerald-400 transition-all shadow-md inline-flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <CreditCard className="w-4 h-4" />
              <span>Confirm & Process Plan Renewal ({formatCurrency(amount, currencySymbol)})</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
