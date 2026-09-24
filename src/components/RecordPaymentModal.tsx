import React, { useState, useEffect } from 'react';
import { X, CreditCard, CheckCircle, ArrowRight, DollarSign, Calendar, Sparkles, Check, Tag } from 'lucide-react';
import { Member, PaymentMethod, PaymentRecord, SubscriptionPlan } from '../types';
import { BeltBadge } from '../utils/bjjBelts';
import { formatCurrency } from '../utils/currencyUtils';

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
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [amount, setAmount] = useState<number>(85);
  const [classesToAdd, setClassesToAdd] = useState<number>(8);
  const [isUnlimited, setIsUnlimited] = useState<boolean>(false);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
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
    const now = new Date();
    setPaymentTime(
      `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    );
  }, [isOpen]);

  const currentMember = members.find((m) => m.id === selectedMemberId);

  // Filter active subscription plans from Plans & Pricing
  const activePlans = subscriptionPlans.filter((p) => p.active !== false);
  const memberCategory = currentMember?.ageGroup || 'Adults';

  // Plans relevant for this student
  const categoryPlans = activePlans.filter(
    (p) => p.category === memberCategory || p.category === 'All Levels'
  );
  const availablePlans = categoryPlans.length > 0 ? categoryPlans : activePlans;

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
  }, [selectedMemberId, availablePlans.length]);

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

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-xl shadow-2xl text-stone-100 overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Record Payment & Renew Classes</h2>
              <p className="text-xs text-stone-400">
                Log tuition fee, credit punch-card classes, and update student status.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Member Selection */}
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5">
              Select Student
            </label>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.fullName} — {m.beltRank} Belt ({m.membershipType === 'monthly_unlimited' ? 'Unlimited' : `${m.classesRemaining} classes left`})
                </option>
              ))}
            </select>
          </div>

          {/* Current Student Standing Preview Box */}
          {currentMember && (
            <div className="p-3 rounded-xl bg-stone-950/80 border border-stone-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-xs">{currentMember.fullName}</span>
                  <BeltBadge belt={currentMember.beltRank} stripes={currentMember.stripes} size="sm" showLabel={false} />
                </div>
                <div className="text-[11px] text-stone-400 mt-1">
                  Category: <strong className="text-white">{memberCategory}</strong> • Total attended:{' '}
                  {currentMember.totalClassesAttended} classes
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-stone-400 uppercase font-semibold block">
                  Current Balance
                </span>
                <span
                  className={`text-xs font-extrabold px-2 py-0.5 rounded ${
                    currentMember.classesRemaining === -1
                      ? 'bg-blue-950 text-blue-300 border border-blue-800'
                      : currentMember.classesRemaining < 0
                      ? 'bg-red-950 text-red-300 border border-red-800 animate-pulse'
                      : currentMember.classesRemaining === 0
                      ? 'bg-red-950 text-red-300 border border-red-800'
                      : currentMember.classesRemaining <= 2
                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
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
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-400" />
                <span>Select Renewal Plan from Plans & Pricing ({memberCategory})</span>
              </label>
              <span className="text-[11px] text-amber-400 font-medium">
                Valid for 1 Month (30 Days)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {availablePlans.map((plan) => {
                const isSelected = selectedPlanId === plan.id;
                const unlim = plan.classesCount === -1;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => handleSelectPlan(plan)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-emerald-950/70 border-emerald-500 text-white ring-1 ring-emerald-500/50 shadow-sm'
                        : 'bg-stone-950 border-stone-800 text-stone-300 hover:border-stone-700'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                        <Check className="w-2.5 h-2.5" />
                      </div>
                    )}
                    <div className="text-[10px] text-stone-400 uppercase font-semibold">
                      {plan.category}
                    </div>
                    <div className="text-xs font-bold text-white mt-0.5 truncate">{plan.name}</div>
                    <div className="text-sm font-black text-white mt-1">
                      {formatCurrency(plan.price, currencySymbol)}
                    </div>
                    <div className="text-[10px] text-emerald-400 mt-0.5">
                      {unlim ? 'Unlimited Classes' : `${plan.classesCount} Classes`} • 1 Month
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount and Classes Added Custom Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1">
                Amount Paid ({currencySymbol}) <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-bold">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full bg-stone-950 border border-stone-700 rounded-lg pl-12 pr-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 font-mono-digits font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1">
                Classes Credited to Balance
              </label>
              {isUnlimited ? (
                <div className="w-full bg-stone-950/50 border border-stone-800 rounded-lg px-3 py-2 text-xs text-blue-400 font-semibold">
                  Unlimited Mat Access (1 Month)
                </div>
              ) : (
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={classesToAdd}
                  onChange={(e) => setClassesToAdd(Number(e.target.value))}
                  className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 font-bold"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1">
                Payment Date
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500 font-bold"
              >
                <option value="Credit Card">Credit Card</option>
                <option value="Cash">Cash</option>
                <option value="Cliq">Cliq</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-300 mb-1">
              Payment Memo / Reference (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Card auth #4819, Zelle memo, Paid cash to front desk"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-2 text-xs text-white placeholder-stone-400 focus:outline-none focus:border-red-500"
            />
          </div>

          {/* New Standing Summary Banner */}
          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-200 text-xs flex items-center justify-between">
            <div>
              <span className="font-semibold block text-emerald-300">New Class Balance:</span>
              <span className="text-[11px] text-emerald-400">
                {isUnlimited
                  ? 'Unlimited passes active for 1 month (30 days)'
                  : currentRemaining < 0
                  ? `Debt deducted: Debt (${currentRemaining}) + ${classesToAdd} added = ${newClassesRemaining} remaining`
                  : `${Math.max(0, currentRemaining)} current + ${classesToAdd} added = ${newClassesRemaining} classes remaining (valid 1 month)`}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-extrabold text-white text-base">
                +{formatCurrency(amount, currencySymbol)}
              </span>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-stone-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              <span>Confirm & Record {formatCurrency(amount, currencySymbol)} Payment</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
