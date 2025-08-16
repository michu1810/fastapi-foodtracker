import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiSun, FiMoon } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';

type Theme = 'light' | 'dark';
const hasWindow = typeof window !== 'undefined';

const getInitialTheme = (): Theme => {
  if (!hasWindow) return 'light';
  try {
    const saved = localStorage.getItem('theme') as Theme | null;
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
};

export default function ThemeToggle() {
  const { t } = useTranslation();
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const isDark = theme === 'dark';

  useEffect(() => {
    if (!hasWindow) return;
    document.documentElement.classList.toggle('dark', isDark);
    try { localStorage.setItem('theme', theme); } catch { /* ignore */ }
  }, [theme, isDark]);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? t('nightMode') : t('dayMode')}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="relative inline-flex items-center justify-between rounded-full
                 bg-white/90 dark:bg-gray-900/90 backdrop-blur p-1 shadow-md
                 h-10 w-[150px] select-none overflow-hidden
                 outline-none focus:outline-none ring-0 focus:ring-0"
    >
      {/* gradient tła */}
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{
          background: isDark
            ? 'linear-gradient(90deg,#0ea5e9 0%,#3730a3 100%)'
            : 'linear-gradient(90deg,#f59e0b 0%,#facc15 100%)',
        }}
        transition={{ type: 'spring', stiffness: 140, damping: 20 }}
      />

      {/* Kontener na napisy i ikony */}
      <div className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-between px-6">
        <span
          className={`text-[11px] font-semibold uppercase tracking-wide
                      ${isDark ? 'text-white' : 'text-gray-900'}
                      ${isDark ? 'opacity-100' : 'opacity-0'}`}
        >
          {t('nightMode')}
        </span>
        <span
          className={`text-[11px] font-semibold uppercase tracking-wide
                      ${isDark ? 'text-white' : 'text-gray-900'}
                      ${isDark ? 'opacity-0' : 'opacity-100'}`}
        >
          {t('dayMode')}
        </span>
      </div>

      {/* Kciuk z ikoną — po lewej dla DAY, po prawej dla NIGHT */}
      <motion.div
        layout
        className={`absolute top-1 h-8 w-8 rounded-full bg-white shadow-md flex items-center justify-center z-[2]
                    ${isDark ? 'right-1' : 'left-1'}`}
        transition={{ type: 'spring', stiffness: 360, damping: 28 }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isDark ? (
            <motion.div key="moon" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <FiMoon className="text-sky-600" />
            </motion.div>
          ) : (
            <motion.div key="sun" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <FiSun className="text-amber-500" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </button>
  );
}
