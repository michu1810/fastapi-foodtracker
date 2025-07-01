import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { pantryService, PantryRead } from '../services/pantryService';
import { useAuth } from './AuthContext';

interface PantryContextType {
    pantries: PantryRead[];
    selectedPantry: PantryRead | null;
    selectPantry: (pantryId: number) => void;
    loading: boolean;
    refreshPantries: () => void;
}

export const PantryContext = createContext<PantryContextType | undefined>(undefined);

export const PantryProvider = ({ children }: { children: ReactNode }) => {
    const { user } = useAuth();
    const [pantries, setPantries] = useState<PantryRead[]>([]);
    const [selectedPantry, setSelectedPantry] = useState<PantryRead | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchPantries = useCallback(async () => {
        if (!user) return;

        setLoading(true);
        try {
            const userPantries = await pantryService.getUserPantries();
            setPantries(userPantries);

            const lastSelectedId = localStorage.getItem('selectedPantryId');
            const lastPantry = userPantries.find(p => p.id === Number(lastSelectedId));

            if (lastPantry) {
                setSelectedPantry(lastPantry);
            } else if (userPantries.length > 0) {
                setSelectedPantry(userPantries[0]);
                localStorage.setItem('selectedPantryId', String(userPantries[0].id));
            }
        } catch (error) {
            console.error("Nie udało się pobrać spiżarni", error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchPantries();
        } else {
            setPantries([]);
            setSelectedPantry(null);
            setLoading(false);
        }
    }, [user, fetchPantries]);

    const selectPantry = (pantryId: number) => {
        const pantry = pantries.find(p => p.id === pantryId);
        if (pantry) {
            setSelectedPantry(pantry);
            localStorage.setItem('selectedPantryId', String(pantry.id));
        }
    };

    const value = {
        pantries,
        selectedPantry,
        selectPantry,
        loading,
        refreshPantries: fetchPantries
    };

    return (
        <PantryContext.Provider value={value}>
            {children}
        </PantryContext.Provider>
    );
};

export const usePantry = () => {
    const context = useContext(PantryContext);
    if (context === undefined) {
        throw new Error('usePantry musi być używany wewnątrz PantryProvider');
    }
    return context;
};
