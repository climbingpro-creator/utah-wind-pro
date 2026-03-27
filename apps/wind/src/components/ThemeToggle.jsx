import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <button
      onClick={toggleTheme}
      className={`
        flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-lg transition-colors duration-200
        ${theme === 'dark' 
          ? 'hover:bg-white/5 text-[var(--text-tertiary)] hover:text-amber-400' 
          : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'}
      `}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4" />
      ) : (
        <Moon className="w-4 h-4" />
      )}
      <span className="text-[8px] leading-none font-medium">Theme</span>
    </button>
  );
};

export default ThemeToggle;
