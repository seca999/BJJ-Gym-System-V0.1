import React, { useState, useRef, useEffect } from 'react';
import { X, UserPlus, Shield, CreditCard, AlertCircle, Check, Camera, Upload, Trash2, Sparkles, Calendar, Tag, Layers, CheckCircle2 } from 'lucide-react';
import { Member, BeltRank, StripeCount, MembershipType, PaymentMethod, PaymentRecord, ClassCategory, SubscriptionPlan } from '../types';
import { 
  getBeltsForAgeGroup, 
  BeltBadge, 
  KIDS_BELT_RANKS, 
  TEENS_BELT_RANKS, 
  ADULT_BELT_RANKS, 
  IBJJF_KIDS_BELT_GROUPS, 
  IBJJF_BELT_MIN_AGE 
} from '../utils/bjjBelts';
import { compressAndResizeImage, STUDENT_AVATAR_PRESETS } from '../utils/imageUtils';
import { 
  calculateStudentAge, 
  calculateIBJJFCompetitionAge, 
  getIBJJFCategory, 
  getIBJJFDivisionLabel, 
  getIBJJFTransferMilestone 
} from '../utils/ibjjfAgeManager';
import { formatCurrency } from '../utils/currencyUtils';

interface NewMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegister: (member: Member, initialPayment?: Omit<PaymentRecord, 'id' | 'memberId' | 'memberName'>) => void;
  subscriptionPlans?: SubscriptionPlan[];
  currencySymbol?: string;
}

