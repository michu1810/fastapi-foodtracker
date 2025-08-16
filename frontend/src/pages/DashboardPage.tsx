import React from 'react';
import { motion } from 'framer-motion';
import { ProductCalendar } from '../components/Calendar/ProductCalendar';
import ExpiringSoonPanel from '../components/ExpiringSoonPanel';
import { usePantry } from '../context/PantryContext';
import { useTranslation } from 'react-i18next';
import CookieConsent from "../components/CookieConsent";


export default function DashboardPage() {
  const { selectedPantry, loading } = usePantry();
  const { t } = useTranslation();

  const renderCalendar = () => {
    if (loading) {
      return (
        <div className="card text-center p-10 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200">
          {t('loadingPantry')}
        </div>
      );
    }
    if (!selectedPantry) {
      return (
        <div className="card text-center p-10 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200">
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
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          <div className="lg:col-span-2 space-y-6">
            {renderCalendar()}
          </div>
          <aside className="space-y-6 z-0">
            <div className="card h-full flex flex-col dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200">
              <h2 className="card-title text-base sm:text-xl dark:text-slate-100">
                🔥 {t('expiringSoon')}
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
