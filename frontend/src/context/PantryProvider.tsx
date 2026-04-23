import React, { ReactNode, useCallback, useEffect, useState } from 'react';
import { pantryService, PantryRead } from '../services/pantryService';
import { useAuth } from './AuthContext';
import { PantryContext } from './PantryContext';

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
      const lastPantry = userPantries.find((p) => p.id === Number(lastSelectedId));

      if (lastPantry) {
        setSelectedPantry(lastPantry);
      } else if (userPantries.length > 0) {
        setSelectedPantry(userPantries[0]);
        localStorage.setItem('selectedPantryId', String(userPantries[0].id));
      }
    } catch (error) {
      console.error('Nie udaĹ‚o siÄ™ pobraÄ‡ spiĹĽarni', error);
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
    const pantry = pantries.find((p) => p.id === pantryId);
    if (pantry) {
      setSelectedPantry(pantry);
      localStorage.setItem('selectedPantryId', String(pantry.id));
    }
  };

  return (
    <PantryContext.Provider
      value={{
        pantries,
        selectedPantry,
        selectPantry,
        loading,
        refreshPantries: fetchPantries,
      }}
    >
      {children}
    </PantryContext.Provider>
  );
};
