import useSWR from 'swr';
import { usePantry } from '../context/PantryContext';
import { getMostWastedProducts } from '../services/statsService';
import type { MostWastedProduct } from '../services/statsService';
import { FaSadTear } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

const CardWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200/80 h-full
                  dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700">
    {children}
  </div>
);

const MostWastedProducts = () => {
  const { t } = useTranslation();
  const { selectedPantry } = usePantry();

  const swrKey = selectedPantry ? `/pantries/${selectedPantry.id}/stats/most-wasted-products` : null;
  const { data: products, error } = useSWR<MostWastedProduct[]>(swrKey, () => getMostWastedProducts(selectedPantry!.id));

  const isLoading = !products && !error;

  return (
    <CardWrapper>
      <h3 className="text-xl font-bold text-gray-800 dark:text-slate-100 mb-4 text-center">
        {t('statsPage.mostWasted.title')}
      </h3>
      {isLoading ? (
        <p className="text-center text-gray-500 dark:text-slate-400">{t('pleaseWait')}</p>
      ) : !products || products.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-slate-400">
          <FaSadTear className="text-4xl mb-2 text-gray-400 dark:text-slate-500" />
          <p>{t('statsPage.mostWasted.none')}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {products.map(product => (
            <li key={product.id} className="flex justify-between items-center text-sm">
              <span className="truncate pr-2 text-gray-600 dark:text-slate-300">{product.name}</span>
              <span className="font-mono font-semibold text-red-500 whitespace-nowrap">
                -{product.wasted_value.toFixed(2)} zł
              </span>
            </li>
          ))}
        </ul>
      )}
    </CardWrapper>
  );
};

export default MostWastedProducts;
