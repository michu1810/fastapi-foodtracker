import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import Portal from "./Portal";

const STORAGE_KEY = "cookie:consentAccepted";
const COOKIE_NAME = "cookie_consent";

function hasAcceptedOnce(): boolean {
  try {
    if (localStorage.getItem(STORAGE_KEY) === "1") return true;
  } catch { /* empty */ }
  return document.cookie.split("; ").some((c) => c.startsWith(`${COOKIE_NAME}=1`));
}

function persistAcceptance() {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch { /* empty */ }
  document.cookie = `${COOKIE_NAME}=1; max-age=${60 * 60 * 24 * 365}; path=/; samesite=lax`;
}

const CookieConsent: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [open, setOpen] = useState(false);
  const shownRef = useRef(false);

  useEffect(() => {
    // pokazuj tylko po zalogowaniu i tylko jeśli jeszcze nie zaakceptowano
    if (!user) return;
    if (!shownRef.current && !hasAcceptedOnce()) {
      shownRef.current = true;
      setOpen(true);
    }
  }, [user]);

  const onAccept = () => {
    persistAcceptance();
    setOpen(false);
  };

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div
            // TOAST „przyklejony” do okna przeglądarki
            className="fixed z-[9999] right-4 left-4 sm:left-auto bottom-[calc(env(safe-area-inset-bottom)+16px)] sm:bottom-4 sm:right-[calc(env(safe-area-inset-right)+16px)] sm:max-w-sm"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.22 }}
            role="dialog"
            aria-live="polite"
          >
            <div className="rounded-2xl border bg-white/95 p-4 shadow-[0_10px_30px_rgba(0,0,0,.2)] backdrop-blur-md
                            border-gray-200 dark:border-slate-700 dark:bg-slate-800/95">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                {t("cookie.title")}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-gray-600 dark:text-slate-300">
                {t("cookie.body")}
              </p>

              <div className="mt-3 flex items-center justify-end">
                <button
                  onClick={onAccept}
                  className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white
                             hover:bg-blue-700 active:scale-95 transition"
                >
                  {t("cookie.ok")}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
};

export default CookieConsent;
