import React from 'react';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import { getAchievements } from '../services/statsService';
import type { Achievement } from '../services/statsService';
import Achievements from '../components/Achievements';
import { Trans, useTranslation } from 'react-i18next';

const AchievementsPage: React.FC = () => {
  const { t } = useTranslation();
  const { data: list, error } = useSWR<Achievement[]>('/products/achievements', getAchievements);

  if (error) {
    return (
      <div className="p-6 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg text-center">
        {t('achievementsPage.fetchError')}
      </div>
    );
  }
  if (!list) {
    return <div className="text-center p-10 dark:text-slate-200">{t('achievementsPage.loading')}</div>;
  }

  const achievedCount = list.filter(ach => ach.achieved).length;
  const totalCount = list.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-slate-50 dark:bg-slate-900 py-10 px-4"
    >
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-bold text-gray-800 dark:text-slate-100 tracking-tight">
            {t('achievementsPage.title')}
          </h2>

          <p className="mt-2 text-lg text-gray-600 dark:text-slate-300">
            <Trans
              i18nKey="achievementsPage.progress"
              values={{ achieved: achievedCount, total: totalCount }}
              components={{ bold: <span className="font-bold text-blue-600 dark:text-sky-400" /> }}
            />
          </p>
        </div>

        <Achievements list={list} />
      </div>
    </motion.div>
  );
};

export default AchievementsPage;
