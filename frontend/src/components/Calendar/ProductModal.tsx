import React, { useState, Fragment } from 'react';
import { Transition } from '@headlessui/react';
import { Product, productsService } from '../../services/productService';

interface ProductModalProps {
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

const ProductModal: React.FC<ProductModalProps> = ({ date, products, onClose, onUseProduct, onDelete, onUpdate, onAddProduct, onWaste, onHide }) => {
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [formData, setFormData] = useState({ name: '', expiration_date: '' });

    const handleEditClick = (product: Product) => {
        setEditingProduct(product);
        setFormData({ name: product.name, expiration_date: product.expiration_date });
    };

    // ZMIANA: Przywracamy funkcję handleSaveUpdate
    const handleSaveUpdate = async () => {
        if (!editingProduct) return;
        try {
            // Ta funkcja używa 'productsService', 'formData' i 'onUpdate', więc błędy znikną
            const updatedProduct = await productsService.updateProduct(editingProduct.id, { 
                name: formData.name, 
                expiration_date: formData.expiration_date 
            });
            onUpdate(updatedProduct); // `onUpdate` jest teraz używane
            setEditingProduct(null);
        } catch (err) {
            console.error("Błąd aktualizacji:", err);
            // Tutaj możesz dodać toast.error() dla użytkownika
        }
    };

    const renderEditForm = () => (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-lg mb-4">Edytuj produkt</h3>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Nazwa produktu</label>
                    <input 
                        type="text" 
                        name="name" 
                        value={formData.name} // `formData` jest teraz używane do odczytu
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md" 
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Data ważności</label>
                    <input 
                        type="date" 
                        name="expiration_date" 
                        value={formData.expiration_date} // `formData` jest teraz używane do odczytu
                        onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })} 
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md" 
                    />
                </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
                <button onClick={() => setEditingProduct(null)} className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg">Anuluj</button>
                {/* ZMIANA: Podłączamy przycisk do przywróconej funkcji */}
                <button onClick={handleSaveUpdate} className="bg-blue-500 text-white px-4 py-2 rounded-lg">Zapisz zmiany</button>
            </div>
        </div>
    );

    const renderProductList = () => (
        <div className="space-y-2 sm:space-y-3">
            {products.map((product) => {
                const isFullyUsed = product.current_amount === 0;
                return (
                    <div key={product.id} className={`border rounded-lg p-3 sm:p-4 transition-shadow hover:shadow-md ${isFullyUsed ? 'bg-gray-100' : ''}`}>
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                            <div>
                                <h3 className={`font-semibold text-base sm:text-lg ${isFullyUsed ? 'line-through text-gray-500' : ''}`}>
                                    {product.name}
                                    <span className="ml-2 font-normal text-sm text-gray-500">
                                        (pozostało: {product.current_amount}/{product.initial_amount}) {product.unit}
                                    </span>
                                </h3>
                                <p className="text-xs sm:text-sm text-gray-600">Wygasa: {product.expiration_date}</p>
                            </div>
                            <div className="flex gap-2 justify-end w-full sm:w-auto mt-3 sm:mt-0 sm:ml-4 flex-shrink-0">
                                {!isFullyUsed ? (
                                    <>
                                        <button onClick={() => handleEditClick(product)} title="Edytuj produkt" className="bg-yellow-400 hover:bg-yellow-500 text-white h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center rounded-full transition-transform hover:scale-110">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                                        </button>
                                        <button onClick={() => onUseProduct(product)} title="Zużyj produkt" className="bg-green-500 hover:bg-green-600 text-white h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center rounded-full transition-transform hover:scale-110">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                        </button>
                                        <button onClick={() => onDelete(product)} title="Usuń cały wpis" className="bg-red-500 hover:bg-red-600 text-white h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center rounded-full transition-transform hover:scale-110">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                        <button onClick={() => onWaste(product)} title="Wyrzuć produkt" className="bg-gray-400 hover:bg-gray-500 text-white h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center rounded-full transition-transform hover:scale-110">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 011 1v1h3.5a.5.5 0 010 1H6a.5.5 0 010-1H9V3a1 1 0 011-1zm-3.707 4.293a1 1 0 011.414 0L10 9.586l3.293-3.293a1 1 0 111.414 1.414L11.414 11l3.293 3.293a1 1 0 01-1.414 1.414L10 12.414l-3.293 3.293a1 1 0 01-1.414-1.414L8.586 11 5.293 7.707a1 1 0 010-1.414z" /></svg>
                                        </button>
                                    </>
                                ) : (
                                    <button onClick={() => onHide(product)} title="Ukryj wpis z widoku" className="bg-gray-400 hover:bg-gray-500 text-white h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center rounded-full transition-transform hover:scale-110">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );

    return (
        <Transition appear show={true} as={Fragment}>
            <div className="fixed inset-0 z-50 overflow-y-auto">
                <div className="min-h-screen px-4 text-center">
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm" onClick={onClose} />
                    </Transition.Child>
                    <span className="inline-block h-screen align-middle" aria-hidden="true">&#8203;</span>
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                        <div className="inline-block w-full max-w-2xl text-left align-middle transition-all transform">
                            <div className="bg-white rounded-lg shadow-xl flex flex-col">
                                <div className="p-4 sm:p-6 border-b">
                                    <div className="flex justify-between items-center">
                                        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                                            {editingProduct ? `Edycja: ${editingProduct.name}` : `Produkty na dzień ${date.toLocaleDateString('pl-PL')}`}
                                        </h2>
                                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 -mr-2">X</button>
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
                            </div>
                        </div>
                    </Transition.Child>
                </div>
            </div>
        </Transition>
    );
};

export default ProductModal;