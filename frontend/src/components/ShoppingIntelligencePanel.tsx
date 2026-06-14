import { motion } from 'framer-motion';
import useSWR from 'swr';
import {
  BadgeCheck,
  CircleSlash,
  ClipboardList,
  Layers3,
  ShoppingBasket,
  TrendingUp,
} from 'lucide-react';
import type React from 'react';
import { useTranslation } from 'react-i18next';
import { usePantry } from '../context/PantryContext';
import { productsService } from '../services/productService';
import type { Product } from '../services/productService';
import { categoryI18nKey } from '../utils/categoryI18n';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const CORE_CATEGORY_KEYS = ['dairy', 'vegetables', 'fruits', 'bakery', 'dry_goods'] as const;

function daysLeft(expirationDate: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiresAt = new Date(`${expirationDate}T00:00:00`);
  return Math.ceil((expiresAt.getTime() - today.getTime()) / MS_PER_DAY);
}

function remainingRatio(product: Product) {
  if (product.initial_amount <= 0) return 0;
  return product.current_amount / product.initial_amount;
}

function uniqueByName(products: Product[]) {
  const seen = new Set<string>();
  return products.filter((product) => {
    const key = product.name.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function ShoppingIntelligencePanel() {
  const { selectedPantry } = usePantry();
  const { t } = useTranslation();

  const allProductsKey = selectedPantry ? `/pantries/${selectedPantry.id}/products/get` : null;
  const { data: products = [], isLoading, error } = useSWR<Product[]>(
    allProductsKey,
    () => productsService.getAllProducts(selectedPantry!.id),
    { refreshInterval: 60000, revalidateOnFocus: true }
  );

  if (!selectedPantry) return null;

  const activeProducts = products.filter((product) => product.current_amount > 0);
  const restockCandidates = uniqueByName(
    products
      .filter((product) => product.initial_amount > 0 && remainingRatio(product) <= 0.3)
      .sort((a, b) => remainingRatio(a) - remainingRatio(b))
  ).slice(0, 4);

  const avoidBuying = activeProducts
    .filter((product) => daysLeft(product.expiration_date) <= 4)
    .sort((a, b) => daysLeft(a.expiration_date) - daysLeft(b.expiration_date))
    .slice(0, 4);

  const activeCategoryKeys = new Set(activeProducts.map((product) => categoryI18nKey(product.category)));
  const missingCoreCategories = CORE_CATEGORY_KEYS.filter((key) => !activeCategoryKeys.has(key)).slice(0, 3);
  const healthyCoverage = Math.round(
    ((CORE_CATEGORY_KEYS.length - missingCoreCategories.length) / CORE_CATEGORY_KEYS.length) * 100
  );

  if (error) {
    return (
      <section className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-950/30 dark:text-red-200">
        {t('shoppingIntel.error')}
      </section>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.04 }}
      className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md dark:border-slate-700 dark:bg-slate-900"
      aria-labelledby="shopping-intel-title"
    >
      <div className="border-b border-slate-200 p-5 dark:border-slate-700">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
              <ShoppingBasket className="h-4 w-4" aria-hidden="true" />
              {t('shoppingIntel.eyebrow')}
            </p>
            <h2 id="shopping-intel-title" className="mt-2 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
              {t('shoppingIntel.title')}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              {t('shoppingIntel.body')}
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-200">
            <TrendingUp className="h-4 w-4" aria-hidden="true" />
            {t('shoppingIntel.coverage', { score: healthyCoverage })}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 p-5 md:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-40 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : (
        <div className="grid gap-0 md:grid-cols-3">
          <ShoppingColumn
            icon={ClipboardList}
            title={t('shoppingIntel.restockTitle')}
            description={t('shoppingIntel.restockBody')}
            empty={t('shoppingIntel.restockEmpty')}
            items={restockCandidates.map((product) => ({
              id: product.id,
              title: product.name,
              meta: t('shoppingIntel.remaining', {
                amount: product.current_amount,
                unit: product.unit === 'szt.' ? t('unitPiecesShort') : t('unitGramsShort'),
              }),
            }))}
            tone="emerald"
          />
          <ShoppingColumn
            icon={CircleSlash}
            title={t('shoppingIntel.avoidTitle')}
            description={t('shoppingIntel.avoidBody')}
            empty={t('shoppingIntel.avoidEmpty')}
            items={avoidBuying.map((product) => ({
              id: product.id,
              title: product.name,
              meta: daysLeft(product.expiration_date) <= 0
                ? t('shoppingIntel.expired')
                : t('shoppingIntel.daysLeft', { count: daysLeft(product.expiration_date) }),
            }))}
            tone="orange"
          />
          <ShoppingColumn
            icon={Layers3}
            title={t('shoppingIntel.coverageTitle')}
            description={t('shoppingIntel.coverageBody')}
            empty={t('shoppingIntel.coverageEmpty')}
            items={missingCoreCategories.map((key) => ({
              id: key,
              title: t(`categories.${key}`),
              meta: t('shoppingIntel.categoryMissing'),
            }))}
            tone="sky"
          />
        </div>
      )}
    </motion.section>
  );
}

type ShoppingItem = {
  id: string | number;
  title: string;
  meta: string;
};

type ShoppingColumnProps = {
  icon: React.ElementType;
  title: string;
  description: string;
  empty: string;
  items: ShoppingItem[];
  tone: 'emerald' | 'orange' | 'sky';
};

const toneClasses = {
  emerald: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30',
  orange: 'text-orange-700 bg-orange-50 border-orange-200 dark:text-orange-200 dark:bg-orange-500/10 dark:border-orange-500/30',
  sky: 'text-sky-700 bg-sky-50 border-sky-200 dark:text-sky-200 dark:bg-sky-500/10 dark:border-sky-500/30',
};

function ShoppingColumn({ icon: Icon, title, description, empty, items, tone }: ShoppingColumnProps) {
  return (
    <div className="border-b border-slate-200 p-5 dark:border-slate-700 md:border-b-0 md:border-r last:md:border-r-0">
      <div className="flex items-start gap-3">
        <div className={`rounded-lg border p-2 ${toneClasses[tone]}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h3 className="font-bold text-slate-950 dark:text-white">{title}</h3>
          <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {items.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
            <BadgeCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-300" aria-hidden="true" />
            {empty}
          </div>
        ) : (
          items.map((item) => (
            <motion.div
              key={item.id}
              layout
              className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/70"
            >
              <p className="font-semibold text-slate-900 dark:text-slate-100">{item.title}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.meta}</p>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
