import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Product, productsService, CreateProductRequest } from '../../services/productService';
import { usePantry } from '../../context/PantryContext';
import Portal from '../Portal';
import ProductListItem from '../ProductListItem';

interface ApiError extends Error {
    response?: {
        data?: {
            detail?: string;
        };
    };
}
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

type EditFormData = Pick<CreateProductRequest, 'name'> & {
    expiration_date: string;
    current_amount: number;
};

const backdropVariants: Variants = {
    visible: { opacity: 1 },
    hidden: { opacity: 0 },
};

const modalVariants: Variants = {
    hidden: { y: "50px", opacity: 0, transition: { type: "spring", stiffness: 400, damping: 40 } },
    visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 30 } },
};

const ProductModal: React.FC<ProductModalProps> = ({
    isOpen,
    isContentLoaded,
    date,
    products,
    onClose,
    onUseProduct,
    onDelete,
    onUpdate,
    onAddProduct,
    onWaste,
    onHide
}) => {
    const { selectedPantry } = usePantry();
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    const [formData, setFormData] = useState<EditFormData>({ name: '', expiration_date: '', current_amount: 0 });

    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) {
            const timer = setTimeout(() => {
                setEditingProduct(null);
                setFormData({ name: '', expiration_date: '', current_amount: 0 });
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
            current_amount: product.current_amount
        });
        setError(null);
    };

    const handleSaveUpdate = async () => {
    if (!editingProduct || !selectedPantry) return;
    setError(null);

    if (formData.current_amount < editingProduct.current_amount) {
        setError(`Ilość nie może być mniejsza niż ${editingProduct.current_amount}.`);
        return;
    }

    try {
        const updatePayload = {
            name: formData.name,
            expiration_date: formData.expiration_date,
            current_amount: formData.current_amount,
            price: editingProduct.price,

            unit: editingProduct.unit as 'szt.' | 'g' | 'kg' | 'ml' | 'l',

            initial_amount: formData.current_amount > editingProduct.initial_amount ? formData.current_amount : editingProduct.initial_amount,
            category_id: editingProduct.category?.id
        };

        const updatedProduct = await productsService.updateProduct(selectedPantry.id, editingProduct.id, updatePayload);
        onUpdate(updatedProduct);
        setEditingProduct(null);

    } catch (err) {
        const apiError = err as ApiError;
        console.error("Błąd aktualizacji:", apiError);
        setError(apiError.response?.data?.detail || "Wystąpił nieoczekiwany błąd.");
    }
};

    const renderEditForm = () => (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-lg mb-4">Edytuj produkt</h3>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Nazwa produktu</label>
                    <input type="text" name="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"/>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Ilość ({editingProduct?.unit})</label>
                    <input
                        type="number"
                        name="current_amount"
                        value={formData.current_amount}
                        onChange={(e) => setFormData({ ...formData, current_amount: parseFloat(e.target.value) || 0 })}
                        min={editingProduct?.current_amount}
                        step="0.01"
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Data ważności</label>
                    <input type="date" name="expiration_date" value={formData.expiration_date || ''} onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md"/>
                </div>
            </div>

            {error && <p className="text-red-500 text-sm mt-4">{error}</p>}

            <div className="flex justify-end gap-3 mt-4">
                <button onClick={() => setEditingProduct(null)} className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg">Anuluj</button>
                <button onClick={handleSaveUpdate} className="bg-blue-500 text-white px-4 py-2 rounded-lg">Zapisz zmiany</button>
            </div>
        </div>
    );

    const renderProductList = () => (
        <div className="space-y-4">
            {products.map((product) => (
                <ProductListItem
                    key={product.id}
                    product={product}
                    onEdit={handleEditClick}
                    onUseProduct={onUseProduct}
                    onWaste={onWaste}
                    onDelete={onDelete}
                    onHide={onHide}
                />
            ))}
        </div>
    );

    return (
        <Portal>
            <AnimatePresence>
                {isOpen && (
                    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
                        <motion.div
                            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
                            variants={backdropVariants}
                            initial="hidden" animate="visible" exit="hidden"
                        />
                        <motion.div
                            className="relative w-full max-w-2xl bg-white rounded-lg shadow-xl flex flex-col"
                            variants={modalVariants}
                            initial="hidden" animate="visible" exit="hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {isContentLoaded && (
                                <>
                                    <div className="p-4 sm:p-6 border-b">
                                        <div className="flex justify-between items-center">
                                            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                                                {editingProduct ? `Edycja: ${editingProduct.name}` : `Produkty na dzień ${date.toLocaleDateString('pl-PL')}`}
                                            </h2>
                                            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 -mr-2 rounded-full transition-colors hover:bg-gray-100">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-4 sm:p-6 max-h-[70vh] overflow-y-auto">
                                        {products.length === 0 && !editingProduct ? (
                                            <p className="text-center text-gray-500 py-8">Brak produktów na ten dzień.</p>
                                        ) : (
                                            editingProduct ? renderEditForm() : renderProductList()
                                        )}
                                    </div>
                                    <div className="bg-gray-50 px-4 sm:px-6 py-4 border-t flex justify-end">
                                        <button onClick={onAddProduct} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors w-full sm:w-auto">+ Dodaj nowy produkt</button>
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
