import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { pantryService, PantryRead } from '../services/pantryService';
import { useAuth } from './AuthContext'; // Używamy naszego istniejącego AuthContext

interface PantryContextType {
    pantries: PantryRead[];
    selectedPantry: PantryRead | null;
    selectPantry: (pantryId: number) => void;
    loading: boolean;
    refreshPantries: () => void;
}

const PantryContext = createContext<PantryContextType | undefined>(undefined);

export const PantryProvider = ({ children }: { children: ReactNode }) => {
    const { user } = useAuth(); // Pobieramy obiekt użytkownika z AuthContext
    const [pantries, setPantries] = useState<PantryRead[]>([]);
    const [selectedPantry, setSelectedPantry] = useState<PantryRead | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchPantries = useCallback(async () => {
        if (!user) return; // Nie rób nic, jeśli nie ma użytkownika

        setLoading(true);
        try {
            const userPantries = await pantryService.getUserPantries();
            setPantries(userPantries);

            // Sprawdzamy, czy jakaś spiżarnia była ostatnio wybrana
            const lastSelectedId = localStorage.getItem('selectedPantryId');
            const lastPantry = userPantries.find(p => p.id === Number(lastSelectedId));

            if (lastPantry) {
                setSelectedPantry(lastPantry);
            } else if (userPantries.length > 0) {
                // Jeśli nie, ustawiamy pierwszą z listy jako domyślną
                setSelectedPantry(userPantries[0]);
            }
        } catch (error) {
            console.error("Nie udało się pobrać spiżarni", error);
        } finally {
            setLoading(false);
        }
    }, [user]); // Funkcja zależy od obiektu użytkownika

    useEffect(() => {
        // Pobieramy spiżarnie za każdym razem, gdy zmieni się użytkownik (logowanie/wylogowanie)
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
            // Zapisujemy wybór w localStorage, aby go zapamiętać
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

// Tworzymy customowy hook dla łatwego dostępu do kontekstu
export const usePantry = () => {
    const context = useContext(PantryContext);
    if (context === undefined) {
        throw new Error('usePantry musi być używany wewnątrz PantryProvider');
    }
    return context;
};
