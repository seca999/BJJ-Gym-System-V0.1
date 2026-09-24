import React, { useState, useEffect } from 'react';
import { GymSettings, SystemUser, UserRole } from '../types';
import { GymLogoDisplay } from './GymLogoDisplay';
import { 
  loadSystemUsers, 
  createOrUpdateUser, 
  deleteUserAccount 
} from '../utils/authStorage';
import { 
  Settings, 
  Sun, 
  Moon, 
  Image, 
  Users, 
  Database, 
  X, 
  Check, 
  Sliders, 
  UserPlus, 
  ShieldCheck, 
  KeyRound, 
  Trash2, 
  Edit, 
  Upload, 
  Download, 
  AlertCircle, 
  RotateCcw,
  Palette,
  Type,
  Lock,
  Sparkles,
  GitBranch,
  Tag
} from 'lucide-react';
import { APP_VERSION_INFO, getFormattedVersionTag } from '../version';

interface SystemSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GymSettings;
  onSaveSettings: (newSettings: GymSettings) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  currentUser: SystemUser | null;
  onOpenDatabaseManager?: () => void;
  onExportData?: () => void;
  onImportData?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLoadSampleData?: () => void;
  onResetData?: () => void;
  onLogout?: () => void;
}

type SystemSettingsTab = 'appearance' | 'branding' | 'users' | 'database';

