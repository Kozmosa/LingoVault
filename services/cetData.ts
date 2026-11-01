import type { CetWord } from '../types/cet';

export interface CetDataset { words: CetWord[]; sample: boolean }
let cached: Promise<CetDataset> | undefined;

async function fetchWords(url: string): Promise<CetWord[]> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function fetchDataset(): Promise<CetDataset> {
  try {
    return { words: await fetchWords('/data/cet-words.json'), sample: false };
  } catch {
    return { words: await fetchWords('/data/cet-words.sample.json'), sample: true };
  }
}

export function loadCetData(): Promise<CetDataset> {
  if (!cached) cached = fetchDataset().catch(error => { cached = undefined; throw error; });
  return cached;
}
