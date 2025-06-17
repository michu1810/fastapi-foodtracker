import React, { useState, Fragment, useEffect } from 'react';
import { Transition } from '@headlessui/react';
import { Product } from '../../services/productService';

interface ConsumptionModalProps {
    product: Product;
    actionType: 'use' | 'waste';
    onClose: () => void;
    onConfirm: (productId: number, amount: number) => void;
}

const ConsumptionModal: React.FC<ConsumptionModalProps> = ({ product, actionType, onClose, onConfirm }) => {
    const [amount, setAmount] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    const verb = actionType === 'use' ? 'zużyć' : 'wyrzucić';
    const title = `Ile produktu "${product.name}" chcesz ${verb}?`;

    const quickActions = product.unit === 'szt.'
        ? [ { label: `1 ${product.unit}`, value: 1 }, { label: `Wszystkie (${product.current_amount} ${product.unit})`, value: product.current_amount } ]
        : [ { label: 'Około 1/4', value: product.current_amount / 4 }, { label: 'Około 1/2', value: product.current_amount / 2 }, { label: 'Całość', value: product.current_amount } ];

    const handleConfirm = (valueToConfirm: number | string) => {
        setError(null);

        const numericValue = typeof valueToConfirm === 'string' ? parseFloat(valueToConfirm) : valueToConfirm;

        if (isNaN(numericValue) || numericValue <= 0) {
            setError('Proszę wpisać lub wybrać wartość większą od zera.');
            return;
        }
        if (numericValue > product.current_amount) {
            setError(`Nie można ${verb} więcej niż posiadasz (${product.current_amount} ${product.unit}).`);
            return;
        }

        onConfirm(product.id, numericValue);
    };

    useEffect(() => {
        if (error) {
            setError(null);
        }
    // ZMIANA: Dodano 'error' do tablicy zależności, aby naprawić ostrzeżenie.
    }, [amount, error]);


    return (
        <Transition appear show={true} as={Fragment}>
            <div className="fixed inset-0 z-50 overflow-y-auto">
                <div className="min-h-screen px-4 text-center">
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
                    </Transition.Child>
                    <span className="inline-block h-screen align-middle" aria-hidden="true">&#8203;</span>
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                        <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
                            <h3 className="text-lg font-medium leading-6 text-gray-900">{title}</h3>
                            <div className="mt-2"><p className="text-sm text-gray-500">Pozostało: {product.current_amount} {product.unit}</p></div>
                            <div className="mt-4 flex flex-col gap-2">
                                {quickActions.map(action => (
                                    <button key={action.label} onClick={() => handleConfirm(action.value)} className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500">
                                        {action.label}
                                    </button>
                                ))}
                            </div>
                            <div className="mt-4">
                                <label htmlFor="amount-input" className="block text-sm font-medium text-gray-700">lub wpisz dokładną ilość:</label>
                                <input type="number" id="amount-input" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={`Ilość w (${product.unit})`} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                            </div>
                            {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
                            <div className="mt-6 flex justify-end gap-3">
                                <button type="button" className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-transparent rounded-md hover:bg-gray-200" onClick={onClose}>Anuluj</button>
                                <button type="button" className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700" onClick={() => handleConfirm(amount)} disabled={!amount}>Potwierdź</button>
                            </div>
                        </div>
                    </Transition.Child>
                </div>
            </div>
        </Transition>
    );
};

export default ConsumptionModal;
