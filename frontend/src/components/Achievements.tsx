import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { FaLock, FaCrown } from 'react-icons/fa';
import { Achievement } from '../services/statsService';
import { useTranslation } from 'react-i18next';

interface AchievementsProps {
  list: Achievement[];
}

/** mapowanie typu osiągnięcia -> klucz grupy (nagłówek tłumaczymy przez i18n) */
const GROUP_KEY_BY_TYPE: Record<string, 'wasteFighting' | 'financialMastery' | 'activityCollecting' | 'tenureRegularity' | 'creativeChallenges'> = {
  saved_products: 'wasteFighting',
  efficiency_rate: 'wasteFighting',

  money_saved: 'financialMastery',
  total_spent_value: 'financialMastery',

  total_products: 'activityCollecting',
  day_add_streak: 'activityCollecting',
  active_products_count: 'activityCollecting',

  days_as_user: 'tenureRegularity',
  weekend_adds: 'tenureRegularity',
  sunday_adds: 'tenureRegularity',

  cheese_products: 'creativeChallenges',
  night_actions: 'creativeChallenges',
  healthy_monday_add: 'creativeChallenges',
  morning_caffeine_add: 'creativeChallenges',
};

const CATEGORY_ORDER: Array<'wasteFighting' | 'financialMastery' | 'activityCollecting' | 'tenureRegularity' | 'creativeChallenges'> = [
  'wasteFighting',
  'financialMastery',
  'activityCollecting',
  'tenureRegularity',
  'creativeChallenges',
];

const Achievements: React.FC<AchievementsProps> = ({ list }) => {
  const { t } = useTranslation();

  const grouped = useMemo(() => {
    const groups: Record<
      string,
      { title: string; achievements: Achievement[] }
    > = {};

    list?.forEach((ach) => {
      const gk = GROUP_KEY_BY_TYPE[ach.type] ?? 'creativeChallenges';
      if (!groups[gk]) {
        groups[gk] = {
          title: t(`achievementsSection.groups.${gk}`),
          achievements: [],
        };
      }
      groups[gk].achievements.push(ach);
    });

    Object.values(groups).forEach((g) =>
      g.achievements.sort((a, b) => (a.total_progress ?? 0) - (b.total_progress ?? 0))
    );

    return groups;
  }, [list, t]);

  if (!list || list.length === 0) return null;

  const orderedKeys = CATEGORY_ORDER.filter((k) => grouped[k]);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg dark:bg-slate-800 dark:text-slate-200">
      <div className="space-y-10">
        {orderedKeys.map((gk) => {
          const group = grouped[gk];
          return (
            <section key={gk}>
              <h4 className="text-xl font-semibold text-gray-700 dark:text-slate-100 mb-4 border-b pb-2 border-gray-200 dark:border-slate-700">
                {group.title}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {group.achievements.map((ach, index) => (
                  <AchievementCard key={ach.id} achievement={ach} index={index} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};

const AchievementCard: React.FC<{ achievement: Achievement; index: number }> = ({ achievement, index }) => {
  const { t } = useTranslation();
  const { id, name, description, icon, achieved, current_progress, total_progress, type } = achievement;

  const current = current_progress ?? 0;
  const total = total_progress ?? 1;
  const progress = total > 0 ? Math.min((current / total) * 100, 100) : 0;

  const isLocked = !achieved && current === 0 && total > 1;

  // i18n klucze dla tytułu/opisu kafelka: achievements.items.<type>.<threshold>.(title|desc)
  const titleI18n = t(`achievementI18n.byId.${id}.title`, { defaultValue: name });
  const descI18n  = t(`achievementI18n.byId.${id}.desc`,  { value: Number(total_progress ?? 0), defaultValue: description });

  const currency = t('currency.pln');

  const formatValue = (value: number) => {
    if (type.includes('money') || type.includes('value')) {
      return `${value.toFixed(2)} ${currency}`;
    }
    if (type === 'efficiency_rate') return `${value}%`;
    return value;
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { delay: index * 0.05 } },
  };

  const base = 'p-4 rounded-xl border-2 flex flex-col transition-all duration-300 h-44 relative overflow-hidden group';
  const cardClasses = achieved
    ? `${base} bg-yellow-50/50 border-yellow-400 shadow-lg dark:bg-yellow-900/30 dark:border-yellow-500`
    : isLocked
    ? `${base} grayscale opacity-60 hover:opacity-100 bg-white border-gray-200 dark:bg-slate-800 dark:border-slate-700`
    : `${base} bg-white border-gray-200 dark:bg-slate-800 dark:border-slate-700`;

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      title={isLocked ? t('achievementsSection.requirement', { description: descI18n }) : ''}
      className={cardClasses}
    >
      {isLocked && <div className="absolute inset-0 bg-gray-500/10 dark:bg-slate-900/10 backdrop-blur-[1px] z-10"></div>}

      <div className="flex items-center mb-2">
        <div className={`text-5xl mr-4 transition-transform duration-300 ${!isLocked && 'group-hover:scale-110'}`}>{icon}</div>
        <div className="flex-1">
          <p className={`font-bold ${isLocked ? 'text-gray-500 dark:text-gray-400' : 'text-gray-800 dark:text-slate-100'}`}>{titleI18n}</p>
          <p className="text-xs text-gray-500 dark:text-slate-400">{descI18n}</p>
        </div>
        {achieved && <FaCrown className="text-2xl text-yellow-500 absolute top-3 right-3" />}
        {isLocked && <FaLock className="text-xl text-gray-400 absolute top-3 right-3" />}
      </div>

      {!achieved && !isLocked && total_progress !== null && (
        <div className="mt-auto pt-2">
          <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5">
            <div
              className="bg-blue-500 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-xs text-right text-gray-500 dark:text-slate-400 mt-1">
            {formatValue(Math.min(current, total))} / {formatValue(total)}
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default Achievements;
