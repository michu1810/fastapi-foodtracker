import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Subtelne, nowoczesne tło:
 * - gradient + winietowanie
 * - animowane „bloby” (bardzo delikatne)
 * - półprzezroczysta siatka punktowa
 * - lekka, prawie niewidoczna sygnatura nazwy aplikacji
 */
const AuthBackground: React.FC = () => {
  const { t } = useTranslation();
  const appName = t('appName');

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Bazowy gradient + miękkie winietowanie */}
      <div className="absolute inset-0 bg-gradient-to-b from-white to-emerald-50" />
      <div className="absolute inset-0 bg-radial from-transparent via-transparent to-black/5" />

      {/* Delikatna siatka punktowa */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="dotgrid" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="#065f46" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dotgrid)" />
      </svg>

      {/* Animowane bloby */}
      <div className="absolute -top-24 -left-24 w-[42vw] h-[42vw] rounded-full bg-emerald-300/30 blur-3xl animate-blob" />
      <div className="absolute -bottom-32 -right-20 w-[36vw] h-[36vw] rounded-full bg-sky-300/30 blur-3xl animate-blob animation-delay-2000" />
      <div className="absolute top-[30%] right-[15%] w-[22vw] h-[22vw] rounded-full bg-teal-300/25 blur-3xl animate-blob animation-delay-4000" />

      {/* Prawie niewidoczny znak wodny z nazwą aplikacji */}
      <div className="absolute inset-x-0 top-[8%] text-center opacity-[0.05] tracking-tight font-extrabold select-none">
        <div className="inline-block">
          <span className="text-[8vw] bg-gradient-to-r from-emerald-900 to-teal-900 bg-clip-text text-transparent">
            {appName}
          </span>
        </div>
      </div>

      <style>{`
        .bg-radial {
          background: radial-gradient(60% 60% at 50% 30%, transparent 0%, transparent 60%, rgba(0,0,0,0.06) 100%);
        }
        @keyframes blob {
          0%   { transform: translate(0px, 0px) scale(1); }
          33%  { transform: translate(20px, -10px) scale(1.05); }
          66%  { transform: translate(-15px, 10px) scale(0.98); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob { animation: blob 14s ease-in-out infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
      `}</style>
    </div>
  );
};

export default AuthBackground;
