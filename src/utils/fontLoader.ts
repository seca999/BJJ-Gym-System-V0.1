/**
 * Dynamic Font Loader Utility for Brazilian Jiu-Jitsu Academy Branding
 * Handles custom font file uploads (.ttf, .otf, .woff, .woff2) and registers them
 * dynamically in the browser via FontFace API and dynamic <style> injection.
 * Also dynamically loads Google Fonts on-demand for any custom font name.
 */

export function injectCustomFontFace(fontUrl: string, fontFamily = 'GymCustomSchoolFont'): void {
  if (typeof document === 'undefined' || !fontUrl) return;

  const styleId = `academy-custom-font-${fontFamily}`;
  let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }

  styleEl.textContent = `
    @font-face {
      font-family: '${fontFamily}';
      src: url('${fontUrl}');
      font-weight: 100 900;
      font-style: normal;
      font-display: swap;
    }
  `;

  if ('fonts' in document && typeof (window as any).FontFace !== 'undefined') {
    try {
      const font = new (window as any).FontFace(fontFamily, `url(${fontUrl})`);
      font.load().then((loadedFont: any) => {
        (document as any).fonts.add(loadedFont);
      }).catch((e: any) => {
        console.warn('FontFace API load warning (fallback style tag is active):', e);
      });
    } catch {
      // fallback style tag remains active
    }
  }
}

export function loadGoogleFont(fontFamily: string): void {
  if (typeof document === 'undefined' || !fontFamily) return;
  const cleanFamily = fontFamily.trim().replace(/['"]/g, '');
  if (!cleanFamily || cleanFamily === 'custom' || cleanFamily === 'sans-serif' || cleanFamily === 'serif') return;

  const fontId = `gfont-${cleanFamily.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
  if (document.getElementById(fontId)) return;

  const link = document.createElement('link');
  link.id = fontId;
  link.rel = 'stylesheet';
  const encoded = encodeURIComponent(cleanFamily);
  link.href = `https://fonts.googleapis.com/css2?family=${encoded}:ital,wght@0,300;0,400;0,600;0,700;0,800;0,900;1,400;1,700&display=swap`;
  document.head.appendChild(link);
}

export function applyBrandingFonts(settings?: {
  customFontUrl?: string;
  customFontName?: string;
  gymNameFontFamily?: string;
  customSloganFontUrl?: string;
  sloganFontFamily?: string;
}): void {
  if (typeof document === 'undefined' || !settings || typeof settings !== 'object') return;

  try {
    // School name font
    if (settings.customFontUrl) {
      injectCustomFontFace(settings.customFontUrl, settings.customFontName || 'GymCustomSchoolFont');
    } else if (settings.gymNameFontFamily && settings.gymNameFontFamily !== 'custom') {
      loadGoogleFont(settings.gymNameFontFamily);
    }

    // Slogan font
    if (settings.customSloganFontUrl) {
      injectCustomFontFace(settings.customSloganFontUrl, 'GymCustomSloganFont');
    } else if (settings.sloganFontFamily && settings.sloganFontFamily !== 'custom') {
      loadGoogleFont(settings.sloganFontFamily);
    }
  } catch (err) {
    console.warn('[applyBrandingFonts] Font application warning:', err);
  }
}

export function removeCustomFontFace(fontFamily = 'GymCustomSchoolFont'): void {
  if (typeof document === 'undefined') return;
  const styleEl = document.getElementById(`academy-custom-font-${fontFamily}`);
  if (styleEl && styleEl.parentNode) {
    styleEl.parentNode.removeChild(styleEl);
  }
}

export const PRESET_FONTS = [
  { id: 'Oswald', label: 'Oswald (Athletic Condensed)', category: 'Athletic' },
  { id: 'Bebas Neue', label: 'Bebas Neue (Heavy Combat)', category: 'Combat' },
  { id: 'Montserrat', label: 'Montserrat (Modern Bold)', category: 'Modern' },
  { id: 'Cinzel', label: 'Cinzel (Warrior Prestige)', category: 'Classic' },
  { id: 'Cinzel Decorative', label: 'Cinzel Decorative (Imperial Crest)', category: 'Classic' },
  { id: 'Anton', label: 'Anton (Impact Block)', category: 'Combat' },
  { id: 'Russo One', label: 'Russo One (Grappling Power)', category: 'Combat' },
  { id: 'Teko', label: 'Teko (Tall Athletic Display)', category: 'Athletic' },
  { id: 'Kanit', label: 'Kanit (Modern Thai Boxing / BJJ)', category: 'Modern' },
  { id: 'Syne', label: 'Syne (Artistic Heavy)', category: 'Modern' },
  { id: 'Orbitron', label: 'Orbitron (Futuristic Combat)', category: 'Tactical' },
  { id: 'Playfair Display', label: 'Playfair Display (Traditional Prestige)', category: 'Classic' },
  { id: 'Black Ops One', label: 'Black Ops One (Tactical Dojo)', category: 'Tactical' },
  { id: 'Permanent Marker', label: 'Permanent Marker (Gritty Street Fight)', category: 'Grappling' },
  { id: 'Righteous', label: 'Righteous (Vibrant Retro Combat)', category: 'Modern' },
  { id: 'Roboto Condensed', label: 'Roboto Condensed (Disciplined Compact)', category: 'Clean' },
  { id: 'Inter', label: 'Inter (Crisp Minimal)', category: 'Clean' },
  { id: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans (Clean Dojo)', category: 'Clean' },
];

export const PRESET_SLOGAN_FONTS = [
  { id: 'Caveat', label: 'Caveat (Signature Script / Handwritten)', category: 'Script' },
  { id: 'Satisfy', label: 'Satisfy (Fluid Flow Signature)', category: 'Script' },
  { id: 'Pacifico', label: 'Pacifico (Casual Surfer Jiu-Jitsu)', category: 'Script' },
  { id: 'Montserrat', label: 'Montserrat (Modern Clean)', category: 'Modern' },
  { id: 'Oswald', label: 'Oswald (Bold Compact)', category: 'Athletic' },
  { id: 'Cinzel', label: 'Cinzel (Classical Motto)', category: 'Classic' },
  { id: 'Playfair Display', label: 'Playfair Display (Elegant Serif Italic)', category: 'Classic' },
  { id: 'Permanent Marker', label: 'Permanent Marker (Street Tag)', category: 'Grappling' },
  { id: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans (Neutral Modern)', category: 'Clean' },
  { id: 'Inter', label: 'Inter (Crisp Technical)', category: 'Clean' },
];
