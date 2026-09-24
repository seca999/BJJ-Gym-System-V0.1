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
  Home
} from 'lucide-react';
import { Member, PaymentRecord, AttendanceRecord, GymSettings, SystemUser } from '../types';
import { GymLogoDisplay } from './GymLogoDisplay';

export type ActiveTab = 'home' | 'members' | 'checkin' | 'schedule' | 'promotions' | 'payments' | 'renewals';

// Default order:
// 1. Home Welcoming Dashboard & Today's Schedule
// 2. Class Check-In
// 3. Directory (Students & Coaches)
// 4. Payments & Billing / Salaries
// 5. Matboard
// 6. Promotions Tracker
// 7. Class Balances & Renewals
const DEFAULT_TAB_ORDER: ActiveTab[] = [
  'home',
  'checkin',
  'members',
  'payments',
  'schedule',
  'promotions',
  'renewals',
];

const ALL_TAB_IDS: ActiveTab[] = [
  'home',
  'checkin',
  'members',
  'payments',
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
  onOpenPayment: () => void;
  onOpenBranding: () => void;
  onOpenSubscriptionPlans?: () => void;
  onOpenDatabase?: () => void;
  onResetData: () => void;
  onExportData: () => void;
  onImportData: (e: React.ChangeEvent<HTMLInputElement>) => void;
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
  onOpenPayment,
  onOpenBranding,
  onOpenSubscriptionPlans,
  onOpenDatabase,
  onResetData,
  onExportData,
  onImportData,
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
      icon: React.ReactNode;
      badge?: React.ReactNode;
    }
  > = {
    home: {
      id: 'tab-nav-home',
      label: 'Home',
      shortLabel: 'Home',
      icon: <Home className="w-3.5 h-3.5 text-red-500 shrink-0" />,
    },
    checkin: {
      id: 'tab-nav-checkin',
      label: 'Mat Check-In',
      shortLabel: 'Check-In',
      icon: <CalendarCheck2 className="w-3.5 h-3.5 text-red-500 shrink-0" />,
      badge: (
        <span className="ml-1 px-1 py-0.2 rounded-full text-[9px] bg-red-950 text-red-300 border border-red-800 font-bold shrink-0">
          {todayAttendanceCount}
        </span>
      ),
    },
    members: {
      id: 'tab-nav-members',
      label: 'Directory',
      shortLabel: 'Directory',
      icon: <Users className="w-3.5 h-3.5 text-blue-400 shrink-0" />,
      badge: (
        <span className="ml-1 px-1 py-0.2 rounded-full text-[9px] bg-stone-800 text-stone-300 shrink-0 font-medium">
          {members.length}
        </span>
      ),
    },
    payments: {
      id: 'tab-nav-payments',
      label: 'Payments & Salaries',
      shortLabel: 'Payments',
      icon: <CreditCard className="w-3.5 h-3.5 text-emerald-400 shrink-0" />,
    },
    schedule: {
      id: 'tab-nav-schedule',
      label: 'Matboard',
      shortLabel: 'Matboard',
      icon: <CalendarDays className="w-3.5 h-3.5 text-amber-400 shrink-0" />,
    },
    promotions: {
      id: 'tab-nav-promotions',
      label: 'Promotions',
      shortLabel: 'Promotions',
      icon: <GraduationCap className="w-3.5 h-3.5 text-amber-400 shrink-0" />,
    },
    renewals: {
      id: 'tab-nav-renewals',
      label: 'Renewals',
      shortLabel: 'Renewals',
      icon: <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />,
      badge:
        urgentRenewalsCount > 0 ? (
          <span className="ml-1 px-1 py-0.2 rounded-full text-[9px] bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 shrink-0">
            {urgentRenewalsCount}
          </span>
        ) : undefined,
    },
  };

  return (
    <div className="w-full bg-stone-950 text-stone-100 flex flex-col">
      {/* Top Header Branding Banner Wrapper - STRICTLY isolated */}
      <div 
        className="relative overflow-hidden bg-stone-900 border-b border-stone-800 shadow-md flex items-center justify-between transition-all duration-200"
        style={{
          minHeight: `${computedHeaderMinHeight}px`,
        }}
      >
        {/* Background Banner Photo Layer - constrained strictly within this branding banner space */}
        {settings.headerBanner?.url && settings.headerBanner?.enabled !== false && (
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
            <div className="absolute z-20 flex-shrink-0 transition-all duration-150" style={logoStyle}>
              <GymLogoDisplay logo={settings.logo} gymName={settings.gymName} minSize={84} />
            </div>
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
            <div className="absolute z-20 max-w-[calc(100vw-360px)] transition-all duration-150" style={textStyle}>
              <h1 
                className="font-extrabold tracking-tight drop-shadow-md transition-all truncate"
                style={{ 
                  color: settings.gymNameColor || '#ffffff',
                  fontSize: settings.gymNameFontSize ? `${settings.gymNameFontSize}px` : undefined,
                  lineHeight: '1.2',
                }}
              >
                {settings.gymName || 'Arte Suave BJJ Academy'}
              </h1>
              {settings.slogan && (
                <p 
                  className="font-semibold tracking-wide mt-1 italic drop-shadow-xs transition-all truncate"
                  style={{ 
                    color: settings.sloganColor || '#f59e0b',
                    fontSize: settings.sloganFontSize ? `${settings.sloganFontSize}px` : undefined,
                  }}
                >
                  "{settings.slogan}"
                </p>
              )}
            </div>
          );
        })()}

        {/* System Settings & User Session Controls in Top Header Right */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-30 flex items-center gap-2">
          {currentUser && onLogout && (
            <button
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-stone-900/90 hover:bg-red-950/80 text-stone-300 hover:text-red-300 border border-stone-800 hover:border-red-700/60 rounded-xl text-xs font-semibold transition-all shadow-md cursor-pointer"
              title={`Logged in as ${currentUser.username} (${currentUser.role}). 10-minute auto-logout active. Click to sign out.`}
            >
              <LogOut className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          )}

          {onOpenSystemSettings && (
            <button
              id="btn-nav-system-settings"
              onClick={onOpenSystemSettings}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-950 to-amber-950 hover:from-red-900 hover:to-amber-900 text-amber-300 border border-amber-500/50 rounded-xl text-xs font-bold transition-all shadow-lg cursor-pointer group flex-shrink-0 animate-pulse"
              title="Open System Settings & Controls"
            >
              <Settings className="w-4 h-4 text-amber-400 group-hover:rotate-45 transition-transform duration-300" />
              <span>System Settings</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Directory Tabs Bar - 100% Isolated completely BELOW branding banner with NO overlap */}
      <div className="w-full bg-stone-900 border-b border-stone-800">
        <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-1 overflow-hidden">
          <nav className="w-full flex items-center gap-0.5 sm:gap-1 py-0.5 overflow-x-auto no-scrollbar">
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
                  className={`flex-1 group relative flex items-center justify-center gap-1 sm:gap-1.5 px-3 py-2 text-[11px] lg:text-xs font-bold border-b-2 whitespace-nowrap transition-all select-none cursor-grab active:cursor-grabbing rounded-t-md min-w-0 ${
                    isActive
                      ? 'border-red-500 text-white bg-stone-800 shadow-xs'
                      : 'border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-800/40'
                  } ${isBeingDragged ? 'opacity-35 scale-95 border-dashed border-red-500 bg-red-950/20' : ''} ${
                    isDragOver ? 'border-amber-400 bg-stone-800/90 ring-1 ring-amber-400/50' : ''
                  }`}
                  title={`${config.label} (Drag to reorder • Position #${index + 1})`}
                >
                  <span className="shrink-0">{config.icon}</span>

                  <span className="truncate">
                    <span className="hidden sm:inline">{config.label}</span>
                    <span className="inline sm:hidden">{config.shortLabel}</span>
                  </span>

                  {config.badge}
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
