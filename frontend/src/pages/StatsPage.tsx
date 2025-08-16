import React from 'react';
import { motion } from 'framer-motion';
import { FaBoxOpen, FaCheck, FaPiggyBank, FaTrash, FaExclamationCircle, FaChartLine } from 'react-icons/fa';
import CountUp from 'react-countup';
import { getStats, getFinancialStats, FinancialStats, Stats, TrendData } from '../services/statsService';
import useSWR from 'swr';
import TrendChart from '../components/TrendChart';
import FinancialBarChart from '../components/FinancialBarChart';
import { usePantry } from '../context/PantryContext';
import apiClient from '../services/api';
import CategoryStats from '../components/CategoryStats';
import MostWastedProducts from '../components/MostWastedProducts';
import { useTranslation } from 'react-i18next';

const CardWrapper: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className }) => (
  <div className={`bg-white dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 p-6 rounded-2xl shadow-lg border border-gray-200/80 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] ${className}`}>
    {children}
  </div>
);

const FinancialCard: React.FC<{ title: string; value: number; icon: React.ElementType; color: string }> = ({ title, value, icon: Icon, color }) => (
  <CardWrapper className="text-center flex-1 w-full">
    <Icon className={`mx-auto text-4xl ${color}`} />
    <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">{title}</p>
    <p className="text-3xl font-bold text-gray-800 dark:text-slate-100 px-2">
      <CountUp end={value} duration={1.5} decimals={2} separator=" " decimal="," /> zł
    </p>
  </CardWrapper>
);

