import React from 'react';
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Product, productsService } from '../../services/productService';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { useSWRConfig } from 'swr';
import { saveToStorage, loadFromStorage } from '../../utils/localStorage';
import { Achievement } from '../../services/statsService';

const HIDDEN_PRODUCTS_STORAGE_KEY = 'hidden_product_ids';

export const useProductCalendarLogic = () => {
    const { user } = useAuth();
    const { mutate } = useSWRConfig();

    // ... (stany od `productsByDate` do `recycleConfetti` bez zmian) ...
    const [productsByDate, setProductsByDate] = useState<Record<string, Product[]>>({});
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    
    const [hiddenProductIds, setHiddenProductIds] = useState<number[]>(
        () => loadFromStorage<number[]>(HIDDEN_PRODUCTS_STORAGE_KEY, [])
    );

    const [showConfetti, setShowConfetti] = useState(false);
    const [recycleConfetti, setRecycleConfetti] = useState(true);
    
    const createdAt = user?.createdAt ? new Date(user.createdAt) : null;

    // ... (funkcje od `fetchProducts` do `handleProductAdded` bez zmian) ...
    const fetchProducts = useCallback(async () => {
        if (!user) return;
        try {
            const products = await productsService.getAllProducts();
            const grouped = productsService.groupProductsByDate(products);
            setProductsByDate(grouped);
        } catch (error) {
            console.error("Błąd pobierania produktów:", error);
        }
    }, [user]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const revalidateAllData = useCallback(() => {
        mutate('/products/stats');
        mutate('/products/stats/financial');
        mutate('/products/achievements');
        fetchProducts();
    }, [mutate, fetchProducts]);

    const handleDayClick = (date: Date) => { setSelectedDate(date); setIsProductModalOpen(true); };
    const handleCloseProductModal = () => setIsProductModalOpen(false);
    const handleOpenAddModal = () => { setIsProductModalOpen(false); setIsAddModalOpen(true); };
    const handleCloseAddModal = () => setIsAddModalOpen(false);
    
    const handleProductAdded = useCallback(() => {
        setIsAddModalOpen(false);
        toast.success("Dodano produkt!");
        revalidateAllData();
    }, [revalidateAllData]);


    const handleAction = useCallback(async (action: 'use' | 'waste', productId: number, amount: number) => {
        const serviceAction = action === 'use' ? productsService.useProduct : productsService.wasteProduct;
        const verb = action === 'use' ? 'Zużyto' : 'Wyrzucono';
        
        try {
            const response = await serviceAction(productId, amount);
            const updatedProduct = response.product;
            
            toast.success(`${verb} ${amount} ${updatedProduct.unit} produktu "${updatedProduct.name}"`);
            revalidateAllData();

            if (response.unlocked_achievements && response.unlocked_achievements.length > 0) {
                setTimeout(() => {
                    response.unlocked_achievements.forEach((ach: Achievement) => {
                        toast.success(
                            // ZMIANA: Zmieniamy _ na t i aktywnie go używamy!
                            (t) => (
                                <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center">
                                        <span className="text-3xl mr-3">{ach.icon}</span>
                                        <div>
                                            <p className="font-bold">Osiągnięcie odblokowane!</p>
                                            <p className="text-sm">{ach.name}</p>
                                        </div>
                                    </div>
                                    {/* NOWY ELEMENT: Przycisk zamykający */}
                                    <button
                                      onClick={() => toast.dismiss(t.id)}
                                      className="ml-4 p-1 border-none bg-white/20 hover:bg-white/30 rounded-full text-white"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                </div>
                            ), 
                            { 
                                duration: 10000, // Dłuższy czas, bo jest przycisk
                                // Stylizacja samego kontenera powiadomienia
                                style: {
                                    backgroundColor: '#2563eb', // Ciemnoniebieskie tło
                                    color: 'white',
                                }
                            }
                        );
                    });
                }, 800);
            }

            if (action === 'use' && !showConfetti) {
                setShowConfetti(true);
                setRecycleConfetti(true);
                setTimeout(() => { setRecycleConfetti(false); }, 2000);
                setTimeout(() => { setShowConfetti(false); }, 9000);
            }
        } catch (err) {
            const errorMessage = axios.isAxiosError(err) ? err.response?.data?.detail || 'Błąd serwera.' : `Błąd podczas akcji '${action}'`;
            toast.error(errorMessage);
        }
    }, [revalidateAllData, showConfetti]);

    // ... (reszta hooka od `handleUseProduct` do końca bez zmian) ...
    const handleUseProduct = (productId: number, amount: number) => handleAction('use', productId, amount);
    const handleWasteProduct = (productId: number, amount: number) => handleAction('waste', productId, amount);
    
    const handleDeleteProduct = useCallback(async (product: Product) => {
        await productsService.deleteProduct(product.id);
        toast.success("Produkt usunięty");
        revalidateAllData();
    }, [revalidateAllData]);
    
    const handleHideProduct = useCallback((productToHide: Product) => {
        const newHiddenIds = [...new Set([...hiddenProductIds, productToHide.id])];
        saveToStorage(HIDDEN_PRODUCTS_STORAGE_KEY, newHiddenIds);
        setHiddenProductIds(newHiddenIds);
        toast.success(`Ukryto "${productToHide.name}"`);
    }, [hiddenProductIds]);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handleProductUpdate = useCallback(async (_updatedProduct: Product) => {
        toast.success("Zaktualizowano produkt!");
        revalidateAllData();
    }, [revalidateAllData]);

    const getVisibleProductsForDate = (date: Date | null): Product[] => {
        if (!date) return [];
        const dateKey = productsService.formatDate(date);
        const allProductsForDate = productsByDate[dateKey] || [];
        return allProductsForDate.filter(p => !hiddenProductIds.includes(p.id));
    };

    return {
        productsByDate, selectedDate, isProductModalOpen, isAddModalOpen, createdAt,
        handleDayClick, handleCloseProductModal, handleOpenAddModal, handleCloseAddModal,
        handleProductAdded, 
        onUseProduct: handleUseProduct, 
        handleDeleteProduct,
        handleProductUpdate, 
        getVisibleProductsForDate, 
        onWasteProduct: handleWasteProduct,
        onHideProduct: handleHideProduct,
        showConfetti,
        recycleConfetti,
    };
};