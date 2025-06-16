import React, { useState, useEffect, Fragment } from 'react';
import { Transition } from '@headlessui/react';
import axios from 'axios';
import { productsService, ExternalProduct, CreateProductRequest, Product } from '../../services/productService';
import clsx from 'clsx'; // Dodajemy clsx do ładniejszego stylowania

interface AddProductModalProps {
    onClose: () => void;
    onProductAdded: (newProduct: Product) => void;
    defaultDate?: Date | null;
}

const today = new Date();
today.setHours(0, 0, 0, 0);

const isPastDate = (dateStr: string) => {
    const selected = new Date(dateStr);
    selected.setHours(0, 0, 0, 0);
    return selected < today;
};

const useDebounce = (value: string, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
};


const AddProductModal: React.FC<AddProductModalProps> = ({ onClose, onProductAdded, defaultDate }) => {
    // Stara logika wyszukiwania i widoków - bez zmian
    const [view, setView] = useState<'search' | 'manual' | 'confirm'>('search');
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<ExternalProduct[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const debouncedQuery = useDebounce(query, 400);
    
    // Stany formularza
    const [productName, setProductName] = useState('');
    const [expirationDate, setExpirationDate] = useState(
        defaultDate ? productsService.formatDate(defaultDate) : ''
    );
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFresh, setIsFresh] = useState(false);
    const [purchaseDate, setPurchaseDate] = useState('');

    // --- NOWE STANY DLA NOWEGO, HYBRYDOWEGO FORMULARZA ---
    // przechowuje informację, czy produkt jest na sztuki czy na wagę
    const [productType, setProductType] = useState<'szt.' | 'g'>('szt.'); 
    // przechowuje cenę całkowitą
    const [price, setPrice] = useState(''); 
    // przechowuje ilość w sztukach
    const [quantity, setQuantity] = useState('1'); 
    // przechowuje wagę w gramach
    const [weight, setWeight] = useState('');

    // Logika wyszukiwania - bez zmian
    useEffect(() => {
        if (debouncedQuery.length > 2 && view === 'search') {
            setIsSearching(true);
            productsService.searchExternalProducts(debouncedQuery)
                .then(setResults)
                .catch(err => console.error("Błąd wyszukiwania:", err))
                .finally(() => setIsSearching(false));
        } else {
            setResults([]);
        }
    }, [debouncedQuery, view]);

    const handleProductSelect = (selectedProduct: ExternalProduct) => {
        setProductName(selectedProduct.name);
        setView('confirm');
    };

    const handleSubmit = async () => {
        // --- NOWA LOGIKA WYSYŁANIA FORMULARZA ---
        
        // 1. ustalamy, jaka jest faktyczna ilość/waga produktu
        const amount = productType === 'szt.' ? parseFloat(quantity) : parseFloat(weight);
        
        // 2. prosta walidacja
        if (!productName || !price || !amount || amount <= 0) {
            setError('Nazwa, cena i poprawna ilość/waga są wymagane.');
            return;
        }

        const effectiveDate = isFresh ? purchaseDate : expirationDate;
        if (!effectiveDate) {
            setError(isFresh ? 'Data zakupu jest wymagana.' : 'Data ważności jest wymagana.');
            return;
        }
        if (isPastDate(effectiveDate)) {
            setError('Nie można dodawać produktów do przeszłości.');
            return;
        }

        setError(null);
        setIsSubmitting(true);
        
        // 3. budujemy obiekt danych zgodny z nowym API
        const newProductData: CreateProductRequest = {
            name: productName,
            price: parseFloat(price),
            unit: productType,
            initial_amount: amount,
            is_fresh_product: isFresh,
            purchase_date: isFresh ? purchaseDate : undefined,
            expiration_date: isFresh && purchaseDate
                ? productsService.formatDate(new Date(new Date(purchaseDate).getTime() + 5 * 24 * 60 * 60 * 1000))
                : expirationDate,
        };

        try {
            const createdProduct = await productsService.createProduct(newProductData);
            onProductAdded(createdProduct);
            onClose();
        } catch (err) {
            let errorMessage = 'Wystąpił nieznany błąd.';
            if (axios.isAxiosError(err)) {
                if (err.response) {
                    errorMessage = err.response.data?.detail || err.response.statusText || 'Błąd serwera.';
                } else if (err.request) {
                    errorMessage = 'Brak odpowiedzi z serwera. Sprawdź połączenie.';
                }
            } else if (err instanceof Error) {
                errorMessage = err.message;
            }
            setError(errorMessage);
            console.error('Błąd podczas dodawania produktu:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderContent = () => {
        if (view === 'search') {
            // Widok wyszukiwania - bez zmian
            return (
                <>
                    <h2 className="text-xl font-semibold text-gray-900">Dodaj nowy produkt</h2>
                    <div className="p-6 space-y-4">
                        <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">Zacznij od wyszukania produktu</label>
                        <input id="search" type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="np. Mleko, Szynka, Ser..." className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                        {isSearching && <p className="text-sm text-gray-500 mt-2">Szukam...</p>}
                        <div className="mt-2 max-h-48 overflow-y-auto">
                            {results.map((product) => (
                                <div key={product.id} onClick={() => handleProductSelect(product)} className="p-2 -mx-2 hover:bg-blue-50 cursor-pointer rounded-md">
                                    {product.name}
                                </div>
                            ))}
                        </div>
                        <div className="text-center pt-2">
                            <button onClick={() => setView('manual')} className="text-sm font-medium text-blue-600 hover:underline">
                                Nie możesz znaleźć produktu? Wprowadź ręcznie
                            </button>
                        </div>
                    </div>
                </>
            );
        }

        // Widok ręcznego dodawania / potwierdzania - przebudowany
        return (
            <>
                <h2 className="text-xl font-semibold text-gray-900">
                    {view === 'confirm' ? `Dodaj "${productName}"` : 'Dodaj produkt ręcznie'}
                </h2>
                <div className="p-6 space-y-4">
                    {error && <div className="bg-red-100 text-red-700 px-4 py-3 rounded">{error}</div>}
                    
                    {/* Nazwa produktu - bez zmian */}
                    <div>
                        <label htmlFor="productName" className="block text-sm font-medium text-gray-700 mb-1">Nazwa produktu *</label>
                        <input id="productName" type="text" value={productName} onChange={(e) => setProductName(e.target.value)} readOnly={view === 'confirm'} className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm ${view === 'confirm' ? 'bg-gray-100 cursor-not-allowed' : 'focus:ring-blue-500 focus:border-blue-500'}`} />
                    </div>

                    {/* --- NOWY PRZEŁĄCZNIK TYPU PRODUKTU --- */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Typ produktu</label>
                        <div className="flex rounded-md shadow-sm">
                            <button type="button" onClick={() => setProductType('szt.')} className={clsx('relative inline-flex items-center justify-center w-1/2 px-4 py-2 text-sm font-medium rounded-l-md border border-gray-300 focus:z-10 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500', productType === 'szt.' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50')}>
                                Na sztuki
                            </button>
                            <button type="button" onClick={() => setProductType('g')} className={clsx('relative inline-flex items-center justify-center w-1/2 px-4 py-2 text-sm font-medium -ml-px border border-gray-300 rounded-r-md focus:z-10 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500', productType === 'g' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50')}>
                                Na wagę
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* --- WARUNKOWE POLE: ILOŚĆ LUB WAGA --- */}
                        {productType === 'szt.' ? (
                            <div>
                                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">Ilość (szt.) *</label>
                                <input id="quantity" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} required min="1" className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                            </div>
                        ) : (
                            <div>
                                <label htmlFor="weight" className="block text-sm font-medium text-gray-700 mb-1">Waga (g) *</label>
                                <input id="weight" type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="np. 500" required min="1" className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                            </div>
                        )}
                        
                        {/* --- NOWE POLE: CENA --- */}
                        <div>
                            <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">Cena za całość (zł) *</label>
                            <input id="price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="np. 12.50" required min="0.01" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                        </div>
                    </div>

                    {/* Logika świeżych produktów i daty - bez zmian */}
                    <div className="md:col-span-3">
                        <label className="inline-flex items-center">
                            <input type="checkbox" checked={isFresh} onChange={(e) => setIsFresh(e.target.checked)} className="form-checkbox mr-2" />
                            <span className="text-sm">Świeży produkt (warzywo/owoc – data przydatności liczona automatycznie)</span>
                        </label>
                    </div>
                    <div>
                        {isFresh ? (
                            <>
                                <label htmlFor="purchaseDate" className="block text-sm font-medium text-gray-700 mb-1">Data zakupu *</label>
                                <input id="purchaseDate" type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                            </>
                        ) : (
                            <>
                                <label htmlFor="expirationDate" className="block text-sm font-medium text-gray-700 mb-1">Data ważności *</label>
                                <input id="expirationDate" type="date" value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                            </>
                        )}
                    </div>
                </div>
            </>
        );
    };

    // Opakowanie modalu w Transition - bez zmian
    return (
        <Transition appear show={true} as={Fragment}>
            <div className="fixed inset-0 z-50 overflow-y-auto">
                <div className="min-h-screen px-4 text-center">
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm" aria-hidden="true" onClick={onClose} />
                    </Transition.Child>
                    <span className="inline-block h-screen align-middle" aria-hidden="true">&#8203;</span>
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                        <div className="inline-block bg-white rounded-lg shadow-xl w-full max-w-lg text-left align-middle transition-all transform">
                            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-start">
                                <div className="flex-grow">
                                    {renderContent()}
                                </div>
                                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors ml-4">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                                <button onClick={onClose} className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg font-medium">Anuluj</button>
                                {(view === 'manual' || view === 'confirm') && (
                                    <button onClick={handleSubmit} disabled={isSubmitting} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium disabled:bg-blue-300">
                                        {isSubmitting ? 'Dodawanie...' : 'Dodaj produkt'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </Transition.Child>
                </div>
            </div>
        </Transition>
    );
};

export default AddProductModal;