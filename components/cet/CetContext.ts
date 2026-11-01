import { createContext, useContext } from 'react';
import type { CetDataset } from '../../services/cetData';
import type { CetPage, CetSettings, CetStore, Feedback } from '../../types/cet';

export interface CetContextValue {
  data: CetDataset;
  store: CetStore;
  now: number;
  paused: boolean;
  navigate: (page: CetPage) => void;
  update: (change: (data: CetStore) => CetStore) => void;
  startStudy: (mode?: 'daily' | 'notebook') => void;
  answer: (feedback: Feedback) => void;
  reconsider: () => void;
  next: () => void;
  toggleStar: (id: string) => void;
  markWord: (id: string, mastered: boolean) => void;
  saveSettings: (settings: CetSettings) => void;
  quizAnswer: (id: string, correct: boolean) => void;
  openAppearance: () => void;
}
export const CetContext = createContext<CetContextValue | null>(null);
export const useCet = () => useContext(CetContext)!;
