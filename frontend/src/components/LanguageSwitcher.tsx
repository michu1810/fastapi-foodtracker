import React, { useMemo, useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";

type Lang = "en" | "pl";
type Props = { className?: string };
const norm = (lng: string) => (lng?.split("-")[0] ?? "en").toLowerCase() as Lang;

/* Flagi bez clipPath – bezproblemowe na mobile */
const FlagEN = () => (
  <svg viewBox="0 0 60 60" className="h-6 w-6 rounded-full overflow-hidden block" aria-hidden="true">
    <rect width="60" height="60" fill="#012169" />
    <path d="M0 0l60 60m0-60L0 60" stroke="#fff" strokeWidth="12" />
    <path d="M0 0l60 60m0-60L0 60" stroke="#C8102E" strokeWidth="7.5" />
    <rect x="25" width="10" height="60" fill="#fff" />
    <rect y="25" width="60" height="10" fill="#fff" />
    <rect x="27.5" width="5" height="60" fill="#C8102E" />
    <rect y="27.5" width="60" height="5" fill="#C8102E" />
  </svg>
);

const FlagPL = () => (
  <svg viewBox="0 0 60 60" className="h-6 w-6 rounded-full overflow-hidden block" aria-hidden="true">
    <rect width="60" height="60" fill="#fff" />
    <rect y="30" width="60" height="30" fill="#DC143C" />
  </svg>
);

export default function LanguageSwitcher({ className }: Props) {
  const { i18n, t } = useTranslation();

  const active = useMemo(
    () => norm(i18n.resolvedLanguage || i18n.language),
    [i18n.language, i18n.resolvedLanguage]
  );

  // lokalny stan do ładnej animacji
  const [uiLang, setUiLang] = useState<Lang>(active);
  useEffect(() => setUiLang(active), [active]); // sync gdy zmienisz język gdzie indziej

  const isPL = uiLang === "pl";
  const toCommitRef = useRef<Lang | null>(null);
  const fallbackTimer = useRef<number | null>(null);

  const commitI18n = (lng: Lang) => {
    try { localStorage.setItem("i18nextLng", lng); } catch { /* empty */ }
    i18n.changeLanguage(lng);
  };

  const setLang = (lng: Lang) => {
    if (lng === active && lng === uiLang) return;
    setUiLang(lng);
    toCommitRef.current = lng;

    if (fallbackTimer.current) window.clearTimeout(fallbackTimer.current);
    fallbackTimer.current = window.setTimeout(() => {
      if (toCommitRef.current) {
        commitI18n(toCommitRef.current);
        toCommitRef.current = null;
      }
    }, 260);
  };

  useEffect(() => () => {
    if (fallbackTimer.current) window.clearTimeout(fallbackTimer.current);
  }, []);

  const handleLayoutDone = () => {
    if (toCommitRef.current) {
      if (fallbackTimer.current) window.clearTimeout(fallbackTimer.current);
      commitI18n(toCommitRef.current);
      toCommitRef.current = null;
    }
  };

  // Geometria: tor 86px, marginesy po 4px (top-1/left-1), gałka 28px → przesunięcie 50px
  const KNOB_TRAVEL = 50;

  return (
    <div className={className}>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setLang("en")}
          className={`text-sm font-semibold select-none transition-colors ${isPL ? "text-gray-400" : "text-teal-500"}`}
          aria-pressed={!isPL}
        >
          EN
        </button>

        <div
          className="relative grid w-[86px] h-9 grid-cols-2 items-center rounded-full
                     border border-gray-300 bg-white/90 shadow-[inset_0_2px_6px_rgba(0,0,0,0.08)] select-none"
          role="switch"
          aria-checked={isPL}
          aria-label={t("language") ?? "Language"}
          onClick={() => setLang(isPL ? "en" : "pl")}
        >
          {/* Jedna gałka – przesuwana w poziomie */}
          <motion.div
            className="absolute top-1 left-1 h-7 w-7 rounded-full bg-white shadow-md flex items-center justify-center will-change-transform"
            animate={{ x: isPL ? KNOB_TRAVEL : 0 }}
            transition={{ type: "spring", stiffness: 600, damping: 40 }}
            onLayoutAnimationComplete={handleLayoutDone}
          >
            {/* Flagi crossfade – żadnego przerzucania w DOM */}
            <div className="relative h-6 w-6">
              <div className={`absolute inset-0 transition-opacity duration-200 ${isPL ? "opacity-0" : "opacity-100"}`}>
                <FlagEN />
              </div>
              <div className={`absolute inset-0 transition-opacity duration-200 ${isPL ? "opacity-100" : "opacity-0"}`}>
                <FlagPL />
              </div>
            </div>
          </motion.div>
        </div>

        <button
          type="button"
          onClick={() => setLang("pl")}
          className={`text-sm font-semibold select-none transition-colors ${isPL ? "text-teal-500" : "text-gray-400"}`}
          aria-pressed={isPL}
        >
          PL
        </button>
      </div>
    </div>
  );
}
