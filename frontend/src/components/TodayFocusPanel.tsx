import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import useSWR, { useSWRConfig } from 'swr';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChefHat,
  Clock3,
  Coins,
  Leaf,
  Sparkles,
  Target,
  Trash2,
  Undo2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePantry } from '../context/PantryContext';
import { productsService } from '../services/productService';
import type { Product } from '../services/productService';
import type { Achievement } from '../services/statsService';
import { categoryI18nKey } from '../utils/categoryI18n';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

type FocusAction = 'use' | 'waste';

type FocusProduct = Product & {
  daysLeft: number;
  riskValue: number;
  priority: number;
};

function toLocalDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function getDaysLeft(expirationDate: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((toLocalDate(expirationDate).getTime() - today.getTime()) / MS_PER_DAY);
}

function getRiskValue(product: Product) {
  if (product.initial_amount <= 0 || product.current_amount <= 0) return 0;
  const remainingRatio = Math.min(product.current_amount / product.initial_amount, 1);
  return product.price * remainingRatio;
}

function getPriority(product: Product, daysLeft: number, riskValue: number) {
  const urgency = daysLeft < 0 ? 120 : daysLeft === 0 ? 100 : Math.max(0, 80 - daysLeft * 14);
  return urgency + Math.min(riskValue * 2, 60) + Math.min(product.current_amount, 20);
}

function unitLabel(product: Product, t: ReturnType<typeof useTranslation>['t']) {
  return product.unit === 'szt.' ? t('unitPiecesShort') : t('unitGramsShort');
}

function buildFocusProducts(products: Product[]): FocusProduct[] {
  return products
    .filter((product) => product.current_amount > 0)
    .map((product) => {
      const daysLeft = getDaysLeft(product.expiration_date);
      const riskValue = getRiskValue(product);
      return {
        ...product,
        daysLeft,
        riskValue,
        priority: getPriority(product, daysLeft, riskValue),
      };
    })
    .sort((a, b) => b.priority - a.priority);
}

function getSuggestedUseOptions(product: FocusProduct, t: ReturnType<typeof useTranslation>['t']) {
  const unit = unitLabel(product, t);
  const allAmount = product.current_amount;

  if (product.unit === 'szt.') {
    const oneAmount = Math.min(1, allAmount);
    const options = [{ key: 'one', label: `${oneAmount} ${unit}`, amount: oneAmount }];
    if (allAmount > oneAmount) {
      options.push({ key: 'all', label: t('todayFocus.actions.all'), amount: allAmount });
    }
    return options;
  }

  const halfAmount = Math.max(allAmount / 2, 1);
  const roundedHalf = Math.min(allAmount, Math.round(halfAmount * 100) / 100);
  return [
    { key: 'half', label: t('todayFocus.actions.half'), amount: roundedHalf },
    { key: 'all', label: t('todayFocus.actions.all'), amount: allAmount },
  ];
}

function getRecipeKey(products: FocusProduct[]) {
  const keys = new Set(products.map((product) => categoryI18nKey(product.category)));

  if (keys.has('bakery') && (keys.has('dairy') || keys.has('meat') || keys.has('vegetables'))) {
    return 'sandwich';
  }
  if ((keys.has('meat') || keys.has('fish_seafood')) && keys.has('vegetables')) {
    return 'pan';
  }
  if (keys.has('fruits') && keys.has('dairy')) {
    return 'bowl';
  }
  if (keys.has('vegetables') || keys.has('fruits')) {
    return 'salad';
  }
  return 'quick';
}

function statusTone(daysLeft: number) {
  if (daysLeft < 0) return 'bg-red-100 text-red-700 ring-red-200 dark:bg-red-500/15 dark:text-red-200 dark:ring-red-500/30';
  if (daysLeft === 0) return 'bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-amber-500/30';
  if (daysLeft <= 2) return 'bg-orange-100 text-orange-700 ring-orange-200 dark:bg-orange-500/15 dark:text-orange-200 dark:ring-orange-500/30';
  return 'bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-500/30';
}

