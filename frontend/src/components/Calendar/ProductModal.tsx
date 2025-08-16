import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Product, productsService } from '../../services/productService';
import { categoryService, Category } from '../../services/categoryService';
import { usePantry } from '../../context/PantryContext';
import Portal from '../Portal';
import ProductListItem from '../ProductListItem';
import { useTranslation } from 'react-i18next';
import { categoryI18nKey } from '../../utils/categoryI18n';

const TextIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 9h.008v.008H6V9z" />
  </svg>
);
const ScaleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.153.542c-1.12.23-2.295.328-3.418.328-1.123 0-2.298-.1-3.418-.328a5.988 5.988 0 01-2.153-.542c-.483-.174-.711-.703-.59-1.202L18.75 4.971z" />
  </svg>
);
const PriceIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const CalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0h18" />
  </svg>
);
const CategoryIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6.878V6a2.25 2.25 0 012.25-2.25h7.5A2.25 2.25 0 0118 6v.878m-12 0c.235-.083.487-.128.75-.128h10.5c.263 0 .515.045.75.128m-12 0A2.25 2.25 0 004.5 9v.878m13.5-3A2.25 2.25 0 0119.5 9v.878m0 0a2.246 2.246 0 00-.75-.128H5.25c-.263 0-.515.045-.75.128m15 0A2.25 2.25 0 0121 12v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6c0-.98.626-1.813 1.5-2.122" />
  </svg>
);

interface ApiError extends Error {
  response?: { data?: { detail?: string } };
}
const UNITS = ['szt.', 'g'] as const;
type Unit = (typeof UNITS)[number];

type EditFormData = {
  name: string;
  expiration_date: string;
  current_amount: number;
  price: number;
  unit: Unit;
  category_id: number | null;
};

interface ProductModalProps {
  isOpen: boolean;
  isContentLoaded: boolean;
  date: Date;
  products: Product[];
  onClose: () => void;
  onUseProduct: (product: Product) => void;
  onDelete: (product: Product) => void;
  onUpdate: (updatedProduct: Product) => void;
  onAddProduct: () => void;
  onWaste: (product: Product) => void;
  onHide: (product: Product) => void;
}

