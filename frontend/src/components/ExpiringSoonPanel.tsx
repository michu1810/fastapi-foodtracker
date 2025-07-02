import React from 'react';
import useSWR from 'swr';
import { ExpiringProduct, productsService } from '../services/productService';
import { usePantry } from '../context/PantryContext';

const getText = (d: number) => {
    if (d === 0) return 'Wygasa dziś';
    if (d === 1) return 'Został 1 dzień';
    if (d < 5) return `Zostały ${d} dni`;
    return `Zostało ${d} dni`;
};

const getColor = (d: number) =>
    d <= 1 ? 'text-red-600 font-bold' : d <= 3 ? 'text-yellow-600 font-bold' : 'text-gray-500';


const ExpiringSoonListItem = React.memo(({ product }: { product: ExpiringProduct }) => (
    <li className="flex justify-between items-center p-3 bg-gray-50 rounded hover:bg-gray-100 transition">
        <span>{product.name}</span>
        <span className={`text-sm ${getColor(product.days_left)}`}>{getText(product.days_left)}</span>
    </li>
));


export default function ExpiringSoonPanel() {
    const { selectedPantry } = usePantry();

    const swrKey = selectedPantry ? `expiring/${selectedPantry.id}` : null;

    const {
      data: products = [],
      error,
      isLoading
    } = useSWR(
      swrKey,
      () => productsService.getExpiringSoonProducts(selectedPantry!.id),
      {
        refreshInterval: 30000,
        revalidateOnFocus: true,
      }
    );

    if (error) {
        console.error("Błąd SWR w ExpiringSoonPanel:", error);
        return <p className="text-center text-gray-500 p-4">Błąd ładowania produktów.</p>;
    }

    return (
        <div className="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300">
            {isLoading
                ? [...Array(5)].map((_, i) => (
                      <div key={i} className="h-12 bg-gray-200 rounded animate-pulse mb-3 mx-2" />
                  ))
                : products.length === 0
                ? <p className="text-center text-gray-500 p-4">Brak produktów bliskich ważności.</p>
                : (
                    <ul className="space-y-3 pr-2">
                        {products.map(p => (
                            <ExpiringSoonListItem key={p.id} product={p} />
                        ))}
                    </ul>
                )
            }
        </div>
    );
}
