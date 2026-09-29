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
  Copy
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

  // Navigation Tabs: Active Candidates vs Automated Reminder Log
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

  // =========================================================================
  // AUTOMATED BACKGROUND REMINDER ENGINE
  // Automatically detects when students reach 1 class left or finished,
  // generates their tailored reminder, and records into the Reminder Log.
  // =========================================================================
  useEffect(() => {
    const updated = processAutomatedRenewalReminders(members);
    setReminderLogs(updated);
  }, [members]);

  // Clear reminder logs
  const handleClearReminderLogs = () => {
    setReminderLogs([]);
    saveReminderLogs([]);
  };

  // Export reminder logs to CSV
  const handleExportReminderLogsCSV = () => {
    const headers = [
      'Timestamp Date',
      'Timestamp Time',
      'Student Name',
      'Recipient',
      'Phone',
      'Belt Rank',
      'Division',
      'Classes Left',
      'Trigger Type',
      'Automated Process Status',
      'Generated Message Text'
    ];
    const rows = reminderLogs.map((l) => [
      l.date,
      l.time,
      `"${l.memberName}"`,
      `"${l.recipientName}"`,
      `"${l.recipientPhone}"`,
      `"${l.beltRank}"`,
      `"${l.ageGroup || 'Adults'}"`,
      l.classesRemaining,
      l.triggerType === 'one_class_left' ? '1 Class Left Notice' : 'Subscription Finished (0 Classes)',
      'Automated Background',
      `"${l.messageText.replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `automated_renewal_reminders_log_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
                ? 'bg-red-600 text-white shadow-md'
                : isLight
                ? 'text-stone-700 hover:text-stone-950 hover:bg-stone-100 font-bold'
                : 'text-stone-400 hover:text-white hover:bg-stone-800'
            }`}
          >
            <History className={`w-4 h-4 ${activeTab === 'reminder_log' ? 'text-white' : isLight ? 'text-stone-700' : 'text-stone-300'}`} />
            <span>Automated Reminder Log</span>
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

        {/* Action Buttons on Reminder Log view */}
        {activeTab === 'reminder_log' && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportReminderLogsCSV}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 border cursor-pointer transition-colors ${
                isLight
                  ? 'bg-stone-100 hover:bg-stone-200 text-stone-800 border-stone-300'
                  : 'bg-stone-800 hover:bg-stone-700 text-stone-200 border-stone-700'
              }`}
            >
              <Download className={`w-3.5 h-3.5 ${isLight ? 'text-stone-600' : 'text-stone-400'}`} />
              <span>Export Log CSV</span>
            </button>
            {reminderLogs.length > 0 && (
              <button
                type="button"
                onClick={handleClearReminderLogs}
                className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                  isLight
                    ? 'bg-stone-100 hover:bg-red-100 text-stone-600 hover:text-red-700 border-stone-300'
                    : 'bg-stone-850 hover:bg-red-950 text-stone-400 hover:text-red-400 border border-stone-700'
                }`}
                title="Clear Reminder Log"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
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

            {/* Compact Search */}
            <div className="relative w-full sm:w-64">
              <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${isLight ? 'text-stone-500' : 'text-stone-500'}`} />
              <input
                type="text"
                placeholder="Search student or parent..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full text-xs pl-8 pr-3 py-1.5 rounded-lg focus:outline-hidden font-medium ${
                  isLight
                    ? 'bg-stone-100 border border-stone-300 text-stone-900 placeholder-stone-500 focus:border-red-600'
                    : 'bg-stone-950 border border-stone-800 text-white placeholder-stone-500 focus:border-red-500'
                }`}
              />
            </div>
          </div>

          {/* Student Alert Cards Grid */}
          {displayedStudents.length === 0 ? (
            <div className={`p-12 rounded-2xl border text-center flex flex-col items-center justify-center shadow-xs ${
              isLight ? 'bg-white border-stone-200' : 'bg-stone-900 border-stone-800'
            }`}>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className={`text-base font-bold mb-1 ${isLight ? 'text-stone-900' : 'text-white'}`}>
                {studentsNeedingRenewal.length === 0
                  ? 'All Student Memberships in Good Standing!'
                  : 'No Students Match Current Filter'}
              </h3>
              <p className={`text-xs max-w-sm ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
                {studentsNeedingRenewal.length === 0
                  ? 'No students currently have 1 class left or finished subscriptions. All background renewal reminders will automatically trigger when a student reaches these thresholds.'
                  : 'Try switching between "1 Class Left" and "Subscription Finished" tabs.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {displayedStudents.map((member) => {
                const isFinished = member.classesRemaining <= 0;
                const isDebt = member.classesRemaining < 0;
                const debtAmount = Math.abs(member.classesRemaining);
                const { isYouth, recipientName, recipientPhone } = getMemberRecipientInfo(member);

                return (
                  <div
                    key={member.id}
                    className={`rounded-2xl p-4 border transition-all flex flex-col justify-between ${
                      isFinished
                        ? isLight
                          ? 'bg-red-50/40 border-red-300 shadow-sm'
                          : 'bg-gradient-to-b from-stone-900 to-red-950/20 border-red-800/80 shadow-md'
                        : isLight
                        ? 'bg-stone-50 border-stone-300 shadow-sm'
                        : 'bg-stone-900 border-stone-800 shadow-sm'
                    }`}
                  >
                    <div>
                      {/* Top Row: Student Name, Belt, and Trigger Badge */}
                      <div className="flex items-start justify-between gap-2.5 mb-2.5">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 
                              onClick={() => onSelectMember(member)}
                              className={`font-black text-base hover:text-red-600 transition-colors cursor-pointer truncate ${
                                isLight ? 'text-stone-950' : 'text-white'
                              }`}
                            >
                              {member.fullName}
                            </h3>

                            <button
                              type="button"
                              onClick={(e) => handleCopyName(e, member.fullName, member.id)}
                              title={copiedMemberId === member.id ? 'Copied name to clipboard!' : `Copy "${member.fullName}"`}
                              className={`p-1 rounded-md transition-all inline-flex items-center gap-1 text-[11px] cursor-pointer active:scale-95 ${
                                copiedMemberId === member.id
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-xs'
                                  : isLight
                                  ? 'text-stone-500 hover:text-stone-900 hover:bg-stone-200 border border-transparent'
                                  : 'text-stone-400 hover:text-white hover:bg-stone-800 border border-transparent'
                              }`}
                            >
                              {copiedMemberId === member.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="font-mono text-[10px] font-bold">Copied</span>
                                </>
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {member.ageGroup && (
                              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                                member.ageGroup === 'Kids'
                                  ? isLight ? 'bg-stone-200 text-stone-950 border-stone-300' : 'bg-stone-800 text-stone-300 border-stone-700'
                                  : member.ageGroup === 'Teens'
                                  ? isLight ? 'bg-purple-100 text-purple-950 border-purple-300' : 'bg-purple-950 text-purple-300 border-purple-800'
                                  : isLight ? 'bg-stone-100 text-stone-800 border-stone-300' : 'bg-stone-800 text-stone-300 border-stone-700'
                              }`}>
                                {member.ageGroup}
                              </span>
                            )}
                          </div>
                          <div className="mt-1">
                            <BeltBadge belt={member.beltRank} stripes={member.stripes} size="sm" />
                          </div>
                        </div>

                        {/* Trigger Status Badge */}
                        {isDebt ? (
                          <span className="px-2.5 py-1 rounded-xl text-xs font-black uppercase bg-red-600 text-white shadow-xs animate-pulse shrink-0">
                            Debt: {debtAmount} Class{debtAmount > 1 ? 'es' : ''}
                          </span>
                        ) : isFinished ? (
                          <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase shrink-0 ${
                            isLight
                              ? 'bg-red-100 text-red-950 border border-red-300 font-extrabold'
                              : 'bg-red-950 text-red-300 border border-red-800'
                          }`}>
                            ⛔ Finished (0 Left)
                          </span>
                        ) : (
                          <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase shrink-0 ${
                            isLight
                              ? 'bg-orange-100 text-orange-950 border border-orange-400 font-extrabold'
                              : 'bg-stone-800 text-orange-400 border border-stone-700'
                          }`}>
                            ⚠️ 1 Class Left
                          </span>
                        )}
                      </div>

                      {/* Recipient & Contact Details */}
                      <div className={`rounded-xl p-2.5 border text-xs space-y-1 mb-3 ${
                        isLight ? 'bg-white border-stone-200' : 'bg-stone-950/90 border border-stone-800'
                      }`}>
                        <div className={`flex items-center justify-between pb-1 border-b ${
                          isLight ? 'border-stone-200' : 'border-stone-850'
                        }`}>
                          <span className={`font-semibold flex items-center gap-1 text-[11px] ${
                            isLight ? 'text-stone-600' : 'text-stone-400'
                          }`}>
                            <Users className={`w-3 h-3 ${isLight ? 'text-stone-700' : 'text-stone-400'}`} />
                            <span>Contact:</span>
                          </span>
                          <span className={`font-bold text-xs ${
                            isYouth
                              ? isLight ? 'text-stone-900 font-black' : 'text-stone-200'
                              : isLight ? 'text-stone-900' : 'text-stone-200'
                          }`}>
                            {isYouth ? `👨‍👩‍👧 Parent: ${recipientName}` : `👤 Direct: ${recipientName}`}
                          </span>
                        </div>

                        <div className={`flex items-center justify-between text-[11px] ${
                          isLight ? 'text-stone-600' : 'text-stone-400'
                        }`}>
                          <span>Phone:</span>
                          <span className={`font-mono font-bold ${
                            isLight ? 'text-stone-900' : 'text-stone-200'
                          }`}>{recipientPhone || 'No phone recorded'}</span>
                        </div>

                        <div className={`pt-1 text-[10px] italic flex items-center gap-1 ${
                          isLight ? 'text-stone-600 font-medium' : 'text-stone-500'
                        }`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Automated background reminder active</span>
                        </div>
                      </div>
                    </div>

                    {/* Streamlined Action: Renew Plan & View Student Profile */}
                    <div className={`pt-2.5 border-t flex items-center gap-2 ${
                      isLight ? 'border-stone-200' : 'border-stone-800'
                    }`}>
                      <button
                        type="button"
                        onClick={() => onOpenPaymentForMember(member.id)}
                        className="flex-1 py-2.5 px-3.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black inline-flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                        title="Renew or top up membership plan"
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>Renew Membership Plan</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onSelectMember(member)}
                        className={`p-2.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                          isLight
                            ? 'bg-stone-100 hover:bg-stone-200 text-stone-800 border-stone-300'
                            : 'bg-stone-800 hover:bg-stone-750 text-stone-300 border-stone-700'
                        }`}
                        title="View student profile & attendance history"
                      >
                        <User className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: AUTOMATED REMINDER LOG VIEW (AUDITED BACKGROUND HISTORY)
          ========================================================================= */}
      {activeTab === 'reminder_log' && (
        <div className="space-y-4">
          <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            isLight ? 'bg-white border-stone-200' : 'bg-stone-900 border-stone-800'
          }`}>
            <div>
              <h2 className={`text-sm font-black flex items-center gap-2 ${
                isLight ? 'text-stone-950' : 'text-white'
              }`}>
                <History className={`w-4 h-4 ${isLight ? 'text-red-700' : 'text-red-400'}`} />
                <span>Automated Background Renewal Reminder History</span>
              </h2>
              <p className={`text-xs mt-0.5 ${isLight ? 'text-stone-600 font-medium' : 'text-stone-400'}`}>
                Full chronological audit trail of all automatic renewal notices triggered for students with 1 class remaining or finished subscriptions.
              </p>
            </div>

            <div className={`text-xs font-mono font-bold px-3 py-1.5 rounded-xl border ${
              isLight
                ? 'text-stone-900 bg-stone-100 border-stone-300 font-black'
                : 'text-stone-300 bg-stone-950/40 border-stone-800'
            }`}>
              Total Logged: {reminderLogs.length} events
            </div>
          </div>

          <div className={`rounded-2xl border overflow-hidden shadow-sm ${
            isLight ? 'bg-white border-stone-200' : 'bg-stone-900 border-stone-800'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`uppercase text-[10px] font-black border-b ${
                  isLight ? 'bg-stone-100 text-stone-700 border-stone-200' : 'bg-stone-950 text-stone-400 border-stone-800'
                }`}>
                  <tr>
                    <th className="p-3.5">Timestamp</th>
                    <th className="p-3.5">Student & Belt</th>
                    <th className="p-3.5">Recipient & Contact</th>
                    <th className="p-3.5">Trigger Reason</th>
                    <th className="p-3.5">Automated Message Content</th>
                    <th className="p-3.5 text-right">Process Status</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-sans ${isLight ? 'divide-stone-200' : 'divide-stone-800/60'}`}>
                  {reminderLogs.map((log) => {
                    const isOneClass = log.triggerType === 'one_class_left';

                    return (
                      <tr key={log.id} className={isLight ? 'hover:bg-stone-50 transition-colors' : 'hover:bg-stone-850/50 transition-colors'}>
                        {/* 1. Timestamp */}
                        <td className="p-3.5 font-mono whitespace-nowrap">
                          <div className={`font-bold ${isLight ? 'text-stone-950' : 'text-white'}`}>{log.date}</div>
                          <div className={`text-[10px] ${isLight ? 'text-stone-500' : 'text-stone-500'}`}>{log.time}</div>
                        </td>

                        {/* 2. Student */}
                        <td className="p-3.5">
                          <div className={`font-bold text-sm ${isLight ? 'text-stone-950' : 'text-white'}`}>{log.memberName}</div>
                          <div className={`text-[10px] mt-0.5 ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
                            {log.ageGroup || 'Adults'} · {log.beltRank}
                          </div>
                        </td>

                        {/* 3. Recipient */}
                        <td className="p-3.5">
                          <div className={`font-bold ${isLight ? 'text-stone-950 font-black' : 'text-stone-200'}`}>
                            {log.isYouth ? `👨‍👩‍👧 ${log.recipientName}` : `👤 ${log.recipientName}`}
                          </div>
                          <div className={`font-mono text-[11px] mt-0.5 ${isLight ? 'text-stone-600' : 'text-stone-400'}`}>
                            {log.recipientPhone || log.phone || 'No phone'}
                          </div>
                        </td>

                        {/* 4. Trigger Type */}
                        <td className="p-3.5 whitespace-nowrap">
                          {isOneClass ? (
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${
                              isLight
                                ? 'bg-orange-100 text-orange-950 border border-orange-400'
                                : 'bg-stone-800 text-orange-300 border border-stone-700'
                            }`}>
                              <span>⚠️</span>
                              <span>1 Class Left</span>
                            </span>
                          ) : (
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${
                              isLight
                                ? 'bg-red-100 text-red-950 border border-red-400'
                                : 'bg-red-500/20 text-red-300 border border-red-500/40'
                            }`}>
                              <span>⛔</span>
                              <span>Finished (0 Left)</span>
                            </span>
                          )}
                        </td>

                        {/* 5. Message Content */}
                        <td className="p-3.5 max-w-md">
                          <div className={`text-xs p-2.5 rounded-xl border leading-relaxed font-sans ${
                            isLight ? 'bg-stone-50 border-stone-200 text-stone-800' : 'bg-stone-950 border-stone-800 text-stone-300'
                          }`}>
                            {log.messageText}
                          </div>
                        </td>

                        {/* 6. Process Status */}
                        <td className="p-3.5 text-right whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                            isLight
                              ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            <Check className="w-3 h-3" />
                            <span>Auto Logged</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                  {reminderLogs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-10 text-center text-stone-500 italic">
                        No renewal reminders logged yet. When students reach 1 class left or complete their packages, the automated background engine records them here automatically.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
