import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  Sliders, 
  Check, 
  Sparkles, 
  Image as ImageIcon, 
  RotateCcw, 
  Link2,
  Maximize2,
  Move,
  Layers,
  Eye,
  Trash2
} from 'lucide-react';
import { GymSettings, GymLogoSettings, HeaderBannerSettings } from '../types';
import { GymLogoDisplay } from './GymLogoDisplay';

interface GymBrandingModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GymSettings;
  onSaveSettings: (newSettings: GymSettings) => void;
}

export const GymBrandingModal: React.FC<GymBrandingModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [gymName, setGymName] = useState(settings.gymName || 'Arte Suave BJJ Academy');
  const [slogan, setSlogan] = useState(
    settings.slogan || 'Where Technique Conquers Strength • Honor, Discipline & Respect'
  );

  // Custom Typography & Colors State
  const [gymNameColor, setGymNameColor] = useState<string>(settings.gymNameColor || '#ffffff');
  const [gymNameFontSize, setGymNameFontSize] = useState<number>(settings.gymNameFontSize || 32);
  const [sloganColor, setSloganColor] = useState<string>(settings.sloganColor || '#f59e0b');
  const [sloganFontSize, setSloganFontSize] = useState<number>(settings.sloganFontSize || 14);

  const configuredLogo: GymLogoSettings = settings.logo || {
    preset: 'emblem-shield',
    width: 84,
    height: 84,
    borderRadius: 12,
    fit: 'contain',
    borderWidth: 1,
    borderColor: '#dc2626',
    padding: 0,
    backgroundColor: '#7f1d1d',
    showEmblemFallback: true,
  };

  const initialLogo: GymLogoSettings = {
    ...configuredLogo,
    width: Math.max(configuredLogo.width || 84, 40),
    height: Math.max(configuredLogo.height || 84, 40),
  };

  const [logo, setLogo] = useState<GymLogoSettings>(initialLogo);
  const [keepAspectRatio, setKeepAspectRatio] = useState(true);
  const [customUrlInput, setCustomUrlInput] = useState(initialLogo.url || '');
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Header Background Banner State
  const configuredBanner: HeaderBannerSettings = settings.headerBanner || {
    enabled: true,
    url: '',
    height: 160,
    bannerWidth: 'full',
    customWidthPercent: 100,
    opacity: 0.85,
    blur: 0,
    positionX: 50,
    positionY: 50,
    fit: 'cover',
    overlayDarkness: 50,
  };

  const [banner, setBanner] = useState<HeaderBannerSettings>(configuredBanner);
  const [bannerUrlInput, setBannerUrlInput] = useState(configuredBanner.url || '');
  const [bannerError, setBannerError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle local logo file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, SVG, WebP).');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setUploadError('Image size should be under 3MB for optimal speed.');
      return;
    }

    setUploadError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setLogo((prev) => ({
        ...prev,
        url: base64,
        preset: undefined,
      }));
      setCustomUrlInput(base64);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handle local header background photo upload
  const handleBannerFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setBannerError('Please select a valid image file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setBannerError('Background photo size should be under 5MB.');
      return;
    }

    setBannerError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setBanner((prev) => ({
        ...prev,
        enabled: true,
        url: base64,
      }));
      setBannerUrlInput(base64);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleWidthChange = (val: number) => {
    setLogo((prev) => {
      if (keepAspectRatio) {
        return { ...prev, width: val, height: val };
      }
      return { ...prev, width: val };
    });
  };

  const handleHeightChange = (val: number) => {
    setLogo((prev) => {
      if (keepAspectRatio) {
        return { ...prev, width: val, height: val };
      }
      return { ...prev, height: val };
    });
  };

  const handleSave = () => {
    const updated: GymSettings = {
      ...settings,
      gymName: gymName.trim() || 'Arte Suave BJJ Academy',
      slogan: slogan.trim() || 'Where Technique Conquers Strength',
      gymNameColor,
      gymNameFontSize,
      sloganColor,
      sloganFontSize,
      logo: {
        ...logo,
        url: customUrlInput.trim() ? customUrlInput.trim() : undefined,
      },
      headerBanner: {
        ...banner,
        url: bannerUrlInput.trim() ? bannerUrlInput.trim() : undefined,
      },
    };
    onSaveSettings(updated);
    onClose();
  };

  const handleResetToDefault = () => {
    setGymName('Arte Suave BJJ Academy');
    setSlogan('Where Technique Conquers Strength • Honor, Discipline & Respect');
    setGymNameColor('#ffffff');
    setGymNameFontSize(32);
    setSloganColor('#f59e0b');
    setSloganFontSize(14);
    setLogo({
      preset: 'emblem-shield',
      width: 84,
      height: 84,
      borderRadius: 12,
      fit: 'contain',
      borderWidth: 1,
      borderColor: '#dc2626',
      padding: 0,
      backgroundColor: '#7f1d1d',
      showEmblemFallback: true,
    });
    setCustomUrlInput('');
    setBanner({
      enabled: true,
      url: '',
      height: 160,
      bannerWidth: 'full',
      customWidthPercent: 100,
      opacity: 0.85,
      blur: 0,
      positionX: 50,
      positionY: 50,
      fit: 'cover',
      overlayDarkness: 50,
    });
    setBannerUrlInput('');
    setUploadError(null);
    setBannerError(null);
  };

  const activeBannerUrl = bannerUrlInput.trim() || banner.url || '';

  return (
    <div
      id="modal-gym-branding-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xs overflow-y-auto"
    >
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-5xl h-[88vh] min-h-[650px] max-h-[860px] shadow-2xl overflow-hidden my-auto flex flex-col shrink-0 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-800 flex items-center justify-between bg-stone-950/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-950 border border-red-800 flex items-center justify-center text-red-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                Gym Logo, Header Background & Slogan
              </h2>
              <p className="text-xs text-stone-400">
                Upload custom logo & header background photo, resize into empty header space, and edit slogans.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1 min-h-0">
          {/* LIVE HEADER PREVIEW CARD WITH BACKGROUND BANNER PHOTO */}
          <div className="bg-stone-950 rounded-xl p-4 sm:p-5 border border-stone-800 text-stone-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <Eye className="w-4 h-4" />
                <span>Live Header & Background Photo Preview</span>
              </span>
              {activeBannerUrl && (
                <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded font-mono">
                  Background Photo Active
                </span>
              )}
            </div>

            {/* Simulated Navbar Header - Automatically stretches with logo height! */}
            <div 
              className="relative overflow-hidden rounded-xl border border-stone-800 shadow-inner p-5 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all duration-300"
              style={{
                minHeight: `${Math.max(banner.height || 140, (logo.height || 84) + 40)}px`,
                backgroundColor: '#1c1917',
              }}
            >
              {/* Render Background Photo in Live Preview */}
              {activeBannerUrl && (
                <div
                  className="absolute inset-0 pointer-events-none overflow-hidden transition-all duration-300 z-0"
                  style={{
                    opacity: banner.opacity ?? 0.85,
                    filter: banner.blur ? `blur(${banner.blur}px)` : 'none',
                  }}
                >
                  <div
                    className="h-full relative overflow-hidden"
                    style={{
                      width:
                        banner.bannerWidth === 'custom'
                          ? `${banner.customWidthPercent ?? 100}%`
                          : banner.bannerWidth === 'behind_logo'
                          ? '60%'
                          : '100%',
                    }}
                  >
                    <img
                      src={activeBannerUrl}
                      alt="Header Background"
                      className="w-full h-full"
                      style={{
                        objectFit: banner.fit || 'cover',
                        objectPosition: `${banner.positionX ?? 50}% ${banner.positionY ?? 50}%`,
                      }}
                    />
                    <div
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(to right, 
                          rgba(12,10,9,${(banner.overlayDarkness ?? 50) / 100}), 
                          rgba(12,10,9,${(banner.overlayDarkness ?? 70) / 100})
                        )`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Foreground Content */}
              <div className="relative z-10 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left min-w-0">
                <GymLogoDisplay
                  logo={{
                    ...logo,
                    url: customUrlInput.trim() ? customUrlInput.trim() : undefined,
                  }}
                  gymName={gymName}
                />
                <div>
                  <div className="flex items-center justify-center sm:justify-start gap-2.5 flex-wrap">
                    <h3 
                      className="font-black tracking-tight leading-tight drop-shadow-md transition-all"
                      style={{ 
                        color: gymNameColor, 
                        fontSize: `${gymNameFontSize}px` 
                      }}
                    >
                      {gymName || 'Arte Suave BJJ Academy'}
                    </h3>
                    <span className="px-2 py-0.5 text-[10px] uppercase font-extrabold tracking-wider bg-stone-800/90 text-amber-400 rounded border border-stone-700 shadow-xs">
                      BJJ Mat Ops
                    </span>
                  </div>
                  <p 
                    className="font-semibold tracking-wide mt-1 italic drop-shadow-sm transition-all"
                    style={{ 
                      color: sloganColor, 
                      fontSize: `${sloganFontSize}px` 
                    }}
                  >
                    "{slogan || 'Where Technique Conquers Strength'}"
                  </p>
                  <p className="text-[11px] text-stone-300/80 mt-1">
                    Logo size: <strong className="text-white">{logo.width}px × {logo.height}px</strong> • Stretched Header Height: <strong className="text-amber-400">{Math.max(banner.height || 140, (logo.height || 84) + 40)}px</strong>
                  </p>
                </div>
              </div>

              {/* Simulated Right Action Buttons in empty space */}
              <div className="relative z-10 hidden md:flex items-center gap-2 opacity-80">
                <span className="px-3 py-1.5 bg-stone-950/80 text-stone-300 border border-stone-800 rounded-lg text-xs font-semibold">
                  Header Buttons Space
                </span>
                <span className="px-3 py-1.5 bg-red-600/90 text-white rounded-lg text-xs font-bold">
                  + Register Student
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 1: HEADER BACKGROUND BANNER PHOTO & RESIZING */}
          <div className="space-y-4 bg-stone-950/80 p-4 rounded-xl border border-stone-800">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-amber-400" />
                <span>1. Header Background Photo & Resizing (Empty Space Fill)</span>
              </h3>
              {activeBannerUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setBannerUrlInput('');
                    setBanner((prev) => ({ ...prev, url: '' }));
                  }}
                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Background Photo</span>
                </button>
              )}
            </div>

            {/* Upload & URL Input */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Upload Box */}
              <div className="p-3 bg-stone-900 rounded-lg border border-stone-800 flex flex-col justify-between">
                <div>
                  <label className="block text-xs font-semibold text-white mb-1">
                    Upload Header Background Image
                  </label>
                  <p className="text-[11px] text-stone-400 mb-2">
                    Upload your gym mat, team photo, or background wallpaper.
                  </p>
                </div>
                <input
                  ref={bannerFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleBannerFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => bannerFileInputRef.current?.click()}
                  className="w-full py-2 px-3 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 hover:border-amber-500/50 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-2 transition-all"
                >
                  <Upload className="w-4 h-4 text-amber-400" />
                  <span>Choose Background Photo File...</span>
                </button>
              </div>

              {/* URL Input */}
              <div className="p-3 bg-stone-900 rounded-lg border border-stone-800 flex flex-col justify-between">
                <div>
                  <label className="block text-xs font-semibold text-white mb-1">
                    Or Enter Photo URL
                  </label>
                  <p className="text-[11px] text-stone-400 mb-2">
                    Paste any image URL to place behind logo & empty space.
                  </p>
                </div>
                <input
                  type="url"
                  value={bannerUrlInput}
                  onChange={(e) => {
                    setBannerUrlInput(e.target.value);
                    setBanner((prev) => ({ ...prev, url: e.target.value, enabled: true }));
                  }}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full bg-stone-950 border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>

            {bannerError && (
              <p className="text-xs text-red-400 bg-red-950/30 p-2 rounded-lg border border-red-900">
                {bannerError}
              </p>
            )}

            {/* Quick Background Presets */}
            <div>
              <span className="text-[11px] text-stone-400 font-medium block mb-2">
                Or pick a martial arts background photo preset:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { 
                    id: 'dojo-mat', 
                    label: 'Dojo Mat Wall', 
                    url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=1200&auto=format&fit=crop' 
                  },
                  { 
                    id: 'tactical-gym', 
                    label: 'Tactical Combat Gym', 
                    url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1200&auto=format&fit=crop' 
                  },
                  { 
                    id: 'black-belt', 
                    label: 'Black Belt Action', 
                    url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=1200&auto=format&fit=crop' 
                  },
                  { 
                    id: 'tatami-wood', 
                    label: 'Dark Wood Tatami', 
                    url: 'https://images.unsplash.com/photo-1508873696983-2df515122519?q=80&w=1200&auto=format&fit=crop' 
                  },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setBannerUrlInput(preset.url);
                      setBanner((prev) => ({ ...prev, url: preset.url, enabled: true }));
                    }}
                    className={`p-2 rounded-lg border text-left text-xs transition-all flex items-center gap-2 ${
                      activeBannerUrl === preset.url
                        ? 'bg-amber-950/70 border-amber-500 text-white font-bold'
                        : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-white'
                    }`}
                  >
                    <div className="w-6 h-6 rounded bg-stone-800 overflow-hidden flex-shrink-0">
                      <img src={preset.url} alt="" className="w-full h-full object-cover" />
                    </div>
                    <span>{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Resize & Positioning Sliders */}
            <div className="pt-2 border-t border-stone-800/80 space-y-3">
              <span className="text-xs font-bold text-stone-300 uppercase tracking-wider block">
                Resize Background Image in Empty Space
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Banner Height Slider */}
                <div className="bg-stone-900 p-3 rounded-lg border border-stone-800 space-y-1">
                  <div className="flex justify-between text-xs text-stone-300">
                    <span>Header Height (Vertical Expansion)</span>
                    <span className="font-mono text-amber-400 font-bold">{banner.height || 160}px</span>
                  </div>
                  <input
                    type="range"
                    min={80}
                    max={360}
                    step={10}
                    value={banner.height || 160}
                    onChange={(e) => setBanner((prev) => ({ ...prev, height: Number(e.target.value) }))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-stone-500">
                    <span>Compact (80px)</span>
                    <span>Standard (160px)</span>
                    <span>Tall Banner (360px)</span>
                  </div>
                </div>

                {/* Banner Coverage Width */}
                <div className="bg-stone-900 p-3 rounded-lg border border-stone-800 space-y-1.5">
                  <div className="flex justify-between text-xs text-stone-300">
                    <span>Width Span Coverage</span>
                    <span className="font-mono text-amber-400 font-bold">
                      {banner.bannerWidth === 'full'
                        ? 'Full Header (100%)'
                        : banner.bannerWidth === 'behind_logo'
                        ? 'Behind Logo Area (60%)'
                        : `${banner.customWidthPercent || 100}% Custom`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {[
                      { id: 'full', label: 'Full Header' },
                      { id: 'behind_logo', label: 'Behind Logo' },
                      { id: 'custom', label: 'Custom %' },
                    ].map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() =>
                          setBanner((prev) => ({
                            ...prev,
                            bannerWidth: w.id as any,
                          }))
                        }
                        className={`flex-1 py-1 text-[11px] font-semibold rounded border transition-colors ${
                          banner.bannerWidth === w.id
                            ? 'bg-amber-600 text-white border-amber-500'
                            : 'bg-stone-950 text-stone-400 border-stone-800 hover:text-stone-200'
                        }`}
                      >
                        {w.label}
                      </button>
                    ))}
                  </div>
                  {banner.bannerWidth === 'custom' && (
                    <input
                      type="range"
                      min={20}
                      max={100}
                      step={5}
                      value={banner.customWidthPercent || 100}
                      onChange={(e) =>
                        setBanner((prev) => ({ ...prev, customWidthPercent: Number(e.target.value) }))
                      }
                      className="w-full accent-amber-500 cursor-pointer mt-1"
                    />
                  )}
                </div>

                {/* Vertical Focal Position (Pan Y) */}
                <div className="bg-stone-900 p-3 rounded-lg border border-stone-800 space-y-1">
                  <div className="flex justify-between text-xs text-stone-300">
                    <span>Vertical Shift / Focus (Y Position)</span>
                    <span className="font-mono text-amber-400 font-bold">{banner.positionY ?? 50}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={2}
                    value={banner.positionY ?? 50}
                    onChange={(e) => setBanner((prev) => ({ ...prev, positionY: Number(e.target.value) }))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-stone-500">
                    <span>Top (0%)</span>
                    <span>Center (50%)</span>
                    <span>Bottom (100%)</span>
                  </div>
                </div>

                {/* Opacity & Overlay Darkness */}
                <div className="bg-stone-900 p-3 rounded-lg border border-stone-800 space-y-1">
                  <div className="flex justify-between text-xs text-stone-300">
                    <span>Darkness Overlay (Text Contrast)</span>
                    <span className="font-mono text-amber-400 font-bold">{banner.overlayDarkness ?? 50}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={90}
                    step={5}
                    value={banner.overlayDarkness ?? 50}
                    onChange={(e) => setBanner((prev) => ({ ...prev, overlayDarkness: Number(e.target.value) }))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-stone-500">
                    <span>Bright Photo (0%)</span>
                    <span>High Contrast Dark (90%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: LOGO SOURCE & RESIZING */}
          <div className="space-y-4 pt-2 border-t border-stone-800">
            <h3 className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-red-400" />
              <span>2. Gym Logo Source & Presets</span>
            </h3>

            {/* Upload Button + Image URL input */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-stone-950/70 rounded-xl border border-stone-800 flex flex-col justify-between">
                <div>
                  <label className="block text-xs font-semibold text-white mb-1">
                    Upload Logo File
                  </label>
                  <p className="text-[11px] text-stone-400 mb-2">
                    Upload your gym's PNG, JPG, or SVG logo.
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2 px-3 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-2 transition-all"
                >
                  <Upload className="w-4 h-4 text-red-400" />
                  <span>Choose Logo File...</span>
                </button>
              </div>

              <div className="p-3 bg-stone-950/70 rounded-xl border border-stone-800 flex flex-col justify-between">
                <div>
                  <label className="block text-xs font-semibold text-white mb-1">
                    Or Enter Logo Web URL
                  </label>
                  <p className="text-[11px] text-stone-400 mb-2">
                    Paste any public image link or CDN logo.
                  </p>
                </div>
                <input
                  type="url"
                  value={customUrlInput}
                  onChange={(e) => {
                    setCustomUrlInput(e.target.value);
                    setLogo((prev) => ({
                      ...prev,
                      url: e.target.value,
                      preset: undefined,
                    }));
                  }}
                  placeholder="https://yourgym.com/logo.png"
                  className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500 font-mono"
                />
              </div>
            </div>

            {uploadError && (
              <p className="text-xs text-red-400 bg-red-950/30 p-2 rounded-lg border border-red-900">
                {uploadError}
              </p>
            )}

            {/* Quick Logo Presets */}
            <div className="pt-1">
              <span className="text-[11px] text-stone-400 font-medium block mb-2">
                Or pick a martial arts insignia preset:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'emblem-shield', label: 'Classic Red Shield', sub: 'BJJ Monogram' },
                  { id: 'tiger-crest', label: 'Flame / Tiger', sub: 'Gold & Red' },
                  { id: 'kimono-crest', label: 'Kanji Crest', sub: '柔術 Jiu-Jitsu' },
                  { id: 'octagon', label: 'Octagon Shield', sub: 'Gold Combat' },
                ].map((p) => {
                  const isSelected = !customUrlInput && logo.preset === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setCustomUrlInput('');
                        setLogo((prev) => ({
                          ...prev,
                          preset: p.id,
                          url: undefined,
                        }));
                      }}
                      className={`p-2 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-red-950/60 border-red-500 text-white shadow-xs'
                          : 'bg-stone-950/40 border-stone-800 text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      <div className="font-bold text-xs text-white">{p.label}</div>
                      <div className="text-[10px] text-stone-400 mt-0.5">{p.sub}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SECTION 3: FREE LOGO RESIZING & DIMENSIONS */}
          <div className="space-y-4 pt-2 border-t border-stone-800">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-red-400" />
                <span>3. Logo Size & Shape Sliders</span>
              </h3>
              <button
                type="button"
                onClick={() => setKeepAspectRatio(!keepAspectRatio)}
                className={`text-xs px-2 py-1 rounded inline-flex items-center gap-1.5 transition-colors ${
                  keepAspectRatio
                    ? 'bg-red-950 text-red-300 border border-red-800'
                    : 'bg-stone-800 text-stone-400 hover:text-stone-200'
                }`}
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>Lock Aspect Ratio ({keepAspectRatio ? 'On' : 'Off'})</span>
              </button>
            </div>

            {/* Quick Size Preset Buttons */}
            <div className="bg-stone-950/60 p-3 rounded-xl border border-stone-800 space-y-2">
              <span className="text-[11px] text-stone-400 font-semibold block">
                Quick Size Presets:
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { label: 'Compact', size: 64 },
                  { label: 'Medium', size: 84 },
                  { label: 'Large', size: 110 },
                  { label: 'Extra Large', size: 150 },
                  { label: 'Hero Display', size: 200 },
                  { label: 'Mega Giant', size: 280 },
                ].map((preset) => (
                  <button
                    key={preset.size}
                    type="button"
                    onClick={() => {
                      setLogo((prev) => ({
                        ...prev,
                        width: preset.size,
                        height: keepAspectRatio ? preset.size : prev.height,
                      }));
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      logo.width === preset.size
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'bg-stone-800 text-stone-300 hover:bg-stone-700 hover:text-white'
                    }`}
                  >
                    {preset.label} ({preset.size}px)
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Width Slider */}
              <div className="bg-stone-950/60 p-3 rounded-xl border border-stone-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-300 font-semibold">Logo Width</span>
                  <span className="font-mono text-red-400 font-bold">{logo.width}px</span>
                </div>
                <input
                  type="range"
                  min={32}
                  max={300}
                  step={2}
                  value={logo.width}
                  onChange={(e) => handleWidthChange(Number(e.target.value))}
                  className="w-full accent-red-600 cursor-pointer"
                />
              </div>

              {/* Height Slider */}
              <div className="bg-stone-950/60 p-3 rounded-xl border border-stone-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-300 font-semibold">Logo Height</span>
                  <span className="font-mono text-red-400 font-bold">{logo.height}px</span>
                </div>
                <input
                  type="range"
                  min={32}
                  max={300}
                  step={2}
                  value={logo.height}
                  onChange={(e) => handleHeightChange(Number(e.target.value))}
                  className="w-full accent-red-600 cursor-pointer"
                />
              </div>

              {/* Corner Radius */}
              <div className="bg-stone-950/60 p-3 rounded-xl border border-stone-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-300 font-semibold">Corner Radius</span>
                  <span className="font-mono text-amber-400 font-bold">
                    {logo.borderRadius >= 90 ? 'Circle' : `${logo.borderRadius}px`}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={2}
                  value={logo.borderRadius}
                  onChange={(e) =>
                    setLogo((prev) => ({ ...prev, borderRadius: Number(e.target.value) }))
                  }
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Border Width & Color */}
              <div className="bg-stone-950/60 p-3 rounded-xl border border-stone-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-300 font-semibold">Border Style</span>
                  <span className="text-[11px] text-stone-400">
                    {logo.borderWidth === 0 ? 'No Border' : `${logo.borderWidth}px border`}
                  </span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  {[0, 1, 2, 4].map((bw) => (
                    <button
                      key={bw}
                      type="button"
                      onClick={() => setLogo((prev) => ({ ...prev, borderWidth: bw }))}
                      className={`flex-1 py-1 text-xs rounded font-bold border transition-colors ${
                        logo.borderWidth === bw
                          ? 'bg-stone-700 text-white border-red-500'
                          : 'bg-stone-900 text-stone-400 border-stone-800 hover:text-stone-200'
                      }`}
                    >
                      {bw === 0 ? 'None' : `${bw}px`}
                    </button>
                  ))}
                  {logo.borderWidth > 0 && (
                    <input
                      type="color"
                      value={logo.borderColor || '#dc2626'}
                      onChange={(e) =>
                        setLogo((prev) => ({ ...prev, borderColor: e.target.value }))
                      }
                      title="Pick border color"
                      className="w-8 h-8 rounded bg-transparent cursor-pointer border border-stone-700"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 4: GYM NAME & SLOGAN TYPOGRAPHY & COLORS */}
          <div className="space-y-4 pt-2 border-t border-stone-800">
            <h3 className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>4. School / Gym Name & Slogan Typography & Colors</span>
            </h3>

            <div className="space-y-4">
              {/* School Name Input + Size & Color Controls */}
              <div className="bg-stone-950/70 p-4 rounded-xl border border-stone-800 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-white mb-1">
                    Academy / School Name Title
                  </label>
                  <input
                    type="text"
                    value={gymName}
                    onChange={(e) => setGymName(e.target.value)}
                    placeholder="Arte Suave BJJ Academy"
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 font-bold"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  {/* School Name Font Size Slider & Presets */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-stone-300 font-semibold">School Name Font Size</span>
                      <span className="font-mono text-amber-400 font-bold">{gymNameFontSize}px</span>
                    </div>
                    <input
                      type="range"
                      min={18}
                      max={72}
                      step={2}
                      value={gymNameFontSize}
                      onChange={(e) => setGymNameFontSize(Number(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      {[
                        { label: 'Small', size: 24 },
                        { label: 'Medium', size: 32 },
                        { label: 'Large', size: 42 },
                        { label: 'Extra Large', size: 56 },
                      ].map((preset) => (
                        <button
                          key={preset.size}
                          type="button"
                          onClick={() => setGymNameFontSize(preset.size)}
                          className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-colors ${
                            gymNameFontSize === preset.size
                              ? 'bg-amber-500 text-stone-950 border-amber-400'
                              : 'bg-stone-900 text-stone-400 border-stone-800 hover:text-white'
                          }`}
                        >
                          {preset.label} ({preset.size}px)
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* School Name Text Color Picker & Presets */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-stone-300 font-semibold">School Name Text Color</span>
                      <span className="font-mono text-stone-300 font-bold">{gymNameColor}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={gymNameColor}
                        onChange={(e) => setGymNameColor(e.target.value)}
                        className="w-10 h-9 rounded bg-stone-900 cursor-pointer border border-stone-700"
                        title="Choose custom color"
                      />
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {[
                          { name: 'Pure White', color: '#ffffff' },
                          { name: 'Gold / Amber', color: '#f59e0b' },
                          { name: 'Crimson Red', color: '#ef4444' },
                          { name: 'Electric Blue', color: '#3b82f6' },
                          { name: 'Emerald', color: '#10b981' },
                          { name: 'Light Silver', color: '#e2e8f0' },
                        ].map((swatch) => (
                          <button
                            key={swatch.color}
                            type="button"
                            onClick={() => setGymNameColor(swatch.color)}
                            title={swatch.name}
                            className={`w-7 h-7 rounded-lg border-2 transition-transform hover:scale-110 ${
                              gymNameColor.toLowerCase() === swatch.color.toLowerCase()
                                ? 'border-amber-400 ring-2 ring-amber-400/50 scale-105'
                                : 'border-stone-700'
                            }`}
                            style={{ backgroundColor: swatch.color }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Slogan Input + Size & Color Controls */}
              <div className="bg-stone-950/70 p-4 rounded-xl border border-stone-800 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-white mb-1">
                    Academy Slogan (Displayed right under school name)
                  </label>
                  <input
                    type="text"
                    value={slogan}
                    onChange={(e) => setSlogan(e.target.value)}
                    placeholder="Where Technique Conquers Strength • Honor, Discipline & Respect"
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-sm text-amber-300 focus:outline-none focus:border-amber-500 font-medium italic"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  {/* Slogan Font Size Slider */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-stone-300 font-semibold">Slogan Font Size</span>
                      <span className="font-mono text-amber-400 font-bold">{sloganFontSize}px</span>
                    </div>
                    <input
                      type="range"
                      min={12}
                      max={28}
                      step={1}
                      value={sloganFontSize}
                      onChange={(e) => setSloganFontSize(Number(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      {[
                        { label: 'Compact', size: 12 },
                        { label: 'Standard', size: 14 },
                        { label: 'Medium', size: 18 },
                        { label: 'Large', size: 22 },
                      ].map((preset) => (
                        <button
                          key={preset.size}
                          type="button"
                          onClick={() => setSloganFontSize(preset.size)}
                          className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-colors ${
                            sloganFontSize === preset.size
                              ? 'bg-amber-500 text-stone-950 border-amber-400'
                              : 'bg-stone-900 text-stone-400 border-stone-800 hover:text-white'
                          }`}
                        >
                          {preset.label} ({preset.size}px)
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Slogan Text Color Picker */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-stone-300 font-semibold">Slogan Text Color</span>
                      <span className="font-mono text-stone-300 font-bold">{sloganColor}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={sloganColor}
                        onChange={(e) => setSloganColor(e.target.value)}
                        className="w-10 h-9 rounded bg-stone-900 cursor-pointer border border-stone-700"
                        title="Choose custom slogan color"
                      />
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {[
                          { name: 'Warm Gold', color: '#f59e0b' },
                          { name: 'Bright White', color: '#ffffff' },
                          { name: 'Flame Amber', color: '#d97706' },
                          { name: 'Soft Gray', color: '#9ca3af' },
                          { name: 'Cyan / Teal', color: '#06b6d4' },
                        ].map((swatch) => (
                          <button
                            key={swatch.color}
                            type="button"
                            onClick={() => setSloganColor(swatch.color)}
                            title={swatch.name}
                            className={`w-7 h-7 rounded-lg border-2 transition-transform hover:scale-110 ${
                              sloganColor.toLowerCase() === swatch.color.toLowerCase()
                                ? 'border-amber-400 ring-2 ring-amber-400/50 scale-105'
                                : 'border-stone-700'
                            }`}
                            style={{ backgroundColor: swatch.color }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 sm:p-5 border-t border-stone-800 flex items-center justify-between bg-stone-950/80 gap-3">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="px-3 py-2 text-stone-400 hover:text-stone-200 text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-stone-800 rounded-lg transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All to Default</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white rounded-lg text-xs font-bold transition-all shadow-md inline-flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Save Header & Branding</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
