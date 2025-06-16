import React, { useEffect, useState } from 'react';
import { ExpiringProduct, productsService } from '../services/productService';

export default function ExpiringSoonPanel() {
  const [products, setProducts] = useState<ExpiringProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const data = await productsService.getExpiringSoonProducts();
      setProducts(data);
      setLoading(false);
    })();
    const i = setInterval(async () => {
      const data = await productsService.getExpiringSoonProducts();
      setProducts(data);
    }, 10000);
    return () => clearInterval(i);
  }, []);

  const getText = (d: number) => {
    if (d === 0) return 'Wygasa dziś';
    if (d === 1) return 'Został 1 dzień';
    if (d < 5) return `Zostały ${d} dni`;
    return `Zostało ${d} dni`;
  };

  const getColor = (d: number) =>
    d <= 1 ? 'text-red-600 font-bold' : d <= 3 ? 'text-yellow-600 font-bold' : 'text-gray-500';

  return (
    <div className="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300">
      {loading
        ? [...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 rounded animate-pulse mb-3" />
          ))
        : products.length === 0
        ? <p className="text-center text-gray-500">Brak produktów.</p>
        : (
          <ul className="space-y-3 pr-2">
            {products.map(p => (
              <li key={p.id} className="flex justify-between items-center p-3 bg-gray-50 rounded hover:bg-gray-100 transition">
                <span>{p.name}</span>
                <span className={`text-sm ${getColor(p.days_left)}`}>{getText(p.days_left)}</span>
              </li>
            ))}
          </ul>
        )
      }
    </div>
  );
}
