import React, { useState } from 'react';
import { 
  Users, 
  CreditCard, 
  ClipboardList, 
  AlertTriangle, 
  UserPlus, 
  PlusCircle, 
  ShieldAlert, 
  RotateCcw, 
  Download, 
  Upload,
  Award,
  Sparkles,
  Sliders,
  GraduationCap,
  CalendarCheck2,
  CalendarDays,
  Sun,
  Moon,
  GripVertical,
  Check,
  Tag,
  Database,
  Settings,
  LogOut,
  User,
  ShieldCheck,
  Home,
  ShoppingBag,
  BarChart3,
  Edit3,
  Palette,
  Pipette
} from 'lucide-react';
import { Member, PaymentRecord, AttendanceRecord, GymSettings, SystemUser } from '../types';
import { GymLogoDisplay } from './GymLogoDisplay';

export type ActiveTab = 'home' | 'members' | 'checkin' | 'schedule' | 'promotions' | 'payments' | 'proshop' | 'reports' | 'renewals';

// Default order:
// 1. Home Welcoming Dashboard & Today's Schedule
// 2. Class Check-In
// 3. Directory (Students & Coaches)
// 4. Payments & Billing / Salaries
// 5. Pro Shop & Fighting Gear
// 6. Reports & Analytics
// 7. Matboard
// 8. Promotions Tracker
// 9. Class Balances & Renewals
const DEFAULT_TAB_ORDER: ActiveTab[] = [
  'home',
  'checkin',
  'members',
  'payments',
  'proshop',
  'reports',
  'schedule',
  'promotions',
  'renewals',
];

