import React from 'react';
import { motion } from 'framer-motion';
import { PantryManagement } from '../components/PantryManagement';
import { usePantry } from '../context/PantryContext';
import { useTranslation } from 'react-i18next';

export const PantryManagementPage = () => {
  const { t } = useTranslation();
  const { selectedPantry, loading, refreshPantries } = usePantry();

  const handleDataChange = () => {
    refreshPantries();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4 sm:p-6 lg:p-8 bg-white dark:bg-slate-900 min-h-screen"
    >
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-100 tracking-tight">
            {t('pantryMgmt.page.title')}
          </h1>
          <p className="text-gray-500 dark:text-slate-300 mt-1">
            {t('pantryMgmt.page.subtitle')}
          </p>
        </div>

        {loading && <p className="dark:text-slate-200">{t('loadingPantry')}</p>}

        {!loading && selectedPantry ? (
          <PantryManagement
            pantry={selectedPantry}
            onDataChange={handleDataChange}
          />
        ) : (
          !loading && (
            <p className="text-center text-gray-500 dark:text-slate-300">
              {t('statsPage.selectPantryPrompt')}
            </p>
          )
        )}
      </div>
    </motion.div>
  );
};
