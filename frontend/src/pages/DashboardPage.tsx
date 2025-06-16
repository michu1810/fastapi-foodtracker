import React from 'react';
import { motion } from 'framer-motion';
import ProductCalendar from '../components/Calendar/ProductCalendar'; // Poprawiamy import
import ExpiringSoonPanel from '../components/ExpiringSoonPanel';

export default function DashboardPage() {
    return (
        <motion.main
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="min-h-screen bg-gray-50 py-4 md:py-10 px-4 flex justify-center"
        >
            <div className="max-w-7xl w-full space-y-6 md:space-y-10">
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                    
                    {/* Kolumna z Kalendarzem (lewa strona) - teraz zawiera tylko jeden komponent */}
                    <div className="lg:col-span-2 space-y-6">
                        <ProductCalendar />
                    </div>

                    {/* Kolumna boczna z listą produktów (prawa strona) */}
                    <aside className="space-y-6">
                        <div className="card h-full flex flex-col">
                            <ExpiringSoonPanel />
                        </div>
                    </aside>

                </section>
            </div>
        </motion.main>
    );
}