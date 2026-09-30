import React, { useState, useMemo, useEffect } from 'react';
import { 
  CreditCard, 
  Search, 
  CheckCircle2, 
  BellRing,
  Users,
  History,
  Trash2,
  Download,
  Clock,
  ShieldAlert,
  User,
  Check,
  AlertCircle,
  Copy,
  MessageSquare,
  Send,
  ExternalLink,
  Smartphone
} from 'lucide-react';
import { Member, RenewalReminderLog } from '../types';
import { BeltBadge } from '../utils/bjjBelts';
import { loadReminderLogs, saveReminderLogs } from '../utils/storage';
import { 
  getMemberRecipientInfo, 
  generateRenewalReminderMessage, 
  qualifiesForRenewalReminder,
  processAutomatedRenewalReminders,
  isYouthMember 
} from '../utils/reminderEngine';
import { MessageSendingLogsView } from './MessageSendingLogsView';
import { 
  cleanPhoneNumber, 
  dispatchWhatsAppMessage, 
  dispatchSMSMessage 
} from '../utils/messagingLogger';

interface RenewalsAlertsViewProps {
  members: Member[];
  theme?: 'dark' | 'light';
  onOpenPaymentForMember: (memberId: string) => void;
  onSelectMember: (member: Member) => void;
}

