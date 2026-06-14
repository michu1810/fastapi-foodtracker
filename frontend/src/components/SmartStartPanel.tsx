import { motion } from 'framer-motion';
import { ArrowRight, CalendarDays, PackagePlus, ScanLine, Warehouse } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const steps = [
  { key: 'pantry', icon: Warehouse },
  { key: 'scan', icon: ScanLine },
  { key: 'track', icon: CalendarDays },
] as const;

export default function SmartStartPanel() {
  const { t } = useTranslation();

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="overflow-hidden rounded-xl border border-teal-200 bg-white shadow-md dark:border-teal-500/30 dark:bg-slate-900"
    >
      <div className="grid gap-0 lg:grid-cols-[1fr_1.1fr]">
        <div className="border-b border-slate-200 p-6 dark:border-slate-700 lg:border-b-0 lg:border-r">
          <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">
            <PackagePlus className="h-4 w-4" aria-hidden="true" />
            {t('smartStart.eyebrow')}
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
            {t('smartStart.title')}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            {t('smartStart.body')}
          </p>

          <Link
            to="/profile/pantries"
            className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-teal-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
          >
            {t('smartStart.cta')}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid gap-3 p-6 sm:grid-cols-3 lg:grid-cols-1">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.06 }}
                className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-teal-100 p-2 text-teal-700 dark:bg-teal-500/15 dark:text-teal-200">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-950 dark:text-white">
                      {t(`smartStart.steps.${step.key}.title`)}
                    </h2>
                    <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">
                      {t(`smartStart.steps.${step.key}.body`)}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}
