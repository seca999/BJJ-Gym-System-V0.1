import React, { useState, useEffect, useRef } from 'react';
import { GymSettings, SystemUser, UserRole, AuditLogEntry } from '../types';
import { getAuditLogs, clearAuditLogs } from '../utils/auditLogger';
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
  Image as ImageIcon, 
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
  Tag,
  Pipette,
  ClipboardList,
  UserCheck,
  CreditCard,
  Search,
  Clock,
  Filter,
  ShieldAlert,
  RefreshCw,
  Rocket,
  Layers,
  ExternalLink,
  Eye,
  CheckCircle2,
  HardDrive,
  GitPullRequest,
  ArrowRight
} from 'lucide-react';
import { APP_VERSION_INFO, getFormattedVersionTag } from '../version';
import { 
  checkForGitHubUpdates, 
  executeAutoDeployment, 
  getUpdateConfig, 
  saveUpdateConfig, 
  GitHubReleaseInfo, 
  DeploymentProgress, 
  UpdateConfig,
  HARDCODED_REPO,
  HARDCODED_BRANCH
} from '../utils/updateManager';

interface SystemSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GymSettings;
  onSaveSettings: (newSettings: GymSettings) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  currentUser: SystemUser | null;
  initialTab?: SystemSettingsTab;
  onOpenDatabaseManager?: () => void;
  onOpenHeaderEditor?: () => void;
  onExportData?: () => void;
  onImportData?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLoadSampleData?: () => void;
  onResetData?: () => void;
  onLogout?: () => void;
}

type SystemSettingsTab = 'logs' | 'users' | 'branding' | 'updates' | 'database';

const SOLID_COLOR_PRESETS = [
  {
    category: '🥋 Dojo Stealth & Black Belts',
    colors: [
      { name: 'Pitch Black', hex: '#000000' },
      { name: 'Obsidian Onyx', hex: '#0c0a09' },
      { name: 'Dark Zinc', hex: '#18181b' },
      { name: 'Deep Stone', hex: '#1c1917' },
      { name: 'Gunmetal Gray', hex: '#27272a' },
      { name: 'Slate Graphite', hex: '#334155' },
    ],
  },
  {
    category: '🎖️ BJJ Belt Rank Colors',
    colors: [
      { name: 'White Belt / Pure White', hex: '#ffffff' },
      { name: 'Chalk Off-White', hex: '#f8fafc' },
      { name: 'Royal Blue Belt', hex: '#1e3a8a' },
      { name: 'Competition Cobalt', hex: '#1d4ed8' },
      { name: 'Vibrant Blue', hex: '#2563eb' },
      { name: 'Imperial Purple Belt', hex: '#581c87' },
      { name: 'Deep Violet', hex: '#4c1d95' },
      { name: 'Earth Brown Belt', hex: '#451a03' },
      { name: 'Saddle Leather', hex: '#78350f' },
      { name: 'Black Belt Red Bar', hex: '#991b1b' },
      { name: 'Crimson Scarlet', hex: '#dc2626' },
      { name: 'Deep Maroon', hex: '#450a0a' },
    ],
  },
  {
    category: '🌿 Championship Mats & Modern Athletics',
    colors: [
      { name: 'Dojo Tatami Green', hex: '#064e3b' },
      { name: 'Deep Emerald', hex: '#065f46' },
      { name: 'Midnight Navy', hex: '#0f172a' },
      { name: 'Dark Ocean Blue', hex: '#1e293b' },
      { name: 'Deep Teal', hex: '#134e4a' },
      { name: 'Imperial Plum', hex: '#701a75' },
      { name: 'Rich Burgundy', hex: '#4c0519' },
      { name: 'Warm Espresso', hex: '#292524' },
      { name: 'Golden Honeycomb', hex: '#b45309' },
    ],
  },
  {
    category: '⚪ Clean Minimalist & Light Mats',
    colors: [
      { name: 'Pure Snow White', hex: '#ffffff' },
      { name: 'Ghost White', hex: '#f8fafc' },
      { name: 'Cool Slate Light', hex: '#f1f5f9' },
      { name: 'Platinum Silver', hex: '#e2e8f0' },
      { name: 'Warm Cream Stone', hex: '#f5f5f4' },
      { name: 'Soft Sand', hex: '#e7e5e4' },
    ],
  },
];

