import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, 
  AlertCircle, 
  CreditCard, 
  Send, 
  MessageSquare, 
  Check, 
  Copy, 
  Phone, 
  Search, 
  Sparkles, 
  ExternalLink, 
  CheckCircle2, 
  X, 
  Filter, 
  BellRing,
  Users,
  UserCheck,
  Megaphone,
  Edit3
} from 'lucide-react';
import { Member } from '../types';
import { BeltBadge } from '../utils/bjjBelts';

interface RenewalsAlertsViewProps {
  members: Member[];
  onOpenPaymentForMember: (memberId: string) => void;
  onSelectMember: (member: Member) => void;
}

export const RenewalsAlertsView: React.FC<RenewalsAlertsViewProps> = ({
  members,
  onOpenPaymentForMember,
  onSelectMember,
}) => {
  // Search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [balanceFilter, setBalanceFilter] = useState<'ALL' | 'EXHAUSTED' | 'WARNING'>('ALL');
  const [divisionFilter, setDivisionFilter] = useState<'ALL' | 'KIDS_PARENTS' | 'ADULTS'>('ALL');
  
  // Single student reminder modal state
  const [activeReminderMember, setActiveReminderMember] = useState<Member | null>(null);
  const [reminderMessage, setReminderMessage] = useState<string>('');
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [sentSuccessId, setSentSuccessId] = useState<string | null>(null);

  // Bulk reminder modal state
  const [isBulkReminderOpen, setIsBulkReminderOpen] = useState(false);
  const [bulkFilter, setBulkFilter] = useState<'ALL' | 'KIDS_PARENTS' | 'ADULTS'>('ALL');
  const [bulkCopiedSuccess, setBulkCopiedSuccess] = useState(false);

  // Filter ONLY students who need renewal (2 classes or less, including 0 or debt)
  const studentsNeedingRenewal = useMemo(() => {
    return members.filter((m) => {
      if (m.isDeleted) return false;
      return m.membershipType === 'class_pack' && m.classesRemaining <= 2;
    });
  }, [members]);

  // Derived counts
  const zeroOrDebtCount = useMemo(() => {
    return studentsNeedingRenewal.filter((m) => m.classesRemaining <= 0).length;
  }, [studentsNeedingRenewal]);

  const oneOrTwoLeftCount = useMemo(() => {
    return studentsNeedingRenewal.filter((m) => m.classesRemaining > 0 && m.classesRemaining <= 2).length;
  }, [studentsNeedingRenewal]);

  const kidsParentsCount = useMemo(() => {
    return studentsNeedingRenewal.filter((m) => m.ageGroup === 'Kids' || m.ageGroup === 'Teens').length;
  }, [studentsNeedingRenewal]);

  const adultsCount = useMemo(() => {
    return studentsNeedingRenewal.filter((m) => !m.ageGroup || m.ageGroup === 'Adults').length;
  }, [studentsNeedingRenewal]);

  // Helper: check if student is kid/teen with parent guardian contact
  const isKidOrTeen = (member: Member) => {
    return member.ageGroup === 'Kids' || member.ageGroup === 'Teens';
  };

  // Filtered by search, balance tab & division
  const displayedStudents = useMemo(() => {
    return studentsNeedingRenewal.filter((m) => {
      if (balanceFilter === 'EXHAUSTED' && m.classesRemaining > 0) return false;
      if (balanceFilter === 'WARNING' && (m.classesRemaining <= 0 || m.classesRemaining > 2)) return false;

      if (divisionFilter === 'KIDS_PARENTS' && !isKidOrTeen(m)) return false;
      if (divisionFilter === 'ADULTS' && isKidOrTeen(m)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = m.fullName.toLowerCase().includes(q);
        const matchesBelt = m.beltRank.toLowerCase().includes(q);
        const matchesPhone = m.phone.toLowerCase().includes(q);
        const matchesParent = m.emergencyContact?.name?.toLowerCase().includes(q);
        return matchesName || matchesBelt || matchesPhone || matchesParent;
      }
      return true;
    });
  }, [studentsNeedingRenewal, balanceFilter, divisionFilter, searchQuery]);

  const getRecipientInfo = (member: Member) => {
    const isYouth = isKidOrTeen(member);
    const rawParentName = member.emergencyContact?.name || '';
    const hasParent = rawParentName && rawParentName !== 'Not specified';
    
    // Clean parent name by stripping out relationship tags in parentheses like (Mother), (Father)
    const cleanParentName = rawParentName.replace(/\s*\([^)]*\)/gi, '').trim();
    
    const recipientName = isYouth
      ? (hasParent ? cleanParentName : `Parent / Guardian of ${member.fullName}`)
      : member.fullName;

    const recipientPhone = (isYouth && hasParent && member.emergencyContact?.phone)
      ? member.emergencyContact.phone
      : member.phone;

    return {
      isYouth,
      recipientName,
      rawParentName,
      cleanParentName,
      recipientPhone,
      relationLabel: isYouth ? (member.emergencyContact?.relation || 'Parent / Guardian') : 'Student Direct Contact',
    };
  };

  // Helper to generate professional renewal reminder text
  const generateReminderText = (member: Member) => {
    const { isYouth, recipientName, relationLabel } = getRecipientInfo(member);
    const isExhausted = member.classesRemaining === 0;
    const isDebt = member.classesRemaining < 0;
    const debtAmount = Math.abs(member.classesRemaining);
    const academyName = 'BJJ Academy';

    if (isYouth) {
      if (isDebt) {
        return `Dear ${recipientName} (${relationLabel} of ${member.fullName}),\n\nThis is a friendly notice from ${academyName}. ${member.fullName} has ${debtAmount} pending class(es) past 0 on their current training pass balance. Please visit the front desk to re-register and top up their plan so their mat time isn't interrupted. See you on the mats!`;
      }
      if (isExhausted) {
        return `Dear ${recipientName} (${relationLabel} of ${member.fullName}),\n\nThis is a friendly notice from ${academyName}. ${member.fullName} has 0 classes remaining on their current training pass. Please visit the front desk to re-register and top up their plan so their mat time isn't interrupted. See you on the mats!`;
      }
      return `Dear ${recipientName} (${relationLabel} of ${member.fullName}),\n\nThis is a friendly notice from ${academyName}. ${member.fullName} has ${member.classesRemaining} class${member.classesRemaining === 1 ? '' : 'es'} remaining until 0 on their current training pass. Please visit the front desk to re-register and top up their plan so their mat time isn't interrupted. See you on the mats!`;
    } else {
      // Adult student
      if (isDebt) {
        return `Dear ${member.fullName},\n\nThis is a friendly notice from ${academyName}. You have ${debtAmount} pending class(es) past 0 on your current training pass balance. Please visit the front desk to re-register and top up your plan so your mat time isn't interrupted. See you on the mats!`;
      }
      if (isExhausted) {
        return `Dear ${member.fullName},\n\nThis is a friendly notice from ${academyName}. You have 0 classes remaining on your current training pass. Please visit the front desk to re-register and top up your plan so your mat time isn't interrupted. See you on the mats!`;
      }
      return `Dear ${member.fullName},\n\nThis is a friendly notice from ${academyName}. You have ${member.classesRemaining} class${member.classesRemaining === 1 ? '' : 'es'} remaining until 0 on your current training pass. Please visit the front desk to re-register and top up your plan so your mat time isn't interrupted. See you on the mats!`;
    }
  };

  // Open modal with customized message for single student
  const handleOpenReminder = (member: Member) => {
    setActiveReminderMember(member);
    setReminderMessage(generateReminderText(member));
    setCopiedSuccess(false);
  };

  // Copy single message to clipboard
  const handleCopyMessage = () => {
    if (!reminderMessage) return;
    navigator.clipboard.writeText(reminderMessage);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2500);
  };

  // Clean phone number for WhatsApp / SMS
  const cleanPhone = (phone: string) => {
    return phone.replace(/[^\d+]/g, '');
  };

  // Send via WhatsApp
  const handleSendWhatsApp = (member: Member, customText?: string) => {
    const { recipientPhone } = getRecipientInfo(member);
    const textToSend = customText || reminderMessage || generateReminderText(member);
    const phone = cleanPhone(recipientPhone);
    const encoded = encodeURIComponent(textToSend);
    const whatsappUrl = phone ? `https://wa.me/${phone.replace('+', '')}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(whatsappUrl, '_blank');
    setSentSuccessId(member.id);
    setTimeout(() => setSentSuccessId(null), 3000);
  };

  // Send via SMS
  const handleSendSMS = (member: Member, customText?: string) => {
    const { recipientPhone } = getRecipientInfo(member);
    const textToSend = customText || reminderMessage || generateReminderText(member);
    const phone = cleanPhone(recipientPhone);
    const encoded = encodeURIComponent(textToSend);
    const smsUrl = `sms:${phone}?body=${encoded}`;
    window.open(smsUrl, '_blank');
    setSentSuccessId(member.id);
    setTimeout(() => setSentSuccessId(null), 3000);
  };

  // Copy ALL renewal reminders in bulk
  const handleCopyAllBulk = () => {
    const candidates = studentsNeedingRenewal.filter((m) => {
      if (bulkFilter === 'KIDS_PARENTS') return isKidOrTeen(m);
      if (bulkFilter === 'ADULTS') return !isKidOrTeen(m);
      return true;
    });

    const compiled = candidates.map((m) => {
      const { recipientName, recipientPhone, isYouth } = getRecipientInfo(m);
      const text = generateReminderText(m);
      return `----------------------------------------\nRECIPIENT: ${recipientName} (${isYouth ? `Parent of ${m.fullName}` : 'Adult Student'})\nPHONE: ${recipientPhone}\nBALANCE: ${m.classesRemaining} classes left until 0\nMESSAGE:\n${text}\n`;
    }).join('\n');

    navigator.clipboard.writeText(compiled);
    setBulkCopiedSuccess(true);
    setTimeout(() => setBulkCopiedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-stone-900 border border-stone-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">
                Student Renewals & Parent Reminders
              </h1>
              <p className="text-xs text-stone-400 mt-0.5">
                Manage students with <strong className="text-amber-400">2 classes or less until 0</strong>. Send automatic parent reminders for kids and direct messages for adults.
              </p>
            </div>
          </div>
        </div>

        {/* Counter Badges & Main Action Button */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-extrabold text-amber-300">
              {studentsNeedingRenewal.length} Need Renewal
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsBulkReminderOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black rounded-xl text-xs inline-flex items-center gap-2 transition-all shadow-md cursor-pointer"
          >
            <Megaphone className="w-4 h-4" />
            <span>📢 Remind Everyone Needing Renewal ({studentsNeedingRenewal.length})</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-stone-900 p-3.5 rounded-2xl border border-stone-800 shadow-xs">
        {/* Left: Low Balance Tabs & Division Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-stone-950 p-1 rounded-xl border border-stone-800">
            <button
              type="button"
              onClick={() => setDivisionFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                divisionFilter === 'ALL'
                  ? 'bg-stone-800 text-white shadow-xs'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              All Divisions
            </button>
            <button
              type="button"
              onClick={() => setDivisionFilter('KIDS_PARENTS')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                divisionFilter === 'KIDS_PARENTS'
                  ? 'bg-amber-500 text-stone-950 shadow-xs'
                  : 'text-amber-400 hover:text-amber-300'
              }`}
            >
              👨‍👩‍👧 Kids Parents ({kidsParentsCount})
            </button>
            <button
              type="button"
              onClick={() => setDivisionFilter('ADULTS')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                divisionFilter === 'ADULTS'
                  ? 'bg-stone-700 text-white shadow-xs'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              👤 Adults ({adultsCount})
            </button>
          </div>

          <div className="h-5 w-px bg-stone-800 hidden sm:block" />

          {/* Low Balance Status Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setBalanceFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                balanceFilter === 'ALL'
                  ? 'bg-amber-500 text-stone-950 shadow-xs'
                  : 'bg-stone-950 text-stone-400 hover:text-white border border-stone-800'
              }`}
            >
              All Low Balance (≤2 Classes)
            </button>
            <button
              type="button"
              onClick={() => setBalanceFilter('EXHAUSTED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                balanceFilter === 'EXHAUSTED'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-stone-950 text-stone-400 hover:text-white border border-stone-800'
              }`}
            >
              <span>0 Classes / Debt</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                balanceFilter === 'EXHAUSTED' ? 'bg-black/30 text-white' : 'bg-red-950 text-red-300 border border-red-800'
              }`}>
                {zeroOrDebtCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setBalanceFilter('WARNING')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                balanceFilter === 'WARNING'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-stone-950 text-stone-400 hover:text-white border border-stone-800'
              }`}
            >
              <span>1 or 2 Classes Left</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                balanceFilter === 'WARNING' ? 'bg-black/30 text-white' : 'bg-amber-950 text-amber-300 border border-amber-800'
              }`}>
                {oneOrTwoLeftCount}
              </span>
            </button>
          </div>
        </div>

        {/* Right: Search Box */}
        <div className="relative min-w-[240px] w-full lg:w-auto">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
          <input
            type="text"
            placeholder="Search student, parent name, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-stone-950 border border-stone-800 text-white text-xs pl-9 pr-3 py-2 rounded-xl focus:outline-hidden focus:border-amber-500"
          />
        </div>
      </div>

      {/* List of Students Needing Renewal */}
      {displayedStudents.length === 0 ? (
        <div className="p-12 rounded-2xl bg-stone-900 border border-stone-800 text-center flex flex-col items-center justify-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">
            {studentsNeedingRenewal.length === 0
              ? 'No Students Currently Need Renewal!'
              : 'No Students Match the Filter'}
          </h3>
          <p className="text-xs text-stone-400 max-w-sm">
            {studentsNeedingRenewal.length === 0
              ? 'All enrolled students currently have more than 2 classes remaining on their active training passes.'
              : 'Try switching the balance filter or clearing your search term.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedStudents.map((member) => {
            const isDebt = member.classesRemaining < 0;
            const isZero = member.classesRemaining === 0;
            const debtAmount = Math.abs(member.classesRemaining);
            const { isYouth, recipientName, recipientPhone, relationLabel } = getRecipientInfo(member);

            return (
              <div
                key={member.id}
                className={`rounded-2xl p-4 sm:p-5 border transition-all flex flex-col justify-between ${
                  isDebt
                    ? 'bg-gradient-to-b from-stone-900 to-red-950/20 border-red-700/80 shadow-md ring-1 ring-red-500/20'
                    : isZero
                    ? 'bg-stone-900 border-red-900/60 shadow-sm'
                    : 'bg-stone-900 border-amber-900/60 shadow-sm'
                }`}
              >
                <div>
                  {/* Top Row: Student Name, Belt, and Remaining Badge */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      {member.avatar ? (
                        <img
                          src={member.avatar}
                          alt={member.fullName}
                          className="w-11 h-11 rounded-full object-cover border-2 border-stone-700 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-stone-800 text-amber-400 font-black text-sm flex items-center justify-center border-2 border-stone-700 shrink-0">
                          {member.fullName.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 
                            onClick={() => onSelectMember(member)}
                            className="font-bold text-white text-base hover:text-amber-400 transition-colors cursor-pointer"
                          >
                            {member.fullName}
                          </h3>
                          {member.ageGroup && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                              member.ageGroup === 'Kids'
                                ? 'bg-amber-950 text-amber-300 border-amber-800'
                                : member.ageGroup === 'Teens'
                                ? 'bg-purple-950 text-purple-300 border-purple-800'
                                : 'bg-stone-800 text-stone-300 border-stone-700'
                            }`}>
                              {member.ageGroup}
                            </span>
                          )}
                        </div>
                        <div className="mt-1">
                          <BeltBadge belt={member.beltRank} stripes={member.stripes} size="sm" />
                        </div>
                      </div>
                    </div>

                    {/* Remaining Classes Badge */}
                    {isDebt ? (
                      <span className="px-2.5 py-1 rounded-xl text-xs font-black uppercase bg-red-900 text-white border border-red-700 animate-pulse shrink-0">
                        Debt: {debtAmount} Class{debtAmount > 1 ? 'es' : ''}
                      </span>
                    ) : isZero ? (
                      <span className="px-2.5 py-1 rounded-xl text-xs font-black uppercase bg-red-950 text-red-300 border border-red-800 shrink-0">
                        0 Classes Left
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-xl text-xs font-black uppercase bg-amber-950 text-amber-300 border border-amber-800 shrink-0">
                        {member.classesRemaining} Class{member.classesRemaining === 1 ? '' : 'es'} Left
                      </span>
                    )}
                  </div>

                  {/* Recipient & Contact Details */}
                  <div className="bg-stone-950/80 rounded-xl p-3 border border-stone-800 text-xs space-y-1.5 mb-3">
                    {/* Recipient Target: Parent vs Student */}
                    <div className="flex items-center justify-between text-stone-300 pb-1.5 border-b border-stone-850">
                      <span className="text-stone-400 font-semibold flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-amber-400" />
                        <span>Reminder Recipient:</span>
                      </span>
                      <span className={`font-bold ${isYouth ? 'text-amber-300' : 'text-stone-200'}`}>
                        {isYouth ? `👨‍👩‍👧 Parent: ${recipientName}` : `👤 Direct: ${recipientName}`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-stone-400">
                      <span>Contact Number:</span>
                      <span className="font-mono text-stone-200 font-bold">{recipientPhone || 'No phone recorded'}</span>
                    </div>

                    <div className="flex items-center justify-between text-stone-400">
                      <span>Plan Progress:</span>
                      <span className="font-semibold text-stone-200">
                        {member.classesTotal - member.classesRemaining} used / {member.classesTotal} total
                      </span>
                    </div>

                    {member.lastAttendedDate && (
                      <div className="flex items-center justify-between text-stone-400">
                        <span>Last Attended:</span>
                        <span className="font-semibold text-stone-300">{member.lastAttendedDate}</span>
                      </div>
                    )}
                  </div>

                  {/* Debt warning notice if applicable */}
                  {isDebt && (
                    <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-800/60 text-xs text-red-200 mb-3 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <strong>Attendance Debt Alert:</strong> Student attended while at 0 credits. Re-registering will automatically deduct these {debtAmount} class(es).
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-stone-800/80 flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleOpenReminder(member)}
                    className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl text-xs font-black inline-flex items-center justify-center gap-1.5 transition-all shadow-sm hover:shadow-md cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send {isYouth ? 'Parent' : 'Student'} Reminder</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenPaymentForMember(member.id)}
                    className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                    title="Open payment ledger to renew or top-up this student"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Renew / Pay</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectMember(member)}
                    className="py-2 px-3 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-semibold border border-stone-700 transition-colors cursor-pointer"
                    title="View Student Profile"
                  >
                    Profile
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SINGLE STUDENT REMINDER MODAL */}
      {activeReminderMember && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-stone-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    Send Front Desk Renewal Reminder
                  </h3>
                  <p className="text-xs text-stone-400">
                    To: <strong className="text-amber-300">{getRecipientInfo(activeReminderMember).recipientName}</strong> ({getRecipientInfo(activeReminderMember).recipientPhone || 'No phone'})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveReminderMember(null)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Recipient & Balance Summary */}
            <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-amber-400 font-bold block">
                  {isKidOrTeen(activeReminderMember) ? '👨‍👩‍👧 Parent Notification' : '👤 Direct Student Contact'}
                </span>
                <span className="text-xs font-bold text-white">
                  {activeReminderMember.classesRemaining <= 0
                    ? activeReminderMember.classesRemaining < 0
                      ? `${Math.abs(activeReminderMember.classesRemaining)} Classes in Debt`
                      : '0 Classes Remaining'
                    : `${activeReminderMember.classesRemaining} Class${activeReminderMember.classesRemaining === 1 ? '' : 'es'} Left Until 0`}
                </span>
              </div>
              <BeltBadge belt={activeReminderMember.beltRank} stripes={activeReminderMember.stripes} size="sm" />
            </div>

            {/* Message Editor */}
            <div>
              <label className="text-xs font-bold text-stone-300 block mb-1.5 flex items-center justify-between">
                <span>Reminder Message (Customizable):</span>
                <button
                  type="button"
                  onClick={() => setReminderMessage(generateReminderText(activeReminderMember))}
                  className="text-[11px] text-amber-400 hover:underline font-normal cursor-pointer"
                >
                  Reset to default template
                </button>
              </label>
              <textarea
                rows={5}
                value={reminderMessage}
                onChange={(e) => setReminderMessage(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-2xl p-3 text-white text-xs leading-relaxed focus:outline-hidden focus:border-amber-500 transition-colors font-sans"
                placeholder="Type your renewal reminder message here..."
              />
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSendWhatsApp(activeReminderMember)}
                  className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Send WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSendSMS(activeReminderMember)}
                  className="py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
                >
                  <Phone className="w-4 h-4" />
                  <span>Send SMS</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleCopyMessage}
                className="w-full py-2.5 px-3 bg-stone-800 hover:bg-stone-750 text-stone-200 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-2 border border-stone-700 transition-colors cursor-pointer"
              >
                {copiedSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-300 font-bold">Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-stone-400" />
                    <span>Copy Message Text</span>
                  </>
                )}
              </button>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveReminderMember(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-stone-400 hover:text-white transition-colors cursor-pointer"
              >
                Done / Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK REMIND ALL MODAL */}
      {isBulkReminderOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-8">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-stone-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    Bulk Renewal Reminders ({studentsNeedingRenewal.length} Candidates)
                  </h3>
                  <p className="text-xs text-stone-400">
                    Send customizable reminders to all students and parents with 2 classes or less remaining until 0.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkReminderOpen(false)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Recipient Segment Tabs */}
            <div className="flex items-center gap-2 bg-stone-950 p-1.5 rounded-2xl border border-stone-800">
              <button
                type="button"
                onClick={() => setBulkFilter('ALL')}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  bulkFilter === 'ALL'
                    ? 'bg-amber-500 text-stone-950 shadow-sm'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                All ({studentsNeedingRenewal.length})
              </button>
              <button
                type="button"
                onClick={() => setBulkFilter('KIDS_PARENTS')}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  bulkFilter === 'KIDS_PARENTS'
                    ? 'bg-amber-500 text-stone-950 shadow-sm'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                👨‍👩‍👧 Kids Parents ({kidsParentsCount})
              </button>
              <button
                type="button"
                onClick={() => setBulkFilter('ADULTS')}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  bulkFilter === 'ADULTS'
                    ? 'bg-amber-500 text-stone-950 shadow-sm'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                👤 Adults Direct ({adultsCount})
              </button>
            </div>

            {/* Bulk Action Header */}
            <div className="flex items-center justify-between gap-3 p-3.5 bg-stone-950 rounded-2xl border border-stone-800">
              <div className="text-xs">
                <span className="text-stone-400 block font-medium">Bulk Action</span>
                <span className="text-white font-bold">
                  {studentsNeedingRenewal.filter((m) => {
                    if (bulkFilter === 'KIDS_PARENTS') return isKidOrTeen(m);
                    if (bulkFilter === 'ADULTS') return !isKidOrTeen(m);
                    return true;
                  }).length} Messages Generated
                </span>
              </div>

              <button
                type="button"
                onClick={handleCopyAllBulk}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black rounded-xl text-xs inline-flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                {bulkCopiedSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-stone-950" />
                    <span>All Messages Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy All Messages to Clipboard</span>
                  </>
                )}
              </button>
            </div>

            {/* Student Candidate List */}
            <div className="max-h-[50vh] min-h-[220px] overflow-y-auto space-y-3 pr-1.5 custom-scrollbar">
              {studentsNeedingRenewal
                .filter((m) => {
                  if (bulkFilter === 'KIDS_PARENTS') return isKidOrTeen(m);
                  if (bulkFilter === 'ADULTS') return !isKidOrTeen(m);
                  return true;
                })
                .map((member) => {
                  const { isYouth, recipientName, recipientPhone } = getRecipientInfo(member);
                  const reminderText = generateReminderText(member);

                  return (
                    <div
                      key={member.id}
                      className="p-3 bg-stone-950 rounded-2xl border border-stone-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white text-xs">{member.fullName}</span>
                          <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded ${
                            isYouth ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-stone-800 text-stone-300'
                          }`}>
                            {isYouth ? `Parent: ${recipientName}` : 'Adult Direct'}
                          </span>
                          <span className="text-[10px] text-amber-400 font-bold">
                            {member.classesRemaining <= 0 ? `${member.classesRemaining} (Finished)` : `${member.classesRemaining} left`}
                          </span>
                        </div>
                        {/* Scrollable & Editable Message Preview Box */}
                        <div className="relative">
                          <textarea
                            rows={3}
                            value={reminderText}
                            readOnly
                            className="w-full text-xs text-stone-200 bg-stone-900/90 p-2.5 rounded-xl border border-stone-800 focus:outline-none focus:border-amber-500/60 resize-y overflow-y-auto leading-relaxed font-sans shadow-inner cursor-text"
                            title="Scroll to view full message"
                          />
                          <span className="text-[9px] text-stone-500 block text-right -mt-0.5">
                            ↕ Scroll or drag corner to view complete message
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleSendWhatsApp(member, reminderText)}
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[11px] font-bold inline-flex items-center gap-1 transition-all cursor-pointer"
                          title="Send WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSendSMS(member, reminderText)}
                          className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-[11px] font-bold inline-flex items-center gap-1 transition-all cursor-pointer"
                          title="Send SMS"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>SMS</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Footer Close */}
            <div className="pt-2 border-t border-stone-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsBulkReminderOpen(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-stone-800 hover:bg-stone-700 text-white transition-colors cursor-pointer"
              >
                Close Bulk Reminders
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
