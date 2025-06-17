import React, { useState } from 'react';
import Confetti from 'react-confetti';
import FancyCalendar from './FancyCalendar';
import { useProductCalendarLogic } from './useProductCalendarLogic';
import ProductModal from './ProductModal';
import AddProductModal from './AddProductModal';
import ConsumptionModal from './ConsumptionModal';
import { getStats } from '../../services/statsService';
import type { Stats } from '../../services/statsService';
import OnboardingGuide from '../OnboardingGuide';
import type { Product } from '../../services/productService';
import useSWR from 'swr';
// ZMIANA: Importujemy hook useAuth, aby uzyskać dostęp do użytkownika
import { useAuth } from '../../context/AuthContext';

const ProductCalendar: React.FC = () => {
    // ZMIANA: Pobieramy informację o zalogowanym użytkowniku
    const { user } = useAuth();

    // ZMIANA: Klucz SWR jest teraz warunkowy. Jeśli nie ma `user`, klucz jest `null` i SWR nie wykona zapytania.
    const { data: stats } = useSWR<Stats>(user ? '/products/stats' : null, getStats, { refreshInterval: 5000 });

    const {
        productsByDate, selectedDate, isProductModalOpen, isAddModalOpen, createdAt,
        handleDayClick, handleCloseProductModal, handleOpenAddModal, handleCloseAddModal,
        handleProductAdded, onUseProduct, handleDeleteProduct, handleProductUpdate,
        getVisibleProductsForDate, onWasteProduct, onHideProduct,
        showConfetti,
        recycleConfetti
    } = useProductCalendarLogic();

    const [consumptionModalOpen, setConsumptionModalOpen] = useState(false);
    const [productToConsume, setProductToConsume] = useState<Product | null>(null);
    const [actionType, setActionType] = useState<'use' | 'waste'>('use');

    const handleOpenConsumptionModal = (product: Product, type: 'use' | 'waste') => {
        handleCloseProductModal();
        setProductToConsume(product);
        setActionType(type);
        setConsumptionModalOpen(true);
    };

    const handleCloseConsumptionModal = () => {
        setConsumptionModalOpen(false);
        setProductToConsume(null);
    };

    const handleConfirmConsumption = (productId: number, amount: number) => {
        if (actionType === 'use') onUseProduct(productId, amount);
        else onWasteProduct(productId, amount);
        handleCloseConsumptionModal();
    };

    const productsForSelectedDate = getVisibleProductsForDate(selectedDate);
    const totalProductsCount = Object.values(productsByDate).flat().length;

    return (
        <div className="card">
            <h2 className="card-title text-base sm:text-xl">📅 Kalendarz produktów</h2>
            <div className="relative space-y-4">
                {totalProductsCount === 0 && user && <OnboardingGuide />}
                {showConfetti && <Confetti recycle={recycleConfetti} />}
                <FancyCalendar productsByDate={productsByDate} onDateClick={handleDayClick} createdAt={createdAt} />

                <div className="bg-white rounded-lg p-4 shadow-md text-center animate-fade-in">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">📊 Statystyki ogólne</h3>
                    <p className="text-gray-600 text-sm mb-3">Sprawdź ile produktów masz aktywnych, wyrzuconych lub oznaczonych jako zużyte.</p>
                    <div className="flex flex-wrap justify-center items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">Aktywne: {stats ? (stats.total - stats.used - stats.wasted) : '...'}</span>
                        <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full font-medium">Wyrzucone: {stats?.wasted ?? '...'}</span>
                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium">Zużyte: {stats?.used ?? '...'}</span>
                    </div>
                    <p className="mt-3 text-xs text-gray-400">Pełne statystyki znajdziesz w zakładce{" "}<span className="underline text-blue-500 cursor-pointer" onClick={() => window.location.href = '/stats'}>Statystyki</span>.</p>
                </div>

                {isProductModalOpen && selectedDate && (
                    <ProductModal
                        date={selectedDate}
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
                    <AddProductModal onClose={handleCloseAddModal} onProductAdded={handleProductAdded} defaultDate={selectedDate} />
                )}
                {consumptionModalOpen && productToConsume && (
                    <ConsumptionModal
                        product={productToConsume}
                        actionType={actionType}
                        onClose={handleCloseConsumptionModal}
                        onConfirm={handleConfirmConsumption}
                    />
                )}
            </div>
        </div>
    );
};

export default ProductCalendar;
