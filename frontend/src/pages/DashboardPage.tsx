import React from 'react';
import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';
import { ProductCalendar } from '../components/Calendar/ProductCalendar';
import ExpiringSoonPanel from '../components/ExpiringSoonPanel';
import { usePantry } from '../context/PantryContext';
import { useTranslation } from 'react-i18next';
import CookieConsent from '../components/CookieConsent';

export default function DashboardPage() {
  const { selectedPantry, loading } = usePantry();
  const { t } = useTranslation();

  const renderCalendar = () => {
    if (loading) {
      return (
        <div className="card p-10 text-center dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {t('loadingPantry')}
        </div>
      );
    }
    if (!selectedPantry) {
      return (
        <div className="card p-10 text-center dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {t('createOrSelectPantry')}
        </div>
      );
    }
    return <ProductCalendar />;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen isolate"
    >
      <div className="w-full space-y-6 md:space-y-10">
        <section className="grid grid-cols-1 gap-6 md:gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {renderCalendar()}
          </div>
          <aside className="z-0 space-y-6">
            <div className="card flex h-full flex-col dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <h2 className="card-title flex items-center gap-2 text-base dark:text-slate-100 sm:text-xl">
                <Flame className="h-5 w-5 text-orange-500" />
                {t('expiringSoon')}
              </h2>
              <CookieConsent />
              <ExpiringSoonPanel />
            </div>
          </aside>
        </section>
      </div>
    </motion.div>
  );
}
