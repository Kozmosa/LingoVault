export interface WordItem {
  id: string;
  english: string;
  chinese: string;
  example?: string;
  tags?: string[];
  isMastered: number;
  createdAt: number;
}

export type SortMethod = 'date_desc' | 'date_asc' | 'a_z';

export interface FileData {
  words: WordItem[];
  version: string;
}

export type AIProvider = 'gemini' | 'openai' | 'anthropic' | 'custom';

export interface AISettings {
  provider: AIProvider;
  apiKey: string;
  baseUrl: string; // For OpenAI compatible / Custom proxies
  model: string;
}

export const DEFAULT_AI_SETTINGS: AISettings = {
  provider: 'gemini',
  apiKey: '', // Will fall back to process.env.API_KEY if empty for Gemini
  baseUrl: '',
  model: 'gemini-2.5-flash'
};