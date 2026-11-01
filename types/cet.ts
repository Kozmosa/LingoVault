/** Official dataset contract, independent of the original Vault WordItem. */
export interface CetWord {
  id: string;
  word: string;
  alts?: string[];
  homograph?: number;
  level: 4 | 6;
  phonetic?: string;
  meaning: string;
  senses?: { pos: string; text: string }[];
  exchange?: { label: string; form: string }[];
  freq?: number;
}

export type CetBook = '4' | '6' | 'all';
export type Feedback = 'known' | 'fuzzy' | 'unknown';
export interface CetProgress {
  stage: number;
  due: number;
  reps: number;
  lapses: number;
  firstSeen: number;
  lastSeen: number;
  starred: boolean;
  mastered: boolean;
}
export interface CetSettings {
  book: CetBook;
  dailyNew: number;
  dailyReview: number;
  accent: 'en-US' | 'en-GB';
  autoSpeak: boolean;
}
export interface CetDailyLog {
  new: number;
  review: number;
  seconds: number;
  newIds: string[];
  reviewIds: string[];
}
export interface CetQueueEntry {
  id: string;
  kind: 'new' | 'review';
  repeat: boolean;
  fuzzyRepeated: boolean;
  mustRecall: boolean;
}
export interface CetSession {
  day: string;
  book: CetBook;
  mode: 'daily' | 'notebook';
  queue: CetQueueEntry[];
  completed: number;
  total: number;
  feedback: Feedback | null;
  /** Progress before the current answer, so a "known" answer can be taken back. */
  before?: CetProgress | null;
}
export interface CetStore {
  version: 1;
  words: Record<string, CetProgress>;
  days: Record<string, CetDailyLog>;
  settings: CetSettings;
  session: CetSession | null;
}
export const CET_PAGES = ['cetToday', 'cetStudy', 'cetQuiz', 'cetLibrary', 'cetNotebook', 'cetStats', 'cetSettings'] as const;
export type CetPage = typeof CET_PAGES[number];
export const isCetPage = (page: string): page is CetPage => (CET_PAGES as readonly string[]).includes(page);