const EfficiencyGauge: React.FC<{ used: number; wasted: number }> = ({ used, wasted }) => {
  const { t } = useTranslation();
  const totalActions = used + wasted;
  const efficiency = totalActions > 0 ? Math.round((used / totalActions) * 100) : 0;
  const circumference = 2 * Math.PI * 52;
  const offset = circumference - (efficiency / 100) * circumference;

  return (
    <CardWrapper className="flex flex-col items-center justify-center">
      <h3 className="text-xl font-bold text-gray-800 dark:text-slate-100 mb-4">{t('statsPage.efficiencyTitle')}</h3>
      <div className="relative w-40 h-40">
        <svg className="w-full h-full" viewBox="0 0 120 120">
          <circle className="text-gray-200 dark:text-slate-700" strokeWidth="12" stroke="currentColor" fill="transparent" r="52" cx="60" cy="60" />
          <circle
            className="text-green-500"
            strokeWidth="12"
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round" stroke="currentColor" fill="transparent"
            r="52" cx="60" cy="60" transform="rotate(-90 60 60)"
            style={{ transition: 'stroke-dashoffset 1.5s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl font-bold text-gray-800 dark:text-slate-100">{efficiency}%</span>
        </div>
      </div>
      <p className="mt-4 text-center text-sm text-gray-600 dark:text-slate-300">{t('statsPage.efficiencyHint')}</p>
    </CardWrapper>
  );
};

const CountBlock: React.FC<{ icon: React.ElementType; value: number; label: string; color: string }> = ({ icon: Icon, value, label, color }) => (
  <CardWrapper className="flex flex-col items-center text-center p-4">
    <Icon className={`text-3xl mb-2 ${color}`} />
    <p className="text-3xl font-bold text-gray-800 dark:text-slate-100">
      <CountUp end={value} duration={1.5} />
    </p>
    <p className="text-sm text-gray-500 dark:text-slate-300 mt-1">{label}</p>
  </CardWrapper>
);

const SavingsForecastCard: React.FC<{ savedSoFar: number }> = ({ savedSoFar }) => {
  const { t } = useTranslation();
  const today = new Date();
  const dayOfMonth = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const projection = dayOfMonth > 1 ? (savedSoFar / dayOfMonth) * daysInMonth : savedSoFar;

  return (
    <CardWrapper className="flex flex-col items-center justify-center">
      <FaChartLine className="mx-auto text-4xl text-indigo-500" />
      <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">{t('statsPage.monthForecastTitle')}</p>
      <p className="text-xl font-bold text-gray-800 dark:text-slate-100">
        {t('statsPage.monthForecastApproxPrefix')}{' '}
        <CountUp end={projection} duration={1.5} decimals={2} separator=" " decimal="," />{' '}
        {t('currency.pln')}
      </p>
      <p className="mt-2 text-center text-xs text-gray-500 dark:text-slate-400">
        {t('statsPage.monthForecastHint')}
      </p>
    </CardWrapper>
  );
}

export default function StatsPage() {
  const { t } = useTranslation();
  const { selectedPantry } = usePantry();

  const swrKeyForStats = selectedPantry ? `/pantries/${selectedPantry.id}/products/stats` : null;
  const { data: quantityStats, error: qError } = useSWR<Stats>(swrKeyForStats, () => getStats(selectedPantry!.id));

  const swrKeyForFinancials = selectedPantry ? `/pantries/${selectedPantry.id}/products/stats/financial` : null;
  const { data: financialStats, error: fError } = useSWR<FinancialStats>(swrKeyForFinancials, () => getFinancialStats(selectedPantry!.id));

  const swrKeyForTrends = selectedPantry ? `/pantries/${selectedPantry.id}/products/stats/trends` : null;
  const { data: trendData, error: tError } = useSWR<TrendData[]>(swrKeyForTrends, (url: string) => apiClient.get(url).then(res => res.data));

  const isLoading = selectedPantry && !quantityStats && !financialStats && !qError && !fError;
  const error = qError || fError || tError;

  if (!selectedPantry) {
    return <div className="text-center p-10 text-gray-500 dark:text-slate-400">{t('statsPage.selectPantryPrompt')}</div>;
  }

  if (isLoading) return <div className="text-center p-10 dark:text-slate-200">{t('statsPage.loadingStats')}</div>;
  if (error && (!quantityStats || !financialStats)) return <div className="p-6 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg text-center">{t('statsPage.fetchError')}</div>;
  if (!quantityStats || !financialStats) return <div className="text-center p-10 dark:text-slate-200">{t('statsPage.noData')}</div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 sm:p-6 lg:p-8 bg-slate-50 dark:bg-slate-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl font-bold text-gray-800 dark:text-slate-100 mb-2 text-center tracking-tight">{t('statsPage.dashboardTitle')}</h2>
        <p className="text-center text-gray-500 dark:text-slate-300 mb-10">
          {t('statsPage.forPantry')} <span className="font-semibold text-teal-600 dark:text-teal-400">{selectedPantry.name}</span>
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-stretch">

          <div className="lg:col-span-3 space-y-8">
            <div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-slate-100 text-center mb-4">{t('statsPage.productStatsTitle')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <CountBlock icon={FaBoxOpen} value={quantityStats.total} label={t('statsPage.allProducts')} color="text-blue-500" />
                <CountBlock icon={FaCheck} value={quantityStats.used} label={t('statsPage.savedProducts')} color="text-green-500" />
                <CountBlock icon={FaExclamationCircle} value={quantityStats.wasted} label={t('statsPage.wastedProducts')} color="text-red-500" />
              </div>
            </div>
            <EfficiencyGauge used={quantityStats.used} wasted={quantityStats.wasted} />

            {tError ? (
              <div className="text-center text-red-500 dark:text-red-400 p-4 bg-red-50 dark:bg-red-900/10 rounded-lg">{t('statsPage.trendError')}</div>
            ) : !trendData ? (
              <div className="text-center p-4 bg-white dark:bg-slate-800 dark:text-slate-200 rounded-2xl shadow-lg">{t('statsPage.trendLoading')}</div>
            ) : (
              <TrendChart data={trendData} />
            )}
          </div>

          <div className="lg:col-span-2 flex flex-col gap-8">
            <div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-slate-100 text-center mb-4">{t('statsPage.financialSummaryTitle')}</h3>
              <div className="flex flex-col sm:flex-row gap-6 w-full">
                <FinancialCard title={t('statsPage.savedMoney')} value={financialStats.saved} icon={FaPiggyBank} color="text-green-500" />
                <FinancialCard title={t('statsPage.lostMoney')} value={financialStats.wasted} icon={FaTrash} color="text-red-500" />
              </div>
            </div>
            <CardWrapper>
              <FinancialBarChart data={financialStats} />
            </CardWrapper>

            <div className="flex flex-col gap-8 flex-grow">
              <SavingsForecastCard savedSoFar={financialStats.saved} />
              <div className="flex-grow flex flex-col gap-8">
                <MostWastedProducts />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <CategoryStats />
        </div>
      </div>
    </motion.div>
  );
}
