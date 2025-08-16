import React from 'react';
import { useTranslation } from 'react-i18next';
import AnimatedLangSwitcher from '../LanguageSwitcher';

/**
 * Pełnoekranowy layout dla stron autoryzacji.
 * - delikatny gradient tła
 * - animowany, subtelny wordmark (nazwa z i18n)
 * - lekkie kropki po bokach
 * - wspólny przełącznik języka w prawym górnym rogu
 */
const AuthLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const name = t('appName') || 'Food Tracker';
  const marquee = `${name} • ${name} • ${name} • ${name}`;

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-white to-emerald-50">
      {/* przełącznik języka */}
      <div className="fixed right-4 top-4 z-40">
        <AnimatedLangSwitcher />
      </div>

      {/* Subtelne kropki po bokach */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute left-[-10%] top-[-10%] h-[140%] w-[40%] opacity-[0.12]">
          <div className="h-full w-full bg-[radial-gradient(circle,_#000_1px,_transparent_1px)] bg-[length:16px_16px]" />
        </div>
        <div className="absolute right-[-10%] bottom-[-10%] h-[140%] w-[40%] opacity-[0.08]">
          <div className="h-full w-full bg-[radial-gradient(circle,_#000_1px,_transparent_1px)] bg-[length:18px_18px]" />
        </div>
      </div>

      {/* Animowany wordmark – maska + bardzo niska opac. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center">
        <div className="relative w-[160vw] max-w-none opacity-[0.08] [mask-image:linear-gradient(to_bottom,transparent,black,black,transparent)]">
          <div className="animate-[slideWordmark_26s_linear_infinite] whitespace-nowrap text-[16vw] font-extrabold leading-none tracking-tight text-emerald-800/80 select-none">
            {marquee}
          </div>
        </div>
      </div>

      {/* Zawartość (karta formularza) */}
      <main className="relative z-10 flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>

      <style>{`
        @keyframes slideWordmark {
          0% { transform: translateX(0); }
          100% { transform: translateX(-25%); }
        }
      `}</style>
    </div>
  );
};

export default AuthLayout;