export const RenewalsAlertsView: React.FC<RenewalsAlertsViewProps> = ({
  members,
  theme = 'dark',
  onOpenPaymentForMember,
  onSelectMember,
}) => {
  const isLight = theme === 'light';

  // Navigation Tabs: Active Candidates vs WhatsApp & SMS Sending Logs
  const [activeTab, setActiveTab] = useState<'alerts' | 'reminder_log'>('alerts');

  // Reminder Logs State (Loaded from storage)
  const [reminderLogs, setReminderLogs] = useState<RenewalReminderLog[]>(() => loadReminderLogs());

  // Search & Filter for Active Candidates
  const [searchQuery, setSearchQuery] = useState('');
  const [activeAlertCategory, setActiveAlertCategory] = useState<'ALL' | 'ONE_CLASS' | 'FINISHED'>('ALL');
  const [copiedMemberId, setCopiedMemberId] = useState<string | null>(null);

  const handleCopyName = (e: React.MouseEvent, fullName: string, memberId: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(fullName);
    setCopiedMemberId(memberId);
    setTimeout(() => {
      setCopiedMemberId((prev) => (prev === memberId ? null : prev));
    }, 1800);
  };

  // Filter ONLY students who need renewal (strictly 1 class left OR subscription finished <= 0)
  const studentsNeedingRenewal = useMemo(() => {
    return members.filter((m) => qualifiesForRenewalReminder(m));
  }, [members]);

  const oneClassLeftStudents = useMemo(() => {
    return studentsNeedingRenewal.filter((m) => m.classesRemaining === 1);
  }, [studentsNeedingRenewal]);

  const finishedSubscriptionStudents = useMemo(() => {
    return studentsNeedingRenewal.filter((m) => m.classesRemaining <= 0);
  }, [studentsNeedingRenewal]);

  // Automated background reminder check
  useEffect(() => {
    const updated = processAutomatedRenewalReminders(members);
    setReminderLogs(updated);
  }, [members]);

  // Handle direct WhatsApp dispatch from card
  const handleDirectWhatsAppSend = (e: React.MouseEvent, member: Member) => {
    e.stopPropagation();
    const { text, triggerType } = generateRenewalReminderMessage(member);
    const { isYouth, recipientName, recipientPhone } = getMemberRecipientInfo(member);

    dispatchWhatsAppMessage({
      memberId: member.id,
      memberName: member.fullName,
      phone: member.phone,
      recipientName,
      recipientPhone,
      isYouth,
      ageGroup: member.ageGroup,
      beltRank: member.beltRank,
      stripes: member.stripes,
      classesRemaining: member.classesRemaining,
      triggerType,
      messageText: text,
      dispatchedBy: 'Alerts Dashboard (Direct WhatsApp)',
    });

    setReminderLogs(loadReminderLogs());
  };

  // Handle direct SMS dispatch from card
  const handleDirectSMSSend = (e: React.MouseEvent, member: Member) => {
    e.stopPropagation();
    const { text, triggerType } = generateRenewalReminderMessage(member);
    const { isYouth, recipientName, recipientPhone } = getMemberRecipientInfo(member);

    dispatchSMSMessage({
      memberId: member.id,
      memberName: member.fullName,
      phone: member.phone,
      recipientName,
      recipientPhone,
      isYouth,
      ageGroup: member.ageGroup,
      beltRank: member.beltRank,
      stripes: member.stripes,
      classesRemaining: member.classesRemaining,
      triggerType,
      messageText: text,
      dispatchedBy: 'Alerts Dashboard (Direct SMS)',
    });

    setReminderLogs(loadReminderLogs());
  };

  // Filtered displayed students for alerts tab
  const displayedStudents = useMemo(() => {
    return studentsNeedingRenewal.filter((m) => {
      if (activeAlertCategory === 'ONE_CLASS' && m.classesRemaining !== 1) return false;
      if (activeAlertCategory === 'FINISHED' && m.classesRemaining > 0) return false;

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
  }, [studentsNeedingRenewal, activeAlertCategory, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Top Header & Tab Navigation Bar */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 rounded-2xl border shadow-sm ${
        isLight ? 'bg-white border-stone-200' : 'bg-stone-900 border-stone-800'
      }`}>
        {/* Subtab Switcher */}
        <div className="flex items-center gap-2 flex-1">
          <button
            type="button"
            onClick={() => setActiveTab('alerts')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black inline-flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'alerts'
                ? isLight ? 'bg-stone-900 text-white shadow-md' : 'bg-stone-800 text-white shadow-md'
                : isLight
                ? 'text-stone-700 hover:text-stone-950 hover:bg-stone-100 font-bold'
                : 'text-stone-400 hover:text-white hover:bg-stone-800'
            }`}
          >
            <BellRing className={`w-4 h-4 ${activeTab === 'alerts' ? 'text-red-400' : isLight ? 'text-stone-700' : 'text-stone-400'}`} />
            <span>Active Renewal Candidates</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
              activeTab === 'alerts'
                ? 'bg-red-600 text-white'
                : isLight
                ? 'bg-stone-200 text-stone-900 border border-stone-300'
                : 'bg-stone-800 text-stone-300'
            }`}>
              {studentsNeedingRenewal.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reminder_log')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black inline-flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'reminder_log'
                ? 'bg-emerald-600 text-white shadow-md'
                : isLight
                ? 'text-stone-700 hover:text-stone-950 hover:bg-stone-100 font-bold'
                : 'text-stone-400 hover:text-white hover:bg-stone-800'
            }`}
          >
            <MessageSquare className={`w-4 h-4 ${activeTab === 'reminder_log' ? 'text-white' : 'text-emerald-400'}`} />
            <span>Automated Message Sending Logs</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
              activeTab === 'reminder_log'
                ? 'bg-black/30 text-white font-bold'
                : isLight
                ? 'bg-stone-200 text-stone-800 font-bold'
                : 'bg-stone-950 text-stone-300'
            }`}>
              {reminderLogs.length}
            </span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: ACTIVE RENEWAL ALERTS VIEW
          ========================================================================= */}
      {activeTab === 'alerts' && (
        <div className="space-y-3.5">
          {/* Streamlined Category Strip & Live Search */}
          <div className={`p-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
            isLight ? 'bg-white border-stone-200' : 'bg-stone-900 border-stone-800'
          }`}>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setActiveAlertCategory('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeAlertCategory === 'ALL'
                    ? 'bg-stone-900 text-white font-black shadow-sm'
                    : isLight
                    ? 'bg-stone-100 text-stone-700 hover:text-stone-950 border border-stone-300'
                    : 'bg-stone-950 text-stone-400 hover:text-white border border-stone-800'
                }`}
              >
                All Needing Renewal ({studentsNeedingRenewal.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveAlertCategory('ONE_CLASS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                  activeAlertCategory === 'ONE_CLASS'
                    ? 'bg-orange-600 text-white shadow-sm font-black'
                    : isLight
                    ? 'bg-stone-100 text-stone-900 hover:bg-stone-200 border border-stone-300 font-bold'
                    : 'bg-stone-950 text-stone-300 hover:text-white border border-stone-800'
                }`}
              >
                <span>⚠️ 1 Class Left</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  isLight ? 'bg-orange-100 text-orange-950' : 'bg-stone-800 text-orange-400'
                }`}>
                  {oneClassLeftStudents.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveAlertCategory('FINISHED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                  activeAlertCategory === 'FINISHED'
                    ? 'bg-red-600 text-white shadow-sm font-black'
                    : isLight
                    ? 'bg-red-50 text-red-950 hover:bg-red-100 border border-red-300 font-bold'
                    : 'bg-stone-950 text-red-400 hover:text-red-300 border border-red-900/50'
                }`}
              >
                <span>⛔ Subscription Finished (0 Classes)</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  isLight ? 'bg-red-200 text-red-950' : 'bg-red-950 text-red-300'
                }`}>
                  {finishedSubscriptionStudents.length}
                </span>
              </button>
            </div>

            {/* Instant Search Bar */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Search candidates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-8 pr-3 py-1.5 rounded-lg text-xs border focus:outline-none transition-all ${
                  isLight
                    ? 'bg-stone-50 border-stone-300 text-stone-900 focus:bg-white focus:border-red-600'
                    : 'bg-stone-950 border-stone-800 text-white focus:border-red-500'
                }`}
              />
            </div>
          </div>

          {/* Student Alert Cards Grid */}
          {displayedStudents.length === 0 ? (
            <div className={`p-12 text-center rounded-2xl border space-y-2 ${
              isLight ? 'bg-white border-stone-200' : 'bg-stone-900 border-stone-800'
            }`}>
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500" />
              <p className={`text-sm font-bold ${isLight ? 'text-stone-900' : 'text-white'}`}>
                No active renewal candidates matching this filter!
              </p>
              <p className="text-xs text-stone-500">
                All active class packs have healthy balances.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {displayedStudents.map((member) => {
                const isOneClassLeft = member.classesRemaining === 1;
                const isFinished = member.classesRemaining <= 0;
                const { recipientName, recipientPhone, isYouth } = getMemberRecipientInfo(member);

                return (
                  <div
                    key={member.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 relative group ${
                      isLight
                        ? isFinished
                          ? 'bg-white border-red-300 hover:border-red-500 shadow-sm'
                          : 'bg-white border-orange-200 hover:border-orange-400 shadow-sm'
                        : isFinished
                        ? 'bg-stone-900/90 border-red-900/60 hover:border-red-600 shadow-md'
                        : 'bg-stone-900/90 border-orange-900/40 hover:border-orange-500 shadow-md'
                    }`}
                  >
                    <div className="space-y-2.5">
                      {/* Top Header: Badge & Status */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3
                              onClick={() => onSelectMember(member)}
                              className={`text-sm font-black hover:underline cursor-pointer transition-colors ${
                                isLight ? 'text-stone-950' : 'text-white'
                              }`}
                            >
                              {member.fullName}
                            </h3>
                            <button
                              type="button"
                              onClick={(e) => handleCopyName(e, member.fullName, member.id)}
                              className="text-stone-400 hover:text-white p-0.5 rounded cursor-pointer"
                              title="Copy Name"
                            >
                              {copiedMemberId === member.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-stone-400 font-medium">
                              {member.ageGroup || 'Adults'}
                            </span>
                            <span className="text-stone-600">•</span>
                            <BeltBadge belt={member.beltRank} stripes={member.stripes} size="sm" />
                          </div>
                        </div>

                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-black uppercase tracking-wider shrink-0 ${
                          isFinished
                            ? 'bg-red-600 text-white shadow-xs animate-pulse'
                            : 'bg-orange-500 text-stone-950 shadow-xs'
                        }`}>
                          {isFinished ? '0 Left (Finished)' : '1 Class Left'}
                        </span>
                      </div>

                      {/* Recipient & Contact Details */}
                      <div className={`p-2.5 rounded-xl border space-y-1 text-xs ${
                        isLight ? 'bg-stone-50 border-stone-200' : 'bg-stone-950/70 border-stone-800'
                      }`}>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-stone-400">Target Contact:</span>
                          <span className={`font-bold ${isLight ? 'text-stone-900' : 'text-stone-200'}`}>
                            {isYouth ? `👨‍👩‍👧 ${recipientName}` : `👤 ${recipientName}`}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-stone-400">Phone:</span>
                          <span className="font-mono text-emerald-400 font-bold">
                            {cleanPhoneNumber(recipientPhone) || 'No Phone'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons: Direct WhatsApp, Direct SMS, Renew Plan & Profile */}
                    <div className="space-y-2 pt-1 border-t border-stone-800/60">
                      {/* Direct Message Dispatches */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={(e) => handleDirectWhatsAppSend(e, member)}
                          className="py-1.5 px-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/40 rounded-xl text-[11px] font-bold inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                          title="Send reminder directly via WhatsApp and log sending"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>WhatsApp</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleDirectSMSSend(e, member)}
                          className="py-1.5 px-2 bg-sky-600/20 hover:bg-sky-600 text-sky-400 hover:text-white border border-sky-500/40 rounded-xl text-[11px] font-bold inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                          title="Send reminder directly via SMS and log sending"
                        >
                          <Smartphone className="w-3 h-3" />
                          <span>SMS Gateway</span>
                        </button>
                      </div>

                      {/* Renew & Profile Button */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onOpenPaymentForMember(member.id)}
                          className="flex-1 py-2 px-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black inline-flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Renew Pass</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onSelectMember(member)}
                          className={`p-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                            isLight
                              ? 'bg-stone-100 hover:bg-stone-200 text-stone-800 border-stone-300'
                              : 'bg-stone-800 hover:bg-stone-700 text-stone-300 border-stone-700'
                          }`}
                          title="View student profile"
                        >
                          <User className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: COMPREHENSIVE WHATSAPP & SMS SENDING LOGS VIEW (FULL DETAILS)
          ========================================================================= */}
      {activeTab === 'reminder_log' && (
        <MessageSendingLogsView
          members={members}
          theme={theme}
          onSelectMember={onSelectMember}
        />
      )}
    </div>
  );
};