export default function TodayFocusPanel() {
  const { selectedPantry } = usePantry();
  const { t, i18n } = useTranslation();
  const { mutate } = useSWRConfig();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [confirmWasteProductId, setConfirmWasteProductId] = useState<number | null>(null);

  const allProductsKey = selectedPantry ? `/pantries/${selectedPantry.id}/products/get` : null;
  const { data: products = [], error, isLoading } = useSWR<Product[]>(
    allProductsKey,
    () => productsService.getAllProducts(selectedPantry!.id),
    { refreshInterval: 45000, revalidateOnFocus: true }
  );

  const focusProducts = useMemo(() => buildFocusProducts(products), [products]);
  const urgentProducts = focusProducts.filter((product) => product.daysLeft <= 3);
  const heroProduct = urgentProducts[0] ?? focusProducts[0] ?? null;
  const planProducts = (urgentProducts.length > 0 ? urgentProducts : focusProducts).slice(0, 4);
  const atRiskValue = urgentProducts.reduce((sum, product) => sum + product.riskValue, 0);
  const expiredCount = focusProducts.filter((product) => product.daysLeft < 0).length;
  const rescueScore = focusProducts.length === 0
    ? 100
    : Math.max(0, Math.round(((focusProducts.length - urgentProducts.length) / focusProducts.length) * 100));
  const recipeKey = getRecipeKey(planProducts);

  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat(i18n.language, { style: 'currency', currency: 'PLN' }),
    [i18n.language]
  );

  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short' }),
    [i18n.language]
  );

  const refreshDashboardData = async () => {
    if (!selectedPantry) return;
    await Promise.all([
      mutate(allProductsKey),
      mutate(`expiring/${selectedPantry.id}`),
      mutate(`/pantries/${selectedPantry.id}/products/stats`),
      mutate(`/pantries/${selectedPantry.id}/products/stats/financial`),
      mutate(`/pantries/${selectedPantry.id}/products/stats/trends`),
      mutate('/products/achievements'),
      mutate(`/pantries/${selectedPantry.id}/products/achievements`),
    ]);
    window.dispatchEvent(new Event('foodtracker:products-changed'));
  };

  const showAchievementToasts = (achievements: Achievement[] | undefined) => {
    if (!achievements?.length) return;

    achievements.forEach((achievement) => {
      toast.success(
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden="true">{achievement.icon}</span>
          <div>
            <p className="font-semibold">{t('toasts.achievementUnlocked')}</p>
            <p className="text-sm">{achievement.name}</p>
          </div>
        </div>,
        { duration: 8000, style: { backgroundColor: '#0f766e', color: 'white' } }
      );
    });
  };

  const handleUndo = async (product: FocusProduct, action: FocusAction, amount: number) => {
    if (!selectedPantry) return;

    try {
      await productsService.undoProductAction(selectedPantry.id, product.id, action, amount);
      toast.success(t('todayFocus.toasts.undone', { name: product.name }));
      await refreshDashboardData();
    } catch (undoError) {
      console.error('Today focus undo failed:', undoError);
      toast.error(t('todayFocus.toasts.undoFailed'));
    }
  };

  const handleQuickAction = async (product: FocusProduct, action: FocusAction, amount = product.current_amount) => {
    if (!selectedPantry || pendingAction) return;

    if (action === 'waste' && confirmWasteProductId !== product.id) {
      setConfirmWasteProductId(product.id);
      return;
    }

    const actionKey = `${action}-${product.id}`;
    setPendingAction(actionKey);
    setConfirmWasteProductId(null);

    try {
      const response = action === 'use'
        ? await productsService.useProduct(selectedPantry.id, product.id, amount)
        : await productsService.wasteProduct(selectedPantry.id, product.id, amount);

      toast.success(
        (toastObj) => (
          <div className="flex items-center gap-3">
            <span>
              {t(action === 'use' ? 'todayFocus.toasts.used' : 'todayFocus.toasts.wasted', {
                name: product.name,
              })}
            </span>
            <button
              type="button"
              onClick={() => {
                toast.dismiss(toastObj.id);
                void handleUndo(product, action, amount);
              }}
              className="inline-flex items-center gap-1 rounded-md bg-white/15 px-2 py-1 text-xs font-semibold text-white transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            >
              <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
              {t('todayFocus.actions.undo')}
            </button>
          </div>
        ),
        { duration: 9000, style: { backgroundColor: '#0f766e', color: 'white' } }
      );
      showAchievementToasts(response.unlocked_achievements);
      await refreshDashboardData();
    } catch (actionError) {
      console.error('Today focus action failed:', actionError);
      toast.error(t('todayFocus.toasts.failed'));
    } finally {
      setPendingAction(null);
    }
  };

  if (!selectedPantry) return null;

  if (error) {
    return (
      <section className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-950/30 dark:text-red-200">
        {t('todayFocus.error')}
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-md dark:border-slate-700 dark:bg-slate-900">
        <div className="h-5 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-32 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      </section>
    );
  }

  if (focusProducts.length === 0) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-md dark:border-emerald-500/30 dark:bg-emerald-950/20"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              {t('todayFocus.emptyEyebrow')}
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{t('todayFocus.emptyTitle')}</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-300">{t('todayFocus.emptyBody')}</p>
          </div>
          <div className="rounded-lg bg-white px-4 py-3 text-sm font-semibold text-emerald-700 shadow-sm dark:bg-slate-900 dark:text-emerald-300">
            {t('todayFocus.score', { score: 100 })}
          </div>
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md dark:border-slate-700 dark:bg-slate-900"
      aria-labelledby="today-focus-title"
    >
      <div className="grid gap-0 lg:grid-cols-[1.05fr_1.25fr_0.9fr]">
        <div className="border-b border-slate-200 p-5 dark:border-slate-700 lg:border-b-0 lg:border-r">
          <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">
            <Target className="h-4 w-4" aria-hidden="true" />
            {t('todayFocus.eyebrow')}
          </p>
          <h2 id="today-focus-title" className="mt-2 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
            {heroProduct
              ? t('todayFocus.titleWithProduct', { name: heroProduct.name })
              : t('todayFocus.title')}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {urgentProducts.length > 0
              ? t('todayFocus.bodyUrgent', { count: urgentProducts.length })
              : t('todayFocus.bodyCalm')}
          </p>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <MetricTile
              icon={AlertTriangle}
              label={t('todayFocus.metrics.urgent')}
              value={String(urgentProducts.length)}
              tone="text-orange-600 dark:text-orange-300"
            />
            <MetricTile
              icon={Coins}
              label={t('todayFocus.metrics.value')}
              value={currencyFormatter.format(atRiskValue)}
              tone="text-teal-700 dark:text-teal-300"
            />
            <MetricTile
              icon={Clock3}
              label={t('todayFocus.metrics.expired')}
              value={String(expiredCount)}
              tone="text-red-600 dark:text-red-300"
            />
          </div>
        </div>

        <div className="border-b border-slate-200 p-5 dark:border-slate-700 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
                <ChefHat className="h-5 w-5 text-teal-600 dark:text-teal-300" aria-hidden="true" />
                {t('todayFocus.planTitle')}
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {t(`todayFocus.recipe.${recipeKey}`)}
              </p>
            </div>
            <div className="hidden rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300 sm:block">
              {t('todayFocus.planBadge')}
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {planProducts.map((product) => {
              const amountLabel = `${product.current_amount} ${unitLabel(product, t)}`;
              const actionUseKey = `use-${product.id}`;
              const actionWasteKey = `waste-${product.id}`;
              const useOptions = getSuggestedUseOptions(product, t);

              return (
                <article
                  key={product.id}
                  className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/70 sm:grid-cols-[1fr_auto]"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="truncate font-semibold text-slate-950 dark:text-white">{product.name}</h4>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${statusTone(product.daysLeft)}`}>
                        {product.daysLeft < 0
                          ? t('todayFocus.days.expired', { count: Math.abs(product.daysLeft) })
                          : product.daysLeft === 0
                            ? t('todayFocus.days.today')
                            : t('todayFocus.days.left', { count: product.daysLeft })}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                        {dateFormatter.format(toLocalDate(product.expiration_date))}
                      </span>
                      <span>{amountLabel}</span>
                      <span>{currencyFormatter.format(product.riskValue)}</span>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:w-52">
                    <div className="grid grid-cols-2 gap-2">
                      {useOptions.map((option) => (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => handleQuickAction(product, 'use', option.amount)}
                          disabled={!!pendingAction}
                          aria-busy={pendingAction === actionUseKey}
                          className="inline-flex min-h-10 items-center justify-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:focus-visible:ring-offset-slate-900"
                        >
                          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                          {option.label}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleQuickAction(product, 'waste')}
                      disabled={!!pendingAction}
                      aria-busy={pendingAction === actionWasteKey}
                      className={`inline-flex min-h-10 items-center justify-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:focus-visible:ring-offset-slate-900 ${
                        confirmWasteProductId === product.id
                          ? 'border-red-500 bg-red-600 text-white hover:bg-red-700 dark:border-red-400 dark:bg-red-600 dark:text-white'
                          : 'border-orange-300 bg-white text-orange-700 hover:bg-orange-50 dark:border-orange-500/40 dark:bg-slate-900 dark:text-orange-200 dark:hover:bg-orange-500/10'
                      }`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      {confirmWasteProductId === product.id
                        ? t('todayFocus.actions.confirmWaste')
                        : t('todayFocus.actions.waste')}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <div className="p-5">
          <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
            <Leaf className="h-5 w-5 text-emerald-600 dark:text-emerald-300" aria-hidden="true" />
            {t('todayFocus.scoreTitle')}
          </h3>
          <div className="mt-5 flex items-end gap-2">
            <span className="text-5xl font-black tracking-tight text-slate-950 dark:text-white">{rescueScore}</span>
            <span className="pb-2 text-sm font-semibold text-slate-500 dark:text-slate-400">/100</span>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${rescueScore}%` }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="h-full rounded-full bg-emerald-500"
            />
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {rescueScore >= 80
              ? t('todayFocus.scoreCopy.good')
              : rescueScore >= 50
                ? t('todayFocus.scoreCopy.medium')
                : t('todayFocus.scoreCopy.low')}
          </p>
          <div className="mt-5 rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm text-teal-800 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-100">
            <p className="font-semibold">{t('todayFocus.tipTitle')}</p>
            <p className="mt-1 text-teal-700 dark:text-teal-200">{t('todayFocus.tipBody')}</p>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

type MetricTileProps = {
  icon: React.ElementType;
  label: string;
  value: string;
  tone: string;
};

function MetricTile({ icon: Icon, label, value, tone }: MetricTileProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/70">
      <Icon className={`h-4 w-4 ${tone}`} aria-hidden="true" />
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 truncate text-sm font-bold text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}
