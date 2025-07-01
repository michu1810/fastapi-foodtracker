import React, { useState } from "react";
import useSWR from 'swr';
import { usePantry } from "../context/PantryContext";
import { getCategoryWasteStats } from "../services/statsService";
import type { CategoryWasteStat } from "../services/statsService";
import { getCategoryIcon } from "../utils/icons";
import { ChevronDownIcon } from "@heroicons/react/24/solid";
import { motion, AnimatePresence } from 'framer-motion';

const CardWrapper: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className }) => (
    <div className={`bg-white p-6 rounded-2xl shadow-lg border border-gray-200/80 transition-all duration-300 ${className}`}>
        {children}
    </div>
);

const RatioBar: React.FC<{ saved: number, wasted: number }> = ({ saved, wasted }) => {
    const total = saved + wasted;
    if (total === 0) {
        return <div className="h-2 bg-green-500 rounded-full" title="100% uratowane" />;
    }
    const savedPercent = (saved / total) * 100;
    return (
        <div className="w-full bg-red-200 rounded-full h-2 overflow-hidden my-1" title={`${Math.round(savedPercent)}% uratowane`}>
            <div className="bg-green-500 h-2" style={{ width: `${savedPercent}%` }} />
        </div>
    );
};


const getIndicator = (stat: CategoryWasteStat) => {
    const hasSzt = stat.saved_szt > 0 || stat.wasted_szt > 0;
    const hasGrams = stat.saved_grams > 0 || stat.wasted_grams > 0;


    if (hasSzt && hasGrams) {
        return { displayValue: '-', color: 'text-gray-500' };
    }

    const saved = hasSzt ? stat.saved_szt : stat.saved_grams;
    const wasted = hasSzt ? stat.wasted_szt : stat.wasted_grams;
    const total = saved + wasted;

    if (total === 0) {
        return { displayValue: '100%', color: 'text-green-600' };
    }

    const saveRate = Math.round((saved / total) * 100);

    let color = 'text-orange-500';
    if (saveRate > 75) color = 'text-green-600';
    else if (saveRate > 50) color = 'text-lime-600';
    else if (saveRate === 50) color = 'text-gray-600';

    return { displayValue: `${saveRate}%`, color };
};


const CategoryStats = () => {
    const [isOpen, setIsOpen] = useState(true);
    const { selectedPantry } = usePantry();
    const swrKey = selectedPantry ? `/pantries/${selectedPantry.id}/products/stats/category-waste` : null;
    const { data: stats, error } = useSWR<CategoryWasteStat[]>(swrKey, () => getCategoryWasteStats(selectedPantry!.id));
    const isLoading = !stats && !error && selectedPantry;

    if (error || !selectedPantry) return null;

    return (
        <CardWrapper className="!p-4 sm:!p-6">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center text-left">
                <h3 className="text-xl font-bold text-gray-800">Statystyki według kategorii</h3>
                <ChevronDownIcon className={`w-6 h-6 text-gray-500 transition-transform duration-300 flex-shrink-0 ml-2 ${isOpen ? "transform rotate-180" : ""}`}/>
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1, marginTop: '1rem' }} exit={{ height: 0, opacity: 0, marginTop: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                        {isLoading ? ( <p className="text-center text-gray-500 pt-4">Ładowanie danych...</p> ) :
                        stats && stats.length > 0 ? (
                            <div className="mt-2">
                                <div className="hidden md:grid md:grid-cols-5 gap-4 text-sm font-semibold text-gray-500 border-b border-gray-200 pb-2 mb-2">
                                    <div className="md:col-span-2 text-left pl-2">Kategoria</div>
                                    <div className="text-right">Uratowane</div>
                                    <div className="text-right">Wyrzucone</div>
                                    <div className="text-right pr-2">Wskaźnik</div>
                                </div>
                                <div className="space-y-4 md:space-y-0">
                                    {stats.map((stat, index) => {
                                        const { displayValue, color } = getIndicator(stat);
                                        const hasSzt = stat.saved_szt > 0 || stat.wasted_szt > 0;
                                        const hasGrams = stat.saved_grams > 0 || stat.wasted_grams > 0;

                                        return (
                                            <div key={index} className="md:grid md:grid-cols-5 gap-4 md:items-center py-2 text-gray-700 hover:bg-gray-50/70 rounded-lg border-b md:border-none last:border-b-0">
                                                <div className="md:col-span-2 flex items-center gap-3 px-2">
                                                    <div className="relative group flex-shrink-0"><img src={getCategoryIcon(stat.icon_name)} alt={stat.category_name} className="w-10 h-10"/><div className="absolute bottom-full mb-2 hidden group-hover:block px-2 py-1 bg-gray-800 text-white text-xs rounded-md shadow-lg whitespace-nowrap z-10">{stat.category_name}</div></div>
                                                    <div className="w-full"><p className="font-semibold text-gray-800">{stat.category_name}</p><RatioBar saved={stat.saved_szt + stat.saved_grams} wasted={stat.wasted_szt + stat.wasted_grams} /></div>
                                                </div>

                                                <div className="flex justify-between items-center px-2 pt-2 md:pt-0 md:contents">
                                                    <span className="md:hidden text-gray-500 text-sm">Uratowane:</span>
                                                    <div className="text-right font-mono text-sm">
                                                        {(hasSzt || !hasGrams) && <div>{Math.round(stat.saved_szt)} szt.</div>}
                                                        {hasGrams && <div>{stat.saved_grams.toFixed(0)} g</div>}
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center px-2 md:contents text-red-500">
                                                    <span className="md:hidden text-gray-500">Wyrzucone:</span>
                                                    <div className="text-right font-mono text-sm">
                                                        {(hasSzt || !hasGrams) && <div>{Math.round(stat.wasted_szt)} szt.</div>}
                                                        {hasGrams && <div>{stat.wasted_grams.toFixed(0)} g</div>}
                                                    </div>
                                                </div>

                                                <div className="flex justify-between items-center px-2 pb-2 md:pb-0 md:contents">
                                                    <span className="md:hidden text-gray-500">Wskaźnik:</span>
                                                    <div className={`text-right font-mono text-sm font-bold ${color}`}>{displayValue}</div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ) : ( <p className="text-center text-gray-500 pt-4">Brak danych o zużytych lub wyrzuconych produktach w tej spiżarni.</p> )}
                    </motion.div>
                )}
            </AnimatePresence>
        </CardWrapper>
    );
};

export default CategoryStats;
