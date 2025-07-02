import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Product, productsService } from '../../services/productService';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { useSWRConfig } from 'swr';
import { saveToStorage, loadFromStorage } from '../../utils/localStorage';
import { Achievement } from '../../services/statsService';
import { usePantry } from '../../context/PantryContext';

const HIDDEN_PRODUCTS_STORAGE_KEY = 'hidden_product_ids';
const RENDER_DELAY = 50; // Opóźnienie w milisekundach dla płynności animacji

export const useProductCalendarLogic = () => {
    const { user } = useAuth();
    const { selectedPantry } = usePantry();
    const { mutate } = useSWRConfig();

    const [productsByDate, setProductsByDate] = useState<Record<string, Product[]>>({});
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [hiddenProductIds, setHiddenProductIds] = useState<number[]>(
        () => loadFromStorage<number[]>(HIDDEN_PRODUCTS_STORAGE_KEY, [])
    );
    const [showConfetti, setShowConfetti] = useState(false);
    const [recycleConfetti, setRecycleConfetti] = useState(true);
    const createdAt = user?.createdAt ? new Date(user.createdAt) : null;

    // ZMIANA: Stany do kontrolowania widoczności "skorupy" wszystkich modali
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isConsumptionModalOpen, setIsConsumptionModalOpen] = useState(false);

    // ZMIANA: Nowe stany do opóźnionego renderowania CIĘŻKIEJ ZAWARTOŚCI
    const [isProductModalContentLoaded, setIsProductModalContentLoaded] = useState(false);
    const [isAddModalContentLoaded, setIsAddModalContentLoaded] = useState(false);
    const [isConsumptionModalContentLoaded, setIsConsumptionModalContentLoaded] = useState(false);

    // ZMIANA: Stany dla modala zużycia przeniesione z ProductCalendar.tsx
    const [productToConsume, setProductToConsume] = useState<Product | null>(null);
    const [actionType, setActionType] = useState<'use' | 'waste'>('use');

    const fetchProducts = useCallback(async () => {
        if (!user || !selectedPantry) {
            setProductsByDate({});
            return;
        }
        try {
            const products = await productsService.getAllProducts(selectedPantry.id);
            const grouped = productsService.groupProductsByDate(products);
            setProductsByDate(grouped);
        } catch (error) {
            console.error("Błąd pobierania produktów:", error);
        }
    }, [user, selectedPantry]);

    useEffect(() => {
        if (selectedPantry) {
            fetchProducts();
        }
    }, [fetchProducts, selectedPantry]);

    const revalidateAllData = useCallback(() => {
        if (!selectedPantry) return;
        const pantryId = selectedPantry.id;
        mutate(`/pantries/${pantryId}/products/stats`);
        mutate(`/pantries/${pantryId}/products/stats/financial`);
        mutate(`/auth/achievements`);
        fetchProducts();
    }, [mutate, fetchProducts, selectedPantry]);


    const handleDayClick = (date: Date) => {
        setSelectedDate(date);
        setIsProductModalOpen(true);
        setTimeout(() => setIsProductModalContentLoaded(true), RENDER_DELAY);
    };

    const handleCloseProductModal = () => {
        setIsProductModalOpen(false);
        setIsProductModalContentLoaded(false);
    };

    const handleOpenAddModal = () => {
        handleCloseProductModal();
        setIsAddModalOpen(true);
        setTimeout(() => setIsAddModalContentLoaded(true), RENDER_DELAY);
    };

    const handleCloseAddModal = () => {
        setIsAddModalOpen(false);
        setIsAddModalContentLoaded(false);
    };

    const handleOpenConsumptionModal = (product: Product, type: 'use' | 'waste') => {
        handleCloseProductModal();
        setProductToConsume(product);
        setActionType(type);
        setIsConsumptionModalOpen(true);
        setTimeout(() => setIsConsumptionModalContentLoaded(true), RENDER_DELAY);
    };

    const handleCloseConsumptionModal = () => {
        setIsConsumptionModalOpen(false);
        setIsConsumptionModalContentLoaded(false);
        // Resetuj produkt do zużycia po zamknięciu modala
        setTimeout(() => setProductToConsume(null), 300);
    };

    // --- Koniec bloku zarządzania modalami ---

    const handleProductAdded = useCallback(() => {
        handleCloseAddModal();
        toast.success("Dodano produkt!");
        revalidateAllData();
    }, [revalidateAllData, handleCloseAddModal]);

    const handleAction = useCallback(async (action: 'use' | 'waste', productId: number, amount: number) => {
        if (!selectedPantry || !user) return;
        const serviceAction = action === 'use' ? productsService.useProduct : productsService.wasteProduct;
        const verb = action === 'use' ? 'Zużyto' : 'Wyrzucono';
        try {
            const response = await serviceAction(selectedPantry.id, productId, amount);
            const updatedProduct = response.product;
            setProductsByDate(currentProducts => {
                const dateKey = updatedProduct.expiration_date;
                const productsOnDate = currentProducts[dateKey] || [];
                const productExists = productsOnDate.some(p => p.id === updatedProduct.id);
                if (!productExists && action === 'use') return currentProducts;

                const newProductsForDate = productsOnDate.map(p =>
                    p.id === updatedProduct.id ? updatedProduct : p
                );
                return { ...currentProducts, [dateKey]: newProductsForDate };
            });
            mutate(`/pantries/${selectedPantry.id}/products/stats`);
            mutate(`/pantries/${selectedPantry.id}/products/stats/financial`);
            toast.success(`${verb} ${amount} ${updatedProduct.unit} produktu "${updatedProduct.name}"`);

            if (response.unlocked_achievements?.length > 0) {
                 setTimeout(() => {
                    response.unlocked_achievements.forEach((ach: Achievement) => {
                        toast.success(
                            (t) => (
                                <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center">
                                        <span className="text-3xl mr-3">{ach.icon}</span>
                                        <div>
                                            <p className="font-bold">Osiągnięcie odblokowane!</p>
                                            <p className="text-sm">{ach.name}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => toast.dismiss(t.id)} className="ml-4 p-1 border-none bg-white/20 hover:bg-white/30 rounded-full text-white">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            ),
                            { duration: 10000, style: { backgroundColor: '#2563eb', color: 'white' } }
                        );
                    });
                }, 800);
            }

            if (action === 'use') {
                setShowConfetti(true);
                setRecycleConfetti(true);
                setTimeout(() => setRecycleConfetti(false), 2000);
                setTimeout(() => setShowConfetti(false), 9000);
            }
        } catch (err) {
            const errorMessage = axios.isAxiosError(err) ? err.response?.data?.detail || 'Błąd serwera.' : `Błąd podczas akcji '${action}'`;
            toast.error(errorMessage);
            revalidateAllData();
        }
    }, [mutate, revalidateAllData, selectedPantry, user]);

    const handleConfirmConsumption = (productId: number, amount: number) => {
        handleAction(actionType, productId, amount);
        handleCloseConsumptionModal();
    };

    const handleUseProduct = (productId: number, amount: number) => handleAction('use', productId, amount);
    const handleWasteProduct = (productId: number, amount: number) => handleAction('waste', productId, amount);

    const handleDeleteProduct = useCallback(async (product: Product) => {
        if (!selectedPantry) return;
        const originalProductsByDate = { ...productsByDate };
        setProductsByDate(currentProducts => {
            const dateKey = product.expiration_date;
            const productsForDate = currentProducts[dateKey] || [];
            const newProductsForDate = productsForDate.filter(p => p.id !== product.id);
            const newProducts = { ...currentProducts, [dateKey]: newProductsForDate };
            if (newProducts[dateKey].length === 0) {
                delete newProducts[dateKey];
            }
            return newProducts;
        });
        try {
            await productsService.deleteProduct(selectedPantry.id, product.id);
            toast.success("Produkt usunięty");
            mutate(`/pantries/${selectedPantry.id}/products/stats`);
            mutate(`/pantries/${selectedPantry.id}/products/stats/financial`);
        } catch (error) {
            console.log(error)
            toast.error("Błąd podczas usuwania, przywracanie...");
            setProductsByDate(originalProductsByDate);
        }
    }, [selectedPantry, productsByDate, mutate]);

    const handleHideProduct = useCallback((productToHide: Product) => {
        const newHiddenIds = [...new Set([...hiddenProductIds, productToHide.id])];
        saveToStorage(HIDDEN_PRODUCTS_STORAGE_KEY, newHiddenIds);
        setHiddenProductIds(newHiddenIds);
        toast.success(`Ukryto "${productToHide.name}"`);
    }, [hiddenProductIds]);

    const handleProductUpdate = useCallback(async (updatedProduct: Product) => {
        setProductsByDate(currentProducts => {
            const allProductsFlat = Object.values(currentProducts).flat();
            const oldProduct = allProductsFlat.find(p => p.id === updatedProduct.id);
            const newProductsState = { ...currentProducts };
            if (oldProduct && oldProduct.expiration_date !== updatedProduct.expiration_date) {
                const oldDateKey = oldProduct.expiration_date;
                newProductsState[oldDateKey] = (newProductsState[oldDateKey] || []).filter(p => p.id !== updatedProduct.id);
                if (newProductsState[oldDateKey].length === 0) {
                    delete newProductsState[oldDateKey];
                }
            }
            const newDateKey = updatedProduct.expiration_date;
            const productsForNewDate = newProductsState[newDateKey] ? [...newProductsState[newDateKey]] : [];
            const existingIndex = productsForNewDate.findIndex(p => p.id === updatedProduct.id);
            if (existingIndex !== -1) {
                productsForNewDate[existingIndex] = updatedProduct;
            } else {
                productsForNewDate.push(updatedProduct);
            }
            newProductsState[newDateKey] = productsForNewDate;
            return newProductsState;
        });
        mutate(`/pantries/${selectedPantry!.id}/products/stats`);
        mutate(`/pantries/${selectedPantry!.id}/products/stats/financial`);
        toast.success("Zaktualizowano produkt!");
    }, [mutate, selectedPantry]);

    const productsForSelectedDate = useMemo(() => {
        if (!selectedDate) return [];
        const dateKey = productsService.formatDate(selectedDate);
        const allProductsForDate = productsByDate[dateKey] || [];
        return allProductsForDate.filter(p => {
            const isUsedUp = p.current_amount === 0;
            const isHidden = hiddenProductIds.includes(p.id);
            return !(isUsedUp && isHidden);
        });
    }, [selectedDate, productsByDate, hiddenProductIds]);

    return {
        productsByDate, selectedDate, productsForSelectedDate, createdAt, showConfetti, recycleConfetti,
        isProductModalOpen, isAddModalOpen, isConsumptionModalOpen,
        isProductModalContentLoaded, isAddModalContentLoaded, isConsumptionModalContentLoaded,
        productToConsume, actionType,
        handleDayClick, handleCloseProductModal, handleOpenAddModal, handleCloseAddModal, handleProductAdded,
        handleOpenConsumptionModal, handleCloseConsumptionModal, handleConfirmConsumption,
        onUseProduct: handleUseProduct,
        onWasteProduct: handleWasteProduct,
        handleDeleteProduct,
        handleProductUpdate,
        onHideProduct: handleHideProduct,
    };
};