export const NewMemberModal: React.FC<NewMemberModalProps> = ({
  isOpen,
  onClose,
  onRegister,
  subscriptionPlans = [],
  currencySymbol = 'JOD',
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // Form states
  const [fullName, setFullName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [ageGroup, setAgeGroup] = useState<ClassCategory>('Adults');
  const [beltRank, setBeltRank] = useState<BeltRank>('White');
  const [stripes, setStripes] = useState<StripeCount>(0);
  const [lastPromotionDate, setLastPromotionDate] = useState('');
  const [nextExpectedPromotionDate, setNextExpectedPromotionDate] = useState('');

  // Emergency contact
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('');

  // Active plans from Plans & Pricing section
  const activePlans = subscriptionPlans.filter((p) => p.active !== false);

  // Selected plan from Plans & Pricing
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [membershipType, setMembershipType] = useState<MembershipType>('class_pack');
  const [classesTotal, setClassesTotal] = useState<number>(8);
  const [notes, setNotes] = useState('');

  // Initial Payment
  const [recordPaymentNow, setRecordPaymentNow] = useState(true);
  const [paymentAmount, setPaymentAmount] = useState<number>(85);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Credit Card');
  const [paymentNotes, setPaymentNotes] = useState('Initial registration tuition payment.');

  const [showPresets, setShowPresets] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dobInputRef = useRef<HTMLInputElement>(null);

  // Filter plans relevant to selected student age category
  const categoryPlans = activePlans.filter(
    (p) => p.category === ageGroup || p.category === 'All Levels'
  );
  const displayPlans = categoryPlans.length > 0 ? categoryPlans : activePlans;

  // Sync default selected plan when age group or available plans change
  useEffect(() => {
    if (displayPlans.length > 0) {
      const match = displayPlans.find((p) => p.id === selectedPlanId) || displayPlans[0];
      if (match) {
        setSelectedPlanId(match.id);
        const isUnlim = match.classesCount === -1;
        setMembershipType(isUnlim ? 'monthly_unlimited' : 'class_pack');
        setClassesTotal(isUnlim ? -1 : match.classesCount);
        setPaymentAmount(match.price);
      }
    }
  }, [ageGroup, subscriptionPlans.length]);

  if (!isOpen) return null;

  // Compute 1-month validity date (exact 1 month / 30 days validity)
  const calculateOneMonthEndDate = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
  };

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    setSelectedPlanId(plan.id);
    const isUnlim = plan.classesCount === -1;
    setMembershipType(isUnlim ? 'monthly_unlimited' : 'class_pack');
    setClassesTotal(isUnlim ? -1 : plan.classesCount);
    setPaymentAmount(plan.price);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      alert('Please provide student name and contact phone.');
      return;
    }

    const memberId = 'mem-' + Date.now();
    const calculatedAge = birthDate ? calculateStudentAge(birthDate, todayStr) : undefined;
    const effectiveClasses = membershipType === 'monthly_unlimited' ? -1 : classesTotal;
    const endDate = calculateOneMonthEndDate();

    const chosenPlan = activePlans.find((p) => p.id === selectedPlanId);
    const planName = chosenPlan ? chosenPlan.name : `${classesTotal} Classes / Month Plan`;

    const newMember: Member = {
      id: memberId,
      fullName: fullName.trim(),
      avatar: avatar.trim() || undefined,
      email: email.trim() || `${fullName.toLowerCase().replace(/\s+/g, '.')}@member.bjj`,
      phone: phone.trim(),
      birthDate: birthDate || undefined,
      age: calculatedAge,
      ageGroup,
      emergencyContact: {
        name: emergencyName.trim() || 'Not specified',
        phone: emergencyPhone.trim() || phone.trim(),
        relation: emergencyRelation.trim() || 'Emergency Contact',
      },
      beltRank,
      stripes,
      lastPromotionDate: lastPromotionDate || undefined,
      nextExpectedPromotionDate: nextExpectedPromotionDate || undefined,
      membershipType,
      classesTotal: effectiveClasses,
      classesRemaining: effectiveClasses, // Full initial balance!
      membershipStartDate: todayStr,
      membershipEndDate: endDate, // Exactly 1 month validity
      status: 'active',
      notes: notes.trim(),
      preferredTraining: 'Both',
      joinDate: todayStr,
      totalClassesAttended: 0,
    };

    let initialPaymentData = undefined;
    if (recordPaymentNow && paymentAmount > 0) {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      initialPaymentData = {
        amount: Number(paymentAmount),
        currency: currencySymbol,
        date: todayStr,
        time: timeStr,
        paymentMethod,
        membershipPackage: planName,
        classesCredited: effectiveClasses === -1 ? 0 : effectiveClasses,
        receiptNumber: `REC-${Date.now().toString().slice(-6)}`,
        status: 'Completed' as const,
        notes: paymentNotes.trim(),
      };
    }

    onRegister(newMember, initialPaymentData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-4xl shadow-2xl text-stone-100 overflow-hidden my-6">
        {/* Modal Header */}
        <div className="px-8 py-5 border-b border-stone-800 flex items-center justify-between bg-stone-950/60">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-red-700 flex items-center justify-center text-white shrink-0 shadow-lg shadow-red-950/50">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Register New Student</h2>
              <p className="text-xs sm:text-sm text-stone-400 mt-0.5">
                Enroll student, assign IBJJF category, select approved monthly subscription plan & record payment.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-8 space-y-8 max-h-[82vh] overflow-y-auto">
          {/* Section 1: Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm sm:text-base font-extrabold uppercase tracking-wider text-red-500">
              1. Student Details
            </h3>

            {/* Primary Age Category / IBJJF Division Selector */}
            <div className="space-y-1.5 p-3 bg-stone-950/80 rounded-xl border border-stone-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-red-500" />
                  <span>Student Age Division (IBJJF Standard):</span>
                </label>
                <span className="text-[10px] text-stone-400">
                  {ageGroup === 'Kids' ? '🧒 Youth Belts (White to Green-Black)' : ageGroup === 'Teens' ? '🥋 Juvenile Ranks (16-17)' : '👤 Adult Ranks (18+)'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAgeGroup('Kids');
                    if (!KIDS_BELT_RANKS.includes(beltRank)) {
                      setBeltRank('White');
                    }
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border text-center flex flex-col items-center gap-0.5 cursor-pointer ${
                    ageGroup === 'Kids'
                      ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-md font-black ring-2 ring-amber-400/50'
                      : 'bg-stone-900 text-stone-300 hover:text-white border-stone-800 hover:bg-stone-850'
                  }`}
                >
                  <span className="text-xs sm:text-sm">🧒 Kids</span>
                  <span className="text-[10px] opacity-80">Ages 4-15 (13 Belts)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAgeGroup('Teens');
                    if (!TEENS_BELT_RANKS.includes(beltRank)) {
                      setBeltRank('White');
                    }
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border text-center flex flex-col items-center gap-0.5 cursor-pointer ${
                    ageGroup === 'Teens'
                      ? 'bg-purple-600 text-white border-purple-500 shadow-md font-black ring-2 ring-purple-400/50'
                      : 'bg-stone-900 text-stone-300 hover:text-white border-stone-800 hover:bg-stone-850'
                  }`}
                >
                  <span className="text-xs sm:text-sm">🥋 Teens</span>
                  <span className="text-[10px] opacity-80">Ages 16-17 (Juvenile)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAgeGroup('Adults');
                    if (!ADULT_BELT_RANKS.includes(beltRank)) {
                      setBeltRank('White');
                    }
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border text-center flex flex-col items-center gap-0.5 cursor-pointer ${
                    ageGroup === 'Adults'
                      ? 'bg-red-600 text-white border-red-500 shadow-md font-black ring-2 ring-red-400/50'
                      : 'bg-stone-900 text-stone-300 hover:text-white border-stone-800 hover:bg-stone-850'
                  }`}
                >
                  <span className="text-xs sm:text-sm">👤 Adults</span>
                  <span className="text-[10px] opacity-80">Ages 18+ (White-Black)</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-stone-300 mb-1.5">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Renzo Gracie"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-stone-400 focus:outline-none focus:border-red-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-stone-300 mb-1.5">
                  Phone Number <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="(555) 000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-stone-400 focus:outline-none focus:border-red-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-stone-300 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="student@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-stone-400 focus:outline-none focus:border-red-500 font-medium"
                />
              </div>

              {/* Student Photo Picker */}
              <div className="p-3 bg-stone-950/60 rounded-xl border border-stone-800">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-amber-400" />
                    <span>Student Picture (Optional)</span>
                  </label>
                  {avatar && (
                    <button
                      type="button"
                      onClick={() => setAvatar('')}
                      className="text-[11px] text-red-400 hover:text-red-300 font-medium inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {/* Preview */}
                  <div className="relative shrink-0">
                    {avatar ? (
                      <img
                        src={avatar}
                        alt="Preview"
                        className="w-12 h-12 rounded-xl object-cover border border-stone-700 shadow-xs"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center text-amber-400 font-bold text-sm shadow-xs">
                        {fullName.trim() ? fullName.charAt(0).toUpperCase() : <Camera className="w-4 h-4 text-stone-500" />}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/png, image/jpeg, image/webp"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              const compressed = await compressAndResizeImage(file, 360, 360, 0.85);
                              setAvatar(compressed);
                            } catch (err: any) {
                              alert(err?.message || 'Error processing image file');
                            }
                          }
                          e.target.value = '';
                        }}
                      />

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 border border-stone-700 transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5 text-red-400" />
                        <span>Upload File</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowPresets(!showPresets)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 border transition-colors ${
                          showPresets
                            ? 'bg-amber-950/60 text-amber-300 border-amber-800/80'
                            : 'bg-stone-800 hover:bg-stone-700 text-stone-200 border-stone-700'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>Presets</span>
                      </button>
                    </div>

                    <input
                      type="url"
                      placeholder="Or paste direct image URL (https://...)"
                      value={avatar}
                      onChange={(e) => setAvatar(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                {/* Preset Avatars Drawer */}
                {showPresets && (
                  <div className="mt-3 pt-3 border-t border-stone-800">
                    <span className="text-[11px] font-semibold text-stone-400 block mb-2">
                      Choose Martial Arts Avatar:
                    </span>
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                      {STUDENT_AVATAR_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            setAvatar(preset.url);
                            setShowPresets(false);
                          }}
                          className="group relative rounded-lg overflow-hidden border border-stone-700 hover:border-red-500 transition-colors p-0.5 bg-stone-900"
                          title={preset.label}
                        >
                          <img
                            src={preset.url}
                            alt={preset.label}
                            className="w-full h-10 rounded object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <span className="text-[8px] text-stone-400 truncate block mt-0.5 text-center">
                            {preset.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Date of Birth with Prominent Clickable Calendar Icon */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-stone-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-amber-400" />
                    <span>Date of Birth (Auto-Sets Kids / Teens / Adults)</span>
                  </span>
                  {birthDate && (
                    <span className="text-[11px] text-amber-300 font-bold">
                      Age: {calculateIBJJFCompetitionAge(birthDate)} yrs (Competition) / {calculateStudentAge(birthDate, todayStr)} yrs (Chronological)
                    </span>
                  )}
                </label>
                <div className="relative flex items-center">
                  <input
                    ref={dobInputRef}
                    type="date"
                    value={birthDate}
                    onChange={(e) => {
                      const newDob = e.target.value;
                      setBirthDate(newDob);
                      if (newDob) {
                        const compAge = calculateIBJJFCompetitionAge(newDob);
                        const chronoAge = calculateStudentAge(newDob, todayStr);
                        const effectiveAge = compAge > 0 ? compAge : chronoAge;
                        const computedCategory = getIBJJFCategory(effectiveAge);
                        setAgeGroup(computedCategory);
                        const allowedBelts = getBeltsForAgeGroup(computedCategory);
                        if (!allowedBelts.includes(beltRank)) {
                          setBeltRank(allowedBelts[0]);
                        }
                      }
                    }}
                    className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-red-500 pr-10 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        (dobInputRef.current as any)?.showPicker();
                      } catch {
                        dobInputRef.current?.focus();
                      }
                    }}
                    className="absolute right-2 p-1 text-amber-400 hover:text-amber-300 hover:bg-stone-800 rounded transition-colors cursor-pointer"
                    title="Open Calendar Picker"
                  >
                    <Calendar className="w-5 h-5" />
                  </button>
                </div>
                {birthDate && (
                  <div className="mt-2 p-2.5 bg-stone-900/90 rounded-lg border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-stone-300 font-medium">
                        Identified IBJJF Division:
                      </span>
                      <span className={`px-2 py-0.5 rounded font-extrabold text-[11px] ${
                        ageGroup === 'Kids'
                          ? 'bg-amber-500 text-stone-950'
                          : ageGroup === 'Teens'
                          ? 'bg-purple-600 text-white'
                          : 'bg-red-600 text-white'
                      }`}>
                        {ageGroup === 'Kids' ? '🧒 Kids (Under 16)' : ageGroup === 'Teens' ? '🥋 Teens (Juvenile)' : '👤 Adults (18+)'}
                      </span>
                    </div>
                    <span className="text-amber-400 font-bold text-[11px]">
                      {getIBJJFDivisionLabel(calculateIBJJFCompetitionAge(birthDate)).subGroup} • IBJJF Belts Unlocked
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-stone-300 mb-1.5">
                  Class Program / Age Category
                </label>
                <select
                  value={ageGroup}
                  onChange={(e) => {
                    const newAge = e.target.value as ClassCategory;
                    setAgeGroup(newAge);
                    const allowedBelts = getBeltsForAgeGroup(newAge);
                    if (!allowedBelts.includes(beltRank)) {
                      setBeltRank(allowedBelts[0]);
                    }
                  }}
                  className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-red-500 font-bold"
                >
                  <option value="Kids">Kids Class (Ages 4-15 • 13 IBJJF Youth Belts: White to Green-Black)</option>
                  <option value="Teens">Teens / Juvenile (Ages 16-17 • White, Blue, Purple)</option>
                  <option value="Adults">Adults Class (Ages 18+ • White through Black)</option>
                </select>
                <p className="text-[11px] text-stone-400 mt-1.5">
                  {ageGroup === 'Kids' && '🧒 IBJJF Kids System: Full youth progression available (Grey, Yellow, Orange, Green).'}
                  {ageGroup === 'Teens' && 'ℹ️ Juveniles (16-17) auto-graduate to Adults at 18. White, Blue, Purple belts.'}
                  {ageGroup === 'Adults' && 'ℹ️ Adult ranks (18+): White, Blue, Purple, Brown, Black.'}
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Belt Rank & Stripes */}
          <div className="space-y-4 pt-4 border-t border-stone-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm sm:text-base font-extrabold uppercase tracking-wider text-red-500">
                2. BJJ Rank & Stripes ({ageGroup} Division)
              </h3>
              <span className={`text-xs px-2.5 py-1 rounded-lg font-bold border ${
                ageGroup === 'Kids'
                  ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                  : ageGroup === 'Teens'
                  ? 'bg-purple-950/80 text-purple-300 border-purple-800'
                  : 'bg-stone-800 text-stone-300 border-stone-700'
              }`}>
                {ageGroup === 'Kids' ? '🧒 13 IBJJF Youth Belts' : ageGroup === 'Teens' ? '🥋 Juvenile Ranks' : '👤 Adult Ranks'}
              </span>
            </div>

            {/* Interactive Visual Kids Belt Picker */}
            {ageGroup === 'Kids' && (
              <div className="p-3.5 bg-stone-950/90 rounded-xl border border-stone-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <span>🥋 Select Official IBJJF Youth Belt:</span>
                  </span>
                  {birthDate && (
                    <span className="text-[11px] text-stone-400">
                      Athlete Competition Age: <strong className="text-white">{calculateIBJJFCompetitionAge(birthDate)} yrs</strong>
                    </span>
                  )}
                </div>

                {/* Grouped Visual Belts */}
                <div className="space-y-2.5">
                  {IBJJF_KIDS_BELT_GROUPS.map((group) => {
                    const studentAge = birthDate ? calculateIBJJFCompetitionAge(birthDate) : 10;
                    const isGroupAgeEligible = studentAge >= group.minAge;

                    return (
                      <div key={group.groupName} className="p-2.5 bg-stone-900/60 rounded-lg border border-stone-800/80">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-bold text-stone-300">
                            {group.groupName}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            isGroupAgeEligible ? 'bg-stone-800 text-stone-400' : 'bg-amber-950 text-amber-300 border border-amber-900/60'
                          }`}>
                            {group.ageLabel}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {group.belts.map((belt) => {
                            const isSelected = beltRank === belt;
                            const minAge = IBJJF_BELT_MIN_AGE[belt] || 4;
                            const isUnderMinAge = birthDate && studentAge < minAge;

                            return (
                              <button
                                key={belt}
                                type="button"
                                onClick={() => setBeltRank(belt)}
                                className={`p-2 rounded-lg text-left transition-all border flex items-center justify-between gap-2 cursor-pointer ${
                                  isSelected
                                    ? 'bg-amber-950/50 border-amber-500 shadow-md ring-2 ring-amber-500/40'
                                    : 'bg-stone-950 hover:bg-stone-800/70 border-stone-800 text-stone-300 hover:border-stone-700'
                                }`}
                              >
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <BeltBadge belt={belt} stripes={0} size="sm" />
                                  <div className="truncate">
                                    <span className={`text-xs font-bold block truncate ${isSelected ? 'text-amber-300' : 'text-stone-200'}`}>
                                      {belt}
                                    </span>
                                    {isUnderMinAge ? (
                                      <span className="text-[9px] text-amber-400 font-semibold block">
                                        Min age {minAge}y
                                      </span>
                                    ) : (
                                      <span className="text-[9px] text-stone-400 block">
                                        Min age {minAge}y
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {isSelected && (
                                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-stone-300 mb-1.5">
                  Belt Rank ({ageGroup} Permitted Belts)
                </label>
                <select
                  value={beltRank}
                  onChange={(e) => setBeltRank(e.target.value as BeltRank)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-red-500 font-bold"
                >
                  {getBeltsForAgeGroup(ageGroup).map((b) => (
                    <option key={b} value={b}>
                      {b} Belt {ageGroup === 'Kids' && b !== 'White' ? '(Youth)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-stone-300 mb-1.5">
                  Stripes (Degrees on Belt)
                </label>
                <select
                  value={stripes}
                  onChange={(e) => setStripes(Number(e.target.value) as StripeCount)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-red-500 font-semibold"
                >
                  <option value={0}>0 Stripes (None)</option>
                  <option value={1}>1 Stripe</option>
                  <option value={2}>2 Stripes</option>
                  <option value={3}>3 Stripes</option>
                  <option value={4}>4 Stripes</option>
                </select>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-stone-300 mb-1.5">
                  Last Promotion Date (Optional)
                </label>
                <input
                  type="date"
                  value={lastPromotionDate}
                  onChange={(e) => setLastPromotionDate(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-red-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-stone-300 mb-1.5">
                  Next Expected Promotion (Optional)
                </label>
                <input
                  type="date"
                  value={nextExpectedPromotionDate}
                  onChange={(e) => setNextExpectedPromotionDate(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-red-500 font-medium"
                />
              </div>
            </div>

            {/* Belt Visual Preview */}
            <div className="p-4 bg-stone-950/80 rounded-xl border border-stone-800 flex items-center justify-between shadow-inner">
              <div>
                <span className="text-xs sm:text-sm text-stone-300 font-bold block">Assigned Belt Preview:</span>
                <span className="text-[11px] text-stone-400">
                  {beltRank} Belt • {stripes} Stripe{stripes !== 1 ? 's' : ''} ({ageGroup} Division)
                </span>
              </div>
              <BeltBadge belt={beltRank} stripes={stripes} size="md" />
            </div>
          </div>

          {/* Section 3: Membership Plan & Classes Credited (From Plans & Pricing section only) */}
          <div className="space-y-4 pt-4 border-t border-stone-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm sm:text-base font-extrabold uppercase tracking-wider text-red-500 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-red-500" />
                <span>3. Monthly Subscription Plan ({ageGroup})</span>
              </h3>
              <span className="text-xs text-amber-400 font-bold">
                Valid for 1 Month (30 Days)
              </span>
            </div>
            <p className="text-xs sm:text-sm text-stone-400 leading-relaxed">
              Select one of the official academy subscription plans configured in the Plans & Pricing section. Each plan is valid for 1 month from registration.
            </p>

            {/* Plans List From Plans & Pricing Section */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {displayPlans.map((plan) => {
                const isSelected = selectedPlanId === plan.id;
                const isUnlim = plan.classesCount === -1;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => handleSelectPlan(plan)}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-red-950/70 border-red-500 text-white shadow-md ring-1 ring-red-500/50'
                        : 'bg-stone-950 border-stone-800 text-stone-300 hover:border-stone-700'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded bg-stone-800 text-amber-400 font-bold">
                        {plan.category}
                      </span>
                      {plan.isPopular && (
                        <span className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded bg-red-900/80 text-red-200 font-bold">
                          Popular
                        </span>
                      )}
                    </div>
                    <div className="font-extrabold text-xs sm:text-sm text-white line-clamp-1">{plan.name}</div>
                    <div className="text-lg sm:text-xl font-black text-white mt-1">
                      {formatCurrency(plan.price, currencySymbol)}
                    </div>
                    <div className="text-[11px] sm:text-xs text-stone-400 mt-1.5">
                      {isUnlim ? 'Unlimited Classes' : `${plan.classesCount} Classes`} • 1 Month
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Plan Summary Banner */}
            {selectedPlanId && (
              <div className="p-4 bg-stone-950 rounded-xl border border-stone-800 text-xs sm:text-sm flex items-center justify-between text-stone-300 shadow-inner">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>
                    Selected Plan: <strong className="text-white font-bold">{activePlans.find(p => p.id === selectedPlanId)?.name || 'Custom Plan'}</strong>
                  </span>
                </div>
                <span className="text-xs sm:text-sm text-emerald-400 font-black">
                  {classesTotal === -1 ? 'Unlimited' : `${classesTotal} Classes Credited`}
                </span>
              </div>
            )}
          </div>

          {/* Section 4: Initial Payment Tracking */}
          <div className="space-y-4 pt-4 border-t border-stone-800 bg-stone-950/40 p-5 rounded-xl border">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={recordPaymentNow}
                  onChange={(e) => setRecordPaymentNow(e.target.checked)}
                  className="rounded border-stone-700 text-red-600 focus:ring-red-500 w-5 h-5 bg-stone-900 cursor-pointer"
                />
                <span className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                  Record Initial Payment Now
                </span>
              </label>
              <span className="text-[11px] sm:text-xs text-emerald-400 font-bold bg-emerald-950/50 border border-emerald-900/50 px-2 py-0.5 rounded-md">
                Will generate official receipt
              </span>
            </div>

            {recordPaymentNow && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-stone-300 mb-1.5">
                    Amount Paid ({currencySymbol})
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-xs sm:text-sm font-bold">
                      {currencySymbol}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(Number(e.target.value))}
                      className="w-full bg-stone-950 border border-stone-700 rounded-lg pl-14 pr-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-red-500 font-black"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-stone-300 mb-1.5">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-red-500 font-bold"
                  >
                    <option value="Credit Card">Credit Card</option>
                    <option value="Cash">Cash</option>
                    <option value="Cliq">Cliq</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Section 5: Emergency Contact & Notes */}
          <div className="space-y-4 pt-4 border-t border-stone-800">
            <h3 className="text-sm sm:text-base font-extrabold uppercase tracking-wider text-red-500">
              4. Emergency Contact & Medical Notes
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-stone-300 mb-1.5">
                  Contact Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Maria Silva"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-stone-400 focus:outline-none focus:border-red-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-stone-300 mb-1.5">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  placeholder="(555) 000-0000"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-stone-400 focus:outline-none focus:border-red-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-stone-300 mb-1.5">
                  Relationship
                </label>
                <select
                  value={emergencyRelation}
                  onChange={(e) => setEmergencyRelation(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-red-500 font-bold"
                >
                  <option value="">Choose options...</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Parent">Parent</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Child">Child</option>
                  <option value="Friend">Friend</option>
                  <option value="Guardian">Guardian</option>
                  <option value="Relative">Relative</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-stone-300 mb-1.5">
                Injuries, Goals, or Coach Notes
              </label>
              <textarea
                rows={3}
                placeholder="Prior injuries (e.g. knee surgery, shoulder), previous wrestling/judo background, competition goals..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-stone-400 focus:outline-none focus:border-red-500 resize-none font-medium leading-relaxed"
              />
            </div>
          </div>

          {/* Modal Footer / Buttons */}
          <div className="pt-5 border-t border-stone-800 flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs sm:text-sm font-extrabold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-7 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs sm:text-sm font-black transition-colors inline-flex items-center gap-2 shadow-lg shadow-red-950/40 cursor-pointer hover:shadow-red-900/60"
            >
              <UserPlus className="w-5 h-5" />
              <span>Complete Registration</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
