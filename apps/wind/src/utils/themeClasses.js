// Theme-aware class utilities for consistent styling

export const themeClasses = {
  // Card backgrounds
  card: (theme) => theme === 'dark' 
    ? 'bg-slate-800/30 border-slate-700' 
    : 'bg-white border-slate-200 shadow-sm',
  
  cardSolid: (theme) => theme === 'dark'
    ? 'bg-slate-800 border-slate-700'
    : 'bg-white border-slate-200 shadow-sm',
  
  // Text colors
  textPrimary: (theme) => theme === 'dark' ? 'text-white' : 'text-slate-900',
  textSecondary: (theme) => theme === 'dark' ? 'text-slate-400' : 'text-slate-600',
  textMuted: (theme) => theme === 'dark' ? 'text-slate-500' : 'text-slate-500',
  
  // Backgrounds
  bgPrimary: (theme) => theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50',
  bgSecondary: (theme) => theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100',
  bgHover: (theme) => theme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-slate-200',
  
  // Borders
  border: (theme) => theme === 'dark' ? 'border-slate-700' : 'border-slate-200',
  
  // Status colors with proper contrast
  success: (theme) => theme === 'dark' ? 'text-green-400' : 'text-green-600',
  successBg: (theme) => theme === 'dark' ? 'bg-green-500/10' : 'bg-green-100',
  
  warning: (theme) => theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600',
  warningBg: (theme) => theme === 'dark' ? 'bg-yellow-500/10' : 'bg-yellow-100',
  
  danger: (theme) => theme === 'dark' ? 'text-red-400' : 'text-red-600',
  dangerBg: (theme) => theme === 'dark' ? 'bg-red-500/10' : 'bg-red-100',
  
  info: (theme) => theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600',
  infoBg: (theme) => theme === 'dark' ? 'bg-cyan-500/10' : 'bg-cyan-100',
  
  // Buttons
  button: (theme) => theme === 'dark'
    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
    : 'bg-slate-100 hover:bg-slate-200 text-slate-700',
  
  buttonPrimary: (theme) => theme === 'dark'
    ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
    : 'bg-cyan-500 hover:bg-cyan-600 text-white',
};

// Helper to combine multiple theme classes
export const tc = (theme, ...classKeys) => {
  return classKeys.map(key => {
    if (typeof key === 'function') return key(theme);
    if (themeClasses[key]) return themeClasses[key](theme);
    return key;
  }).join(' ');
};