export const SystemSettingsModal: React.FC<SystemSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  theme,
  onToggleTheme,
  currentUser,
  onOpenDatabaseManager,
  onExportData,
  onImportData,
  onLoadSampleData,
  onResetData,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<SystemSettingsTab>('appearance');

  // Branding Form State
  const [gymName, setGymName] = useState(settings.gymName || '');
  const [slogan, setSlogan] = useState(settings.slogan || '');
  const [logoUrl, setLogoUrl] = useState(settings.logo?.url || '');
  const [logoWidth, setLogoWidth] = useState(settings.logo?.width || 84);
  const [logoHeight, setLogoHeight] = useState(settings.logo?.height || 84);
  const [logoBorderRadius, setLogoBorderRadius] = useState(settings.logo?.borderRadius || 12);
  const [logoBorderWidth, setLogoBorderWidth] = useState(settings.logo?.borderWidth || 1);
  const [logoBgColor, setLogoBgColor] = useState(settings.logo?.backgroundColor || 'transparent');
  const [currencySymbol, setCurrencySymbol] = useState(settings.currencySymbol || 'JOD');

  // Custom Colors & Font Size Form State
  const [gymNameColor, setGymNameColor] = useState(settings.gymNameColor || '#ffffff');
  const [gymNameFontSize, setGymNameFontSize] = useState<number>(settings.gymNameFontSize || 32);
  const [sloganColor, setSloganColor] = useState(settings.sloganColor || '#f59e0b');
  const [sloganFontSize, setSloganFontSize] = useState<number>(settings.sloganFontSize || 14);
  const [logoIconColor, setLogoIconColor] = useState(settings.logo?.iconColor || '#ffffff');
  const [logoBorderColor, setLogoBorderColor] = useState(settings.logo?.borderColor || '#dc2626');

  // Zoom levels
  const [logoZoom, setLogoZoom] = useState(settings.logo?.zoom || 100);
  const [bannerZoom, setBannerZoom] = useState(settings.headerBanner?.zoom || 100);

  // Position levels & alignment for School Name & Slogan
  const [brandingAlignment, setBrandingAlignment] = useState<'left' | 'center' | 'right'>(settings.brandingAlignment || 'left');
  const [brandingVerticalOffset, setBrandingVerticalOffset] = useState<number>(settings.brandingVerticalOffset || 0);
  const [brandingHorizontalOffset, setBrandingHorizontalOffset] = useState<number>(settings.brandingHorizontalOffset || 0);
  
  // Independent Position & alignment for Logo
  const [logoAlignment, setLogoAlignment] = useState<'left' | 'center' | 'right'>(settings.logoAlignment || 'left');
  const [logoVerticalOffset, setLogoVerticalOffset] = useState<number>(settings.logoVerticalOffset || 0);
  const [logoHorizontalOffset, setLogoHorizontalOffset] = useState<number>(settings.logoHorizontalOffset || 0);
  const [circleMaskEnabled, setCircleMaskEnabled] = useState<boolean>(settings.logo?.borderRadius === 9999);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [showLayoutGuides, setShowLayoutGuides] = useState<boolean>(false);

  // Drag-and-Drop state handlers for Live Preview
  const [isDraggingText, setIsDraggingText] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [dragStartOffset, setDragStartOffset] = useState({ x: 0, y: 0 });

  const [isDraggingLogo, setIsDraggingLogo] = useState(false);
  const [logoDragStartPos, setLogoDragStartPos] = useState({ x: 0, y: 0 });
  const [logoDragStartOffset, setLogoDragStartOffset] = useState({ x: 0, y: 0 });

  // Header Banner State
  const [bannerUrl, setBannerUrl] = useState(settings.headerBanner?.url || '');
  const [bannerHeight, setBannerHeight] = useState(settings.headerBanner?.height || 160);
  const [bannerWidth, setBannerWidth] = useState<'full' | 'behind_logo' | 'custom'>(settings.headerBanner?.bannerWidth || 'full');
  const [customWidthPercent, setCustomWidthPercent] = useState(settings.headerBanner?.customWidthPercent || 100);
  const [overlayDarkness, setOverlayDarkness] = useState(settings.headerBanner?.overlayDarkness ?? 50);
  const [positionY, setPositionY] = useState(settings.headerBanner?.positionY ?? 50);

  // User Management State
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [userRole, setUserRole] = useState<UserRole>('staff');
  const [password, setPassword] = useState('');
  const [userActive, setUserActive] = useState(true);
  const [userError, setUserError] = useState<string | null>(null);
  const [userSuccess, setUserSuccess] = useState<string | null>(null);

  // Load system users on open
  useEffect(() => {
    if (isOpen) {
      loadSystemUsers().then(setSystemUsers);
      setGymName(settings.gymName || '');
      setSlogan(settings.slogan || '');
      setLogoUrl(settings.logo?.url || '');
      setLogoWidth(settings.logo?.width || 84);
      setLogoHeight(settings.logo?.height || 84);
      setLogoBorderRadius(settings.logo?.borderRadius || 12);
      setLogoBorderWidth(settings.logo?.borderWidth || 1);
      setLogoBgColor(settings.logo?.backgroundColor || 'transparent');
      setCurrencySymbol(settings.currencySymbol || 'JOD');
      setBannerUrl(settings.headerBanner?.url || '');
      setBannerHeight(settings.headerBanner?.height || 160);
      setBannerWidth(settings.headerBanner?.bannerWidth || 'full');
      setCustomWidthPercent(settings.headerBanner?.customWidthPercent || 100);
      setOverlayDarkness(settings.headerBanner?.overlayDarkness ?? 50);
      setPositionY(settings.headerBanner?.positionY ?? 50);
      setLogoZoom(settings.logo?.zoom || 100);
      setBannerZoom(settings.headerBanner?.zoom || 100);
      
      setBrandingAlignment(settings.brandingAlignment || 'left');
      setBrandingVerticalOffset(settings.brandingVerticalOffset || 0);
      setBrandingHorizontalOffset(settings.brandingHorizontalOffset || 0);
      
      setLogoAlignment(settings.logoAlignment || 'left');
      setLogoVerticalOffset(settings.logoVerticalOffset || 0);
      setLogoHorizontalOffset(settings.logoHorizontalOffset || 0);
      setCircleMaskEnabled(settings.logo?.borderRadius === 9999);

      // Load custom colors & typography
      setGymNameColor(settings.gymNameColor || '#ffffff');
      setGymNameFontSize(settings.gymNameFontSize || 32);
      setSloganColor(settings.sloganColor || '#f59e0b');
      setSloganFontSize(settings.sloganFontSize || 14);
      setLogoIconColor(settings.logo?.iconColor || '#ffffff');
      setLogoBorderColor(settings.logo?.borderColor || '#dc2626');
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const updateBrandingRealTime = (overrides: {
    gymName?: string;
    slogan?: string;
    logoUrl?: string;
    logoWidth?: number;
    logoHeight?: number;
    logoZoom?: number;
    circleMaskEnabled?: boolean;
    logoAlignment?: 'left' | 'center' | 'right';
    logoVerticalOffset?: number;
    logoHorizontalOffset?: number;
    brandingAlignment?: 'left' | 'center' | 'right';
    brandingVerticalOffset?: number;
    brandingHorizontalOffset?: number;
    bannerUrl?: string;
    bannerHeight?: number;
    bannerZoom?: number;
    positionY?: number;
    overlayDarkness?: number;
    gymNameColor?: string;
    gymNameFontSize?: number;
    sloganColor?: string;
    sloganFontSize?: number;
    logoIconColor?: string;
  }) => {
    const activeGymName = overrides.gymName !== undefined ? overrides.gymName : gymName;
    const activeSlogan = overrides.slogan !== undefined ? overrides.slogan : slogan;
    const activeLogoUrl = overrides.logoUrl !== undefined ? overrides.logoUrl : logoUrl;
    const activeLogoWidth = overrides.logoWidth !== undefined ? overrides.logoWidth : logoWidth;
    const activeLogoHeight = overrides.logoHeight !== undefined ? overrides.logoHeight : logoHeight;
    const activeLogoZoom = overrides.logoZoom !== undefined ? overrides.logoZoom : logoZoom;
    const activeCircleMask = overrides.circleMaskEnabled !== undefined ? overrides.circleMaskEnabled : circleMaskEnabled;
    const activeLogoAlign = overrides.logoAlignment !== undefined ? overrides.logoAlignment : logoAlignment;
    const activeLogoVOffset = overrides.logoVerticalOffset !== undefined ? overrides.logoVerticalOffset : logoVerticalOffset;
    const activeLogoHOffset = overrides.logoHorizontalOffset !== undefined ? overrides.logoHorizontalOffset : logoHorizontalOffset;
    const activeBrandAlign = overrides.brandingAlignment !== undefined ? overrides.brandingAlignment : brandingAlignment;
    const activeBrandVOffset = overrides.brandingVerticalOffset !== undefined ? overrides.brandingVerticalOffset : brandingVerticalOffset;
    const activeBrandHOffset = overrides.brandingHorizontalOffset !== undefined ? overrides.brandingHorizontalOffset : brandingHorizontalOffset;
    const activeBannerUrl = overrides.bannerUrl !== undefined ? overrides.bannerUrl : bannerUrl;
    const activeBannerHeight = overrides.bannerHeight !== undefined ? overrides.bannerHeight : bannerHeight;
    const activeBannerZoom = overrides.bannerZoom !== undefined ? overrides.bannerZoom : bannerZoom;
    const activePositionY = overrides.positionY !== undefined ? overrides.positionY : positionY;
    const activeOverlayDarkness = overrides.overlayDarkness !== undefined ? overrides.overlayDarkness : overlayDarkness;
    const activeGymNameColor = overrides.gymNameColor !== undefined ? overrides.gymNameColor : gymNameColor;
    const activeGymNameFontSize = overrides.gymNameFontSize !== undefined ? overrides.gymNameFontSize : gymNameFontSize;
    const activeSloganColor = overrides.sloganColor !== undefined ? overrides.sloganColor : sloganColor;
    const activeSloganFontSize = overrides.sloganFontSize !== undefined ? overrides.sloganFontSize : sloganFontSize;
    const activeLogoIconColor = overrides.logoIconColor !== undefined ? overrides.logoIconColor : logoIconColor;

    const updatedSettings: GymSettings = {
      ...settings,
      gymName: activeGymName.trim(),
      slogan: activeSlogan.trim(),
      currencySymbol: currencySymbol.trim() || 'JOD',
      gymNameColor: activeGymNameColor,
      gymNameFontSize: Number(activeGymNameFontSize),
      sloganColor: activeSloganColor,
      sloganFontSize: Number(activeSloganFontSize),
      brandingAlignment: activeBrandAlign,
      brandingVerticalOffset: Number(activeBrandVOffset),
      brandingHorizontalOffset: Number(activeBrandHOffset),
      logoAlignment: activeLogoAlign,
      logoVerticalOffset: Number(activeLogoVOffset),
      logoHorizontalOffset: Number(activeLogoHOffset),
      logo: {
        url: activeLogoUrl.trim(),
        width: Number(activeLogoWidth),
        height: Number(activeLogoHeight),
        borderRadius: activeCircleMask ? 9999 : Number(logoBorderRadius),
        borderWidth: Number(logoBorderWidth),
        backgroundColor: logoBgColor,
        fit: settings.logo?.fit || 'contain',
        borderColor: logoBorderColor,
        padding: settings.logo?.padding ?? 2,
        iconColor: activeLogoIconColor,
        zoom: Number(activeLogoZoom),
      },
      headerBanner: {
        enabled: true,
        url: activeBannerUrl.trim(),
        height: Number(activeBannerHeight),
        bannerWidth,
        customWidthPercent: Number(customWidthPercent),
        opacity: settings.headerBanner?.opacity ?? 0.85,
        blur: settings.headerBanner?.blur ?? 0,
        positionX: settings.headerBanner?.positionX ?? 50,
        positionY: Number(activePositionY),
        fit: settings.headerBanner?.fit || 'cover',
        overlayDarkness: Number(activeOverlayDarkness),
        zoom: Number(activeBannerZoom),
      },
    };
    onSaveSettings(updatedSettings);
  };

  const handlePreviewMouseMove = (e: React.MouseEvent) => {
    if (isDraggingText) {
      const dx = e.clientX - dragStartPos.x;
      const dy = e.clientY - dragStartPos.y;
      const newX = Math.max(-500, Math.min(500, dragStartOffset.x + dx));
      const newY = Math.max(-250, Math.min(250, dragStartOffset.y + dy));
      setBrandingHorizontalOffset(newX);
      setBrandingVerticalOffset(newY);
      updateBrandingRealTime({
        brandingHorizontalOffset: newX,
        brandingVerticalOffset: newY
      });
    } else if (isDraggingLogo) {
      const dx = e.clientX - logoDragStartPos.x;
      const dy = e.clientY - logoDragStartPos.y;
      const newX = Math.max(-500, Math.min(500, logoDragStartOffset.x + dx));
      const newY = Math.max(-250, Math.min(250, logoDragStartOffset.y + dy));
      setLogoHorizontalOffset(newX);
      setLogoVerticalOffset(newY);
      updateBrandingRealTime({
        logoHorizontalOffset: newX,
        logoVerticalOffset: newY
      });
    }
  };

  const handlePreviewMouseUpOrLeave = () => {
    setIsDraggingText(false);
    setIsDraggingLogo(false);
  };

  const handleSaveBranding = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedSettings: GymSettings = {
      ...settings,
      gymName: gymName.trim(),
      slogan: slogan.trim(),
      currencySymbol: currencySymbol.trim() || 'JOD',
      gymNameColor,
      gymNameFontSize: Number(gymNameFontSize),
      sloganColor,
      sloganFontSize: Number(sloganFontSize),
      brandingAlignment,
      brandingVerticalOffset: Number(brandingVerticalOffset),
      brandingHorizontalOffset: Number(brandingHorizontalOffset),
      logoAlignment,
      logoVerticalOffset: Number(logoVerticalOffset),
      logoHorizontalOffset: Number(logoHorizontalOffset),
      logo: {
        url: logoUrl.trim(),
        width: Number(logoWidth),
        height: Number(logoHeight),
        borderRadius: circleMaskEnabled ? 9999 : Number(logoBorderRadius),
        borderWidth: Number(logoBorderWidth),
        backgroundColor: logoBgColor,
        fit: settings.logo?.fit || 'contain',
        borderColor: logoBorderColor,
        padding: settings.logo?.padding ?? 2,
        iconColor: logoIconColor,
        zoom: Number(logoZoom),
      },
      headerBanner: {
        enabled: true,
        url: bannerUrl.trim(),
        height: Number(bannerHeight),
        bannerWidth,
        customWidthPercent: Number(customWidthPercent),
        opacity: settings.headerBanner?.opacity ?? 0.85,
        blur: settings.headerBanner?.blur ?? 0,
        positionX: settings.headerBanner?.positionX ?? 50,
        positionY: Number(positionY),
        fit: settings.headerBanner?.fit || 'cover',
        overlayDarkness: Number(overlayDarkness),
        zoom: Number(bannerZoom),
      },
    };
    onSaveSettings(updatedSettings);
    setUserSuccess('Academy Branding, Header Background & Slogan updated successfully!');
    setTimeout(() => setUserSuccess(null), 3000);
  };

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const resultStr = reader.result as string;
        setLogoUrl(resultStr);
        updateBrandingRealTime({ logoUrl: resultStr });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBannerFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const resultStr = reader.result as string;
        setBannerUrl(resultStr);
        updateBrandingRealTime({ bannerUrl: resultStr });
      };
      reader.readAsDataURL(file);
    }
  };

  const openAddUser = () => {
    setEditingUser(null);
    setUsername('');
    setFullName('');
    setUserRole('staff');
    setPassword('');
    setUserActive(true);
    setUserError(null);
    setUserModalOpen(true);
  };

  const openEditUser = (u: SystemUser) => {
    setEditingUser(u);
    setUsername(u.username);
    setFullName(u.fullName);
    setUserRole(u.role);
    setPassword(''); // leave blank unless changing
    setUserActive(u.active);
    setUserError(null);
    setUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError(null);

    const result = await createOrUpdateUser({
      id: editingUser?.id,
      username,
      fullName,
      role: userRole,
      active: userActive,
      plainPassword: password || undefined,
    });

    if (result.success) {
      setSystemUsers(result.users);
      setUserModalOpen(false);
      setUserSuccess(editingUser ? 'User updated successfully!' : 'New user created successfully!');
      setTimeout(() => setUserSuccess(null), 3000);
    } else {
      setUserError(result.error || 'Failed to save user.');
    }
  };

  const handleDeleteUser = async (u: SystemUser) => {
    if (!window.confirm(`Are you sure you want to delete user "${u.username}"?`)) return;

    const result = await deleteUserAccount(u.id, currentUser?.id);
    if (result.success) {
      setSystemUsers(result.users);
      setUserSuccess(`User "${u.username}" deleted.`);
      setTimeout(() => setUserSuccess(null), 3000);
    } else {
      alert(result.error || 'Failed to delete user.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 text-stone-100 rounded-2xl w-full max-w-5xl h-[88vh] min-h-[650px] max-h-[860px] shadow-2xl overflow-hidden flex flex-col my-auto shrink-0">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-stone-950 border-b border-stone-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-950/80 border border-red-900/60 rounded-xl text-red-400">
              <Settings className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-raven text-white tracking-wide">
                SYSTEM SETTINGS & CONFIGURATION
              </h2>
              <p className="text-xs text-stone-400">
                Manage appearance, academy logo & slogan, user access control, and database
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-100 bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Banner */}
        {userSuccess && (
          <div className="bg-emerald-950/90 border-b border-emerald-800 text-emerald-200 px-5 py-2.5 text-xs flex items-center gap-2 shrink-0">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{userSuccess}</span>
          </div>
        )}

        {/* Segmented Tab Navigation Bar - Non-overlapping and clean */}
        <div className="bg-stone-950 px-4 sm:px-5 py-3 border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-2 p-1.5 bg-stone-900/90 rounded-xl border border-stone-800/80 overflow-x-auto no-scrollbar">
            {[
              { id: 'appearance', label: 'Theme & Appearance', icon: Palette },
              { id: 'branding', label: 'Logo & Slogan', icon: Image },
              { id: 'users', label: 'User Access Control', icon: Users },
              { id: 'database', label: 'Database & Backups', icon: Database },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as SystemSettingsTab)}
                  className={`flex-1 min-w-[160px] py-2.5 px-3.5 text-xs font-extrabold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-red-600 text-white shadow-md ring-1 ring-red-500/50'
                      : 'text-stone-400 hover:text-white hover:bg-stone-800/60 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-stone-500'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Content Body - Fixed flex-1 container with independent scroll */}
        <div className="p-6 overflow-y-auto flex-1 bg-stone-900 min-h-0">
          {/* TAB 1: APPEARANCE & THEME */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <div className="bg-stone-950 border border-stone-800 rounded-xl p-5">
                <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                  <Palette className="w-4 h-4 text-amber-400" />
                  System Color Theme
                </h3>
                <p className="text-xs text-stone-400 mb-4">
                  Switch between Dark Mode (Tactical Mat) and Light Mode (Clean Studio) across the entire application.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Dark Mode Card */}
                  <div
                    onClick={() => theme === 'light' && onToggleTheme()}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                      theme === 'dark'
                        ? 'border-red-600 bg-stone-900 ring-2 ring-red-950'
                        : 'border-stone-800 bg-stone-950 hover:border-stone-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-stone-900 border border-stone-800 rounded-lg text-amber-400">
                        <Moon className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">Dark Mode</h4>
                        <p className="text-[11px] text-stone-400">High contrast tactical dark theme</p>
                      </div>
                    </div>
                    {theme === 'dark' && (
                      <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-white">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  {/* Light Mode Card */}
                  <div
                    onClick={() => theme === 'dark' && onToggleTheme()}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                      theme === 'light'
                        ? 'border-red-600 bg-stone-900 ring-2 ring-red-950'
                        : 'border-stone-800 bg-stone-950 hover:border-stone-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-stone-100 border border-stone-300 rounded-lg text-amber-600">
                        <Sun className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">Light Mode</h4>
                        <p className="text-[11px] text-stone-400">Bright, high-legibility studio theme</p>
                      </div>
                    </div>
                    {theme === 'light' && (
                      <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-white">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Typography & Readability */}
              <div className="bg-stone-950 border border-stone-800 rounded-xl p-5">
                <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                  <Type className="w-4 h-4 text-amber-400" />
                  Font & Currency Formatting
                </h3>
                <p className="text-xs text-stone-400 mb-4">
                  Default currency symbol used across tuition packages and financial ledgers.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                      System Currency Symbol
                    </label>
                    <input
                      type="text"
                      value={currencySymbol}
                      onChange={(e) => setCurrencySymbol(e.target.value)}
                      placeholder="e.g. JOD, USD, EUR, £"
                      className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-red-600"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BRANDING, LOGO & SLOGAN */}
          {activeTab === 'branding' && (
            <form onSubmit={handleSaveBranding} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* BOX 1: LOGO, BRAND SLOGAN & COLORS CONFIGURATION */}
                <div className="bg-stone-950 border border-stone-800 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-stone-900">
                    <Palette className="w-5 h-5 text-red-500" />
                    <div>
                      <h4 className="text-sm font-extrabold text-white">1. Academy Logo, Slogan & Brand Colors</h4>
                      <p className="text-[11px] text-stone-400">Configure your academy name, tagline, emblem, and theme palette</p>
                    </div>
                  </div>

                  {/* Academy Name */}
                  <div>
                    <label className="block text-[11px] font-bold text-stone-300 uppercase tracking-wider mb-2">
                      Academy Gym Name
                    </label>
                    <input
                      type="text"
                      required
                      value={gymName}
                      onChange={(e) => { setGymName(e.target.value); updateBrandingRealTime({ gymName: e.target.value }); }}
                      placeholder="e.g. Arte Suave BJJ Academy"
                      className="w-full h-10 bg-stone-900 border border-stone-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 block shadow-inner"
                    />
                  </div>

                  {/* Academy Slogan */}
                  <div>
                    <label className="block text-[11px] font-bold text-stone-300 uppercase tracking-wider mb-2">
                      Academy Slogan / Tagline
                    </label>
                    <input
                      type="text"
                      value={slogan}
                      onChange={(e) => { setSlogan(e.target.value); updateBrandingRealTime({ slogan: e.target.value }); }}
                      placeholder="e.g. Where Technique Conquers Strength"
                      className="w-full h-10 bg-stone-900 border border-stone-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 block shadow-inner"
                    />
                  </div>

                  {/* Logo Device File Upload (URL Option Removed) */}
                  <div className="bg-stone-900/60 p-3.5 rounded-xl border border-stone-800 space-y-3">
                    <label className="block text-[11px] font-bold text-stone-300 uppercase tracking-wider">
                      Academy Logo Emblem File
                    </label>
                    <div className="flex items-center gap-3">
                      {logoUrl ? (
                        <div className="relative w-14 h-14 bg-stone-950 border border-stone-800 rounded-xl overflow-hidden flex items-center justify-center p-1">
                          <img src={logoUrl} alt="Logo thumbnail" className="max-w-full max-h-full object-contain" />
                          <button
                            type="button"
                            onClick={() => { setLogoUrl(''); updateBrandingRealTime({ logoUrl: '' }); }}
                            className="absolute inset-0 bg-red-900/90 text-white flex items-center justify-center text-[10px] font-bold opacity-0 hover:opacity-100 transition-opacity"
                            title="Remove Logo File"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div className="w-14 h-14 bg-stone-950 border border-dashed border-stone-800 rounded-xl flex items-center justify-center text-stone-600 text-xs font-bold">
                          None
                        </div>
                      )}
                      
                      <label className="flex-1 cursor-pointer bg-stone-950 hover:bg-stone-800 border border-stone-800 hover:border-stone-700 text-stone-300 px-3.5 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all text-xs font-bold shadow-inner">
                        <Upload className="w-4 h-4 text-amber-400" />
                        <span>Upload Logo File</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Sizing Controls */}
                  <div className="bg-stone-900/40 p-4 rounded-xl border border-stone-900 space-y-3">
                    <label className="block text-[11px] font-bold text-stone-300 uppercase tracking-wider">
                      Logo Dimensions & Scaling Zoom
                    </label>
                    <div>
                      <div className="flex justify-between text-[10px] text-stone-400 font-bold mb-1">
                        <span>Logo Size (Locked 1:1 Aspect Ratio)</span>
                        <span className="font-mono text-amber-400">{logoWidth}px × {logoHeight}px</span>
                      </div>
                      <input
                        type="range"
                        min={40}
                        max={500}
                        step={20}
                        value={logoWidth}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setLogoWidth(v);
                          setLogoHeight(v);
                          updateBrandingRealTime({ logoWidth: v, logoHeight: v });
                        }}
                        className="w-full accent-red-600"
                      />
                      <span className="block text-[9px] text-stone-500 mt-1">Changes size in precise 20px connected increments to lock perfect aspect ratios</span>
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] text-stone-400 font-bold mb-1">
                        <span>Logo Picture Zoom / Crop Scale</span>
                        <span className="font-mono text-amber-400">{logoZoom}%</span>
                      </div>
                      <input
                        type="range"
                        min={50}
                        max={250}
                        step={5}
                        value={logoZoom}
                        onChange={(e) => { const v = Number(e.target.value); setLogoZoom(v); updateBrandingRealTime({ logoZoom: v }); }}
                        className="w-full accent-red-600"
                      />
                    </div>

                    {/* Circle Mask Toggle */}
                    <div className="pt-2 border-t border-stone-850 flex items-center justify-between">
                      <div>
                        <span className="block text-[11px] font-bold text-stone-200">Apply Circular Mask</span>
                        <span className="block text-[10px] text-stone-500">Clips logo rectangular corners into a perfect circle</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={circleMaskEnabled}
                          onChange={(e) => { const v = e.target.checked; setCircleMaskEnabled(v); updateBrandingRealTime({ circleMaskEnabled: v }); }}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-stone-800 rounded-full peer peer-focus:ring-2 peer-focus:ring-amber-500/20 peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-stone-300 after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600 peer-checked:after:bg-white peer-checked:after:border-white"></div>
                      </label>
                    </div>
                  </div>

                  {/* Position & Align Academy Logo Separately */}
                  <div className="bg-stone-900/60 p-4 rounded-xl border border-stone-800 space-y-3">
                    <label className="block text-[11px] font-bold text-stone-300 uppercase tracking-wider">
                      Move & Align Academy Logo
                    </label>
                    
                    {/* Logo Align Buttons */}
                    <div>
                      <span className="block text-[10px] text-stone-400 font-medium mb-1.5">Horizontal Alignment</span>
                      <div className="flex gap-1">
                        {[
                          { id: 'left', label: 'Left' },
                          { id: 'center', label: 'Center' },
                          { id: 'right', label: 'Right' },
                        ].map((align) => (
                          <button
                            key={align.id}
                            type="button"
                            onClick={() => { setLogoAlignment(align.id as any); updateBrandingRealTime({ logoAlignment: align.id as any }); }}
                            className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg border transition-all ${
                              logoAlignment === align.id
                                ? 'bg-red-600 text-white border-red-500 shadow-md'
                                : 'bg-stone-950 text-stone-400 border-stone-800 hover:border-stone-700'
                            }`}
                          >
                            {align.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Logo Vertical Shift Slider */}
                      <div>
                        <div className="flex justify-between text-[10px] text-stone-400 font-bold mb-1">
                          <span>Vertical Shift</span>
                          <span className="font-mono text-red-400">{logoVerticalOffset > 0 ? `+${logoVerticalOffset}` : logoVerticalOffset}px</span>
                        </div>
                        <input
                          type="range"
                          min={-250}
                          max={250}
                          step={2}
                          value={logoVerticalOffset}
                          onChange={(e) => { const v = Number(e.target.value); setLogoVerticalOffset(v); updateBrandingRealTime({ logoVerticalOffset: v }); }}
                          className="w-full accent-red-600"
                        />
                      </div>

                      {/* Logo Horizontal Shift Slider */}
                      <div>
                        <div className="flex justify-between text-[10px] text-stone-400 font-bold mb-1">
                          <span>Horizontal Shift</span>
                          <span className="font-mono text-red-400">{logoHorizontalOffset > 0 ? `+${logoHorizontalOffset}` : logoHorizontalOffset}px</span>
                        </div>
                        <input
                          type="range"
                          min={-500}
                          max={500}
                          step={5}
                          value={logoHorizontalOffset}
                          onChange={(e) => { const v = Number(e.target.value); setLogoHorizontalOffset(v); updateBrandingRealTime({ logoHorizontalOffset: v }); }}
                          className="w-full accent-red-600"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Position & Align School Name & Slogan */}
                  <div className="bg-stone-900/60 p-4 rounded-xl border border-stone-800 space-y-3">
                    <label className="block text-[11px] font-bold text-stone-300 uppercase tracking-wider">
                      Move & Align Slogan & School Name
                    </label>
                    
                    {/* Align Buttons */}
                    <div>
                      <span className="block text-[10px] text-stone-400 font-medium mb-1.5">Horizontal Alignment</span>
                      <div className="flex gap-1">
                        {[
                          { id: 'left', label: 'Left' },
                          { id: 'center', label: 'Center' },
                          { id: 'right', label: 'Right' },
                        ].map((align) => (
                          <button
                            key={align.id}
                            type="button"
                            onClick={() => { setBrandingAlignment(align.id as any); updateBrandingRealTime({ brandingAlignment: align.id as any }); }}
                            className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg border transition-all ${
                              brandingAlignment === align.id
                                ? 'bg-amber-600 text-white border-amber-500 shadow-md'
                                : 'bg-stone-950 text-stone-400 border-stone-800 hover:border-stone-700'
                            }`}
                          >
                            {align.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Vertical Shift Slider */}
                      <div>
                        <div className="flex justify-between text-[10px] text-stone-400 font-bold mb-1">
                          <span>Vertical Shift</span>
                          <span className="font-mono text-amber-400">{brandingVerticalOffset > 0 ? `+${brandingVerticalOffset}` : brandingVerticalOffset}px</span>
                        </div>
                        <input
                          type="range"
                          min={-250}
                          max={250}
                          step={2}
                          value={brandingVerticalOffset}
                          onChange={(e) => { const v = Number(e.target.value); setBrandingVerticalOffset(v); updateBrandingRealTime({ brandingVerticalOffset: v }); }}
                          className="w-full accent-amber-500"
                        />
                      </div>

                      {/* Horizontal Shift Slider */}
                      <div>
                        <div className="flex justify-between text-[10px] text-stone-400 font-bold mb-1">
                          <span>Horizontal Shift</span>
                          <span className="font-mono text-amber-400">{brandingHorizontalOffset > 0 ? `+${brandingHorizontalOffset}` : brandingHorizontalOffset}px</span>
                        </div>
                        <input
                          type="range"
                          min={-500}
                          max={500}
                          step={5}
                          value={brandingHorizontalOffset}
                          onChange={(e) => { const v = Number(e.target.value); setBrandingHorizontalOffset(v); updateBrandingRealTime({ brandingHorizontalOffset: v }); }}
                          className="w-full accent-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Typography Font Sizes & Brand Colors */}
                  <div className="bg-stone-900/60 p-3.5 rounded-xl border border-stone-800 space-y-3">
                    <label className="block text-[11px] font-bold text-stone-300 uppercase tracking-wider">
                      Typography Font Sizes & Colors
                    </label>

                    {/* Font Size Sliders */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex justify-between text-[10px] text-stone-400 font-bold mb-1">
                          <span>Name Font Size</span>
                          <span className="font-mono text-amber-400">{gymNameFontSize}px</span>
                        </div>
                        <input
                          type="range"
                          min={18}
                          max={72}
                          step={2}
                          value={gymNameFontSize}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            setGymNameFontSize(v);
                            updateBrandingRealTime({ gymNameFontSize: v });
                          }}
                          className="w-full accent-amber-500"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] text-stone-400 font-bold mb-1">
                          <span>Slogan Font Size</span>
                          <span className="font-mono text-amber-400">{sloganFontSize}px</span>
                        </div>
                        <input
                          type="range"
                          min={12}
                          max={28}
                          step={1}
                          value={sloganFontSize}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            setSloganFontSize(v);
                            updateBrandingRealTime({ sloganFontSize: v });
                          }}
                          className="w-full accent-amber-500"
                        />
                      </div>
                    </div>

                    {/* Colors */}
                    <div className="grid grid-cols-3 gap-2.5 pt-1 border-t border-stone-800/80">
                      <div>
                        <span className="block text-[10px] text-stone-400 font-medium mb-1">School Name</span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={gymNameColor}
                            onChange={(e) => { setGymNameColor(e.target.value); updateBrandingRealTime({ gymNameColor: e.target.value }); }}
                            className="w-7 h-7 rounded bg-stone-950 border border-stone-800 cursor-pointer p-0.5"
                          />
                          <input
                            type="text"
                            value={gymNameColor}
                            onChange={(e) => { setGymNameColor(e.target.value); updateBrandingRealTime({ gymNameColor: e.target.value }); }}
                            className="w-12 bg-stone-950 border border-stone-800 rounded px-1 py-1 text-[9px] text-white uppercase font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <span className="block text-[10px] text-stone-400 font-medium mb-1">Slogan Text</span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={sloganColor}
                            onChange={(e) => { setSloganColor(e.target.value); updateBrandingRealTime({ sloganColor: e.target.value }); }}
                            className="w-7 h-7 rounded bg-stone-950 border border-stone-800 cursor-pointer p-0.5"
                          />
                          <input
                            type="text"
                            value={sloganColor}
                            onChange={(e) => { setSloganColor(e.target.value); updateBrandingRealTime({ sloganColor: e.target.value }); }}
                            className="w-12 bg-stone-950 border border-stone-800 rounded px-1 py-1 text-[9px] text-white uppercase font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <span className="block text-[10px] text-stone-400 font-medium mb-1">Emblem Icon</span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={logoIconColor}
                            onChange={(e) => { setLogoIconColor(e.target.value); updateBrandingRealTime({ logoIconColor: e.target.value }); }}
                            className="w-7 h-7 rounded bg-stone-950 border border-stone-800 cursor-pointer p-0.5"
                          />
                          <input
                            type="text"
                            value={logoIconColor}
                            onChange={(e) => { setLogoIconColor(e.target.value); updateBrandingRealTime({ logoIconColor: e.target.value }); }}
                            className="w-12 bg-stone-950 border border-stone-800 rounded px-1 py-1 text-[9px] text-white uppercase font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* BOX 2: HEADER BACKGROUND PHOTO CONFIGURATION */}
                <div className="bg-stone-950 border border-stone-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-stone-900">
                      <Image className="w-5 h-5 text-amber-500" />
                      <div>
                        <h4 className="text-sm font-extrabold text-white">2. Header Background & Coverage</h4>
                        <p className="text-[11px] text-stone-400">Upload background photo and adjust contrast overlays and height dimensions</p>
                      </div>
                    </div>

                    {/* Header Background Device File Upload (URL Option Removed) */}
                    <div className="bg-stone-900/60 p-4 rounded-xl border border-stone-800 space-y-3">
                      <label className="block text-[11px] font-bold text-stone-300 uppercase tracking-wider">
                        Header Background Image File
                      </label>
                      <div className="flex items-center gap-3">
                        {bannerUrl ? (
                          <div className="relative w-24 h-12 bg-stone-950 border border-stone-800 rounded-xl overflow-hidden flex items-center justify-center">
                            <img src={bannerUrl} alt="Banner thumbnail" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => { setBannerUrl(''); updateBrandingRealTime({ bannerUrl: '' }); }}
                              className="absolute inset-0 bg-red-900/95 text-white flex items-center justify-center text-[10px] font-bold opacity-0 hover:opacity-100 transition-opacity"
                              title="Clear Background Photo"
                            >
                              Clear
                            </button>
                          </div>
                        ) : (
                          <div className="w-24 h-12 bg-stone-950 border border-dashed border-stone-800 rounded-xl flex items-center justify-center text-stone-600 text-xs font-bold text-center">
                            No Photo
                          </div>
                        )}
                        
                        <label className="flex-1 cursor-pointer bg-stone-950 hover:bg-stone-800 border border-stone-800 hover:border-stone-700 text-stone-300 px-3.5 py-3 rounded-xl flex items-center justify-center gap-2 transition-all text-xs font-bold shadow-inner">
                          <Upload className="w-4 h-4 text-emerald-400" />
                          <span>Upload Background Photo</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleBannerFileUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    {/* Dimensions & Controls */}
                    <div className="space-y-4 bg-stone-900/40 p-3.5 rounded-xl border border-stone-900">
                      {/* Header Height Slider */}
                      <div>
                        <div className="flex justify-between text-[11px] text-stone-300 font-bold mb-1">
                          <span>Banner Header Height</span>
                          <span className="font-mono text-amber-400">{bannerHeight}px</span>
                        </div>
                        <input
                          type="range"
                          min={100}
                          max={300}
                          step={10}
                          value={bannerHeight}
                          onChange={(e) => { const v = Number(e.target.value); setBannerHeight(v); updateBrandingRealTime({ bannerHeight: v }); }}
                          className="w-full accent-amber-500"
                        />
                      </div>

                      {/* Background Zoom slider */}
                      <div>
                        <div className="flex justify-between text-[11px] text-stone-300 font-bold mb-1">
                          <span>Background Picture Zoom / Crop Scale</span>
                          <span className="font-mono text-amber-400">{bannerZoom}%</span>
                        </div>
                        <input
                          type="range"
                          min={100}
                          max={300}
                          step={5}
                          value={bannerZoom}
                          onChange={(e) => { const v = Number(e.target.value); setBannerZoom(v); updateBrandingRealTime({ bannerZoom: v }); }}
                          className="w-full accent-amber-500"
                        />
                      </div>

                      {/* Text Contrast darkness slider */}
                      <div>
                        <div className="flex justify-between text-[11px] text-stone-300 font-bold mb-1">
                          <span>Text Contrast Overlay Darkness</span>
                          <span className="font-mono text-amber-400">{overlayDarkness}%</span>
                        </div>
                        <input
                          type="range"
                          min={10}
                          max={90}
                          step={5}
                          value={overlayDarkness}
                          onChange={(e) => { const v = Number(e.target.value); setOverlayDarkness(v); updateBrandingRealTime({ overlayDarkness: v }); }}
                          className="w-full accent-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-stone-900">
                    <button
                      type="submit"
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold px-6 py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer text-xs uppercase tracking-wider"
                    >
                      <Check className="w-4 h-4" />
                      <span>Apply Academy Branding Updates</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* LIVE BRANDING PREVIEW HEADER PANEL AT THE BOTTOM */}
              <div className="bg-stone-950 border border-stone-800 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-stone-900">
                  <span className="text-[11px] font-extrabold text-stone-400 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Live Interactive Screen & Layout Simulator</span>
                  </span>

                  {/* Simulator Toggles */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Layout Guides Toggle */}
                    <button
                      type="button"
                      onClick={() => setShowLayoutGuides(!showLayoutGuides)}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all flex items-center gap-1 ${
                        showLayoutGuides
                          ? 'bg-red-950 text-red-400 border-red-800'
                          : 'bg-stone-900 text-stone-400 border-stone-800 hover:border-stone-700'
                      }`}
                      title="Show layout container bounds, alignments and offset coordinates"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                      <span>{showLayoutGuides ? 'Hide Align Guides' : 'Show Align Guides'}</span>
                    </button>

                    {/* Viewport Selectors */}
                    <div className="flex bg-stone-900 border border-stone-800 rounded-lg p-0.5">
                      {[
                        { id: 'desktop', label: 'Desktop', icon: (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <rect x="2" y="3" width="20" height="14" rx="2" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 21h8M12 17v4" />
                          </svg>
                        ) },
                        { id: 'tablet', label: 'Tablet', icon: (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <rect x="4" y="2" width="16" height="20" rx="2" />
                            <circle cx="12" cy="18" r="1" />
                          </svg>
                        ) },
                        { id: 'mobile', label: 'Mobile', icon: (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <rect x="5" y="2" width="14" height="20" rx="2" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01" />
                          </svg>
                        ) }
                      ].map((device) => (
                        <button
                          key={device.id}
                          type="button"
                          onClick={() => setPreviewDevice(device.id as any)}
                          className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all flex items-center gap-1 ${
                            previewDevice === device.id
                              ? 'bg-amber-600 text-white shadow-md'
                              : 'text-stone-400 hover:text-stone-200'
                          }`}
                        >
                          {device.icon}
                          <span className="hidden md:inline">{device.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Simulated Monitor Screen Container with Drag event bindings */}
                <div 
                  className="bg-stone-900/40 border border-stone-900 rounded-xl p-4 flex items-center justify-center overflow-auto min-h-[220px] select-none"
                  onMouseMove={handlePreviewMouseMove}
                  onMouseUp={handlePreviewMouseUpOrLeave}
                  onMouseLeave={handlePreviewMouseUpOrLeave}
                >
                  <div 
                    className={`relative overflow-hidden border transition-all duration-300 w-full shadow-2xl bg-stone-950 ${
                      previewDevice === 'mobile' 
                        ? 'max-w-[375px] border-amber-500/50 rounded-[32px] px-2 py-4' 
                        : previewDevice === 'tablet' 
                        ? 'max-w-[768px] border-stone-700 rounded-[20px] px-3 py-3' 
                        : 'max-w-full border-stone-800 rounded-xl'
                    }`}
                  >
                    {/* Mobile Phone Speaker Notch simulation */}
                    {previewDevice === 'mobile' && (
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-4 bg-stone-900 rounded-full z-30 flex items-center justify-center border border-stone-850">
                        <div className="w-8 h-1 bg-stone-700 rounded-full" />
                      </div>
                    )}

                    <div 
                      className="relative overflow-hidden w-full transition-all duration-300 rounded-lg"
                      style={{
                        minHeight: `${Math.max(bannerHeight || 160, 20 + Math.max(0, logoVerticalOffset) + logoHeight + 25)}px`,
                        backgroundColor: '#1c1917',
                      }}
                    >
                      {/* Background Banner Photo Layer in Preview */}
                      {bannerUrl.trim() && (
                        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" style={{ opacity: 0.9 }}>
                          <div className="h-full relative overflow-hidden w-full">
                            <img
                              src={bannerUrl.trim()}
                              alt="Background preview"
                              className="w-full h-full object-cover"
                              style={{ 
                                objectPosition: `50% ${positionY}%`,
                                transform: `scale(${(bannerZoom || 100) / 100})`,
                                transformOrigin: 'center center',
                                transition: 'transform 0.15s ease-out-in',
                              }}
                            />
                            <div
                              className="absolute inset-0"
                              style={{
                                background: `linear-gradient(to right, rgba(12,10,9,${overlayDarkness / 100}), rgba(12,10,9,${(overlayDarkness + 20) / 100}))`,
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* 1. Absolute / Aligned Logo Container with Layout Guides helper + Drag handlers */}
                      {(() => {
                        const logoStyle: React.CSSProperties = {
                          top: `${20 + logoVerticalOffset}px`,
                        };
                        if (logoAlignment === 'center') {
                          logoStyle.left = `calc(50% + ${logoHorizontalOffset}px)`;
                          logoStyle.transform = 'translateX(-50%)';
                        } else if (logoAlignment === 'right') {
                          logoStyle.right = `${20 - logoHorizontalOffset}px`;
                        } else {
                          logoStyle.left = `${20 + logoHorizontalOffset}px`;
                        }

                        return (
                          <div 
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setIsDraggingLogo(true);
                              setLogoDragStartPos({ x: e.clientX, y: e.clientY });
                              setLogoDragStartOffset({ x: logoHorizontalOffset, y: logoVerticalOffset });
                            }}
                            className={`absolute z-20 group select-none transition-all duration-150 border-2 rounded-xl p-1.5 cursor-grab active:cursor-grabbing ${
                              isDraggingLogo 
                                ? 'border-red-500 bg-red-950/20 scale-105 shadow-xl ring-4 ring-red-500/30' 
                                : 'border-dashed border-red-500/20 hover:border-red-500/60 hover:bg-red-950/10'
                            } ${showLayoutGuides ? 'ring-2 ring-red-500/80 ring-offset-2 ring-offset-stone-950 bg-red-950/30' : ''}`}
                            style={logoStyle}
                            title="Drag Academy Logo to reposition"
                          >
                            {/* Draggable indicator badge */}
                            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-600 text-white font-mono text-[7px] font-black px-1 py-0.5 rounded shadow whitespace-nowrap z-40 pointer-events-none uppercase tracking-widest flex items-center gap-0.5">
                              <span>✥ Logo</span>
                            </div>

                            {showLayoutGuides && (
                              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-red-600 text-white font-mono text-[8px] font-black px-1 py-0.5 rounded shadow whitespace-nowrap z-40 pointer-events-none uppercase tracking-wider">
                                Logo (dx: {logoHorizontalOffset}px, dy: {logoVerticalOffset}px)
                              </div>
                            )}

                            <GymLogoDisplay
                              logo={{
                                url: logoUrl,
                                width: logoWidth,
                                height: logoHeight,
                                borderRadius: circleMaskEnabled ? 9999 : logoBorderRadius,
                                borderWidth: 0,
                                backgroundColor: logoBgColor,
                                fit: settings.logo?.fit || 'contain',
                                borderColor: 'transparent',
                                padding: settings.logo?.padding ?? 2,
                                iconColor: logoIconColor,
                                zoom: logoZoom,
                              }}
                              gymName={gymName}
                            />
                          </div>
                        );
                      })()}

                      {/* 2. Absolute / Aligned School Name & Slogan Text Container with Layout Guides helper + Drag handlers */}
                      {(() => {
                        const textStyle: React.CSSProperties = {
                          top: `${35 + brandingVerticalOffset}px`,
                        };
                        if (brandingAlignment === 'center') {
                          textStyle.left = `calc(50% + ${brandingHorizontalOffset}px)`;
                          textStyle.transform = 'translateX(-50%)';
                          textStyle.textAlign = 'center';
                        } else if (brandingAlignment === 'right') {
                          textStyle.right = `${20 - brandingHorizontalOffset}px`;
                          textStyle.textAlign = 'right';
                        } else {
                          const minLeftGap = logoAlignment === 'left' ? Math.max(120 + logoWidth, 200) : 20;
                          textStyle.left = `${minLeftGap + brandingHorizontalOffset}px`;
                          textStyle.textAlign = 'left';
                        }

                        return (
                          <div 
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setIsDraggingText(true);
                              setDragStartPos({ x: e.clientX, y: e.clientY });
                              setDragStartOffset({ x: brandingHorizontalOffset, y: brandingVerticalOffset });
                            }}
                            className={`absolute z-20 group select-none transition-all duration-150 border-2 rounded-xl p-2 cursor-grab active:cursor-grabbing max-w-[calc(100%-220px)] ${
                              isDraggingText 
                                ? 'border-amber-500 bg-amber-950/20 scale-105 shadow-xl ring-4 ring-amber-500/30' 
                                : 'border-dashed border-amber-500/20 hover:border-amber-500/60 hover:bg-amber-950/10'
                            } ${showLayoutGuides ? 'ring-2 ring-amber-500/80 ring-offset-2 ring-offset-stone-950 bg-amber-950/30' : ''}`}
                            style={textStyle}
                            title="Drag Academy Name & Slogan to reposition"
                          >
                            {/* Draggable indicator badge */}
                            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-amber-500 text-stone-950 font-mono text-[7px] font-black px-1 py-0.5 rounded shadow whitespace-nowrap z-40 pointer-events-none uppercase tracking-widest flex items-center gap-0.5">
                              <span>✥ Text</span>
                            </div>

                            {showLayoutGuides && (
                              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-amber-500 text-stone-950 font-mono text-[8px] font-black px-1 py-0.5 rounded shadow whitespace-nowrap z-40 pointer-events-none uppercase tracking-wider">
                                Text (dx: {brandingHorizontalOffset}px, dy: {brandingVerticalOffset}px)
                              </div>
                            )}

                            <h3 
                              className="font-black tracking-tight drop-shadow-md select-none transition-all truncate"
                              style={{ 
                                color: gymNameColor,
                                fontSize: `${gymNameFontSize}px`,
                                lineHeight: '1.2',
                              }}
                            >
                              {gymName || 'ARTE SUAVE BJJ'}
                            </h3>
                            {slogan && (
                              <p 
                                className="italic mt-0.5 drop-shadow-xs font-semibold select-none transition-all truncate"
                                style={{ 
                                  color: sloganColor,
                                  fontSize: `${sloganFontSize}px`,
                                }}
                              >
                                "{slogan}"
                              </p>
                            )}
                          </div>
                        );
                      })()}

                      {/* Right Side: Mock System Settings Button */}
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-30 inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-red-950/90 to-amber-950/90 text-amber-300 border border-amber-500/50 rounded-xl text-[10px] font-bold shadow-lg select-none opacity-80 flex-shrink-0">
                        <Settings className="w-3.5 h-3.5 text-amber-400" />
                        <span>System Settings</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* TAB 3: USER ACCESS CONTROL */}
          {activeTab === 'users' && (
            <div className="space-y-5">
              {/* Active Session & Switch Account Info */}
              {currentUser && (
                <div className="bg-stone-950 border border-stone-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-stone-900 border border-stone-800 rounded-xl text-amber-400">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold tracking-wider text-stone-500">Active System Session</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-bold text-white text-sm">{currentUser.username}</span>
                        <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 bg-red-950/80 border border-red-900 text-red-400 rounded">
                          {currentUser.role}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-[11px] text-emerald-400 font-medium">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Security: 10-Minute Auto-Logout Active</span>
                      </div>
                    </div>
                  </div>

                  {onLogout && (
                    <button
                      type="button"
                      onClick={() => {
                        onLogout();
                        onClose(); // Close settings when logging out
                      }}
                      className="bg-red-950 hover:bg-red-900 border border-red-800 text-red-300 hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                    >
                      <span>Sign Out / Switch Account</span>
                    </button>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    System User Accounts
                  </h3>
                  <p className="text-xs text-stone-400">
                    Control access credentials, passwords, and staff permission roles
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openAddUser}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-2 shadow transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Create System User</span>
                </button>
              </div>

              {/* Users Roster Table */}
              <div className="bg-stone-950 border border-stone-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs text-stone-300">
                  <thead className="bg-stone-900 border-b border-stone-800 text-stone-400 uppercase tracking-wider">
                    <tr>
                      <th className="p-3.5">Username</th>
                      <th className="p-3.5">Full Name</th>
                      <th className="p-3.5">Role</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Last Login</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800">
                    {systemUsers.map((u) => {
                      const isSelf = currentUser?.id === u.id;
                      return (
                        <tr key={u.id} className="hover:bg-stone-900/50">
                          <td className="p-3.5 font-semibold text-white flex items-center gap-2">
                            <span>{u.username}</span>
                            {isSelf && (
                              <span className="text-[10px] bg-amber-950 border border-amber-800 text-amber-400 px-1.5 py-0.5 rounded">
                                You
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-stone-200">{u.fullName}</td>
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                u.role === 'admin'
                                  ? 'bg-red-950 border border-red-800 text-red-400'
                                  : u.role === 'manager'
                                  ? 'bg-purple-950 border border-purple-800 text-purple-400'
                                  : 'bg-blue-950 border border-blue-800 text-blue-400'
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                u.active
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-900'
                                  : 'bg-stone-800 text-stone-500'
                              }`}
                            >
                              {u.active ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td className="p-3.5 text-stone-400 text-[11px]">
                            {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'}
                          </td>
                          <td className="p-3.5 text-right space-x-2">
                            <button
                              type="button"
                              onClick={() => openEditUser(u)}
                              className="text-stone-400 hover:text-amber-400 p-1.5 rounded-lg hover:bg-stone-800 transition-colors"
                              title="Edit User & Password"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u)}
                              disabled={isSelf}
                              className="text-stone-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-stone-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              title={isSelf ? 'Cannot delete yourself' : 'Delete User'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: DATABASE & BACKUPS */}
          {activeTab === 'database' && (
            <div className="space-y-6">
              {/* GitHub Release & Version Tracker Card */}
              <div className="bg-gradient-to-r from-stone-950 via-stone-900 to-amber-950/40 border border-amber-500/30 rounded-2xl p-5 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-stone-800">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
                      <Tag className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-extrabold text-white uppercase tracking-wide">
                          GitHub Release & Deployment Tracker
                        </h4>
                        <span className="px-2 py-0.5 text-[10px] font-mono font-black uppercase bg-amber-500 text-stone-950 rounded shadow-xs">
                          {getFormattedVersionTag()}
                        </span>
                      </div>
                      <p className="text-xs text-stone-400 mt-0.5">
                        {APP_VERSION_INFO.releaseName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-mono text-stone-300 bg-stone-950/80 px-3 py-1.5 rounded-xl border border-stone-800 shrink-0">
                    <GitBranch className="w-4 h-4 text-emerald-400" />
                    <span>Branch: <strong className="text-emerald-400">{APP_VERSION_INFO.gitBranch}</strong></span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-xs">
                  <div className="bg-stone-950/60 p-3 rounded-xl border border-stone-800">
                    <span className="block text-[10px] font-bold text-stone-400 uppercase">Build Number</span>
                    <span className="text-white font-mono font-bold">{APP_VERSION_INFO.buildNumber}</span>
                  </div>
                  <div className="bg-stone-950/60 p-3 rounded-xl border border-stone-800">
                    <span className="block text-[10px] font-bold text-stone-400 uppercase">Build Date</span>
                    <span className="text-white font-mono font-bold">{new Date(APP_VERSION_INFO.buildTimestamp).toLocaleDateString()}</span>
                  </div>
                  <div className="bg-stone-950/60 p-3 rounded-xl border border-stone-800">
                    <span className="block text-[10px] font-bold text-stone-400 uppercase">Canonical Seed State</span>
                    <span className="text-amber-300 font-mono font-bold">{APP_VERSION_INFO.databaseSeedVersion} (Auto-Seeded)</span>
                  </div>
                </div>

                {/* Changelog Highlights */}
                <div className="mt-3 pt-3 border-t border-stone-800/80">
                  <span className="block text-[11px] font-bold text-stone-300 uppercase tracking-wider mb-1.5">
                    Included Release Features in Git Tracking (`version/version.json`):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-stone-400">
                    {APP_VERSION_INFO.changelog.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                        <span className="truncate">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-stone-950 border border-stone-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-950 border border-emerald-900 rounded-xl text-emerald-400">
                      <Database className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Local Database Health & Repair</h4>
                      <p className="text-xs text-stone-400">Connected to C:\BJJ Academy\Database\bjj_academy.db</p>
                    </div>
                  </div>
                  {onOpenDatabaseManager && (
                    <button
                      type="button"
                      onClick={onOpenDatabaseManager}
                      className="bg-stone-800 hover:bg-stone-700 text-stone-100 text-xs font-semibold px-4 py-2 rounded-xl border border-stone-700 transition-colors"
                    >
                      Open Database Inspector
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Export Backup */}
                {onExportData && (
                  <div className="bg-stone-950 border border-stone-800 rounded-xl p-5 flex flex-col justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                        <Download className="w-4 h-4 text-emerald-400" />
                        Export Full Backup JSON
                      </h4>
                      <p className="text-xs text-stone-400 mb-4">
                        Download a complete JSON snapshot of members, payments, coaches, and settings.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onExportData}
                      className="w-full bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-200 text-xs font-semibold py-2.5 rounded-lg transition-colors"
                    >
                      Download Backup
                    </button>
                  </div>
                )}

                {/* Import Backup */}
                {onImportData && (
                  <div className="bg-stone-950 border border-stone-800 rounded-xl p-5 flex flex-col justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                        <Upload className="w-4 h-4 text-amber-400" />
                        Import Backup JSON
                      </h4>
                      <p className="text-xs text-stone-400 mb-4">
                        Restore system data from a previously exported JSON backup file.
                      </p>
                    </div>
                    <label className="cursor-pointer w-full bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-200 text-xs font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload & Restore Backup</span>
                      <input type="file" accept=".json" onChange={onImportData} className="hidden" />
                    </label>
                  </div>
                )}

                {/* Load Sample / Test Dummy Data */}
                {onLoadSampleData && (
                  <div className="bg-stone-950 border border-stone-800 rounded-xl p-5 flex flex-col justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        Load Test & Sample Data
                      </h4>
                      <p className="text-xs text-stone-400 mb-4">
                        Populate comprehensive dummy data (kids students, teens, adults, coaches, classes, attendance, payments) to test all application logic.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onLoadSampleData}
                      className="cursor-pointer w-full bg-amber-950/60 hover:bg-amber-900/80 border border-amber-800/80 text-amber-300 hover:text-white text-xs font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Load Sample / Dummy Data</span>
                    </button>
                  </div>
                )}

                {/* Factory Reset Data Erase */}
                {onResetData && (
                  <div className="bg-stone-950 border border-stone-800 rounded-xl p-5 flex flex-col justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                        <Trash2 className="w-4 h-4 text-red-400" />
                        Factory Reset (Wipe All Records)
                      </h4>
                      <p className="text-xs text-stone-400 mb-4">
                        Completely erase all members, classes, coaches, attendance, and payments to start from an empty database.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onResetData}
                      className="cursor-pointer w-full bg-red-950/60 hover:bg-red-900/80 border border-red-800/80 text-red-300 hover:text-white text-xs font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Erase All Data (Reset to 0)</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* INNER MODAL: ADD / EDIT USER */}
      {userModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-md p-6 shadow-2xl text-stone-100 relative">
            <button
              onClick={() => setUserModalOpen(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-100"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold font-raven text-white mb-1 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-400" />
              <span>{editingUser ? 'Edit User Account' : 'Create System User'}</span>
            </h3>
            <p className="text-xs text-stone-400 mb-5">
              Password will be securely encrypted with SHA-256 + Salt before storage.
            </p>

            {userError && (
              <div className="mb-4 bg-red-950/80 border border-red-800 text-red-200 text-xs p-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{userError}</span>
              </div>
            )}

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. coach_lucas"
                  className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Lucas Silva"
                  className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">Access Role</label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value as UserRole)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-600"
                >
                  <option value="admin">Administrator (Full Access)</option>
                  <option value="manager">Manager (Operations & Billing)</option>
                  <option value="staff">Staff / Desk Coach (Check-In & Attendance)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  {editingUser ? 'New Password (leave blank to keep current)' : 'Password'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-600"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="userActive"
                  checked={userActive}
                  onChange={(e) => setUserActive(e.target.checked)}
                  className="rounded bg-stone-950 border-stone-800 text-red-600 focus:ring-0"
                />
                <label htmlFor="userActive" className="text-xs text-stone-300 cursor-pointer">
                  Account is Active & Permitted to Login
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold bg-stone-800 text-stone-300 hover:bg-stone-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingUser ? 'Update Account' : 'Create User'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
