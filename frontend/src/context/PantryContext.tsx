import { createContext, useContext } from 'react';
import type { PantryRead } from '../services/pantryService';

export interface PantryContextType {
  pantries: PantryRead[];
  selectedPantry: PantryRead | null;
  selectPantry: (pantryId: number) => void;
  loading: boolean;
  refreshPantries: () => void;
}

export const PantryContext = createContext<PantryContextType | undefined>(undefined);

export const usePantry = () => {
  const context = useContext(PantryContext);
  if (context === undefined) {
    throw new Error('usePantry musi być używany wewnątrz PantryProvider');
  }
  return context;
};
