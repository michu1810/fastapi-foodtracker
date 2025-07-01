import React from 'react';
import { motion } from 'framer-motion';
import { ProductCalendar } from '../components/Calendar/ProductCalendar';
import ExpiringSoonPanel from '../components/ExpiringSoonPanel';
import { useProductCalendarLogic } from '../components/Calendar/useProductCalendarLogic';
import { usePantry } from '../context/PantryContext';

export default function DashboardPage() {
    const calendarLogic = useProductCalendarLogic();
    const { selectedPantry, loading } = usePantry();

    const renderCalendar = () => {
        if (loading) {
            return <div className="card text-center p-10">Ładowanie spiżarni...</div>;
        }
        if (!selectedPantry) {
            return <div className="card text-center p-10">Stwórz lub wybierz spiżarnię, aby zacząć.</div>;
        }
        return <ProductCalendar {...calendarLogic} />;
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="min-h-screen isolate"
        >
            <div className="w-full space-y-6 md:space-y-10">
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        {renderCalendar()}
                    </div>
                    <aside className="space-y-6 z-0">
                        <div className="card h-full flex flex-col">
                            <h2 className="card-title text-base sm:text-xl">🔥 Wygasa wkrótce</h2>
                            <ExpiringSoonPanel />
                        </div>
                    </aside>
                </section>
            </div>
        </motion.div>
    );
}
