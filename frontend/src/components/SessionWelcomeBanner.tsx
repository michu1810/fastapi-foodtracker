import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Sparkles, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { usePantry } from '../context/PantryContext';

const AUTH_BANNER_KEY = 'foodtracker:auth-banner';

export default function SessionWelcomeBanner() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { selectedPantry } = usePantry();
  const [source, setSource] = useState<string | null>(null);

  useEffect(() => {
    const storedSource = sessionStorage.getItem(AUTH_BANNER_KEY);
    if (!storedSource) return;

    setSource(storedSource);
    sessionStorage.removeItem(AUTH_BANNER_KEY);
  }, []);

  const providerLabel = useMemo(() => {
    if (source === 'google') return 'Google';
    if (source === 'github') return 'GitHub';
    return t('auth.welcome.passwordProvider');
  }, [source, t]);

  return (
    <AnimatePresence>
      {source && (
        <motion.section
          initial={{ opacity: 0, y: -8, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.99 }}
          transition={{ duration: 0.25 }}
          className="relative overflow-hidden rounded-xl border border-teal-200 bg-teal-50 p-4 shadow-md dark:border-teal-500/30 dark:bg-teal-500/10"
          role="status"
          aria-live="polite"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white text-teal-700 shadow-sm dark:bg-slate-950 dark:text-teal-200">
                <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-teal-800 dark:text-teal-200">
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  {t('auth.welcome.eyebrow', { provider: providerLabel })}
                </p>
                <h2 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">
                  {t('auth.welcome.title', { email: user?.email ?? '' })}
                </h2>
                <p className="mt-1 text-sm leading-6 text-teal-900/80 dark:text-teal-100/80">
                  {selectedPantry ? t('auth.welcome.bodyReady') : t('auth.welcome.bodyNoPantry')}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
              <Link
                to={selectedPantry ? '/' : '/profile/pantries'}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 active:scale-95 dark:focus-visible:ring-offset-slate-950"
              >
                {selectedPantry ? t('auth.welcome.ctaDashboard') : t('auth.welcome.ctaPantry')}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <button
                type="button"
                onClick={() => setSource(null)}
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-teal-300 bg-white px-3 py-2 text-sm font-semibold text-teal-800 transition hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:border-teal-500/40 dark:bg-slate-950 dark:text-teal-100 dark:hover:bg-teal-500/10 dark:focus-visible:ring-offset-slate-950"
                aria-label={t('auth.welcome.dismiss')}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
