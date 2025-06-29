import React from 'react';
import { motion } from 'framer-motion';
import { PantryManagement } from '../components/PantryManagement';
import { usePantry } from '../context/PantryContext';

export const PantryManagementPage = () => {
    const { selectedPantry, loading, refreshPantries } = usePantry();

    const handleDataChange = () => {
        refreshPantries();
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 sm:p-6 lg:p-8"
        >
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Zarządzanie Spiżarniami</h1>
                    <p className="text-gray-500 mt-1">
                        Zmień nazwę, zaproś członków lub usuń swoje spiżarnie.
                    </p>
                </div>

                {loading && <p>Ładowanie spiżarni...</p>}

                {!loading && selectedPantry ? (
                    // Przekazujemy pantry i funkcję odświeżającą jako propsy
                    <PantryManagement
                        pantry={selectedPantry}
                        onDataChange={handleDataChange}
                    />
                ) : (
                    !loading && <p className="text-center text-gray-500">Wybierz spiżarnię z menu na górze, aby rozpocząć.</p>
                )}
            </div>
        </motion.div>
    );
};
