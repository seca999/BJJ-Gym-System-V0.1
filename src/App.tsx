import React, { useState, useEffect } from 'react';
import { Navbar, ActiveTab } from './components/Navbar';
import { HomeWelcomingView } from './components/HomeWelcomingView';
import { MemberList } from './components/MemberList';
import { PaymentsLedgerView } from './components/PaymentsLedgerView';
import { AttendanceLogView } from './components/AttendanceLogView';
import { RenewalsAlertsView } from './components/RenewalsAlertsView';
import { CoachesDirectoryView } from './components/CoachesDirectoryView';
import { PromotionsTrackerView } from './components/PromotionsTrackerView';
import { ClassCheckInView } from './components/ClassCheckInView';
import { ScheduleBoardView } from './components/ScheduleBoardView';
import { SubscriptionPlansModal } from './components/SubscriptionPlansModal';
import { DatabaseSettingsModal } from './components/DatabaseSettingsModal';
import { GymBrandingModal } from './components/GymBrandingModal';
import { SystemSettingsModal } from './components/SystemSettingsModal';
import { LoginPage } from './components/LoginPage';
import { NewMemberModal } from './components/NewMemberModal';
import { RecordPaymentModal } from './components/RecordPaymentModal';
import { MemberProfileModal } from './components/MemberProfileModal';
import { ReceiptModal } from './components/ReceiptModal';
import { 
  Member, 
  PaymentRecord, 
  AttendanceRecord, 
  ClassSession, 
  GymSettings,
  ClassCategory,
  Coach,
  TimetableConfig,
  SubscriptionPlan,
  IBJJFTransferRecord,
  SystemUser
} from './types';
import { getSessionUser, clearSessionUser, recordSessionActivity, isSessionExpired } from './utils/authStorage';
import { 
  loadMembers, 
  saveMembers, 
  loadPayments, 
  savePayments, 
  loadAttendance, 
  saveAttendance, 
  loadClasses, 
  saveClasses, 
  loadSettings, 
  saveSettings,
  loadCoaches,
  saveCoaches,
  loadTimetableConfig,
  saveTimetableConfig,
  loadSubscriptionPlans,
  saveSubscriptionPlans,
  resetAllDataToDefault,
  factoryResetDataErase,
  loadSampleDemoData,
  exportBackupJSON,
  importBackupJSON
} from './utils/storage';
import { restoreDataFromDiskDatabase } from './utils/databaseManager';
import { INITIAL_SUBSCRIPTION_PLANS } from './data/sampleData';
import { evaluateAndAutoTransferMembers } from './utils/ibjjfAgeManager';
import { Sparkles, X as CloseIcon, Award } from 'lucide-react';

