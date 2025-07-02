import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import axios from 'axios';
import { productsService, ExternalProduct, CreateProductRequest, Product } from '../../services/productService';
import clsx from 'clsx';
import { ScanBarcode, Info } from 'lucide-react';
import BarcodeScanner from '../BarcodeScanner';
import { usePantry } from '../../context/PantryContext';
import useSWR from 'swr';
import { Category, categoryService } from '../../services/categoryService';
import { Listbox } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid';
import Portal from '../Portal';

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


interface AddProductModalProps {
    isOpen: boolean;
    isContentLoaded: boolean;
    onClose: () => void;
    onProductAdded: (newProduct: Product) => void;
    defaultDate?: Date | null;
}

const backdropVariants: Variants = {
    visible: { opacity: 1 },
    hidden: { opacity: 0 },
};

const modalVariants: Variants = {
    hidden: { y: "50px", opacity: 0, transition: { type: "spring", stiffness: 400, damping: 40 } },
    visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 30 } },
};


const AddProductModal: React.FC<AddProductModalProps> = ({ isOpen, isContentLoaded, onClose, onProductAdded, defaultDate }) => {
    const { selectedPantry } = usePantry();
    const [view, setView] = useState<'search' | 'manual' | 'confirm'>('search');
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<ExternalProduct[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const debouncedQuery = useDebounce(query, 400);
    const [selectedExternalId, setSelectedExternalId] = useState<string | undefined>(undefined);
    const [productName, setProductName] = useState('');
    const [expirationDate, setExpirationDate] = useState(defaultDate ? productsService.formatDate(defaultDate) : '');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFresh, setIsFresh] = useState(false);
    const [purchaseDate, setPurchaseDate] = useState('');
    const [productType, setProductType] = useState<'szt.' | 'g'>('szt.');
    const [price, setPrice] = useState('');
    const [quantity, setQuantity] = useState('1');
    const [weight, setWeight] = useState('');
    const [isScannerVisible, setIsScannerVisible] = useState(false);
    const { data: categories, error: categoriesError } = useSWR<Category[]>('categories', categoryService.getAllCategories);
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [searchSessionKey, setSearchSessionKey] = useState(0);

    useEffect(() => {
        if (isContentLoaded) {
             setExpirationDate(defaultDate ? productsService.formatDate(defaultDate) : '');
        }
    }, [isContentLoaded, defaultDate]);

    useEffect(() => {
        if (!isOpen) {
            const timer = setTimeout(() => {
                setView('search');
                setQuery('');
                setResults([]);
                setProductName('');
                setSelectedExternalId(undefined);
                setError(null);
                setSelectedCategory(null);
                setPrice('');
                setQuantity('1');
                setWeight('');
                setIsFresh(false);
                setPurchaseDate('');
                setSearchSessionKey(prev => prev + 1);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    useEffect(() => {
        if (view !== 'search' || debouncedQuery.trim() === '') {
            setResults([]);
            return;
        }
        if (debouncedQuery.length > 2) {
            setIsSearching(true);
            productsService.searchExternalProducts(debouncedQuery)
                .then(setResults)
                .catch(err => console.error("Błąd wyszukiwania:", err))
                .finally(() => setIsSearching(false));
        } else {
            setResults([]);
        }
    }, [debouncedQuery, view, searchSessionKey]);
    const resolveAndSetCategory = async (productId: string) => {
        try {
            const category = await productsService.resolveCategory(productId);
            if (category) {
                setSelectedCategory(category);
            }
        } catch (error) {
            console.log(error)
            console.log("Nie udało się automatycznie ustalić kategorii (to nie problem).");
            setSelectedCategory(null);
        }
    };
    const handleProductSelect = (selectedProduct: ExternalProduct) => {
        setProductName(selectedProduct.name);
        setSelectedExternalId(selectedProduct.id);
        setView('confirm');
        resolveAndSetCategory(selectedProduct.id);
    };
    const handleScanSuccess = async (decodedText: string) => {
        setIsScannerVisible(false);
        setIsSearching(true);
        setError(null);
        try {
            const productData = await productsService.getProductByBarcode(decodedText);
            if (productData) {
                setProductName(productData.name);
                setSelectedExternalId(productData.id);
                setView('confirm');
                resolveAndSetCategory(productData.id);
            } else {
                alert(`Kod ${decodedText} został zeskanowany, ale nie ma go w bazie. Uzupełnij dane ręcznie.`);
                setProductName('');
                setSelectedExternalId(undefined);
                setView('manual');
            }
        } catch (error) {
            console.log(error);
            setError('Wystąpił błąd podczas komunikacji z serwerem.');
            setTimeout(() => setError(null), 5000);
        } finally {
            setIsSearching(false);
        }
    };
    const handleSubmit = async () => {
        if (!selectedPantry) {
            setError('Nie wybrano spiżarni. Odśwież stronę.');
            return;
        }
        const amount = productType === 'szt.' ? parseFloat(quantity) : parseFloat(weight);
        if (!productName || !price || !amount || amount <= 0) {
            setError('Nazwa, cena i poprawna ilość/waga są wymagane.');
            return;
        }
        const effectiveDate = isFresh ? purchaseDate : expirationDate;
        if (!effectiveDate) {
            setError(isFresh ? 'Data zakupu jest wymagana.' : 'Data ważności jest wymagana.');
            return;
        }
        if (!isFresh && isPastDate(effectiveDate)) {
            setError('Nie można dodawać produktów z przeszłą datą ważności.');
            return;
        }
        setError(null);
        setIsSubmitting(true);
        const newProductData: CreateProductRequest = { name: productName, price: parseFloat(price), unit: productType, initial_amount: amount, is_fresh_product: isFresh, purchase_date: isFresh ? purchaseDate : undefined, expiration_date: isFresh ? undefined : expirationDate, shelf_life_days: isFresh ? 5 : undefined, category_id: selectedCategory?.id, external_id: selectedExternalId, };
        try {
            const createdProduct = await productsService.createProduct(selectedPantry.id, newProductData);
            onProductAdded(createdProduct);
            onClose();
        } catch (err) {
            let errorMessage = 'Wystąpił nieznany błąd.';
            if (axios.isAxiosError(err)) {
                if (err.response) { errorMessage = err.response.data?.detail || err.response.statusText || 'Błąd serwera.'; } else if (err.request) { errorMessage = 'Brak odpowiedzi z serwera. Sprawdź połączenie.'; }
            } else if (err instanceof Error) { errorMessage = err.message; }
            setError(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };
    const renderManualForm = () => ( /* ... JSX dla formularza bez zmian ... */ <div className="p-4 sm:p-6"><h2 className="text-xl font-semibold text-gray-900" id="modal-title">{view === 'confirm' ? `Dodaj "${productName}"` : 'Dodaj produkt ręcznie'}</h2><div className="mt-4 grid grid-cols-1 gap-y-5">{error && <div className="bg-red-100 text-red-700 px-4 py-3 rounded">{error}</div>}<div><label htmlFor="productName" className="block text-sm font-medium text-gray-700 mb-1">Nazwa produktu *</label><input id="productName" type="text" value={productName} onChange={(e) => setProductName(e.target.value)} readOnly={view === 'confirm'} className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm ${view === 'confirm' ? 'bg-gray-100 cursor-not-allowed' : 'focus:ring-blue-500 focus:border-blue-500'}`}/></div><div><Listbox value={selectedCategory} onChange={setSelectedCategory}><div className="relative"><Listbox.Label className="block text-sm font-medium text-gray-700 mb-1">Kategoria</Listbox.Label><Listbox.Button className="relative w-full cursor-default rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-left shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"><span className="block truncate">{selectedCategory ? selectedCategory.name : "Wybierz kategorię (opcjonalnie)"}</span><span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2"><ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true"/></span></Listbox.Button><Listbox.Options as={motion.ul} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm z-20">{categoriesError && <div className="px-3 py-2 text-red-500">Błąd ładowania</div>}{categories?.map((category) => (<Listbox.Option key={category.id} className={({ active }) => `relative cursor-default select-none py-2 pl-10 pr-4 ${active ? 'bg-blue-100 text-blue-900' : 'text-gray-900'}`} value={category}>{({ selected }) => (<><span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>{category.name}</span>{selected ? (<span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600"><CheckIcon className="h-5 w-5" aria-hidden="true"/></span>) : null}</>)}</Listbox.Option>))}</Listbox.Options></div></Listbox><div className="flex items-start gap-2 mt-1.5 text-xs text-gray-500"><Info size={14} className="flex-shrink-0 mt-0.5"/><span>Kategoria jest dopasowywana automatycznie i może zawierać błędy. Zawsze możesz ją poprawić ręcznie.</span></div></div><div><label className="block text-sm font-medium text-gray-700 mb-2">Typ produktu</label><div className="flex rounded-md shadow-sm"><button type="button" onClick={() => setProductType('szt.')} className={clsx('relative inline-flex items-center justify-center w-1/2 px-4 py-2 text-sm font-medium rounded-l-md border border-gray-300 focus:z-10 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500', productType === 'szt.' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50')}>Na sztuki</button><button type="button" onClick={() => setProductType('g')} className={clsx('relative inline-flex items-center justify-center w-1/2 px-4 py-2 text-sm font-medium -ml-px border border-gray-300 rounded-r-md focus:z-10 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500', productType === 'g' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50')}>Na wagę</button></div></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{productType === 'szt.' ? (<div><label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">Ilość (szt.) *</label><input id="quantity" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} required min="1" className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"/></div>) : (<div><label htmlFor="weight" className="block text-sm font-medium text-gray-700 mb-1">Waga (g) *</label><input id="weight" type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="np. 500" required min="1" className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"/></div>)}<div><label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">Cena za całość (zł) *</label><input id="price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="np. 12.50" required min="0.01" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"/></div></div><div><label className="flex items-center space-x-3 cursor-pointer"><input type="checkbox" checked={isFresh} onChange={(e) => setIsFresh(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/><span className="text-sm text-gray-700">Świeży produkt (np. warzywo, owoc)</span></label>{isFresh && (<div className="flex items-start gap-2 mt-1.5 text-xs text-gray-500"><Info size={14} className="flex-shrink-0 mt-0.5"/><span>Data ważności jest szacowana na podstawie średniej dla danej kategorii. Traktuj ją jako wskazówkę.</span></div>)}</div><div>{isFresh ? (<><label htmlFor="purchaseDate" className="block text-sm font-medium text-gray-700 mb-1">Data zakupu *</label><input id="purchaseDate" type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"/></>) : (<><label htmlFor="expirationDate" className="block text-sm font-medium text-gray-700 mb-1">Data ważności *</label><input id="expirationDate" type="date" value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"/></>)}</div></div></div>);
    const renderContent = () => { if (view === 'search') { return ( <div className="p-4 sm:p-6"><h2 className="text-xl font-semibold text-gray-900">Dodaj nowy produkt</h2><div className="mt-4 space-y-4"><label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">Zacznij od wyszukania produktu</label><div className="relative"><input id="search" type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="np. Mleko, Szynka, Ser..." className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 pr-10"/><div onClick={() => setIsScannerVisible(true)} className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer text-gray-400 hover:text-blue-500" title="Skanuj kod kreskowy"><ScanBarcode size={20}/></div></div>{isSearching && <p className="text-sm text-gray-500 mt-2">Szukam...</p>}{error && <p className="text-sm text-red-500 mt-2">{error}</p>}<div className="mt-2 max-h-48 overflow-y-auto">{results.map((product) => (<div key={product.id} onClick={() => handleProductSelect(product)} className="p-2 -mx-2 hover:bg-blue-50 cursor-pointer rounded-md">{product.name}</div>))}</div><div className="text-center pt-2"><button onClick={() => setView('manual')} className="text-sm font-medium text-blue-600 hover:underline">Nie możesz znaleźć produktu? Wprowadź ręcznie</button></div></div></div> ); } return renderManualForm(); };

    return (
        <Portal>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 sm:pt-16"
                        onClick={onClose}
                    >
                        <motion.div
                            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
                            variants={backdropVariants} initial="hidden" animate="visible" exit="hidden"
                        />
                        <motion.div
                            className="relative z-10 bg-white rounded-lg shadow-xl w-full max-w-lg flex flex-col"
                            variants={modalVariants} initial="hidden" animate="visible" exit="hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* ZMIANA: Renderuj zawartość dopiero, gdy isContentLoaded jest true */}
                            {isContentLoaded && (
                                <>
                                    <div className="flex-grow overflow-y-auto max-h-[85vh]">
                                        {renderContent()}
                                    </div>

                                    <div className="flex-shrink-0 bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-3 border-t">
                                        <button type="button" onClick={handleSubmit} disabled={isSubmitting || view === 'search'} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-blue-300 disabled:cursor-not-allowed">
                                            {isSubmitting ? 'Dodawanie...' : 'Dodaj produkt'}
                                        </button>
                                        <button type="button" onClick={onClose} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm">
                                            Anuluj
                                        </button>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                )}
                {isContentLoaded && isScannerVisible && (<BarcodeScanner onScan={handleScanSuccess} onClose={() => setIsScannerVisible(false)} />)}
            </AnimatePresence>
        </Portal>
    );
};

export default AddProductModal;
