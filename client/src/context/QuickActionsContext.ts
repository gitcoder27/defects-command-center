import { createContext, useContext } from 'react';
import type { GlobalCaptureContext } from '@/components/capture/GlobalCaptureDialog';

export interface QuickActionsValue {
  openCapture: (context?: GlobalCaptureContext) => void;
  openCommandPalette: () => void;
}

const QuickActionsContext = createContext<QuickActionsValue>({
  openCapture: () => {},
  openCommandPalette: () => {},
});

export function useQuickActions(): QuickActionsValue {
  return useContext(QuickActionsContext);
}

export const QuickActionsProvider = QuickActionsContext.Provider;