const ALL_TAB_IDS: ActiveTab[] = [
  'home',
  'checkin',
  'members',
  'payments',
  'proshop',
  'reports',
  'schedule',
  'promotions',
  'renewals',
];

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  members: Member[];
  payments: PaymentRecord[];
  attendance: AttendanceRecord[];
  settings: GymSettings;
  coachesCount: number;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  currentUser?: SystemUser | null;
  onOpenSystemSettings?: () => void;
  onLogout?: () => void;
  onOpenNewMember: () => void;
  onOpenBranding?: () => void;
  onOpenHeaderEditor?: () => void;
  onOpenSubscriptionPlans?: () => void;
  onOpenDatabase?: () => void;
  onResetData: () => void;
  onExportData: () => void;
  onImportData: (e: React.ChangeEvent<HTMLInputElement>) => void;
  checkInSubSection?: 'group' | 'vip';
  onSelectCheckInSubSection?: (sub: 'group' | 'vip') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  members,
  attendance,
  settings,
  coachesCount,
  theme = 'dark',
  onToggleTheme,
  currentUser,
  onOpenSystemSettings,
  onLogout,
  onOpenNewMember,
  onOpenBranding,
  onOpenHeaderEditor,
  onOpenSubscriptionPlans,
  onOpenDatabase,
  onResetData,
  onExportData,
  onImportData,
  checkInSubSection = 'group',
  onSelectCheckInSubSection,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Tab order state initialized from localStorage or DEFAULT_TAB_ORDER
  const [tabOrder, setTabOrder] = useState<ActiveTab[]>(() => {
    try {
      const saved = localStorage.getItem('gym_nav_tabs_order');
      if (saved) {
        const parsed = JSON.parse(saved) as ActiveTab[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          const validSaved = parsed.filter((id) => ALL_TAB_IDS.includes(id));
          const missing = ALL_TAB_IDS.filter((id) => !validSaved.includes(id));
          if (!validSaved.includes('home')) {
            return ['home', ...validSaved, ...missing.filter((id) => id !== 'home')];
          }
          return [...validSaved, ...missing];
        }
      }
    } catch {
      // fallback to default
    }
    return DEFAULT_TAB_ORDER;
  });

  // Drag-and-drop state
  const [draggedTab, setDraggedTab] = useState<ActiveTab | null>(null);
  const [dragOverTab, setDragOverTab] = useState<ActiveTab | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const updateTabOrder = (newOrder: ActiveTab[]) => {
    setTabOrder(newOrder);
    try {
      localStorage.setItem('gym_nav_tabs_order', JSON.stringify(newOrder));
    } catch {
      // ignore
    }
    showToast('Tab order saved!');
  };

  const handleDragStart = (e: React.DragEvent, tabId: ActiveTab) => {
    setDraggedTab(tabId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', tabId);
  };

  const handleDragOver = (e: React.DragEvent, targetTabId: ActiveTab) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverTab !== targetTabId) {
      setDragOverTab(targetTabId);
    }
  };

  const handleDragLeave = (_e: React.DragEvent, targetTabId: ActiveTab) => {
    if (dragOverTab === targetTabId) {
      setDragOverTab(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetTabId: ActiveTab) => {
    e.preventDefault();
    if (!draggedTab || draggedTab === targetTabId) {
      setDraggedTab(null);
      setDragOverTab(null);
      return;
    }

    const newOrder = [...tabOrder];
    const fromIndex = newOrder.indexOf(draggedTab);
    const toIndex = newOrder.indexOf(targetTabId);

    if (fromIndex !== -1 && toIndex !== -1) {
      newOrder.splice(fromIndex, 1);
      newOrder.splice(toIndex, 0, draggedTab);
      updateTabOrder(newOrder);
    }

    setDraggedTab(null);
    setDragOverTab(null);
  };

  const handleDragEnd = () => {
    setDraggedTab(null);
    setDragOverTab(null);
  };

  // Today's date in YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAttendanceCount = attendance.filter((a) => a.date === todayStr).length;

  // Dynamic header height calculation: automatically stretches banner when logo is resized or shifted vertically
  const currentLogoHeight = settings.logo?.height || 84;
  const logoOffsetY = Math.max(0, settings.logoVerticalOffset ?? 0);
  const requiredMinHeaderHeight = 20 + logoOffsetY + currentLogoHeight + 25;
  const baseConfiguredBannerHeight = settings.headerBanner?.height || 150;
  const computedHeaderMinHeight = Math.max(baseConfiguredBannerHeight, requiredMinHeaderHeight);

  // Count members who need renewal (2 classes or less)
  const urgentRenewalsCount = members.filter(
    (m) =>
      !m.isDeleted &&
      m.membershipType === 'class_pack' &&
      m.classesRemaining <= 2
  ).length;

  // Tab definitions lookup
  const tabConfigMap: Record<
    ActiveTab,
    {
      id: string;
      label: string;
      shortLabel: string;
      icon: (isActive: boolean) => React.ReactNode;
    }
  > = {
    home: {
      id: 'tab-nav-home',
      label: 'Home',
      shortLabel: 'Home',
      icon: (isActive) => (
        <Home className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : theme === 'light' ? 'text-red-600' : 'text-red-500'}`} />
      ),
    },
    checkin: {
      id: 'tab-nav-checkin',
      label: 'MAT',
      shortLabel: 'MAT',
      icon: (isActive) => (
        <CalendarCheck2 className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : theme === 'light' ? 'text-red-600' : 'text-red-500'}`} />
      ),
    },
    members: {
      id: 'tab-nav-members',
      label: 'Directory',
      shortLabel: 'Directory',
      icon: (isActive) => (
        <Users className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : theme === 'light' ? 'text-blue-600' : 'text-blue-400'}`} />
      ),
    },
    payments: {
      id: 'tab-nav-payments',
      label: 'Payments',
      shortLabel: 'Payments',
      icon: (isActive) => (
        <CreditCard className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : theme === 'light' ? 'text-emerald-600' : 'text-emerald-400'}`} />
      ),
    },
    proshop: {
      id: 'tab-nav-proshop',
      label: 'Shop',
      shortLabel: 'Shop',
      icon: (isActive) => (
        <ShoppingBag className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : theme === 'light' ? 'text-purple-600' : 'text-purple-400'}`} />
      ),
    },
    reports: {
      id: 'tab-nav-reports',
      label: 'Reporting',
      shortLabel: 'Reporting',
      icon: (isActive) => (
        <BarChart3 className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : theme === 'light' ? 'text-indigo-600' : 'text-indigo-400'}`} />
      ),
    },
    schedule: {
      id: 'tab-nav-schedule',
      label: 'Matboard',
      shortLabel: 'Schedule',
      icon: (isActive) => (
        <CalendarDays className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : theme === 'light' ? 'text-stone-750' : 'text-stone-300'}`} />
      ),
    },
    promotions: {
      id: 'tab-nav-promotions',
      label: 'Promotions',
      shortLabel: 'Promotions',
      icon: (isActive) => (
        <GraduationCap className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : theme === 'light' ? 'text-red-700' : 'text-red-400'}`} />
      ),
    },
    renewals: {
      id: 'tab-nav-renewals',
      label: 'Expired',
      shortLabel: 'Expired',
      icon: (isActive) => (
        <ShieldAlert className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : theme === 'light' ? 'text-red-700' : 'text-red-400'}`} />
      ),
    },
  };

  const renderTabBadge = (tabId: ActiveTab, isActive: boolean) => {
    if (tabId === 'checkin') {
      return (
        <span
          className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black shrink-0 transition-colors ${
            isActive
              ? 'bg-white text-red-700 shadow-xs'
              : theme === 'light'
              ? 'bg-red-100 text-red-800 border border-red-300 font-bold'
              : 'bg-red-950 text-red-300 border border-red-800'
          }`}
        >
          {todayAttendanceCount}
        </span>
      );
    }
    if (tabId === 'members') {
      return (
        <span
          className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 transition-colors ${
            isActive
              ? 'bg-white text-red-700 shadow-xs'
              : theme === 'light'
              ? 'bg-stone-200 text-stone-700 font-bold'
              : 'bg-stone-800 text-stone-300'
          }`}
        >
          {members.length}
        </span>
      );
    }
    if (tabId === 'renewals' && urgentRenewalsCount > 0) {
      return (
        <span
          className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black shrink-0 transition-colors ${
            isActive
              ? 'bg-white text-red-700 shadow-xs'
              : theme === 'light'
              ? 'bg-red-100 text-red-900 border border-red-300 font-black'
              : 'bg-red-950 text-red-300 border border-red-800'
          }`}
        >
          {urgentRenewalsCount}
        </span>
      );
    }
    return null;
  };

  return (
    <div className="w-full bg-stone-950 text-stone-100 flex flex-col transition-all">
      {/* Top Header Branding Banner Wrapper - STRICTLY isolated */}
      <div 
        className="relative overflow-hidden border-b border-stone-800 shadow-md flex items-center justify-between transition-all duration-200"
        style={{
          minHeight: `${computedHeaderMinHeight}px`,
          backgroundColor: settings.headerBgColor || '#0c0a09',
        }}
      >
        {/* Background Banner Photo Layer - constrained strictly within this branding banner space */}
        {settings.headerBanner?.url && settings.headerBanner?.enabled !== false && settings.headerBgType !== 'solid' && (
          <div
            className="absolute inset-0 pointer-events-none overflow-hidden transition-all duration-300 z-0"
            style={{
              height: '100%',
              opacity: settings.headerBanner.opacity ?? 0.85,
              filter: settings.headerBanner.blur ? `blur(${settings.headerBanner.blur}px)` : 'none',
            }}
          >
            <div
              className="h-full relative overflow-hidden w-full"
            >
              <img
                src={settings.headerBanner.url}
                alt="Gym Header Background"
                className="w-full h-full"
                style={{
                  objectFit: settings.headerBanner.fit || 'cover',
                  objectPosition: `${settings.headerBanner.positionX ?? 50}% ${settings.headerBanner.positionY ?? 50}%`,
                  transform: `scale(${(settings.headerBanner.zoom ?? 100) / 100})`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.15s ease-out-in',
                }}
              />
              {/* Dark gradient overlay so text/logo stay beautifully legible */}
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(to right, 
                    rgba(12,10,9,${(settings.headerBanner.overlayDarkness ?? 50) / 100}), 
                    rgba(12,10,9,${(settings.headerBanner.overlayDarkness ?? 70) / 100})
                  )`,
                }}
              />
            </div>
          </div>
        )}

        {/* Absolute / Aligned Logo */}
        {(() => {
          const logoAlign = settings.logoAlignment || 'left';
          const logoHOffset = settings.logoHorizontalOffset ?? 0;
          const logoVOffset = settings.logoVerticalOffset ?? 0;
          const logoWidth = settings.logo?.width || 84;

          const logoStyle: React.CSSProperties = {
            top: `${20 + logoVOffset}px`,
          };
          if (logoAlign === 'center') {
            logoStyle.left = `calc(50% + ${logoHOffset}px)`;
            logoStyle.transform = 'translateX(-50%)';
          } else if (logoAlign === 'right') {
            logoStyle.right = `${20 - logoHOffset}px`;
          } else {
            logoStyle.left = `${20 + logoHOffset}px`;
          }

          return (
            <button
              type="button"
              onClick={() => setActiveTab('home')}
              title="Go to Home Dashboard"
              className="absolute z-20 flex-shrink-0 transition-all duration-150 cursor-pointer hover:opacity-90 hover:scale-105 active:scale-95 focus:outline-none text-left bg-transparent border-none p-0"
              style={logoStyle}
            >
              <GymLogoDisplay logo={settings.logo} gymName={settings.gymName} minSize={84} />
            </button>
          );
        })()}

        {/* Absolute / Aligned School Name & Slogan Text */}
        {(() => {
          const brandAlign = settings.brandingAlignment || 'left';
          const brandHOffset = settings.brandingHorizontalOffset ?? 0;
          const brandVOffset = settings.brandingVerticalOffset ?? 0;
          const logoWidth = settings.logo?.width || 84;
          const logoAlign = settings.logoAlignment || 'left';

          const textStyle: React.CSSProperties = {
            top: `${35 + brandVOffset}px`,
          };
          if (brandAlign === 'center') {
            textStyle.left = `calc(50% + ${brandHOffset}px)`;
            textStyle.transform = 'translateX(-50%)';
            textStyle.textAlign = 'center';
          } else if (brandAlign === 'right') {
            textStyle.right = `${20 - brandHOffset}px`;
            textStyle.textAlign = 'right';
          } else {
            const minLeftGap = logoAlign === 'left' ? Math.max(120 + logoWidth, 200) : 20;
            textStyle.left = `${minLeftGap + brandHOffset}px`;
            textStyle.textAlign = 'left';
          }

          return (
            <div 
              onClick={() => setActiveTab('home')}
              className="absolute z-20 max-w-[calc(100vw-360px)] transition-all duration-150 cursor-pointer group" 
              style={textStyle}
              title="Go to Home Dashboard"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') setActiveTab('home'); }}
            >
              <h1 
                className="font-extrabold tracking-tight drop-shadow-md transition-all truncate group-hover:opacity-90"
                style={{ 
                  color: settings.gymNameColor || '#ffffff',
                  fontSize: settings.gymNameFontSize ? `${settings.gymNameFontSize}px` : undefined,
                  fontFamily: settings.customFontUrl
                    ? 'GymCustomSchoolFont, sans-serif'
                    : settings.gymNameFontFamily && settings.gymNameFontFamily !== 'custom'
                    ? `${settings.gymNameFontFamily}, sans-serif`
                    : undefined,
                  letterSpacing: settings.gymNameLetterSpacing !== undefined ? `${settings.gymNameLetterSpacing}px` : undefined,
                  textTransform: settings.gymNameTextTransform || undefined,
                  fontWeight: settings.gymNameFontWeight || undefined,
                  textShadow: settings.gymNameShadow === false ? 'none' : undefined,
                  lineHeight: '1.2',
                }}
              >
                {settings.gymName || 'Arte Suave BJJ Academy'}
              </h1>
              {settings.slogan && (
                <p 
                  className="font-semibold tracking-wide mt-1 italic drop-shadow-xs transition-all truncate group-hover:opacity-90"
                  style={{ 
                    color: settings.sloganColor || '#e2e8f0',
                    fontSize: settings.sloganFontSize ? `${settings.sloganFontSize}px` : undefined,
                    fontFamily: settings.customSloganFontUrl
                      ? 'GymCustomSloganFont, sans-serif'
                      : settings.sloganFontFamily && settings.sloganFontFamily !== 'custom'
                      ? `${settings.sloganFontFamily}, sans-serif`
                      : undefined,
                  }}
                >
                  "{settings.slogan}"
                </p>
              )}
            </div>
          );
        })()}

        {/* Header Controls in Top Right Corner - Small, sleek, minimal & uncluttered */}
        <div className="absolute right-2.5 top-2.5 z-30 flex items-center gap-1 sm:gap-1.5 bg-stone-950/75 backdrop-blur-xs px-1.5 py-1 rounded-lg border border-stone-800/80 shadow-sm">
          {/* Light / Dark Mode Toggle */}
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="p-1 hover:bg-stone-800/90 text-stone-300 hover:text-white rounded-md transition-all cursor-pointer flex items-center justify-center"
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            >
              {theme === 'light' ? <Moon className="w-3 h-3 text-indigo-400" /> : <Sun className="w-3 h-3 text-stone-300" />}
            </button>
          )}

          {/* System Settings Button (compact micro button) */}
          {onOpenSystemSettings && (
            <button
              id="btn-nav-system-settings"
              onClick={onOpenSystemSettings}
              className="px-1.5 py-0.5 hover:bg-stone-800/90 text-stone-300 hover:text-white rounded-md text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
              title="Open System Settings"
            >
              <Settings className="w-3 h-3 text-stone-300 shrink-0" />
              <span className="hidden sm:inline">Settings</span>
            </button>
          )}

          {/* Sign Out Button (compact micro button) */}
          {currentUser && onLogout && (
            <button
              onClick={onLogout}
              className="px-1.5 py-0.5 hover:bg-red-950/80 text-stone-400 hover:text-red-300 rounded-md text-[10px] font-medium transition-all cursor-pointer flex items-center gap-1"
              title={`Signed in as ${currentUser.username}. Click to sign out.`}
            >
              <LogOut className="w-3 h-3 text-red-400 shrink-0" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Directory Tabs Bar - 100% Isolated completely BELOW branding banner with NO overlap */}
      <div className={`w-full border-b transition-colors ${
        theme === 'light'
          ? 'bg-stone-200/90 border-stone-300 shadow-xs'
          : 'bg-stone-900 border-stone-800'
      }`}>
        <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-6 lg:px-8 py-1.5 overflow-hidden">
          <nav className="w-full flex items-center gap-1 sm:gap-2 py-0.5 overflow-x-auto no-scrollbar">
            {tabOrder.map((tabId, index) => {
              const config = tabConfigMap[tabId];
              if (!config) return null;
              const isActive = activeTab === tabId;
              const isBeingDragged = draggedTab === tabId;
              const isDragOver = dragOverTab === tabId && draggedTab !== tabId;

              return (
                <button
                  key={tabId}
                  id={config.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, tabId)}
                  onDragOver={(e) => handleDragOver(e, tabId)}
                  onDragLeave={(e) => handleDragLeave(e, tabId)}
                  onDrop={(e) => handleDrop(e, tabId)}
                  onDragEnd={handleDragEnd}
                  onClick={() => setActiveTab(tabId)}
                  className={`flex-1 group relative flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 py-2.5 text-[11px] lg:text-xs font-black whitespace-nowrap transition-all select-none cursor-pointer rounded-t-lg min-w-0 active:scale-[0.98] ${
                    isActive
                      ? 'nav-tab-active bg-red-600 text-white shadow-md border-b-[3px] border-red-800 ring-2 ring-red-500/40 -translate-y-0.5 z-10'
                      : theme === 'light'
                      ? 'bg-white hover:bg-stone-100 text-stone-700 hover:text-stone-950 border-b-2 border-stone-300/80 shadow-2xs'
                      : 'bg-stone-950/70 hover:bg-stone-850 text-stone-400 hover:text-stone-200 border-b-2 border-stone-800/80'
                  } ${isBeingDragged ? 'opacity-35 scale-95 border-dashed border-red-500 bg-red-950/20' : ''} ${
                    isDragOver ? 'border-amber-400 bg-stone-800/90 ring-1 ring-amber-400/50' : ''
                  }`}
                  title={`${config.label} (Drag to reorder • Position #${index + 1})`}
                >
                  {/* Glowing active indicator dot */}
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs shrink-0 animate-pulse" />
                  )}

                  <span className={`shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : ''}`}>
                    {config.icon(isActive)}
                  </span>

                  <span className="truncate">
                    <span className="hidden sm:inline">{config.label}</span>
                    <span className="inline sm:hidden">{config.shortLabel}</span>
                  </span>

                  {renderTabBadge(tabId, isActive)}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Transient toast message */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 bg-stone-900 border border-amber-500/50 text-amber-300 px-3.5 py-2 rounded-xl text-xs font-bold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