const backdropVariants: Variants = { visible: { opacity: 1 }, hidden: { opacity: 0 } };
const modalVariants: Variants = {
  hidden: { y: '30px', opacity: 0, scale: 0.98 },
  visible: { y: 0, opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 30 } },
};
const formItemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  isContentLoaded,
  date,
  products,
  onClose,
  onUpdate,
  onAddProduct,
  ...rest
}) => {
  const { t, i18n } = useTranslation();
  const { selectedPantry } = usePantry();
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<EditFormData>({
    name: '',
    expiration_date: '',
    current_amount: 0,
    price: 0,
    unit: 'szt.',
    category_id: null,
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🔵 FUNKCJA TŁUMACZĄCA NAZWY KATEGORII
  const getCategoryLabel = (cat: Category) =>
    t(`categories.${categoryI18nKey(cat)}`, { defaultValue: cat.name });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const fetchedCategories = await categoryService.getAllCategories();
        setCategories(fetchedCategories);
      } catch (e) {
        console.error('Failed to fetch categories', e);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setEditingProduct(null);
        setError(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleEditClick = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      expiration_date: product.expiration_date,
      current_amount: product.current_amount,
      price: product.price,
      unit: product.unit as Unit,
      category_id: product.category?.id ?? null,
    });
    setError(null);
  };

  const handleFormChange = (field: keyof EditFormData, value: string | number | null) => {
    let processedValue = value;
    if (field === 'current_amount' || field === 'price') {
      const isPieces = formData.unit === 'szt.' && field === 'current_amount';
      const numericValue = isPieces ? parseInt(value as string, 10) : parseFloat(value as string);
      processedValue = isNaN(numericValue) ? 0 : numericValue;
    }

    if (field === 'unit' && value === 'szt.') {
      setFormData((prev) => ({ ...prev, unit: value as Unit, current_amount: Math.round(prev.current_amount) }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: processedValue }));
    }
  };

  const handleSaveUpdate = async () => {
    if (!editingProduct || !selectedPantry) return;
    setError(null);
    setIsSaving(true);

    const { current_amount, unit } = formData;

    if (unit === 'szt.' && current_amount % 1 !== 0) {
      setError(t('piecesMustBeInteger'));
      setIsSaving(false);
      return;
    }
    if (current_amount < 1) {
      setError(t('amountCantBeLessThanOne'));
      setIsSaving(false);
      return;
    }

    try {
      const newInitialAmount =
        formData.unit !== editingProduct.unit || current_amount > editingProduct.initial_amount
          ? current_amount
          : editingProduct.initial_amount;

      const updatePayload = {
        ...formData,
        category_id: formData.category_id === null ? undefined : formData.category_id,
        initial_amount: newInitialAmount,
      };

      const updatedProduct = await productsService.updateProduct(selectedPantry.id, editingProduct.id, updatePayload);
      onUpdate(updatedProduct);
      setEditingProduct(null);
    } catch (err) {
      const apiError = err as ApiError;
      console.error('Update error:', apiError);
      setError(apiError.response?.data?.detail || t('unexpectedError'));
    } finally {
      setIsSaving(false);
    }
  };

  const renderEditForm = () => (
    <motion.div
      className="bg-slate-50 dark:bg-slate-700/40 p-4 sm:p-6 rounded-lg"
      variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
      initial="hidden"
      animate="visible"
    >
      <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-100 mb-6">{t('editProduct')}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
        <motion.div variants={formItemVariants} className="md:col-span-2">
          <label htmlFor="name" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
            {t('productName')}
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-300/70">
              <TextIcon />
            </div>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleFormChange('name', e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm
                         bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                         focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </motion.div>

        <motion.div variants={formItemVariants}>
          <label htmlFor="current_amount" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
            {t('amount')}
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-300/70">
              <ScaleIcon />
            </div>
            <input
              id="current_amount"
              type="number"
              value={formData.current_amount}
              onChange={(e) => handleFormChange('current_amount', e.target.value)}
              min="1"
              step={formData.unit === 'szt.' ? 1 : 0.01}
              className="w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm
                         bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                         focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </motion.div>

        <motion.div variants={formItemVariants}>
          <label htmlFor="unit" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
            {t('unit')}
          </label>
          <select
            id="unit"
            value={formData.unit}
            onChange={(e) => handleFormChange('unit', e.target.value as (typeof UNITS)[number])}
            className="w-full h-[42px] px-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm
                       bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                       focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u === 'szt.' ? t('unitPiecesShort') : t('unitGramsShort')}
              </option>
            ))}
          </select>
        </motion.div>

        <motion.div variants={formItemVariants}>
          <label htmlFor="price" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
            {t('pricePLN')}
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-300/70">
              <PriceIcon />
            </div>
            <input
              id="price"
              type="number"
              value={formData.price}
              onChange={(e) => handleFormChange('price', e.target.value)}
              min="0"
              step="0.01"
              className="w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm
                         bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                         focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </motion.div>

        <motion.div variants={formItemVariants}>
          <label htmlFor="category_id" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
            {t('category')}
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-300/70">
              <CategoryIcon />
            </div>
            <select
              id="category_id"
              value={formData.category_id ?? ''}
              onChange={(e) => handleFormChange('category_id', e.target.value ? parseInt(e.target.value, 10) : null)}
              className="w-full pl-10 pr-3 py-2 border h[42px] border-slate-300 dark:border-slate-600 rounded-md shadow-sm appearance-none
                         bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                         focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">{t('noCategory')}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {getCategoryLabel(cat)}
                </option>
              ))}
            </select>
          </div>
        </motion.div>

        <motion.div variants={formItemVariants} className="md:col-span-2">
          <label htmlFor="expiration_date" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
            {t('expirationDate')}
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-300/70">
              <CalendarIcon />
            </div>
            <input
              id="expiration_date"
              type="date"
              value={formData.expiration_date || ''}
              onChange={(e) => handleFormChange('expiration_date', e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm
                         bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                         focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </motion.div>
      </div>

      {error && <p className="text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-300 p-3 rounded-md text-sm mt-4">{error}</p>}

      <motion.div variants={formItemVariants} className="flex justify-end gap-3 mt-6">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setEditingProduct(null)}
          className="bg-slate-200 text-slate-700 font-semibold px-4 py-2 rounded-lg hover:bg-slate-300 transition-colors
                     dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
        >
          {t('cancel')}
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleSaveUpdate}
          disabled={isSaving}
          className="bg-indigo-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? t('savingDots') : t('saveChanges')}
        </motion.button>
      </motion.div>
    </motion.div>
  );

  const renderProductList = () => (
    <div className="space-y-4">
      {products.map((product) => (
        <ProductListItem key={product.id} product={product} onEdit={handleEditClick} {...rest} />
      ))}
    </div>
  );

  const dateLabel = new Intl.DateTimeFormat(i18n.language, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <motion.div className="absolute inset-0 bg-black/40 backdrop-blur-sm" variants={backdropVariants} initial="hidden" animate="visible" exit="hidden" />
            <motion.div
              className="relative w-full max-w-2xl bg-white dark:bg-slate-800 dark:text-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {isContentLoaded && (
                <>
                  <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between items-center">
                      <h2 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-slate-100">
                        {editingProduct ? t('editProduct') : t('productsForDate', { date: dateLabel })}
                      </h2>
                      <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 p-2 -mr-2 rounded-full transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="p-4 sm:p-6 max-h-[70vh] overflow-y-auto bg-slate-100/50 dark:bg-slate-900/30">
                    {products.length === 0 && !editingProduct ? (
                      <p className="text-center text-slate-500 dark:text-slate-400 py-8">{t('noProductsForDay')}</p>
                    ) : editingProduct ? (
                      renderEditForm()
                    ) : (
                      renderProductList()
                    )}
                  </div>

                  <div className="bg-white dark:bg-slate-800 px-4 sm:px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={onAddProduct}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-lg transition-colors shadow-sm"
                    >
                      + {t('addNewProduct')}
                    </motion.button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
};

export default ProductModal;
