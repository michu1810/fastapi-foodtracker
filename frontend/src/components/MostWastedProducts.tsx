import useSWR from 'swr';
import { usePantry } from '../context/PantryContext';
import { getMostWastedProducts } from '../services/statsService';
import type { MostWastedProduct } from '../services/statsService';
import { FaSadTear } from 'react-icons/fa';

const CardWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200/80 h-full">
        {children}
    </div>
);

const MostWastedProducts = () => {
    const { selectedPantry } = usePantry();

    const swrKey = selectedPantry ? `/pantries/${selectedPantry.id}/stats/most-wasted-products` : null;
    const { data: products, error } = useSWR<MostWastedProduct[]>(swrKey, () => getMostWastedProducts(selectedPantry!.id));

    const isLoading = !products && !error;

    return (
        <CardWrapper>
            <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">Największe Straty</h3>
            {isLoading ? (
                <p className="text-center text-gray-500">Ładowanie...</p>
            ) : !products || products.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                    <FaSadTear className="text-4xl mb-2 text-gray-400" />
                    <p>Brak wyrzuconych produktów. Tak trzymaj!</p>
                </div>
            ) : (
                <ul className="space-y-3">
                    {products.map(product => (
                        <li key={product.id} className="flex justify-between items-center text-sm">
                            <span className="truncate pr-2 text-gray-600">{product.name}</span>
                            <span className="font-mono font-semibold text-red-500 whitespace-nowrap">
                                -{product.wasted_value.toFixed(2)} zł
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </CardWrapper>
    );
};

export default MostWastedProducts;