export default function App() {
  // App state
  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [settings, setSettings] = useState<GymSettings>(loadSettings());
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [timetableConfig, setTimetableConfig] = useState<TimetableConfig>(loadTimetableConfig());
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [targetCheckInClassId, setTargetCheckInClassId] = useState<string | null>(null);
  const [transferNotifications, setTransferNotifications] = useState<IBJJFTransferRecord[]>([]);

  const handleNavigateFromHome = (tab: ActiveTab, classId?: string) => {
    if (classId) {
      setTargetCheckInClassId(classId);
    }
    setActiveTab(tab);
  };

  // Theme state ('dark' | 'light')
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('gym_app_theme');
      return saved === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try {
      localStorage.setItem('gym_app_theme', next);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('theme-light');
      document.documentElement.classList.remove('theme-dark');
    } else {
      document.documentElement.classList.add('theme-dark');
      document.documentElement.classList.remove('theme-light');
    }
  }, [theme]);

  // User session state & Security auto-logout (10 minutes)
  const [currentUser, setCurrentUser] = useState<SystemUser | null>(() => getSessionUser());
  const [securityLogoutMessage, setSecurityLogoutMessage] = useState<string | null>(null);

  // Modal states
  const [isNewMemberModalOpen, setIsNewMemberModalOpen] = useState(false);
  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState(false);
  const [isBrandingModalOpen, setIsBrandingModalOpen] = useState(false);
  const [isSubscriptionPlansModalOpen, setIsSubscriptionPlansModalOpen] = useState(false);
  const [isDatabaseModalOpen, setIsDatabaseModalOpen] = useState(false);
  const [isSystemSettingsModalOpen, setIsSystemSettingsModalOpen] = useState(false);
  const [paymentPreselectedMemberId, setPaymentPreselectedMemberId] = useState<string | undefined>(undefined);
  const [selectedProfileMember, setSelectedProfileMember] = useState<Member | null>(null);
  const [receiptPayment, setReceiptPayment] = useState<PaymentRecord | null>(null);

  const handleLogout = (customMessage?: string) => {
    clearSessionUser();
    setCurrentUser(null);
    if (customMessage) {
      setSecurityLogoutMessage(customMessage);
    }
  };

  // 10-Minute Security Auto-Logout System
  useEffect(() => {
    if (!currentUser) return;

    // Immediately stamp activity
    recordSessionActivity();

    let lastRecorded = Date.now();
    const handleActivity = () => {
      const now = Date.now();
      // Throttle localStorage writes to once every 2 seconds
      if (now - lastRecorded > 2000) {
        lastRecorded = now;
        recordSessionActivity();
      }
    };

    const userEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    userEvents.forEach((ev) => window.addEventListener(ev, handleActivity, { passive: true }));

    // Periodic check every 3 seconds for 10-minute session expiry
    const expiryInterval = setInterval(() => {
      if (isSessionExpired()) {
        handleLogout('Your session was automatically logged out after 10 minutes of inactivity for security.');
      }
    }, 3000);

    return () => {
      userEvents.forEach((ev) => window.removeEventListener(ev, handleActivity));
      clearInterval(expiryInterval);
    };
  }, [currentUser]);

  // Initialize data on mount
  useEffect(() => {
    const loadedRawMembers = loadMembers();
    // Run IBJJF automated age category check (Kids -> Teens -> Adults)
    const { updatedMembers, transferEvents } = evaluateAndAutoTransferMembers(loadedRawMembers);
    if (transferEvents.length > 0) {
      saveMembers(updatedMembers);
      setMembers(updatedMembers);
      setTransferNotifications(transferEvents);
    } else {
      setMembers(loadedRawMembers);
    }

    setPayments(loadPayments());
    setAttendance(loadAttendance());
    setClasses(loadClasses());
    setSettings(loadSettings());
    setCoaches(loadCoaches());
    setTimetableConfig(loadTimetableConfig());
    setSubscriptionPlans(loadSubscriptionPlans());

    // Silent startup sync from disk SQLite DB to ensure file-based changes (e.g. deletions) are reflected
    restoreDataFromDiskDatabase().then((res) => {
      if (res.success) {
        const freshMembers = loadMembers();
        const { updatedMembers: currentMembers } = evaluateAndAutoTransferMembers(freshMembers);
        setMembers(currentMembers);
        setPayments(loadPayments());
        setAttendance(loadAttendance());
        setClasses(loadClasses());
        setSettings(loadSettings());
        setCoaches(loadCoaches());
        setTimetableConfig(loadTimetableConfig());
        setSubscriptionPlans(loadSubscriptionPlans());
      }
    }).catch(() => {});
  }, []);

  // Sync to local storage and verify IBJJF transitions
  const updateMembersState = (newMembers: Member[]) => {
    const { updatedMembers, transferEvents } = evaluateAndAutoTransferMembers(newMembers);
    setMembers(updatedMembers);
    saveMembers(updatedMembers);
    if (transferEvents.length > 0) {
      setTransferNotifications((prev) => [...transferEvents, ...prev]);
    }
  };

  const updatePaymentsState = (newPayments: PaymentRecord[]) => {
    setPayments(newPayments);
    savePayments(newPayments);
  };

  const updateAttendanceState = (newAttendance: AttendanceRecord[]) => {
    setAttendance(newAttendance);
    saveAttendance(newAttendance);
  };

  const updateCoachesState = (newCoaches: Coach[]) => {
    setCoaches(newCoaches);
    saveCoaches(newCoaches);
  };

  const updateTimetableState = (newConfig: TimetableConfig) => {
    setTimetableConfig(newConfig);
    saveTimetableConfig(newConfig);
  };

  const updateSubscriptionPlansState = (newPlans: SubscriptionPlan[]) => {
    setSubscriptionPlans(newPlans);
    saveSubscriptionPlans(newPlans);
  };

  const handleSaveSubscriptionPlan = (savedPlan: SubscriptionPlan) => {
    const existingIndex = subscriptionPlans.findIndex((p) => p.id === savedPlan.id);
    let updated: SubscriptionPlan[];
    if (existingIndex >= 0) {
      updated = subscriptionPlans.map((p) => (p.id === savedPlan.id ? savedPlan : p));
    } else {
      updated = [savedPlan, ...subscriptionPlans];
    }
    updateSubscriptionPlansState(updated);
  };

  const handleDeleteSubscriptionPlan = (planId: string) => {
    const updated = subscriptionPlans.filter((p) => p.id !== planId);
    updateSubscriptionPlansState(updated);
  };

  const handleResetSubscriptionPlans = () => {
    updateSubscriptionPlansState(INITIAL_SUBSCRIPTION_PLANS);
  };

  const handleAddCoach = (newCoach: Coach) => {
    const updated = [...coaches, newCoach];
    updateCoachesState(updated);
  };

  const handleUpdateCoach = (updatedCoach: Coach) => {
    const updated = coaches.map((c) => (c.id === updatedCoach.id ? updatedCoach : c));
    updateCoachesState(updated);
  };

  const handleDeleteCoach = (coachId: string) => {
    const updated = coaches.map((c) =>
      c.id === coachId ? { ...c, isDeleted: true, active: false } : c
    );
    updateCoachesState(updated);

    // Unassign deleted coach from any scheduled classes
    const updatedClasses = classes.map((cls) => {
      if (cls.headCoachId === coachId) {
        return {
          ...cls,
          headCoachId: undefined,
          headCoachName: undefined,
          coach: 'Unassigned Coach',
        };
      }
      return cls;
    });
    updateClassesState(updatedClasses);
  };

  const updateClassesState = (newClasses: ClassSession[]) => {
    setClasses(newClasses);
    saveClasses(newClasses);
  };

  const handleSaveClass = (savedClass: ClassSession) => {
    const existingIndex = classes.findIndex((c) => c.id === savedClass.id);
    let updated: ClassSession[];
    if (existingIndex >= 0) {
      updated = classes.map((c) => (c.id === savedClass.id ? savedClass : c));
    } else {
      updated = [...classes, savedClass];
    }
    updateClassesState(updated);
  };

  const handleDeleteClass = (classId: string) => {
    const classToDelete = classes.find((c) => c.id === classId);
    const updated = classes.filter((c) => c.id !== classId);
    updateClassesState(updated);

    // Also clean up timetable cells referencing this class if any
    if (classToDelete) {
      const updatedCells = timetableConfig.cells.filter(
        (cell) => cell.title !== classToDelete.title
      );
      if (updatedCells.length !== timetableConfig.cells.length) {
        updateTimetableState({
          ...timetableConfig,
          cells: updatedCells,
        });
      }
    }
  };

  const updateSettingsState = (newSettings: GymSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  // --- Handlers ---

  // 1. Register Client
  const handleRegisterMember = (
    newMember: Member,
    initialPaymentData?: Omit<PaymentRecord, 'id' | 'memberId' | 'memberName'>
  ) => {
    const updatedMembers = [newMember, ...members];
    updateMembersState(updatedMembers);

    if (initialPaymentData) {
      const newPayment: PaymentRecord = {
        ...initialPaymentData,
        id: 'pay-' + Date.now(),
        memberId: newMember.id,
        memberName: newMember.fullName,
      };
      const updatedPayments = [newPayment, ...payments];
      updatePaymentsState(updatedPayments);
    }
  };

  // 2. Perform Attendance Check-In
  const handlePerformCheckIn = (
    memberId: string,
    className: string,
    coach: string,
    category?: ClassCategory,
    customDateStr?: string
  ): { success: boolean; message: string; remainingAfter: number } => {
    const member = members.find((m) => m.id === memberId);
    if (!member) return { success: false, message: 'Member not found', remainingAfter: 0 };

    const now = new Date();
    const dateStr = customDateStr || now.toISOString().split('T')[0];
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const sessionDateObj = new Date(dateStr + 'T00:00:00');
    const dayOfWeek = dayNames[sessionDateObj.getDay()];

    let remainingAfter = member.classesRemaining;

    // Deduct class if class pack or single drop in
    if (member.membershipType === 'class_pack' || member.membershipType === 'single_dropin') {
      remainingAfter = member.classesRemaining - 1;
    }

    // Determine status
    let newStatus = member.status;
    if (member.membershipType === 'class_pack' || member.membershipType === 'single_dropin') {
      if (remainingAfter <= 0) {
        newStatus = 'expired';
      } else if (remainingAfter <= settings.lowClassWarningThreshold) {
        newStatus = 'warning';
      } else {
        newStatus = 'active';
      }
    }

    const updatedMember: Member = {
      ...member,
      classesRemaining: remainingAfter,
      totalClassesAttended: member.totalClassesAttended + 1,
      lastAttendedDate: dateStr,
      status: newStatus,
    };

    const resolvedCategory: ClassCategory =
      category ||
      (className.toLowerCase().includes('kid')
        ? 'Kids'
        : className.toLowerCase().includes('teen')
        ? 'Teens'
        : 'Adults');

    const newAttendanceRecord: AttendanceRecord = {
      id: 'att-' + Date.now(),
      memberId: member.id,
      memberName: member.fullName,
      beltRank: member.beltRank,
      stripes: member.stripes,
      date: dateStr,
      time: timeStr,
      className,
      classCategory: resolvedCategory,
      dayOfWeek,
      coach,
      classesRemainingAfter: remainingAfter,
    };

    // Update state
    updateMembersState(members.map((m) => (m.id === member.id ? updatedMember : m)));
    updateAttendanceState([newAttendanceRecord, ...attendance]);

    if (selectedProfileMember?.id === member.id) {
      setSelectedProfileMember(updatedMember);
    }

    const isDebt = remainingAfter < 0;
    const debtCount = Math.abs(remainingAfter);

    return {
      success: true,
      message: isDebt
        ? `Checked in ${member.fullName} to ${className} (Debt: ${debtCount} class${debtCount > 1 ? 'es' : ''} — will be deducted upon renewal)`
        : `Checked in ${member.fullName} to ${className} (${remainingAfter} classes left)`,
      remainingAfter,
    };
  };

  // 3. Undo Attendance Check-In (Restores class balance)
  const handleUndoCheckIn = (attendanceId: string) => {
    const record = attendance.find((a) => a.id === attendanceId);
    if (!record) return;

    // Find member
    const member = members.find((m) => m.id === record.memberId);
    if (member) {
      const restoredRemaining =
        member.classesRemaining === -1 ? -1 : member.classesRemaining + 1;
      const restoredTotalAttended = Math.max(0, member.totalClassesAttended - 1);

      const updatedMember: Member = {
        ...member,
        classesRemaining: restoredRemaining,
        totalClassesAttended: restoredTotalAttended,
        status:
          member.membershipType === 'class_pack' && restoredRemaining <= 0
            ? 'expired'
            : member.membershipType === 'class_pack' && restoredRemaining <= 2
            ? 'warning'
            : 'active',
      };

      updateMembersState(members.map((m) => (m.id === member.id ? updatedMember : m)));
      if (selectedProfileMember?.id === member.id) {
        setSelectedProfileMember(updatedMember);
      }
    }

    // Remove attendance record
    updateAttendanceState(attendance.filter((a) => a.id !== attendanceId));
  };

  // 4. Record Payment & Renew Classes (Deducts any debt automatically)
  const handleRecordPayment = (
    paymentData: Omit<PaymentRecord, 'id' | 'receiptNumber'>,
    classesToAdd: number,
    newEndDate?: string
  ) => {
    const receiptNum = `REC-${Date.now().toString().slice(-6)}`;
    const newPayment: PaymentRecord = {
      ...paymentData,
      id: 'pay-' + Date.now(),
      receiptNumber: receiptNum,
    };

    // Update student's class balance and status
    const targetMember = members.find((m) => m.id === paymentData.memberId);
    if (targetMember) {
      let newClassesRemaining = targetMember.classesRemaining;
      let newMembershipType = targetMember.membershipType;

      if (classesToAdd === -1) {
        // Unlimited
        newClassesRemaining = -1;
        newMembershipType = 'monthly_unlimited';
      } else {
        // Add credits to current balance (reconciling negative debt)
        const base = targetMember.classesRemaining === -1 ? 0 : targetMember.classesRemaining;
        newClassesRemaining = base + classesToAdd;
        newMembershipType = 'class_pack';
      }

      const updatedMember: Member = {
        ...targetMember,
        classesRemaining: newClassesRemaining,
        classesTotal:
          classesToAdd === -1
            ? -1
            : targetMember.classesTotal === -1
            ? classesToAdd
            : targetMember.classesTotal + classesToAdd,
        membershipType: newMembershipType,
        membershipStartDate: paymentData.date || targetMember.membershipStartDate,
        membershipEndDate: newEndDate || targetMember.membershipEndDate,
        status: newClassesRemaining === -1 || newClassesRemaining > 0 ? 'active' : 'expired',
      };

      updateMembersState(members.map((m) => (m.id === targetMember.id ? updatedMember : m)));

      if (selectedProfileMember?.id === targetMember.id) {
        setSelectedProfileMember(updatedMember);
      }
    }

    const updatedPayments = [newPayment, ...payments];
    updatePaymentsState(updatedPayments);

    // Open receipt modal to show customer receipt
    setReceiptPayment(newPayment);
  };

  // 5. Update Member Profile Details
  const handleUpdateMember = (updated: Member) => {
    updateMembersState(members.map((m) => (m.id === updated.id ? updated : m)));
    setSelectedProfileMember(updated);
  };

  // 5b. Soft-delete / Archive Member Profile
  const handleDeleteMember = (memberId: string) => {
    const updated = members.map((m) =>
      m.id === memberId ? { ...m, isDeleted: true, status: 'expired' as const } : m
    );
    updateMembersState(updated);
    if (selectedProfileMember?.id === memberId) {
      setSelectedProfileMember(null);
    }
  };

  // 6. Quick Payment Modal trigger with member pre-selected
  const handleOpenPaymentForMember = (memberId: string) => {
    setPaymentPreselectedMemberId(memberId);
    setIsRecordPaymentModalOpen(true);
  };

  // 7. Quick Check-In shortcut from roster/card
  const handleQuickCheckInFromRoster = (member: Member) => {
    const defaultClass = classes[0]?.title || 'Evening Fundamentals (Gi)';
    const defaultCoach = classes[0]?.coach || 'Professor Lucas';

    if (member.membershipType === 'class_pack' && member.classesRemaining <= 0) {
      const renew = window.confirm(
        `${member.fullName} has 0 classes remaining from their membership!\n\nWould you like to open the payment renewal screen now?`
      );
      if (renew) {
        handleOpenPaymentForMember(member.id);
      }
      return;
    }

    handlePerformCheckIn(member.id, defaultClass, defaultCoach);
    alert(`Checked in ${member.fullName} to ${defaultClass}!`);
  };

  // 8. Data Export / Import / Reset Handlers
  const handleExportData = () => {
    const jsonStr = exportBackupJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bjj_gym_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importBackupJSON(content);
      if (success) {
        setMembers(loadMembers());
        setPayments(loadPayments());
        setAttendance(loadAttendance());
        setClasses(loadClasses());
        setSettings(loadSettings());
        setCoaches(loadCoaches());
        setTimetableConfig(loadTimetableConfig());
        alert('Gym data successfully restored from backup!');
      } else {
        alert('Failed to parse backup file. Please check file format.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleLoadSampleData = async () => {
    await loadSampleDemoData();
    const freshMembers = loadMembers();
    const { updatedMembers } = evaluateAndAutoTransferMembers(freshMembers);
    setMembers(updatedMembers);
    setPayments(loadPayments());
    setAttendance(loadAttendance());
    setClasses(loadClasses());
    setSettings(loadSettings());
    setCoaches(loadCoaches());
    setTimetableConfig(loadTimetableConfig());
    setSubscriptionPlans(loadSubscriptionPlans());
    alert('Dummy test data loaded successfully!\n\n21 students (10 kids, 4 teens, 7 adults), 5 coaches, 9 classes, attendance check-ins, and payments are now active.');
  };

  const handleFactoryResetData = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to completely erase all data (reset to 0 records)?\n\nThis will purge all members, attendance, classes, and payments.'
    );
    if (!confirmed) return;

    await factoryResetDataErase();
    setMembers([]);
    setPayments([]);
    setAttendance([]);
    setClasses([]);
    setCoaches([]);
    setSubscriptionPlans(loadSubscriptionPlans());
    setTimetableConfig(loadTimetableConfig());
    setSettings(loadSettings());
    alert('All data has been erased to 0 records.');
  };

  // Render Login Page if user is not authenticated
  if (!currentUser) {
    return (
      <LoginPage
        settings={settings}
        onLoginSuccess={(user) => {
          setSecurityLogoutMessage(null);
          setCurrentUser(user);
        }}
        securityMessage={securityLogoutMessage}
      />
    );
  }

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-150 ${
      theme === 'light' 
        ? 'bg-stone-100 text-stone-900 selection:bg-red-600 selection:text-white' 
        : 'bg-stone-950 text-stone-100 selection:bg-red-600 selection:text-white'
    }`}>
      {/* Top Navbar Header with Logo, Slogan, and Coaches Tab */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        members={members}
        payments={payments}
        attendance={attendance}
        settings={settings}
        coachesCount={coaches.length}
        theme={theme}
        onToggleTheme={toggleTheme}
        currentUser={currentUser}
        onOpenSystemSettings={() => setIsSystemSettingsModalOpen(true)}
        onLogout={handleLogout}
        onOpenNewMember={() => setIsNewMemberModalOpen(true)}
        onOpenPayment={() => {
          setPaymentPreselectedMemberId(undefined);
          setIsRecordPaymentModalOpen(true);
        }}
        onOpenBranding={() => setIsBrandingModalOpen(true)}
        onOpenSubscriptionPlans={() => setIsSubscriptionPlansModalOpen(true)}
        onOpenDatabase={() => setIsDatabaseModalOpen(true)}
        onResetData={handleLoadSampleData}
        onExportData={handleExportData}
        onImportData={handleImportData}
      />

      {/* Main Container - Expanded to utilize full screen space */}
      <main className="flex-1 w-full max-w-[1920px] mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-6">
        {/* IBJJF Automatic Category Transfer Notification Banner */}
        {transferNotifications.length > 0 && (
          <div className="mb-4 space-y-2">
            {transferNotifications.map((notif, idx) => (
              <div
                key={idx}
                className="p-3.5 bg-gradient-to-r from-amber-950/80 via-stone-900 to-amber-950/80 border border-amber-600/60 rounded-xl flex items-center justify-between text-xs text-amber-200 shadow-md animate-in fade-in slide-in-from-top-2 duration-200"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-600 text-stone-950 flex items-center justify-center font-bold shrink-0">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-white text-xs flex items-center gap-1.5">
                      <span>IBJJF Automated Category Graduation</span>
                      <span className="text-[10px] bg-amber-600 text-stone-950 font-black px-1.5 py-0.2 rounded">
                        Age {notif.age}
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-200/90 mt-0.5">
                      <strong>{notif.memberName}</strong> has reached age {notif.age} and was automatically transferred from <strong>{notif.previousCategory}</strong> to <strong>{notif.newCategory}</strong> ({notif.reason}).
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTransferNotifications((prev) => prev.filter((_, i) => i !== idx))}
                  className="p-1 rounded-md text-stone-400 hover:text-white hover:bg-stone-800 transition-colors ml-2 shrink-0"
                  title="Dismiss notification"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Tab 0: Welcoming Home Dashboard & Today's Schedule */}
        {activeTab === 'home' && (
          <HomeWelcomingView
            settings={settings}
            classes={classes}
            timetableConfig={timetableConfig}
            members={members}
            coaches={coaches}
            attendance={attendance}
            onNavigateTab={handleNavigateFromHome}
            onSelectMember={(m) => setSelectedProfileMember(m)}
          />
        )}

        {/* Tab 1: Directory (Students & Coaches) */}
        {activeTab === 'members' && (
          <MemberList
            members={members}
            coaches={coaches}
            attendance={attendance}
            classes={classes}
            onSelectMember={(m) => setSelectedProfileMember(m)}
            onOpenPaymentForMember={handleOpenPaymentForMember}
            onOpenNewMember={() => setIsNewMemberModalOpen(true)}
            onUpdateMember={handleUpdateMember}
            onAddCoach={handleAddCoach}
            onUpdateCoach={handleUpdateCoach}
            onDeleteCoach={handleDeleteCoach}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {/* Tab: Class Check-In & Mat Attendance */}
        {activeTab === 'checkin' && (
          <ClassCheckInView
            classes={classes}
            timetableConfig={timetableConfig}
            members={members}
            attendance={attendance}
            coaches={coaches}
            onCheckIn={handlePerformCheckIn}
            onUndoCheckIn={handleUndoCheckIn}
            onSaveClass={handleSaveClass}
            onDeleteClass={handleDeleteClass}
            onSelectMember={(m) => setSelectedProfileMember(m)}
            onOpenPaymentForMember={handleOpenPaymentForMember}
            onOpenSubscriptionPlans={() => setIsSubscriptionPlansModalOpen(true)}
            initialClassId={targetCheckInClassId}
          />
        )}

        {/* Tab: Academy Timetable & Mat Schedule Board */}
        {activeTab === 'schedule' && (
          <ScheduleBoardView
            config={timetableConfig}
            gymSettings={settings}
            classes={classes}
            coaches={coaches}
            theme={theme}
            onUpdateConfig={updateTimetableState}
            onSaveClass={handleSaveClass}
            onDeleteClass={handleDeleteClass}
          />
        )}

        {/* Tab: Promotions & Belt Progression Directory */}
        {activeTab === 'promotions' && (
          <PromotionsTrackerView
            members={members}
            coaches={coaches}
            onUpdateMember={handleUpdateMember}
            onUpdateCoach={handleUpdateCoach}
            defaultCoachName={settings.defaultCoach || 'Professor Lucas Silva'}
          />
        )}

        {/* Tab 3: Payments & Financial Ledger / Coach Salaries */}
        {activeTab === 'payments' && (
          <PaymentsLedgerView
            payments={payments}
            members={members}
            coaches={coaches}
            attendance={attendance}
            classes={classes}
            onOpenPayment={() => {
              setPaymentPreselectedMemberId(undefined);
              setIsRecordPaymentModalOpen(true);
            }}
            onViewReceipt={(p) => setReceiptPayment(p)}
            onAddCoach={handleAddCoach}
            onUpdateCoach={handleUpdateCoach}
            onDeleteCoach={handleDeleteCoach}
          />
        )}

        {/* Tab 5: Class Balances & Renewals Center */}
        {activeTab === 'renewals' && (
          <RenewalsAlertsView
            members={members}
            onOpenPaymentForMember={handleOpenPaymentForMember}
            onSelectMember={(m) => setSelectedProfileMember(m)}
          />
        )}
      </main>

      {/* Modals & Dialogs */}

      {/* 1. Register New Student Modal */}
      <NewMemberModal
        isOpen={isNewMemberModalOpen}
        onClose={() => setIsNewMemberModalOpen(false)}
        onRegister={handleRegisterMember}
        subscriptionPlans={subscriptionPlans}
        currencySymbol={settings.currencySymbol}
      />

      {/* 2. Record Payment & Class Credit Modal */}
      <RecordPaymentModal
        isOpen={isRecordPaymentModalOpen}
        onClose={() => setIsRecordPaymentModalOpen(false)}
        members={members}
        preSelectedMemberId={paymentPreselectedMemberId}
        subscriptionPlans={subscriptionPlans}
        currencySymbol={settings.currencySymbol}
        onRecordPayment={handleRecordPayment}
      />

      {/* 3. Member Detailed Profile Drawer / Modal */}
      <MemberProfileModal
        isOpen={selectedProfileMember !== null}
        onClose={() => setSelectedProfileMember(null)}
        member={selectedProfileMember}
        attendance={attendance}
        payments={payments}
        onOpenPayment={handleOpenPaymentForMember}
        onUpdateMember={handleUpdateMember}
        onViewReceipt={(p) => setReceiptPayment(p)}
        onDeleteMember={handleDeleteMember}
      />

      {/* 4. Payment Receipt Modal */}
      <ReceiptModal
        isOpen={receiptPayment !== null}
        onClose={() => setReceiptPayment(null)}
        payment={receiptPayment}
        settings={settings}
      />

      {/* 5. Gym Branding, Custom Logo & Slogan Modal */}
      <GymBrandingModal
        isOpen={isBrandingModalOpen}
        onClose={() => setIsBrandingModalOpen(false)}
        settings={settings}
        onSaveSettings={updateSettingsState}
      />

      {/* 6. Subscription Plans & Pricing Modal (Kids, Teens, Adults - 8, 12, Unlimited) */}
      <SubscriptionPlansModal
        isOpen={isSubscriptionPlansModalOpen}
        onClose={() => setIsSubscriptionPlansModalOpen(false)}
        plans={subscriptionPlans}
        onSavePlan={handleSaveSubscriptionPlan}
        onDeletePlan={handleDeleteSubscriptionPlan}
        onResetPlans={handleResetSubscriptionPlans}
        currencySymbol={settings.currencySymbol}
      />

      {/* 7. Local Database Settings, Path Verification, Health Check & Architecture Modal */}
      <DatabaseSettingsModal
        isOpen={isDatabaseModalOpen}
        onClose={() => setIsDatabaseModalOpen(false)}
        onDataRepaired={() => {
          setMembers(loadMembers());
          setPayments(loadPayments());
          setAttendance(loadAttendance());
          setClasses(loadClasses());
          setSettings(loadSettings());
          setCoaches(loadCoaches());
          setTimetableConfig(loadTimetableConfig());
          setSubscriptionPlans(loadSubscriptionPlans());
        }}
      />

      {/* 8. Unified System Settings Modal (Theme, Logo & Slogan, User Access Control, Database) */}
      <SystemSettingsModal
        isOpen={isSystemSettingsModalOpen}
        onClose={() => setIsSystemSettingsModalOpen(false)}
        settings={settings}
        onSaveSettings={updateSettingsState}
        theme={theme}
        onToggleTheme={toggleTheme}
        currentUser={currentUser}
        onOpenDatabaseManager={() => setIsDatabaseModalOpen(true)}
        onExportData={handleExportData}
        onImportData={handleImportData}
        onLoadSampleData={handleLoadSampleData}
        onResetData={handleFactoryResetData}
        onLogout={handleLogout}
      />
    </div>
  );
}
