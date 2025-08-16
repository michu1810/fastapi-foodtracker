import React, { Suspense, lazy } from 'react';
import Confetti from 'react-confetti';
import FancyCalendar from './FancyCalendar';
import { getStats } from '../../services/statsService';
import type { Stats } from '../../services/statsService';
import OnboardingGuide from '../OnboardingGuide';
import useSWR from 'swr';
import { useAuth } from '../../context/AuthContext';
import { usePantry } from '../../context/PantryContext';
import { useProductCalendarLogic } from './useProductCalendarLogic';
import { useTranslation } from 'react-i18next';

const ProductModal = lazy(() => import('./ProductModal'));
const AddProductModal = lazy(() => import('./AddProductModal'));
const ConsumptionModal = lazy(() => import('./ConsumptionModal'));

export const ProductCalendar: React.FC = () => {
  const {
    productsByDate, selectedDate, productsForSelectedDate, createdAt, showConfetti, recycleConfetti,
    isProductModalOpen, isAddModalOpen, isConsumptionModalOpen,
    isProductModalContentLoaded, isAddModalContentLoaded, isConsumptionModalContentLoaded,
    productToConsume, actionType,
    handleDayClick, handleCloseProductModal, handleOpenAddModal, handleCloseAddModal, handleProductAdded,
    handleOpenConsumptionModal, handleCloseConsumptionModal, handleConfirmConsumption,
    handleDeleteProduct, handleProductUpdate, onHideProduct,
  } = useProductCalendarLogic();

  const { user } = useAuth();
  const { selectedPantry } = usePantry();
  const { t } = useTranslation();

  const swrKeyForStats = selectedPantry ? `/pantries/${selectedPantry.id}/products/stats` : null;
  const { data: stats } = useSWR<Stats>(swrKeyForStats, () => getStats(selectedPantry!.id));

  const totalProductsCount = Object.values(productsByDate).flat().length;

  return (
    <div className="card dark:bg-slate-900 dark:text-slate-200">
      <h2 className="card-title text-base sm:text-xl dark:text-slate-100">📅 {t('productCalendar')}</h2>

      <div className="relative space-y-4">
        {totalProductsCount === 0 && user && <OnboardingGuide />}
        {showConfetti && <Confetti recycle={recycleConfetti} />}

        <FancyCalendar
          productsByDate={productsByDate}
          onDateClick={handleDayClick}
          createdAt={createdAt}
        />

        <div className="bg-white rounded-lg p-4 shadow-md text-center dark:bg-slate-800 dark:text-slate-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-2 dark:text-slate-100">📊 {t('overallStats')}</h3>

          <div className="flex flex-wrap justify-center items-center gap-2 sm:gap-4 text-xs sm:text-sm">
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium dark:bg-blue-900/40 dark:text-blue-300">
              {t('active')}: {stats ? stats.active : '...'}
            </span>
            <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full font-medium dark:bg-red-900/40 dark:text-red-300">
              {t('wasted')}: {stats?.wasted ?? '...'}
            </span>
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium dark:bg-green-900/40 dark:text-green-300">
              {t('used')}: {stats?.used ?? '...'}
            </span>
          </div>

          <p className="mt-3 text-xs text-gray-400 dark:text-slate-400">
            {t('fullStatsHint')}{' '}
            <span
              className="underline text-blue-500 cursor-pointer dark:text-blue-400"
              onClick={() => (window.location.href = '/stats')}
            >
              {t('statistics')}
            </span>.
          </p>
        </div>

        <Suspense fallback={null}>
          {isProductModalOpen && (
            <ProductModal
              isOpen={isProductModalOpen}
              isContentLoaded={isProductModalContentLoaded}
              date={selectedDate!}
              products={productsForSelectedDate}
              onClose={handleCloseProductModal}
              onDelete={handleDeleteProduct}
              onUpdate={handleProductUpdate}
              onAddProduct={handleOpenAddModal}
              onUseProduct={(product) => handleOpenConsumptionModal(product, 'use')}
              onWaste={(product) => handleOpenConsumptionModal(product, 'waste')}
              onHide={onHideProduct}
            />
          )}

          {isAddModalOpen && (
            <AddProductModal
              isOpen={isAddModalOpen}
              isContentLoaded={isAddModalContentLoaded}
              onClose={handleCloseAddModal}
              onProductAdded={handleProductAdded}
              defaultDate={selectedDate}
            />
          )}

          {isConsumptionModalOpen && (
            <ConsumptionModal
              isOpen={isConsumptionModalOpen}
              isContentLoaded={isConsumptionModalContentLoaded}
              product={productToConsume!}
              actionType={actionType}
              onClose={handleCloseConsumptionModal}
              onConfirm={handleConfirmConsumption}
            />
          )}
        </Suspense>
      </div>
    </div>
  );
};
