import React, { useState, useMemo, useEffect } from 'react';
import { 
  MessageSquare, 
  Search, 
  Download, 
  Trash2, 
  RefreshCw, 
  Copy, 
  Check, 
  ExternalLink, 
  Phone, 
  Clock, 
  Eye, 
  X as CloseIcon, 
  CheckCircle2, 
  Smartphone,
  Bot
} from 'lucide-react';
import { Member, RenewalReminderLog, ReminderTriggerType } from '../types';
import { BeltBadge } from '../utils/bjjBelts';
import { loadReminderLogs, saveReminderLogs } from '../utils/storage';
import { cleanPhoneNumber, getWhatsAppLink, ensureInitialMessageLogsSeeded } from '../utils/messagingLogger';
import { getJordanDateStr } from '../utils/timeUtils';

interface MessageSendingLogsViewProps {
  members?: Member[];
  theme?: 'dark' | 'light';
  onSelectMember?: (member: Member) => void;
}

export const MessageSendingLogsView: React.FC<MessageSendingLogsViewProps> = ({
  members = [],
  theme = 'dark',
  onSelectMember,
}) => {
  const isLight = theme === 'light';

  // State
  const [logs, setLogs] = useState<RenewalReminderLog[]>(() => {
    ensureInitialMessageLogsSeeded();
    return loadReminderLogs();
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLogForModal, setSelectedLogForModal] = useState<RenewalReminderLog | null>(null);
  const [copiedLogId, setCopiedLogId] = useState<string | null>(null);

  // Sync logs periodically or on storage change
  useEffect(() => {
    const handleStorage = () => {
      setLogs(loadReminderLogs());
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const refreshLogs = () => {
    setLogs(loadReminderLogs());
  };

  const handleCopyText = (e: React.MouseEvent, text: string, logId: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedLogId(logId);
    setTimeout(() => {
      setCopiedLogId((prev) => (prev === logId ? null : prev));
    }, 2000);
  };

  const handleDeleteLog = (e: React.MouseEvent, logId: string) => {
    e.stopPropagation();
    const updated = logs.filter((l) => l.id !== logId);
    setLogs(updated);
    saveReminderLogs(updated);
    if (selectedLogForModal?.id === logId) {
      setSelectedLogForModal(null);
    }
  };

  const handleClearAllLogs = () => {
    if (window.confirm('Are you sure you want to clear all automatic message sending logs?')) {
      setLogs([]);
      saveReminderLogs([]);
      setSelectedLogForModal(null);
    }
  };

  // Export logs to CSV
  const handleExportCSV = () => {
    const headers = [
      'Log ID',
      'Date',
      'Time',
      'Channel',
      'Status',
      'Student Name',
      'Student Belt',
      'Division',
      'Recipient Name',
      'Recipient Phone',
      'Is Youth/Parent',
      'Trigger Category',
      'Dispatched By',
      'Message Text'
    ];

    const rows = filteredLogs.map((l) => [
      `"${l.id}"`,
      `"${l.date}"`,
      `"${l.time}"`,
      `"${l.channel || l.sentVia}"`,
      `"${l.status}"`,
      `"${l.memberName}"`,
      `"${l.beltRank}"`,
      `"${l.ageGroup || 'Adults'}"`,
      `"${l.recipientName}"`,
      `"${cleanPhoneNumber(l.recipientPhone || l.phone)}"`,
      l.isYouth ? 'Yes (Parent/Guardian)' : 'No (Direct Student)',
      `"${l.triggerType}"`,
      `"${l.dispatchedBy || 'System'}"`,
      `"${l.messageText.replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `automated_messages_log_${getJordanDateStr()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Logs calculation
  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs;
    const q = searchQuery.toLowerCase();
    return logs.filter((log) => {
      const matchesMember = log.memberName.toLowerCase().includes(q);
      const matchesRecipient = log.recipientName.toLowerCase().includes(q);
      const matchesPhone = (log.recipientPhone || log.phone || '').includes(q);
      const matchesText = log.messageText.toLowerCase().includes(q);
      const matchesBelt = log.beltRank.toLowerCase().includes(q);
      const matchesDate = log.date.includes(q);
      return matchesMember || matchesRecipient || matchesPhone || matchesText || matchesBelt || matchesDate;
    });
  }, [logs, searchQuery]);

  const getTriggerLabel = (type: ReminderTriggerType) => {
    switch (type) {
      case 'one_class_left':
        return { label: '1 Class Left Notice', badgeColor: 'bg-orange-500/20 text-orange-400 border-orange-500/40', icon: '⚠️' };
      case 'subscription_finished':
        return { label: 'Subscription Finished', badgeColor: 'bg-red-500/20 text-red-400 border-red-500/40', icon: '⛔' };
      case 'payment_receipt':
        return { label: 'Payment Receipt', badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', icon: '🧾' };
      case 'checkin_alert':
        return { label: 'Check-In Alert', badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/40', icon: '🥋' };
      case 'promotion_notice':
        return { label: 'Belt Promotion', badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/40', icon: '🏆' };
      case 'welcome_message':
        return { label: 'Welcome Registration', badgeColor: 'bg-teal-500/20 text-teal-400 border-teal-500/40', icon: '👋' };
      case 'custom_broadcast':
      default:
        return { label: 'System Notice', badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/40', icon: '🤖' };
    }
  };

  return (
    <div className="space-y-3 animate-in fade-in duration-200">
      {/* Search & Utility Bar */}
      <div className={`p-2.5 sm:p-3 rounded-2xl border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
        isLight ? 'bg-white border-stone-200' : 'bg-stone-900 border-stone-800'
      }`}>
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search sent message logs by student name, recipient phone, text, or date..."
            className={`w-full pl-10 pr-10 py-2 text-xs rounded-xl border focus:outline-none transition-all ${
              isLight
                ? 'bg-stone-50 border-stone-300 text-stone-900 focus:border-emerald-600 focus:bg-white'
                : 'bg-stone-950 border-stone-800 text-white focus:border-emerald-500 focus:bg-stone-950'
            }`}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white"
            >
              <CloseIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={logs.length === 0}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
              isLight
                ? 'bg-stone-100 hover:bg-stone-200 text-stone-800 border-stone-300'
                : 'bg-stone-800 hover:bg-stone-700 text-stone-200 border-stone-700'
            }`}
          >
            <Download className="w-3.5 h-3.5 text-stone-400" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={refreshLogs}
            className={`p-2 rounded-xl border transition-all cursor-pointer shadow-sm active:scale-95 ${
              isLight
                ? 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-300'
                : 'bg-stone-800 hover:bg-stone-700 text-stone-300 border-stone-700'
            }`}
            title="Refresh Logs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {logs.length > 0 && (
            <button
              type="button"
              onClick={handleClearAllLogs}
              className={`p-2 rounded-xl border transition-all cursor-pointer shadow-sm active:scale-95 ${
                isLight
                  ? 'bg-stone-100 hover:bg-red-100 text-stone-600 hover:text-red-700 border-stone-300'
                  : 'bg-stone-800 hover:bg-red-950 text-stone-400 hover:text-red-400 border-stone-700'
              }`}
              title="Clear All Logs"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Automated Messages Logs Table */}
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
                <th className="p-3.5">Channel</th>
                <th className="p-3.5">Student & Belt</th>
                <th className="p-3.5">Recipient & Contact</th>
                <th className="p-3.5">Reason / Trigger</th>
                <th className="p-3.5">Message Content</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className={`divide-y font-sans ${isLight ? 'divide-stone-200' : 'divide-stone-800/60'}`}>
              {filteredLogs.map((log) => {
                const triggerInfo = getTriggerLabel(log.triggerType);
                const isWhatsApp = log.channel === 'whatsapp' || log.sentVia === 'whatsapp';
                const isSMS = log.channel === 'sms' || log.sentVia === 'sms';
                const cleanPhone = cleanPhoneNumber(log.recipientPhone || log.phone);

                const mObj = members.find((m) => m.id === log.memberId);
                const logStripes = log.stripes !== undefined ? log.stripes : (mObj?.stripes ?? 0);
                const logBelt = (log.beltRank || mObj?.beltRank || 'White') as any;

                return (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLogForModal(log)}
                    className={`cursor-pointer transition-colors ${
                      isLight ? 'hover:bg-stone-50' : 'hover:bg-stone-850/60'
                    }`}
                  >
                    {/* 1. Timestamp */}
                    <td className="p-3.5 font-mono whitespace-nowrap">
                      <div className={`font-bold ${isLight ? 'text-stone-950' : 'text-white'}`}>
                        {log.date}
                      </div>
                      <div className="text-[10px] text-stone-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-stone-500" />
                        <span>{log.time}</span>
                      </div>
                    </td>

                    {/* 2. Channel Badge */}
                    <td className="p-3.5 whitespace-nowrap">
                      {isWhatsApp ? (
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 inline-flex items-center gap-1.5 shadow-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>WhatsApp</span>
                        </span>
                      ) : isSMS ? (
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-black uppercase tracking-wider bg-sky-500/20 text-sky-400 border border-sky-500/40 inline-flex items-center gap-1.5 shadow-xs">
                          <Smartphone className="w-3 h-3 text-sky-400" />
                          <span>SMS</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 inline-flex items-center gap-1.5">
                          <span>🤖 Auto Send</span>
                        </span>
                      )}
                    </td>

                    {/* 3. Student & Belt */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <div className={`font-bold text-sm ${isLight ? 'text-stone-950' : 'text-white'}`}>
                          {log.memberName}
                        </div>
                      </div>
                      <div className="mt-1">
                        <BeltBadge belt={logBelt} stripes={logStripes} size="sm" />
                      </div>
                    </td>

                    {/* 4. Recipient & Contact */}
                    <td className="p-3.5">
                      <div className={`font-bold ${isLight ? 'text-stone-950' : 'text-stone-200'}`}>
                        {log.isYouth ? `👨‍👩‍👧 ${log.recipientName}` : `👤 ${log.recipientName}`}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-stone-400 mt-0.5">
                        <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>{cleanPhone || log.recipientPhone || 'No Phone'}</span>
                      </div>
                    </td>

                    {/* 5. Category / Trigger */}
                    <td className="p-3.5 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border inline-flex items-center gap-1 ${triggerInfo.badgeColor}`}>
                        <span>{triggerInfo.icon}</span>
                        <span>{triggerInfo.label}</span>
                      </span>
                    </td>

                    {/* 6. Message Content Preview */}
                    <td className="p-3.5 max-w-xs sm:max-w-md">
                      <div className={`text-xs p-2.5 rounded-xl border leading-relaxed line-clamp-2 ${
                        isLight ? 'bg-stone-50 border-stone-200 text-stone-800' : 'bg-stone-950 border-stone-800/80 text-stone-300'
                      }`}>
                        {log.messageText}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-stone-500 font-mono mt-1 px-1">
                        <span>{log.characterCount || log.messageText.length} characters</span>
                        <span>Sent via: {log.dispatchedBy || 'System Automation'}</span>
                      </div>
                    </td>

                    {/* 7. Status */}
                    <td className="p-3.5 text-center whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        <Check className="w-3 h-3" />
                        <span>Sent Automatically</span>
                      </span>
                    </td>

                    {/* 8. Quick Actions */}
                    <td className="p-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {/* Copy Message */}
                        <button
                          type="button"
                          onClick={(e) => handleCopyText(e, log.messageText, log.id)}
                          className={`p-2 rounded-lg border transition-all cursor-pointer ${
                            copiedLogId === log.id
                              ? 'bg-emerald-600 text-white border-emerald-500'
                              : isLight
                              ? 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-300'
                              : 'bg-stone-800 hover:bg-stone-700 text-stone-300 border-stone-700'
                          }`}
                          title="Copy message content"
                        >
                          {copiedLogId === log.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>

                        {/* WhatsApp Open Button */}
                        <a
                          href={getWhatsAppLink(cleanPhone, log.messageText)}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-lg border border-emerald-500/40 transition-all"
                          title="Open in WhatsApp"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>

                        {/* View Details Drawer */}
                        <button
                          type="button"
                          onClick={() => setSelectedLogForModal(log)}
                          className="p-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg border border-stone-700 transition-all cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Log */}
                        <button
                          type="button"
                          onClick={(e) => handleDeleteLog(e, log.id)}
                          className="p-2 bg-stone-800 hover:bg-red-950 text-stone-400 hover:text-red-400 rounded-lg border border-stone-700 transition-all cursor-pointer"
                          title="Delete Entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-stone-500 italic space-y-2">
                    <MessageSquare className="w-8 h-8 mx-auto text-stone-600 opacity-60" />
                    <p className="text-sm font-medium">No automated message logs found.</p>
                    <p className="text-xs text-stone-600">
                      When automated renewal notices, receipts, or WhatsApp messages are sent by the system, their complete records appear here.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          MODAL: FULL MESSAGE DISPATCH DETAILS DRAWER
          ========================================================================= */}
      {selectedLogForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className={`w-full max-w-2xl rounded-3xl border shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto ${
            isLight ? 'bg-white border-stone-200 text-stone-900' : 'bg-stone-900 border-stone-800 text-white'
          }`}>
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-stone-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-1 text-[10px] font-mono font-black uppercase rounded-lg border bg-emerald-500/20 text-emerald-400 border-emerald-500/40">
                    {selectedLogForModal.channel === 'whatsapp' || selectedLogForModal.sentVia === 'whatsapp' ? 'WhatsApp Message' : 'SMS Message'}
                  </span>
                  <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-800">
                    Sent Automatically
                  </span>
                </div>
                <h3 className="text-lg font-black text-white">
                  Automated Message Audit Details
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedLogForModal(null)}
                className="p-2 text-stone-400 hover:text-white rounded-xl hover:bg-stone-800 transition-colors cursor-pointer"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Recipient & Student Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Student Details Card */}
              <div className="p-4 rounded-2xl bg-stone-950/70 border border-stone-800 space-y-2">
                <span className="text-[10px] font-bold uppercase text-stone-400 tracking-wider block">
                  Student Information
                </span>
                <div className="space-y-1">
                  <div className="text-base font-bold text-white">{selectedLogForModal.memberName}</div>
                  <div className="text-stone-400">Division: <strong className="text-stone-200">{selectedLogForModal.ageGroup || 'Adults'}</strong></div>
                  <div className="pt-1">
                    {(() => {
                      const modalM = members.find((m) => m.id === selectedLogForModal.memberId);
                      const mStripes = selectedLogForModal.stripes !== undefined ? selectedLogForModal.stripes : (modalM?.stripes ?? 0);
                      const mBelt = (selectedLogForModal.beltRank || modalM?.beltRank || 'White') as any;
                      return <BeltBadge belt={mBelt} stripes={mStripes} size="sm" />;
                    })()}
                  </div>
                </div>
              </div>

              {/* Recipient Contact Card */}
              <div className="p-4 rounded-2xl bg-stone-950/70 border border-stone-800 space-y-2">
                <span className="text-[10px] font-bold uppercase text-stone-400 tracking-wider block">
                  Recipient Contact
                </span>
                <div className="space-y-1">
                  <div className="text-sm font-bold text-white">
                    {selectedLogForModal.isYouth ? `👨‍👩‍👧 ${selectedLogForModal.recipientName}` : `👤 ${selectedLogForModal.recipientName}`}
                  </div>
                  <div className="font-mono text-emerald-400 flex items-center gap-1.5 pt-1">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{cleanPhoneNumber(selectedLogForModal.recipientPhone || selectedLogForModal.phone)}</span>
                  </div>
                  <div className="text-[11px] text-stone-400">
                    Timestamp: <strong className="text-stone-300 font-mono">{selectedLogForModal.date} at {selectedLogForModal.time}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Full Message Text */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[10px] font-bold uppercase text-stone-400 tracking-wider">
                  Full Dispatched Message Text
                </span>
                <span className="font-mono text-[11px] text-stone-400">
                  {selectedLogForModal.characterCount || selectedLogForModal.messageText.length} characters
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 text-stone-200 text-xs font-sans whitespace-pre-wrap leading-relaxed">
                {selectedLogForModal.messageText}
              </div>
            </div>

            {/* Dispatch Route Audit Information */}
            <div className="p-3.5 rounded-xl bg-stone-950/50 border border-stone-800/80 text-[11px] text-stone-400 font-mono space-y-1">
              <div>Log Reference ID: <strong className="text-stone-300">{selectedLogForModal.id}</strong></div>
              <div>Dispatched by: <strong className="text-emerald-400">{selectedLogForModal.dispatchedBy || 'System Automation Dispatcher'}</strong></div>
              <div>Gateway: <strong className="text-stone-300">{selectedLogForModal.deliveryDetails?.platform || 'Automated Messaging Service'}</strong></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
