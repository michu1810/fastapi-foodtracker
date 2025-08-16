import React from 'react';
import { useTranslation } from 'react-i18next';

const OnboardingGuide: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 text-center animate-fade-in-smooth border border-blue-200
                    dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700">
      <span className="text-3xl sm:text-4xl mb-4 block">👋</span>
      <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 mb-2">{t('onboarding.title')}</h2>
      <p className="text-gray-600 dark:text-slate-300 max-w-md mx-auto">
        {t('onboarding.body')}{' '}
        <span className="font-semibold text-teal-600 dark:text-teal-400">{t('onboarding.clickHint')}</span>
      </p>
    </div>
  );
};

export default OnboardingGuide;
