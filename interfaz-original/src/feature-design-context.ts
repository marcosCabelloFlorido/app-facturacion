import { createContext } from 'react';

/** Only opens local visual drafts. No business operation belongs in this context. */
export const FeatureDesignContext = createContext<{
  open: (id?: string) => void;
  area: string;
  shortcuts: { id: string; title: string }[];
} | null>(null);
