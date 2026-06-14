import { motion } from 'framer-motion';
import useSWR from 'swr';
import { ArrowRight, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePantry } from '../context/PantryContext';
import { getAchievements } from '../services/statsService';
import type { Achievement } from '../services/statsService';

function getProgress(achievement: Achievement) {
  const current = achievement.current_progress ?? 0;
  const total = achievement.total_progress ?? 0;
  if (achievement.achieved) return 100;
  if (total <= 0) return 0;
  return Math.min(100, Math.round((current / total) * 100));
}

function getNextAchievement(list: Achievement[]) {
  return list
    .filter((achievement) => !achievement.achieved)
    .sort((a, b) => getProgress(b) - getProgress(a))[0] ?? null;
}

export default function NextAchievementPanel() {
  const { selectedPantry } = usePantry();
  const { t } = useTranslation();

  const achievementsKey = selectedPantry ? `/pantries/${selectedPantry.id}/products/achievements` : null;
  const { data: achievements = [], isLoading } = useSWR<Achievement[]>(
    achievementsKey,
    () => getAchievements(selectedPantry!.id),
    { refreshInterval: 60000, revalidateOnFocus: true }
  );

  if (!selectedPantry) return null;

  const nextAchievement = getNextAchievement(achievements);
  const progress = nextAchievement ? getProgress(nextAchievement) : 100;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.08 }}
      className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-md dark:border-amber-500/30 dark:bg-amber-500/10"
      aria-labelledby="next-achievement-title"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-white p-2 text-amber-600 shadow-sm dark:bg-slate-900 dark:text-amber-300">
            <Trophy className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
              {t('nextAchievement.eyebrow')}
            </p>
            <h2 id="next-achievement-title" className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
              {isLoading
                ? t('nextAchievement.loading')
                : nextAchievement
                  ? t(`achievementI18n.byId.${nextAchievement.id}.title`, { defaultValue: nextAchievement.name })
                  : t('nextAchievement.completeTitle')}
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-amber-800/80 dark:text-amber-100/80">
              {nextAchievement
                ? t(`achievementI18n.byId.${nextAchievement.id}.desc`, {
                    value: Number(nextAchievement.total_progress ?? 0),
                    defaultValue: nextAchievement.description,
                  })
                : t('nextAchievement.completeBody')}
            </p>
          </div>
        </div>

        <Link
          to="/achievements"
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 dark:focus-visible:ring-white dark:focus-visible:ring-offset-slate-950"
        >
          {t('nextAchievement.cta')}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/80 dark:bg-slate-900/70">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.75, ease: 'easeOut' }}
          className="h-full rounded-full bg-amber-500"
        />
      </div>
    </motion.section>
  );
}