export const SystemSettingsModal: React.FC<SystemSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  theme,
  onToggleTheme,
  currentUser,
  initialTab = 'logs',
  onOpenDatabaseManager,
  onOpenHeaderEditor,
  onExportData,
  onImportData,
  onLoadSampleData,
  onResetData,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<SystemSettingsTab>(initialTab || 'logs');

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [logSearch, setLogSearch] = useState('');
  const [logCategoryFilter, setLogCategoryFilter] = useState<string>('ALL');

  useEffect(() => {
    setAuditLogs(getAuditLogs());
    const handleUpdate = () => setAuditLogs(getAuditLogs());
    window.addEventListener('audit_logs_updated', handleUpdate);
    return () => window.removeEventListener('audit_logs_updated', handleUpdate);
  }, []);

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

  // Header & App Solid Background Color & Fill Mode State
  const [headerBgColor, setHeaderBgColor] = useState<string>(settings.headerBgColor || '#0c0a09');
  const [headerBgType, setHeaderBgType] = useState<'solid' | 'photo' | 'both'>(settings.headerBgType || 'both');
  const [appBgColor, setAppBgColor] = useState<string>(settings.appBgColor || '');
  const [bannerUrl, setBannerUrl] = useState(settings.headerBanner?.url || '');
  const [bannerHeight, setBannerHeight] = useState(settings.headerBanner?.height || 160);
  const [bannerZoom, setBannerZoom] = useState(settings.headerBanner?.zoom || 100);
  const [overlayDarkness, setOverlayDarkness] = useState(settings.headerBanner?.overlayDarkness ?? 50);

  // Branding active sub-view
  const [brandingSubTab, setBrandingSubTab] = useState<'colors' | 'logo' | 'typography' | 'wallpaper' | 'theme'>('colors');
  const [colorTarget, setColorTarget] = useState<'header' | 'background'>('header');
  const [eyedropperNotice, setEyedropperNotice] = useState<string | null>(null);

  // Position levels & alignment for School Name & Slogan
  const [brandingAlignment, setBrandingAlignment] = useState<'left' | 'center' | 'right'>(settings.brandingAlignment || 'left');
  const [brandingVerticalOffset, setBrandingVerticalOffset] = useState<number>(settings.brandingVerticalOffset || 0);
  const [brandingHorizontalOffset, setBrandingHorizontalOffset] = useState<number>(settings.brandingHorizontalOffset || 0);
  
  // Independent Position & alignment for Logo
  const [logoAlignment, setLogoAlignment] = useState<'left' | 'center' | 'right'>(settings.logoAlignment || 'left');
  const [logoVerticalOffset, setLogoVerticalOffset] = useState<number>(settings.logoVerticalOffset || 0);
  const [logoHorizontalOffset, setLogoHorizontalOffset] = useState<number>(settings.logoHorizontalOffset || 0);
  const [logoZoom, setLogoZoom] = useState(settings.logo?.zoom || 100);
  const [circleMaskEnabled, setCircleMaskEnabled] = useState<boolean>(settings.logo?.borderRadius === 9999);

  // User Management State
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [userToDelete, setUserToDelete] = useState<SystemUser | null>(null);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [userRole, setUserRole] = useState<UserRole>('staff');
  const [password, setPassword] = useState('');
  const [userActive, setUserActive] = useState(true);
  const [userError, setUserError] = useState<string | null>(null);
  const [userSuccess, setUserSuccess] = useState<string | null>(null);

  // GitHub Updates & Deployment State
  const [updateConfig, setUpdateConfig] = useState<UpdateConfig>(() => getUpdateConfig());
  const [customRepoInput, setCustomRepoInput] = useState(HARDCODED_REPO);
  const [customBranchInput, setCustomBranchInput] = useState(HARDCODED_BRANCH);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [updateCheckResult, setUpdateCheckResult] = useState<{ checked: boolean; release?: GitHubReleaseInfo; error?: string } | null>(null);
  const [availableVersions, setAvailableVersions] = useState<GitHubReleaseInfo[]>([]);
  const [nextVersion, setNextVersion] = useState<GitHubReleaseInfo | null>(null);
  const [isDeployingUpdate, setIsDeployingUpdate] = useState(false);
  const [deploymentProgress, setDeploymentProgress] = useState<DeploymentProgress | null>(null);

  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialTab) {
        setActiveTab(initialTab);
      }
      loadSystemUsers().then((users) => setSystemUsers(users));
      setGymName(settings.gymName || '');
      setSlogan(settings.slogan || '');
      setLogoUrl(settings.logo?.url || '');
      setLogoWidth(settings.logo?.width || 84);
      setLogoHeight(settings.logo?.height || 84);
      setLogoBorderRadius(settings.logo?.borderRadius || 12);
      setLogoBorderWidth(settings.logo?.borderWidth || 1);
      setLogoBgColor(settings.logo?.backgroundColor || 'transparent');
      setCurrencySymbol(settings.currencySymbol || 'JOD');
      setGymNameColor(settings.gymNameColor || '#ffffff');
      setGymNameFontSize(settings.gymNameFontSize || 32);
      setSloganColor(settings.sloganColor || '#f59e0b');
      setSloganFontSize(settings.sloganFontSize || 14);
      setLogoIconColor(settings.logo?.iconColor || '#ffffff');
      setLogoBorderColor(settings.logo?.borderColor || '#dc2626');
      setHeaderBgColor(settings.headerBgColor || '#0c0a09');
      setHeaderBgType(settings.headerBgType || 'both');
      setAppBgColor(settings.appBgColor || '');
      setBannerUrl(settings.headerBanner?.url || '');
      setBannerHeight(settings.headerBanner?.height || 160);
      setBannerZoom(settings.headerBanner?.zoom || 100);
      setOverlayDarkness(settings.headerBanner?.overlayDarkness ?? 50);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  // Browser Eyedropper API Helper
  const handleEyedropperPick = async (onColorPicked: (hex: string) => void) => {
    if (!('EyeDropper' in window)) {
      setEyedropperNotice(
        'The Eyedropper tool is supported in modern desktop browsers (Chrome, Edge, Opera). You can also use the color picker wheel or select from any curated swatch!'
      );
      setTimeout(() => setEyedropperNotice(null), 6000);
      return;
    }
    setEyedropperNotice(null);
    try {
      const eyeDropper = new (window as any).EyeDropper();
      const result = await eyeDropper.open();
      if (result?.sRGBHex) {
        onColorPicked(result.sRGBHex);
      }
    } catch {
      // User cancelled
    }
  };

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
    headerBgColor?: string;
    headerBgType?: 'solid' | 'photo' | 'both';
    appBgColor?: string;
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
    const activeOverlayDarkness = overrides.overlayDarkness !== undefined ? overrides.overlayDarkness : overlayDarkness;
    const activeGymNameColor = overrides.gymNameColor !== undefined ? overrides.gymNameColor : gymNameColor;
    const activeGymNameFontSize = overrides.gymNameFontSize !== undefined ? overrides.gymNameFontSize : gymNameFontSize;
    const activeSloganColor = overrides.sloganColor !== undefined ? overrides.sloganColor : sloganColor;
    const activeSloganFontSize = overrides.sloganFontSize !== undefined ? overrides.sloganFontSize : sloganFontSize;
    const activeLogoIconColor = overrides.logoIconColor !== undefined ? overrides.logoIconColor : logoIconColor;
    const activeHeaderBgColor = overrides.headerBgColor !== undefined ? overrides.headerBgColor : headerBgColor;
    const activeHeaderBgType = overrides.headerBgType !== undefined ? overrides.headerBgType : headerBgType;
    const activeAppBgColor = overrides.appBgColor !== undefined ? overrides.appBgColor : appBgColor;

    const updatedSettings: GymSettings = {
      ...settings,
      gymName: activeGymName.trim(),
      slogan: activeSlogan.trim(),
      currencySymbol: currencySymbol.trim() || 'JOD',
      gymNameColor: activeGymNameColor,
      gymNameFontSize: Number(activeGymNameFontSize),
      sloganColor: activeSloganColor,
      sloganFontSize: Number(activeSloganFontSize),
      headerBgColor: activeHeaderBgColor,
      headerBgType: activeHeaderBgType,
      appBgColor: activeAppBgColor.trim() || undefined,
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
        opacity: settings.headerBanner?.opacity ?? 0.85,
        blur: settings.headerBanner?.blur ?? 0,
        positionX: settings.headerBanner?.positionX ?? 50,
        positionY: settings.headerBanner?.positionY ?? 50,
        fit: settings.headerBanner?.fit || 'cover',
        overlayDarkness: Number(activeOverlayDarkness),
        zoom: Number(activeBannerZoom),
      },
    };

    onSaveSettings(updatedSettings);
  };

  const handleSaveBranding = (e: React.FormEvent) => {
    e.preventDefault();
    updateBrandingRealTime({});
    setUserSuccess('Academy Logo, Header Background & Theme Styling saved successfully!');
    setTimeout(() => setUserSuccess(null), 3500);
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
      e.target.value = '';
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
      e.target.value = '';
    }
  };

  // Check for Updates action
  const handleCheckUpdates = async () => {
    setIsCheckingUpdates(true);
    setUpdateCheckResult(null);
    setDeploymentProgress(null);
    try {
      const res = await checkForGitHubUpdates(customRepoInput, customBranchInput);
      setUpdateCheckResult({ checked: true, release: res.release, error: res.error });
      if (res.versions && res.versions.length > 0) {
        setAvailableVersions(res.versions);
        const top = res.versions[0];
        setNextVersion(top);
        if (top.isNewer) {
          setUserSuccess(`New update found! Version Code ${top.versionCode || top.version} is available to install.`);
        } else {
          setUserSuccess(`No new updates found on GitHub. Your academy system is all up to date!`);
        }
        setTimeout(() => setUserSuccess(null), 5000);
      } else if (res.error) {
        setUserError(res.error);
        setTimeout(() => setUserError(null), 5000);
      }
    } catch (err: any) {
      setUpdateCheckResult({ checked: true, error: err.message });
    } finally {
      setIsCheckingUpdates(false);
    }
  };

  // Deploy Update action (targets the Next / New Version directly)
  const handleDeployUpdate = async () => {
    const targetToDeploy = nextVersion || updateCheckResult?.release;
    if (!targetToDeploy) return;
    setIsDeployingUpdate(true);
    try {
      const res = await executeAutoDeployment(targetToDeploy, (prog) => {
        setDeploymentProgress(prog);
      });
      if (res.success) {
        setUserSuccess(`Version ${targetToDeploy.version} installed! Application is reloading...`);
      }
    } catch (err: any) {
      setDeploymentProgress({
        step: 'error',
        percent: 0,
        message: 'Deployment failed.',
        error: err.message,
      });
    } finally {
      setIsDeployingUpdate(false);
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
    setPassword('');
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

  const handleRequestDeleteUser = (u: SystemUser) => {
    setUserToDelete(u);
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    const u = userToDelete;
    const result = await deleteUserAccount(u.id, currentUser?.id);
    if (result.success) {
      setSystemUsers(result.users);
      setUserSuccess(`User "${u.username}" deleted.`);
      setTimeout(() => setUserSuccess(null), 3000);
      setUserToDelete(null);
    } else {
      alert(result.error || 'Failed to delete user.');
      setUserToDelete(null);
    }
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'CHECK_IN':
        return { label: 'Check-In', bg: 'bg-emerald-950/80 text-emerald-300 border-emerald-800', icon: UserCheck };
      case 'MEMBER':
        return { label: 'Student', bg: 'bg-blue-950/80 text-blue-300 border-blue-800', icon: Users };
      case 'PAYMENT':
        return { label: 'Payment', bg: 'bg-amber-950/80 text-amber-300 border-amber-800', icon: CreditCard };
      case 'SECURITY':
        return { label: 'Security', bg: 'bg-red-950/80 text-red-300 border-red-800', icon: ShieldAlert };
      case 'SYSTEM':
        return { label: 'System', bg: 'bg-purple-950/80 text-purple-300 border-purple-800', icon: Settings };
      default:
        return { label: 'General', bg: 'bg-stone-800 text-stone-300 border-stone-700', icon: ClipboardList };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 text-stone-100 rounded-2xl w-full max-w-5xl h-[90vh] min-h-[660px] max-h-[890px] shadow-2xl overflow-hidden flex flex-col my-auto shrink-0">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-stone-950 border-b border-stone-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-950/80 border border-red-900/60 rounded-xl text-red-400">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-raven text-white tracking-wide">
                SYSTEM SETTINGS & CONFIGURATION
              </h2>
              <p className="text-xs text-stone-400">
                Manage academy branding, header styling, system auto-updates, user access, and backups
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

        {/* Segmented Tab Navigation Bar */}
        <div className="bg-stone-950 px-4 sm:px-5 py-3 border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-2 p-1.5 bg-stone-900/90 rounded-xl border border-stone-800/80 overflow-x-auto no-scrollbar">
            {[
              { id: 'logs', label: 'Logs & Timeline', icon: ClipboardList },
              { id: 'users', label: 'User Access Control', icon: Users },
              { id: 'branding', label: 'Logo, Header & Theme', icon: Palette },
              { id: 'updates', label: 'Check for updates', icon: Rocket },
              { id: 'database', label: 'Database & Backups', icon: Database },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as SystemSettingsTab)}
                  className={`flex-1 min-w-[150px] py-2.5 px-3 text-xs font-extrabold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
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

        {/* Modal Content Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-stone-900 min-h-0">

          {/* TAB 1: APPLICATION LOGS & TIMELINE */}
          {activeTab === 'logs' && (() => {
            const filteredLogs = auditLogs.filter((log) => {
              if (logCategoryFilter !== 'ALL' && log.category !== logCategoryFilter) return false;
              if (!logSearch.trim()) return true;
              const q = logSearch.toLowerCase();
              return (
                log.action.toLowerCase().includes(q) ||
                log.details.toLowerCase().includes(q) ||
                log.userName.toLowerCase().includes(q) ||
                log.date.includes(q)
              );
            });

            return (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-amber-400" />
                      Application Audit Timeline & Security Logs
                    </h3>
                    <p className="text-xs text-stone-400">
                      Real-time roll call history, payments audit, member status transitions, and user logins
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-stone-400 font-mono bg-stone-950 px-2.5 py-1 rounded-lg border border-stone-800">
                      Total: <strong className="text-amber-400">{filteredLogs.length}</strong> events
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
                    <input
                      type="text"
                      value={logSearch}
                      onChange={(e) => setLogSearch(e.target.value)}
                      placeholder="Search events, student names, actions, or IP addresses..."
                      className="w-full pl-9 pr-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Audit Timeline List */}
                <div className="space-y-3">
                  {filteredLogs.length === 0 ? (
                    <div className="p-10 text-center bg-stone-950 border border-stone-800 rounded-2xl text-stone-400 text-xs">
                      No application log records matching your filter.
                    </div>
                  ) : (
                    filteredLogs.map((log) => {
                      const badge = getCategoryBadge(log.category);
                      const BadgeIcon = badge.icon;
                      return (
                        <div
                          key={log.id}
                          className="p-4 bg-stone-950 border border-stone-800/90 hover:border-stone-700 rounded-2xl transition-all shadow-md flex items-start gap-3.5"
                        >
                          <div className={`p-2.5 rounded-xl border shrink-0 mt-0.5 ${badge.bg}`}>
                            <BadgeIcon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${badge.bg}`}>
                                  {badge.label}
                                </span>
                                <h4 className="text-xs font-black text-white">{log.action}</h4>
                              </div>
                              <div className="flex items-center gap-2 text-[11px] font-bold text-stone-400 shrink-0">
                                <Clock className="w-3 h-3 text-amber-500" />
                                <span>{log.date} • {log.time}</span>
                              </div>
                            </div>
                            <p className="text-xs text-stone-300 font-medium leading-relaxed">
                              {log.details}
                            </p>
                            <div className="pt-1.5 flex items-center justify-between text-[11px] text-stone-400 border-t border-stone-900/80">
                              <span className="font-semibold text-amber-300 flex items-center gap-1">
                                <Users className="w-3 h-3 text-stone-500" />
                                <span>By: <strong>{log.userName}</strong> {log.userRole ? `(${log.userRole})` : ''}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })()}

          {/* TAB 2: USER ACCESS CONTROL */}
          {activeTab === 'users' && (
            <div className="space-y-5">
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
                    </div>
                  </div>
                  {onLogout && (
                    <button
                      type="button"
                      onClick={() => {
                        onLogout();
                        onClose();
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
                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-2 shadow transition-colors cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Create System User</span>
                </button>
              </div>

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
                              onClick={() => handleRequestDeleteUser(u)}
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

          {/* TAB 3: LOGO, HEADER STYLE & THEME BRANDING */}
          {activeTab === 'branding' && (
            <div className="space-y-6">
              {/* Live Preview Header Card */}
              <div className="bg-stone-950 border border-stone-800 rounded-2xl p-4 shadow-xl space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-stone-850">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-amber-500" />
                    <span>Live Header Branding Preview</span>
                  </span>
                  <span className="text-[11px] font-bold text-stone-400">
                    Real-time changes apply immediately
                  </span>
                </div>

                {/* Simulated Header Banner Preview */}
                <div
                  className="w-full rounded-xl overflow-hidden relative border border-stone-800 flex items-center justify-between px-6 py-4 transition-all duration-300 shadow-inner"
                  style={{
                    backgroundColor: headerBgColor || '#0c0a09',
                    minHeight: `${Math.min(180, Math.max(90, bannerHeight))}px`,
                  }}
                >
                  {/* Photo wallpaper layer */}
                  {bannerUrl && headerBgType !== 'solid' && (
                    <div
                      className="absolute inset-0 pointer-events-none bg-cover bg-center"
                      style={{
                        backgroundImage: `url(${bannerUrl})`,
                        opacity: (100 - overlayDarkness) / 100,
                        transform: `scale(${bannerZoom / 100})`,
                      }}
                    />
                  )}

                  <div className="relative z-10 flex items-center gap-4 w-full">
                    {/* Logo display */}
                    <div
                      className="shrink-0 rounded-xl overflow-hidden border flex items-center justify-center transition-transform shadow-md"
                      style={{
                        width: `${Math.min(110, Math.max(48, logoWidth))}px`,
                        height: `${Math.min(110, Math.max(48, logoHeight))}px`,
                        borderRadius: circleMaskEnabled ? '9999px' : `${logoBorderRadius}px`,
                        borderColor: logoBorderColor || '#dc2626',
                        backgroundColor: logoBgColor || 'transparent',
                      }}
                    >
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt="Gym Logo"
                          className="w-full h-full object-contain"
                          style={{ transform: `scale(${logoZoom / 100})` }}
                        />
                      ) : (
                        <span className="font-black text-xs" style={{ color: logoIconColor }}>
                          LOGO
                        </span>
                      )}
                    </div>

                    {/* Academy Text */}
                    <div className="min-w-0">
                      <h3
                        className="font-black uppercase tracking-wider truncate leading-tight drop-shadow-md"
                        style={{
                          color: gymNameColor || '#ffffff',
                          fontSize: `${Math.min(36, Math.max(16, gymNameFontSize))}px`,
                        }}
                      >
                        {gymName || 'RAVENS BJJ ACADEMY'}
                      </h3>
                      <p
                        className="font-bold tracking-wide truncate mt-0.5 drop-shadow-sm"
                        style={{
                          color: sloganColor || '#f59e0b',
                          fontSize: `${Math.min(18, Math.max(10, sloganFontSize))}px`,
                        }}
                      >
                        {slogan || 'SAMY AL-JAMAL BRAZILIAN JIU-JITSU & MARTIAL ARTS'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sub-Navigation for Branding Sections */}
              <div className="flex items-center gap-1.5 p-1 bg-stone-950 rounded-xl border border-stone-800 overflow-x-auto">
                {[
                  { id: 'colors', label: 'Solid Colors & Eyedropper', icon: Pipette },
                  { id: 'logo', label: 'Logo & Emblem', icon: ImageIcon },
                  { id: 'typography', label: 'School Name & Slogan', icon: Type },
                  { id: 'wallpaper', label: 'Photo Banner & Height', icon: Layers },
                  { id: 'theme', label: 'Dark / Light Theme', icon: Sun },
                ].map((st) => {
                  const Icon = st.icon;
                  const isAct = brandingSubTab === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setBrandingSubTab(st.id as any)}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                        isAct
                          ? 'bg-amber-500 text-stone-950 font-black shadow-sm'
                          : 'text-stone-400 hover:text-white'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{st.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* SUBTAB 1: SOLID COLORS & LIVE EYEDROPPER */}
              {brandingSubTab === 'colors' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {eyedropperNotice && (
                    <div className="p-3 bg-amber-950/80 border border-amber-600/60 rounded-xl text-xs text-amber-200 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>{eyedropperNotice}</span>
                    </div>
                  )}

                  {/* Target Switcher */}
                  <div className="p-3 bg-stone-950 border border-stone-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-2.5">
                    <span className="text-xs font-black uppercase tracking-wider text-stone-300 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>Choose Background Target:</span>
                    </span>
                    <div className="flex items-center gap-1.5 bg-stone-900 p-1 rounded-xl border border-stone-800 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => setColorTarget('header')}
                        className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                          colorTarget === 'header'
                            ? 'bg-amber-500 text-stone-950 shadow-md'
                            : 'text-stone-400 hover:text-white'
                        }`}
                      >
                        🥋 Header Background
                      </button>
                      <button
                        type="button"
                        onClick={() => setColorTarget('background')}
                        className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                          colorTarget === 'background'
                            ? 'bg-amber-500 text-stone-950 shadow-md'
                            : 'text-stone-400 hover:text-white'
                        }`}
                      >
                        💻 Full App Background
                      </button>
                    </div>
                  </div>

                  {/* Eyedropper & Color Wheel Card */}
                  <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-stone-850">
                      <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                        <Pipette className="w-4 h-4 text-amber-500" />
                        <span>
                          {colorTarget === 'header' ? 'Header Solid Color & Screen Eyedropper' : 'Application Solid Background & Eyedropper'}
                        </span>
                      </span>
                      <span className="text-[11px] font-mono font-bold text-stone-400">
                        HEX: <strong className="text-white">{colorTarget === 'header' ? headerBgColor : (appBgColor || 'Default Theme')}</strong>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                      <div className="flex items-center gap-3.5 bg-stone-900 p-3.5 rounded-xl border border-stone-800">
                        <div
                          className="w-12 h-12 rounded-xl border-2 border-amber-500/60 shadow-lg shrink-0 transition-transform hover:scale-105"
                          style={{ backgroundColor: colorTarget === 'header' ? headerBgColor : (appBgColor || '#0c0a09') }}
                        />
                        <div className="flex-1 min-w-0 space-y-1">
                          <label className="text-[10px] text-stone-400 uppercase font-black tracking-wider block">
                            Pick or Type HEX Color
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={colorTarget === 'header' ? headerBgColor : (appBgColor || '#0c0a09')}
                              onChange={(e) => {
                                if (colorTarget === 'header') {
                                  setHeaderBgColor(e.target.value);
                                  updateBrandingRealTime({ headerBgColor: e.target.value, headerBgType: 'solid' });
                                } else {
                                  setAppBgColor(e.target.value);
                                  updateBrandingRealTime({ appBgColor: e.target.value });
                                }
                              }}
                              className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent p-0 shrink-0"
                            />
                            <input
                              type="text"
                              value={colorTarget === 'header' ? headerBgColor : appBgColor}
                              onChange={(e) => {
                                if (colorTarget === 'header') {
                                  setHeaderBgColor(e.target.value);
                                  updateBrandingRealTime({ headerBgColor: e.target.value, headerBgType: 'solid' });
                                } else {
                                  setAppBgColor(e.target.value);
                                  updateBrandingRealTime({ appBgColor: e.target.value });
                                }
                              }}
                              placeholder="#0C0A09"
                              className="w-28 bg-stone-950 border border-stone-700 rounded-lg px-2.5 py-1 text-xs font-mono font-black text-amber-300 uppercase focus:border-amber-500 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="bg-stone-900 p-3.5 rounded-xl border border-stone-800 flex items-center justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                            <Pipette className="w-3.5 h-3.5 text-amber-400" />
                            <span>Live Eyedropper Tool</span>
                          </h4>
                          <p className="text-[11px] text-stone-400 mt-0.5">
                            Sample color from any pixel on your screen.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            handleEyedropperPick((col) => {
                              if (colorTarget === 'header') {
                                setHeaderBgColor(col);
                                updateBrandingRealTime({ headerBgColor: col, headerBgType: 'solid' });
                              } else {
                                setAppBgColor(col);
                                updateBrandingRealTime({ appBgColor: col });
                              }
                            })
                          }
                          className="px-4 py-2 bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-stone-950 font-black rounded-xl text-xs inline-flex items-center gap-1.5 transition-all shadow-md cursor-pointer shrink-0"
                        >
                          <Pipette className="w-3.5 h-3.5 fill-stone-950" />
                          <span>Pick Color</span>
                        </button>
                      </div>
                    </div>

                    {/* Shortcuts */}
                    <div className="pt-2 border-t border-stone-850 flex items-center gap-2 flex-wrap text-xs">
                      {colorTarget === 'background' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setAppBgColor(headerBgColor);
                              updateBrandingRealTime({ appBgColor: headerBgColor });
                            }}
                            className="px-2.5 py-1 bg-stone-900 hover:bg-stone-800 border border-amber-600/50 text-amber-300 rounded-lg text-[10px] font-bold cursor-pointer"
                          >
                            🔗 Match Header ({headerBgColor})
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAppBgColor('');
                              updateBrandingRealTime({ appBgColor: '' });
                            }}
                            className="px-2.5 py-1 bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 rounded-lg text-[10px] font-bold cursor-pointer"
                          >
                            🔄 Reset to Default Theme
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setGymNameColor('#ffffff');
                              setSloganColor('#f59e0b');
                              updateBrandingRealTime({ gymNameColor: '#ffffff', sloganColor: '#f59e0b' });
                            }}
                            className="px-2.5 py-1 bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 rounded-lg text-[10px] font-bold cursor-pointer"
                          >
                            ⚪ White Text (For Dark Solids)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setGymNameColor('#0c0a09');
                              setSloganColor('#dc2626');
                              updateBrandingRealTime({ gymNameColor: '#0c0a09', sloganColor: '#dc2626' });
                            }}
                            className="px-2.5 py-1 bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 rounded-lg text-[10px] font-bold cursor-pointer"
                          >
                            ⚫ Black Text (For Light Solids)
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Preset Swatches */}
                  <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-4">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-400 block">
                      Curated Academy Solid Color Palettes
                    </span>
                    <div className="space-y-4">
                      {SOLID_COLOR_PRESETS.map((group) => (
                        <div key={group.category} className="space-y-2">
                          <h5 className="text-[11px] font-black uppercase text-stone-300">{group.category}</h5>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                            {group.colors.map((c) => {
                              const activeCol = colorTarget === 'header' ? headerBgColor : (appBgColor || '#0c0a09');
                              const isSel = activeCol.toLowerCase() === c.hex.toLowerCase();
                              const isLight = c.hex.toLowerCase() === '#ffffff' || c.hex.toLowerCase() === '#f8fafc' || c.hex.toLowerCase() === '#f1f5f9';
                              return (
                                <button
                                  key={c.hex}
                                  type="button"
                                  onClick={() => {
                                    if (colorTarget === 'header') {
                                      setHeaderBgColor(c.hex);
                                      updateBrandingRealTime({
                                        headerBgColor: c.hex,
                                        headerBgType: 'solid',
                                        ...(isLight && gymNameColor === '#ffffff' ? { gymNameColor: '#0c0a09' } : {}),
                                      });
                                    } else {
                                      setAppBgColor(c.hex);
                                      updateBrandingRealTime({ appBgColor: c.hex });
                                    }
                                  }}
                                  className={`p-2 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 text-center cursor-pointer ${
                                    isSel
                                      ? 'border-amber-400 bg-stone-900 shadow-md'
                                      : 'border-stone-800 bg-stone-900/60 hover:border-stone-600'
                                  }`}
                                >
                                  <div
                                    className={`w-7 h-7 rounded-lg border shadow-xs flex items-center justify-center ${
                                      isLight ? 'border-stone-400' : 'border-stone-700'
                                    }`}
                                    style={{ backgroundColor: c.hex }}
                                  >
                                    {isSel && <Check className={`w-3.5 h-3.5 ${isLight ? 'text-stone-950' : 'text-white'}`} />}
                                  </div>
                                  <span className="text-[10px] font-bold text-stone-300 truncate w-full">{c.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* SUBTAB 2: LOGO & EMBLEM */}
              {brandingSubTab === 'logo' && (
                <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-4 animate-in fade-in duration-150">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-400 block">
                    Academy Logo Emblem & Sizing
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3.5 bg-stone-900 rounded-xl border border-stone-800 space-y-2">
                      <label className="text-xs font-bold text-white block">Upload Logo Image File</label>
                      <input ref={logoFileInputRef} type="file" accept="image/*" onChange={handleLogoFileUpload} className="hidden" />
                      <button
                        type="button"
                        onClick={() => logoFileInputRef.current?.click()}
                        className="w-full py-2.5 px-3 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
                      >
                        <Upload className="w-4 h-4 text-amber-400" />
                        <span>Choose Logo File (.png, .jpg, .svg, .webp)...</span>
                      </button>
                    </div>

                    <div className="p-3.5 bg-stone-900 rounded-xl border border-stone-800 space-y-2">
                      <label className="text-xs font-bold text-white block">Or Paste Logo Image URL</label>
                      <input
                        type="url"
                        value={logoUrl}
                        onChange={(e) => {
                          setLogoUrl(e.target.value);
                          updateBrandingRealTime({ logoUrl: e.target.value });
                        }}
                        placeholder="https://..."
                        className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                  </div>

                  {/* Logo Dimensions & Mask */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-stone-300">
                        <span>Logo Width</span>
                        <span className="font-mono text-amber-400 font-bold">{logoWidth}px</span>
                      </div>
                      <input
                        type="range"
                        min="40"
                        max="240"
                        value={logoWidth}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setLogoWidth(v);
                          updateBrandingRealTime({ logoWidth: v });
                        }}
                        className="w-full accent-amber-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-stone-300">
                        <span>Logo Height</span>
                        <span className="font-mono text-amber-400 font-bold">{logoHeight}px</span>
                      </div>
                      <input
                        type="range"
                        min="40"
                        max="240"
                        value={logoHeight}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setLogoHeight(v);
                          updateBrandingRealTime({ logoHeight: v });
                        }}
                        className="w-full accent-amber-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-stone-300">
                        <span>Logo Zoom</span>
                        <span className="font-mono text-amber-400 font-bold">{logoZoom}%</span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="250"
                        value={logoZoom}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setLogoZoom(v);
                          updateBrandingRealTime({ logoZoom: v });
                        }}
                        className="w-full accent-amber-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <label className="flex items-center gap-2 text-xs text-stone-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={circleMaskEnabled}
                        onChange={(e) => {
                          setCircleMaskEnabled(e.target.checked);
                          updateBrandingRealTime({ circleMaskEnabled: e.target.checked });
                        }}
                        className="rounded bg-stone-950 border-stone-800 text-amber-500 focus:ring-0"
                      />
                      <span>Apply Circular Crop Mask to Logo</span>
                    </label>
                  </div>
                </div>
              )}

              {/* SUBTAB 3: SCHOOL NAME & SLOGAN TYPOGRAPHY */}
              {brandingSubTab === 'typography' && (
                <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-4 animate-in fade-in duration-150">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-400 block">
                    School Name & Slogan Typography
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-stone-300 block mb-1">Academy Full Name</label>
                      <input
                        type="text"
                        value={gymName}
                        onChange={(e) => {
                          setGymName(e.target.value);
                          updateBrandingRealTime({ gymName: e.target.value });
                        }}
                        placeholder="e.g. RAVENS BJJ ACADEMY"
                        className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-stone-300 block mb-1">Academy Slogan / Subtitle</label>
                      <input
                        type="text"
                        value={slogan}
                        onChange={(e) => {
                          setSlogan(e.target.value);
                          updateBrandingRealTime({ slogan: e.target.value });
                        }}
                        placeholder="e.g. SAMY AL-JAMAL BRAZILIAN JIU-JITSU"
                        className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-stone-300">
                        <span>Name Font Size</span>
                        <span className="font-mono text-amber-400 font-bold">{gymNameFontSize}px</span>
                      </div>
                      <input
                        type="range"
                        min="18"
                        max="64"
                        value={gymNameFontSize}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setGymNameFontSize(v);
                          updateBrandingRealTime({ gymNameFontSize: v });
                        }}
                        className="w-full accent-amber-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-stone-300">
                        <span>Slogan Font Size</span>
                        <span className="font-mono text-amber-400 font-bold">{sloganFontSize}px</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="26"
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
                </div>
              )}

              {/* SUBTAB 4: PHOTO BANNER WALLPAPER */}
              {brandingSubTab === 'wallpaper' && (
                <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-4 animate-in fade-in duration-150">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-400 block">
                    Header Photo Banner Wallpaper & Height
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3.5 bg-stone-900 rounded-xl border border-stone-800 space-y-2">
                      <label className="text-xs font-bold text-white block">Upload Wallpaper Image</label>
                      <input ref={bannerFileInputRef} type="file" accept="image/*" onChange={handleBannerFileUpload} className="hidden" />
                      <button
                        type="button"
                        onClick={() => bannerFileInputRef.current?.click()}
                        className="w-full py-2.5 px-3 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
                      >
                        <Upload className="w-4 h-4 text-amber-400" />
                        <span>Choose Banner Image File...</span>
                      </button>
                    </div>

                    <div className="p-3.5 bg-stone-900 rounded-xl border border-stone-800 space-y-2">
                      <label className="text-xs font-bold text-white block">Or Banner Image URL</label>
                      <input
                        type="url"
                        value={bannerUrl}
                        onChange={(e) => {
                          setBannerUrl(e.target.value);
                          updateBrandingRealTime({ bannerUrl: e.target.value });
                        }}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-stone-300">
                        <span>Header Height</span>
                        <span className="font-mono text-amber-400 font-bold">{bannerHeight}px</span>
                      </div>
                      <input
                        type="range"
                        min="90"
                        max="320"
                        value={bannerHeight}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setBannerHeight(v);
                          updateBrandingRealTime({ bannerHeight: v });
                        }}
                        className="w-full accent-amber-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-stone-300">
                        <span>Wallpaper Zoom</span>
                        <span className="font-mono text-amber-400 font-bold">{bannerZoom}%</span>
                      </div>
                      <input
                        type="range"
                        min="100"
                        max="300"
                        value={bannerZoom}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setBannerZoom(v);
                          updateBrandingRealTime({ bannerZoom: v });
                        }}
                        className="w-full accent-amber-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-stone-300">
                        <span>Overlay Darkness</span>
                        <span className="font-mono text-amber-400 font-bold">{overlayDarkness}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="90"
                        value={overlayDarkness}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setOverlayDarkness(v);
                          updateBrandingRealTime({ overlayDarkness: v });
                        }}
                        className="w-full accent-amber-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SUBTAB 5: THEME MODE */}
              {brandingSubTab === 'theme' && (
                <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-4 animate-in fade-in duration-150">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-400 block">
                    Application Appearance & Theme Mode
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        if (theme !== 'dark') onToggleTheme();
                      }}
                      className={`p-4 rounded-xl border-2 transition-all flex items-center gap-3 text-left cursor-pointer ${
                        theme === 'dark'
                          ? 'border-amber-500 bg-stone-900 shadow-md'
                          : 'border-stone-800 bg-stone-900/60 hover:border-stone-700'
                      }`}
                    >
                      <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 text-amber-400">
                        <Moon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-white">Dark Mode (Default Stealth)</h4>
                        <p className="text-[11px] text-stone-400 mt-0.5">High-contrast obsidian mats and gold accents</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (theme !== 'light') onToggleTheme();
                      }}
                      className={`p-4 rounded-xl border-2 transition-all flex items-center gap-3 text-left cursor-pointer ${
                        theme === 'light'
                          ? 'border-amber-500 bg-stone-900 shadow-md'
                          : 'border-stone-800 bg-stone-900/60 hover:border-stone-700'
                      }`}
                    >
                      <div className="p-3 rounded-xl bg-stone-100 border border-stone-300 text-stone-900">
                        <Sun className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-white">Light Mode (Clean Daylight)</h4>
                        <p className="text-[11px] text-stone-400 mt-0.5">Crisp clean white matboard and high legibility</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-stone-800">
                <span className="text-xs text-stone-400">
                  Settings are automatically saved and applied live.
                </span>
                <button
                  type="button"
                  onClick={handleSaveBranding}
                  className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black text-xs rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Branding & Header Style</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: GITHUB UPDATES & AUTO-DEPLOYMENT */}
          {activeTab === 'updates' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Current Version & Status Card */}
              <div className="bg-gradient-to-r from-stone-950 via-stone-900 to-amber-950/40 border border-amber-500/30 rounded-2xl p-5 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-stone-800">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
                      <Rocket className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-extrabold text-white uppercase tracking-wide">
                          Continuous Deployment & Updates Engine
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
                    <span className="block text-[10px] font-bold text-stone-400 uppercase">Installed Build</span>
                    <span className="text-white font-mono font-bold">{APP_VERSION_INFO.buildNumber}</span>
                  </div>
                  <div className="bg-stone-950/60 p-3 rounded-xl border border-stone-800">
                    <span className="block text-[10px] font-bold text-stone-400 uppercase">Build Date</span>
                    <span className="text-white font-mono font-bold">{new Date(APP_VERSION_INFO.buildTimestamp).toLocaleDateString()}</span>
                  </div>
                  <div className="bg-stone-950/60 p-3 rounded-xl border border-stone-800">
                    <span className="block text-[10px] font-bold text-stone-400 uppercase">Auto-Updater Status</span>
                    <span className="text-emerald-400 font-mono font-bold">Active & Ready</span>
                  </div>
                </div>
              </div>

              {/* Remote Repository Config & Update Check Action */}
              <div className="bg-stone-950 border border-stone-800 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <GitPullRequest className="w-4 h-4 text-amber-400" />
                      Live GitHub Repository Updates
                    </h4>
                    <p className="text-xs text-stone-400">
                      Querying live releases, tags, and commits from <strong className="text-amber-400 font-mono">{HARDCODED_REPO}</strong> ({HARDCODED_BRANCH}).
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleCheckUpdates}
                    disabled={isCheckingUpdates || isDeployingUpdate}
                    className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-stone-950 font-black rounded-xl text-xs inline-flex items-center gap-2 shadow-lg transition-all cursor-pointer active:scale-95 shrink-0"
                  >
                    <RefreshCw className={`w-4 h-4 ${isCheckingUpdates ? 'animate-spin' : ''}`} />
                    <span>{isCheckingUpdates ? 'Polling GitHub...' : 'Check for Updates Now'}</span>
                  </button>
                </div>

                <div className="p-3 bg-stone-900/80 rounded-xl border border-stone-800 flex items-center justify-between flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-2 text-stone-300">
                    <span className="font-bold text-stone-400 uppercase text-[10px]">Configured Repo:</span>
                    <a
                      href={`https://github.com/${HARDCODED_REPO}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-amber-400 hover:underline flex items-center gap-1 font-bold"
                    >
                      <span>https://github.com/{HARDCODED_REPO}</span>
                      <ExternalLink className="w-3 h-3 text-stone-400" />
                    </a>
                  </div>
                  <div className="flex items-center gap-1.5 text-stone-400 font-mono text-[11px]">
                    <GitBranch className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Target: <strong className="text-emerald-400">{HARDCODED_BRANCH}</strong></span>
                  </div>
                </div>
              </div>

              {/* Real Current Version vs Next Version Comparison (No dropdown selection to install) */}
              {nextVersion ? (
                <div className="space-y-5 animate-in fade-in duration-200">
                  {/* ALL UP TO DATE BANNER (WHEN NO UPDATES AVAILABLE) */}
                  {!nextVersion.isNewer && (
                    <div className="p-4 bg-emerald-950/40 border border-emerald-500/50 rounded-2xl flex items-center justify-between gap-3 shadow-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30 shrink-0">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-black text-white">
                              All Up to Date — No New Updates Found
                            </h4>
                            <span className="px-2 py-0.5 text-[9px] font-mono font-black uppercase bg-emerald-500 text-stone-950 rounded">
                              Running Latest Code
                            </span>
                          </div>
                          <p className="text-xs text-emerald-300/80 mt-0.5">
                            Your academy system is currently running the newest release (Version Code {APP_VERSION_INFO.versionCode || 103}). There are no new updates on GitHub.
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-emerald-400 font-bold hidden sm:inline-block bg-emerald-950/80 px-3 py-1.5 rounded-xl border border-emerald-800 shrink-0">
                        ✔ 100% Up to Date
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* CARD 1: CURRENT VERSION */}
                    <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-stone-800 text-stone-300 rounded-full border border-stone-700 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-stone-400" />
                            Current Installed Version
                          </span>
                          <span className="text-[11px] font-mono text-stone-400">
                            Build {APP_VERSION_INFO.buildNumber}
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h5 className="text-base font-black text-white font-mono">
                              v{APP_VERSION_INFO.version}
                            </h5>
                            {APP_VERSION_INFO.versionCode && (
                              <span className="px-2 py-0.5 text-[10px] font-mono font-black uppercase bg-stone-800 text-amber-400 border border-amber-500/40 rounded">
                                Version Code: {APP_VERSION_INFO.versionCode}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-stone-300 font-medium mt-1">
                            {APP_VERSION_INFO.releaseName}
                          </p>
                          <p className="text-[11px] text-stone-400 mt-0.5">
                            Build Date: {new Date(APP_VERSION_INFO.buildTimestamp).toLocaleDateString()} • Branch: {APP_VERSION_INFO.gitBranch}
                          </p>
                        </div>

                        {/* Current Installed Features / Highlights */}
                        <div className="space-y-1.5 pt-2 border-t border-stone-800">
                          <span className="text-[10px] font-bold uppercase text-stone-400 tracking-wider block">
                            Current Version Highlights:
                          </span>
                          <div className="space-y-1">
                            {APP_VERSION_INFO.changelog.slice(0, 4).map((item, i) => (
                              <div key={i} className="flex items-start gap-2 text-xs text-stone-300">
                                <Check className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                                <span>{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 text-[11px] text-stone-400 font-mono flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Currently active in local environment</span>
                      </div>
                    </div>

                    {/* CARD 2: NEXT VERSION (TARGET NEXT RELEASE / COMMIT) */}
                    <div className={`bg-stone-900/90 border rounded-2xl p-5 space-y-4 flex flex-col justify-between ${
                      nextVersion.isNewer
                        ? 'border-emerald-500/50 shadow-xl shadow-emerald-950/20'
                        : 'border-stone-800'
                    }`}>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-full border flex items-center gap-1.5 ${
                            nextVersion.isNewer
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
                              : 'bg-stone-800 text-stone-300 border-stone-700'
                          }`}>
                            {nextVersion.isNewer ? (
                              <>
                                <Sparkles className="w-3 h-3 text-emerald-400" />
                                <span>Next Version (Update Available)</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                <span>No New Updates (All Up to Date)</span>
                              </>
                            )}
                          </span>
                          <span className="text-[11px] font-mono text-emerald-400 font-bold">
                            {nextVersion.isLatest ? '⭐ Latest Master' : 'Next in Queue'}
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h5 className="text-base font-black text-white font-mono">
                              {nextVersion.version}
                            </h5>
                            {nextVersion.versionCode && (
                              <span className="px-2 py-0.5 text-[10px] font-mono font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded">
                                Version Code: {nextVersion.versionCode}
                              </span>
                            )}
                            <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded ${
                              nextVersion.isNewer
                                ? 'bg-amber-500 text-stone-950 font-black'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}>
                              {nextVersion.isNewer ? 'Target Next' : 'All Up To Date'}
                            </span>
                          </div>
                          {nextVersion.versionCode && APP_VERSION_INFO.versionCode && (
                            <div className="mt-1">
                              {nextVersion.versionCode > APP_VERSION_INFO.versionCode ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-black text-emerald-400 bg-emerald-950/80 border border-emerald-600/50 rounded-md">
                                  <span>▲ New Version Code {nextVersion.versionCode} &gt; Current Code {APP_VERSION_INFO.versionCode}</span>
                                </span>
                              ) : nextVersion.versionCode === APP_VERSION_INFO.versionCode ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 rounded-md">
                                  <span>✔ In Sync: Both running Version Code {nextVersion.versionCode}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-400 bg-amber-950/40 border border-amber-800/60 rounded-md">
                                  <span>★ Local Installed Code {APP_VERSION_INFO.versionCode} &gt; GitHub Repository (Code {nextVersion.versionCode})</span>
                                </span>
                              )}
                            </div>
                          )}
                          <p className="text-xs text-stone-200 font-medium mt-1">
                            {nextVersion.releaseName}
                          </p>
                          <p className="text-[11px] text-stone-400 mt-0.5">
                            Author: <strong className="text-stone-300">{nextVersion.author || 'seca999'}</strong> • Published: {new Date(nextVersion.publishedAt).toLocaleString()}
                          </p>
                        </div>

                        {/* Next Version Improvements Highlights */}
                        <div className="space-y-1.5 pt-2 border-t border-stone-800">
                          <span className="text-[10px] font-bold uppercase text-emerald-400 tracking-wider block">
                            {nextVersion.isNewer ? 'Improvements in Next Version:' : 'Latest Version Highlights:'}
                          </span>
                          <div className="space-y-1 max-h-36 overflow-y-auto">
                            {nextVersion.highlights && nextVersion.highlights.length > 0 ? (
                              nextVersion.highlights.map((h, i) => (
                                <div key={i} className="flex items-start gap-2 text-xs text-stone-200">
                                  <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                  <span>{h}</span>
                                </div>
                              ))
                            ) : (
                              <div className="text-xs text-stone-300 italic">{nextVersion.releaseName}</div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Direct Deploy Button for Next Version */}
                      <div className="pt-2 border-t border-stone-800 space-y-2">
                        {nextVersion.isNewer ? (
                          <button
                            type="button"
                            onClick={handleDeployUpdate}
                            disabled={isDeployingUpdate}
                            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 disabled:opacity-60 text-stone-950 font-black rounded-xl text-xs inline-flex items-center justify-center gap-2 shadow-xl hover:shadow-2xl transition-all cursor-pointer active:scale-98"
                          >
                            <Rocket className="w-4 h-4" />
                            <span>
                              {isDeployingUpdate
                                ? 'Installing Next Version...'
                                : `Install & Deploy Next Version (${nextVersion.versionCode ? `Code ${nextVersion.versionCode}` : nextVersion.version})`}
                            </span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="w-full py-3 bg-stone-900 border border-stone-800 text-stone-400 font-bold rounded-xl text-xs inline-flex items-center justify-center gap-2 cursor-not-allowed opacity-90 select-none"
                          >
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>No New Updates — System is All Up to Date</span>
                          </button>
                        )}
                        <div className="flex items-center justify-between text-[10px] text-stone-400 font-mono">
                          <span>SHA: {nextVersion.commitHash || nextVersion.version}</span>
                          <a
                            href={nextVersion.htmlUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-amber-400 hover:underline flex items-center gap-1 font-bold"
                          >
                            <span>Inspect on GitHub</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: IMPROVEMENTS & DIFFERENCES BETWEEN EACH VERSION */}
                  <div className="bg-stone-950 border border-stone-800 rounded-2xl p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-800">
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <Layers className="w-4 h-4 text-amber-400" />
                          Version Improvements & Differences Between Each Version
                        </h4>
                        <p className="text-xs text-stone-400">
                          Detailed highlight of what was improved and added across each version:
                        </p>
                      </div>
                      <span className="px-2.5 py-1 text-[11px] font-mono font-bold text-amber-400 bg-amber-950/60 border border-amber-800/80 rounded-lg">
                        {availableVersions.length} versions tracked
                      </span>
                    </div>

                    <div className="space-y-3">
                      {availableVersions.map((v, idx) => {
                        const isNext = idx === 0;
                        const isCurrent = v.version === APP_VERSION_INFO.buildNumber || APP_VERSION_INFO.version.includes(v.version);
                        return (
                          <div
                            key={v.version}
                            className={`p-4 rounded-xl border transition-all ${
                              isNext
                                ? 'bg-emerald-950/20 border-emerald-500/40'
                                : isCurrent
                                ? 'bg-amber-950/20 border-amber-500/40'
                                : 'bg-stone-900/60 border-stone-800 hover:border-stone-700'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-stone-800/60">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-black uppercase ${
                                  isNext
                                    ? 'bg-emerald-500 text-stone-950'
                                    : isCurrent
                                    ? 'bg-amber-500 text-stone-950'
                                    : 'bg-stone-800 text-stone-300'
                                }`}>
                                  {v.version}
                                </span>
                                {v.versionCode && (
                                  <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase bg-stone-800 text-amber-400 border border-amber-500/30 rounded">
                                    Code {v.versionCode}
                                  </span>
                                )}
                                {isNext && (
                                  <span className={`px-1.5 py-0.5 text-[9px] font-black uppercase rounded border ${
                                    v.isNewer
                                      ? 'bg-emerald-950 text-emerald-300 border-emerald-600/60'
                                      : 'bg-stone-800 text-stone-300 border-stone-700'
                                  }`}>
                                    {v.isNewer ? '▲ Next Version (Newer)' : 'Latest on GitHub'}
                                  </span>
                                )}
                                {isCurrent && (
                                  <span className="px-1.5 py-0.5 text-[9px] font-black uppercase bg-amber-950 text-amber-300 border border-amber-600/60 rounded">
                                    ● Current Installed
                                  </span>
                                )}
                                <h5 className="text-xs font-bold text-white">
                                  {v.releaseName}
                                </h5>
                              </div>

                              <div className="flex items-center gap-3 text-[11px] text-stone-400 font-mono shrink-0">
                                <span>{new Date(v.publishedAt).toLocaleDateString()}</span>
                                <a
                                  href={v.htmlUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-amber-400 hover:underline flex items-center gap-1"
                                >
                                  <span>Commit</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            </div>

                            {/* Specific Improvements of this Version */}
                            <div className="pt-2 space-y-1.5">
                              <span className="text-[10px] font-bold uppercase text-stone-400 tracking-wider block">
                                Improvements in this version:
                              </span>
                              <div className="space-y-1">
                                {v.highlights && v.highlights.length > 0 ? (
                                  v.highlights.map((h, hIdx) => (
                                    <div key={hIdx} className="flex items-start gap-2 text-xs text-stone-300">
                                      <span className="text-amber-400 font-bold">•</span>
                                      <span>{h}</span>
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-xs text-stone-400 italic">{v.body}</div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                /* Before checking updates: Initial view showing Current Version and Prompt to Check */
                <div className="bg-stone-950 border border-stone-800 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-stone-800">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-amber-400" />
                      <h4 className="text-sm font-bold text-white">Update Status & Target Next Version</h4>
                    </div>
                    <span className="text-xs text-stone-400 font-mono">
                      Current: <strong className="text-white">v{APP_VERSION_INFO.version}</strong>
                    </span>
                  </div>
                  <p className="text-xs text-stone-400">
                    Click <strong className="text-amber-400">"Check for Updates Now"</strong> above to poll <strong className="text-stone-300 font-mono">{HARDCODED_REPO}</strong> for the next available version and see all improvements between versions.
                  </p>
                </div>
              )}

              {/* Error Banner */}
              {updateCheckResult?.error && (
                <div className="p-4 bg-red-950/60 border border-red-800 rounded-2xl text-xs text-red-200 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-white mb-0.5">Could not poll GitHub:</span>
                    <span>{updateCheckResult.error}</span>
                  </div>
                </div>
              )}

              {/* Live Deployment Progress Bar */}
              {deploymentProgress && (
                <div className="bg-stone-950 border border-stone-800 rounded-2xl p-5 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white flex items-center gap-2">
                      <Rocket className="w-4 h-4 text-amber-400 animate-bounce" />
                      <span>{deploymentProgress.message}</span>
                    </span>
                    <span className="font-mono font-black text-amber-400">{deploymentProgress.percent}%</span>
                  </div>

                  <div className="w-full bg-stone-900 rounded-full h-3 overflow-hidden border border-stone-800">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full transition-all duration-300 rounded-full"
                      style={{ width: `${deploymentProgress.percent}%` }}
                    />
                  </div>

                  {deploymentProgress.backupSnapshotName && (
                    <div className="text-[11px] text-stone-400 flex items-center gap-1.5 pt-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Safety Backup snapshot saved: <strong className="text-stone-300 font-mono">{deploymentProgress.backupSnapshotName}</strong></span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: DATABASE & BACKUPS */}
          {activeTab === 'database' && (
            <div className="space-y-6">
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
                      className="bg-stone-800 hover:bg-stone-700 text-stone-100 text-xs font-semibold px-4 py-2 rounded-xl border border-stone-700 transition-colors cursor-pointer"
                    >
                      Open Database Inspector
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      className="w-full bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-200 text-xs font-semibold py-2.5 rounded-lg transition-colors cursor-pointer"
                    >
                      Download Backup
                    </button>
                  </div>
                )}

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
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-100 cursor-pointer"
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
                  className="px-4 py-2 text-xs font-semibold bg-stone-800 text-stone-300 hover:bg-stone-700 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingUser ? 'Update Account' : 'Create User'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User In-App Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-red-500/40 bg-stone-900 text-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-500 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Delete User Account?</h3>
                <p className="text-xs text-stone-400">Confirm user access revocation</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-stone-800 bg-stone-950 space-y-1 text-xs">
              <div className="font-bold text-sm text-white">{userToDelete.fullName}</div>
              <div className="text-stone-400">Username: <strong className="text-stone-200">{userToDelete.username}</strong></div>
              <div className="text-stone-400 uppercase font-bold text-[10px]">Role: <span className="text-red-400">{userToDelete.role}</span></div>
            </div>

            <p className="text-xs leading-relaxed text-stone-300">
              Are you sure you want to delete user account <strong className="text-white">"{userToDelete.username}"</strong>? They will immediately lose access to the management portal.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Yes, Delete Account</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
