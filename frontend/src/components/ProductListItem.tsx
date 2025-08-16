import React from 'react';
import { useTranslation } from 'react-i18next';
import { Product } from '../services/productService';
import { getCategoryIcon } from '../utils/icons';
import { categoryI18nKey } from '../utils/categoryI18n';

interface ActionButtonProps {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  className: string;
}

const ActionButton: React.FC<ActionButtonProps> = ({ onClick, label, children, className }) => (
  <div className="flex flex-col items-center gap-1.5 flex-1">
    <button
      onClick={onClick}
      className={`relative group h-10 w-10 flex items-center justify-center rounded-full transition-transform hover:scale-110 ${className}`}
    >
      {children}
      <span className="hidden sm:block absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 text-xs text-white bg-gray-800 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
        {label}
      </span>
    </button>
    <span className="sm:hidden text-xs font-medium text-gray-600 dark:text-slate-300">{label}</span>
  </div>
);

interface ProductListItemProps {
  product: Product;
  onEdit: (product: Product) => void;
  onUseProduct: (product: Product) => void;
  onWaste: (product: Product) => void;
  onDelete: (product: Product) => void;
  onHide: (product: Product) => void;
}

const ProductListItem: React.FC<ProductListItemProps> = ({
  product, onEdit, onUseProduct, onWaste, onDelete, onHide
}) => {
  const { t } = useTranslation();

  const isFullyUsed = product.current_amount === 0;
  const iconSrc = getCategoryIcon(product.category?.icon_name);

  const unitLabel = product.unit === 'szt.' ? t('unitPiecesShort') : t('unitGramsShort');

  const catKey = product.category ? categoryI18nKey(product.category) : 'other';

  const categoryLabel =
    product.category
      ? t(`categories.${catKey}`, { defaultValue: product.category.name })
      : '';

  return (
    <div className={`border rounded-lg p-3 sm:p-4 transition-shadow hover:shadow-md ${isFullyUsed ? 'bg-gray-100 dark:bg-slate-800/40' : 'bg-white dark:bg-slate-800'} pb-4 sm:pb-4 border-gray-200 dark:border-slate-700`}>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
        <div className="flex items-center gap-4 flex-grow">
          <img src={iconSrc} alt={categoryLabel || t('category')} className="w-8 h-8 flex-shrink-0" />

          <div className="flex-grow">
            <h3 className={`font-semibold text-base sm:text-lg ${isFullyUsed ? 'line-through text-gray-500 dark:text-slate-400' : 'text-gray-900 dark:text-slate-100'}`}>
              {product.name}
              <span className="ml-2 font-normal text-sm text-gray-500 dark:text-slate-300">
                {t('remainingOf', {
                  left: product.current_amount,
                  total: product.initial_amount,
                  unit: unitLabel
                })}
              </span>
            </h3>

            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-300">
                {t('expiresAt', { date: product.expiration_date })}
              </p>

              {product.category && (
                <>
                  <span className="text-gray-300 dark:text-slate-600">|</span>
                  <span className="text-xs font-medium bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-slate-200 px-2 py-0.5 rounded-full">
                    {categoryLabel}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-around sm:justify-end w-full sm:w-auto mt-4 sm:mt-0 sm:ml-4 flex-shrink-0">
          {!isFullyUsed ? (
            <>
              <ActionButton label={t('edit')} onClick={() => onEdit(product)} className="bg-yellow-400 hover:bg-yellow-500 text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
              </ActionButton>

              <ActionButton label={t('use')} onClick={() => onUseProduct(product)} className="bg-green-500 hover:bg-green-600 text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </ActionButton>

              <ActionButton label={t('waste')} onClick={() => onWaste(product)} className="bg-orange-400 hover:bg-orange-500 text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 011 1v1h3.5a.5.5 0 010 1H6a.5.5 0 010-1H9V3a1 1 0 011-1zm-3.707 4.293a1 1 0 011.414 0L10 9.586l3.293-3.293a1 1 0 111.414 1.414L11.414 11l3.293 3.293a1 1 0 01-1.414 1.414L10 12.414l-3.293 3.293a1 1 0 01-1.414-1.414L8.586 11 5.293 7.707a1 1 0 010-1.414z" /></svg>
              </ActionButton>

              <ActionButton label={t('delete')} onClick={() => onDelete(product)} className="bg-red-500 hover:bg-red-600 text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </ActionButton>
            </>
          ) : (
            <ActionButton label={t('hide')} onClick={() => onHide(product)} className="bg-gray-400 hover:bg-gray-500 text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </ActionButton>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(ProductListItem);
