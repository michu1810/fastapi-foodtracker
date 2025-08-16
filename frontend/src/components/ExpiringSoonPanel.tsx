import React from 'react';
import useSWR from 'swr';
import { ExpiringProduct, productsService } from '../services/productService';
import { usePantry } from '../context/PantryContext';
import { useTranslation } from 'react-i18next';

const getColor = (d: number) =>
  d <= 1 ? 'text-red-600 font-bold' : d <= 3 ? 'text-yellow-600 font-bold' : 'text-gray-500 dark:text-gray-400';

const ExpiringSoonListItem = React.memo(({ product, getText }: { product: ExpiringProduct; getText: (d: number) => string }) => (
  <li className="flex justify-between items-center p-3 bg-gray-50 rounded hover:bg-gray-100 transition
                 dark:bg-slate-700/50 dark:hover:bg-slate-700 dark:text-slate-200">
    <span>{product.name}</span>
    <span className={getColor(product.days_left)}>{getText(product.days_left)}</span>
  </li>
));

export default function ExpiringSoonPanel() {
  const { t } = useTranslation();
  const { selectedPantry } = usePantry();

  const swrKey = selectedPantry ? `expiring/${selectedPantry.id}` : null;

  const {
    data: products = [],
    error,
    isLoading,
  } = useSWR(
    swrKey,
    () => productsService.getExpiringSoonProducts(selectedPantry!.id),
    {
      refreshInterval: 30000,
      revalidateOnFocus: true,
    }
  );

  const getText = (d: number) => {
    if (d === 0) return t('expiringToday');
    return t('daysLeft', { count: d });
  };

  if (error) {
    console.error('Błąd SWR w ExpiringSoonPanel:', error);
    return <p className="text-center text-gray-500 dark:text-slate-400 p-4">{t('loadingError')}</p>;
  }

  return (
    <div className="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-600">
      {isLoading
        ? [...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 dark:bg-slate-700 rounded animate-pulse mb-3 mx-2" />
          ))
        : products.length === 0
          ? <p className="text-center text-gray-500 dark:text-slate-400 p-4">{t('noExpiringProducts')}</p>
          : (
            <ul className="space-y-3 pr-2">
              {products.map(p => (
                <ExpiringSoonListItem key={p.id} product={p} getText={getText} />
              ))}
            </ul>
          )
      }
    </div>
  );
}
