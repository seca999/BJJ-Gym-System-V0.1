import React from 'react';
import { Shield, Flame } from 'lucide-react';
import { GymLogoSettings } from '../types';

interface GymLogoDisplayProps {
  logo?: GymLogoSettings;
  gymName?: string;
  className?: string;
  sizeOverride?: { width?: number; height?: number };
  minSize?: number;
}

export const GymLogoDisplay: React.FC<GymLogoDisplayProps> = ({
  logo,
  gymName = 'Arte Suave BJJ',
  className = '',
  sizeOverride,
  minSize,
}) => {
  const configuredWidth = sizeOverride?.width ?? logo?.width ?? 84;
  const configuredHeight = sizeOverride?.height ?? logo?.height ?? 84;

  const minimumThreshold = minSize ?? 40;
  const width = sizeOverride?.width
    ? sizeOverride.width
    : Math.max(configuredWidth, minimumThreshold);
  const height = sizeOverride?.height
    ? sizeOverride.height
    : Math.max(configuredHeight, minimumThreshold);

  const borderRadius = logo?.borderRadius ?? 12;
  const isCircle = borderRadius >= 90 || logo?.borderRadius === 9999;
  
  const finalWidth = isCircle ? Math.max(width, height) : width;
  const finalHeight = isCircle ? Math.max(width, height) : height;

  const borderWidth = logo?.borderWidth ?? 1;
  const borderColor = logo?.borderColor ?? '#dc2626';
  const fit = logo?.fit ?? 'contain';
  const padding = logo?.padding ?? 0;
  const backgroundColor = logo?.backgroundColor ?? '#7f1d1d';
  const url = logo?.url;
  const preset = logo?.preset ?? 'emblem-shield';

  const style: React.CSSProperties = {
    width: `${finalWidth}px`,
    height: `${finalHeight}px`,
    borderRadius: isCircle ? '9999px' : `${borderRadius}px`,
    border: 'none', // Remove border entirely as requested
    backgroundColor: backgroundColor || 'transparent',
    padding: `${padding}px`,
  };

  // If a custom image URL / Data URL is provided
  if (url && url.trim()) {
    return (
      <div
        id="gym-custom-logo-container"
        style={style}
        className={`flex items-center justify-center overflow-hidden flex-shrink-0 relative group rounded-full ${className}`}
      >
        <img
          src={url}
          alt={gymName}
          style={{
            objectFit: fit,
            width: '100%',
            height: '100%',
            borderRadius: isCircle ? '9999px' : `${borderRadius}px`,
            transform: `scale(${(logo?.zoom ?? 100) / 100})`,
            transition: 'transform 0.15s ease-out-in',
          }}
          onError={(e) => {
            // If image fails to load, fallback to styled initial/emblem
            e.currentTarget.style.display = 'none';
            const fallback = document.getElementById('logo-fallback-elem');
            if (fallback) fallback.style.display = 'flex';
          }}
        />
        <div
          id="logo-fallback-elem"
          style={{ display: 'none' }}
          className="w-full h-full flex items-center justify-center font-black text-white"
        >
          {gymName.slice(0, 3).toUpperCase()}
        </div>
      </div>
    );
  }

  // Presets
  if (preset === 'tiger-crest') {
    return (
      <div
        style={style}
        className={`flex items-center justify-center overflow-hidden flex-shrink-0 shadow-inner bg-gradient-to-br from-amber-600 to-red-800 text-white font-black select-none ${className}`}
      >
        <Flame className="w-3/5 h-3/5" style={{ color: logo?.iconColor || '#fde047' }} />
      </div>
    );
  }

  if (preset === 'kimono-crest') {
    return (
      <div
        style={style}
        className={`flex items-center justify-center overflow-hidden flex-shrink-0 shadow-inner bg-gradient-to-b from-stone-900 to-stone-950 text-white font-black select-none ${className}`}
      >
        <span 
          className="text-[13px] tracking-wider font-extrabold"
          style={{ color: logo?.iconColor || '#ef4444' }}
        >
          柔術
        </span>
      </div>
    );
  }

  if (preset === 'octagon') {
    return (
      <div
        className={`flex items-center justify-center overflow-hidden flex-shrink-0 shadow-inner bg-stone-900 text-amber-400 font-black select-none ${className}`}
        style={style}
      >
        <Shield className="w-3/5 h-3/5" style={{ color: logo?.iconColor || '#fbbf24' }} />
      </div>
    );
  }

  // Default: Classic Red BJJ Shield
  return (
    <div
      id="gym-emblem-logo-container"
      style={style}
      className={`flex items-center justify-center overflow-hidden flex-shrink-0 shadow-inner bg-gradient-to-b from-red-700 to-red-950 text-white font-black select-none ${className}`}
    >
      <div className="text-center leading-none">
        <span
          className="font-black tracking-tighter"
          style={{ 
            fontSize: `${Math.max(10, Math.floor(width * 0.36))}px`,
            color: logo?.iconColor || '#ffffff' 
          }}
        >
          BJJ
        </span>
      </div>
    </div>
  );
};
