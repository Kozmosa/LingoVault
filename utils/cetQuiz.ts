import type { CetWord } from '../types/cet';

export type QuizMode = 'choice' | 'spelling';
export interface QuizQuestion { word: CetWord; options: CetWord[] }
export const normalizeSpelling = (text: string) => text.normalize('NFKC').trim().toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, ' ');
export const matchesSpelling = (word: CetWord, answer: string) => [word.word, ...(word.alts ?? [])].some(value => normalizeSpelling(value) === normalizeSpelling(answer));

function glosses(word: CetWord): string[] {
  return [word.meaning, ...(word.senses ?? []).map(sense => sense.text)].flatMap(text => text.split(/[^\u3400-\u9fff]+/)).filter(text => text.length > 0);
}
/** Conservative lexical screening, including detailed senses and spelling variants. */
export function meaningsOverlap(a: CetWord, b: CetWord): boolean {
  if ([a.word, ...(a.alts ?? [])].some(value => matchesSpelling(b, value))) return true;
  return glosses(a).some(left => glosses(b).some(right => {
    if (left.includes(right) || right.includes(left)) return true;
    for (let i = 0; i < left.length - 1; i++) if (right.includes(left.slice(i, i + 2))) return true;
    return false;
  }));
}
function shuffled<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function makeQuiz(learned: CetWord[], all: CetWord[], mode: QuizMode, count: number, random = Math.random): QuizQuestion[] {
  const result: QuizQuestion[] = [];
  const pools = { 4: all.filter(word => word.level === 4 && word.meaning.trim()), 6: all.filter(word => word.level === 6 && word.meaning.trim()) };
  for (const word of shuffled(learned.filter(word => word.meaning.trim()), random)) {
    if (result.length >= count) break;
    const options = [word];
    if (mode === 'choice') {
      for (const candidate of shuffled(pools[word.level], random)) {
        if (options.every(other => !meaningsOverlap(candidate, other))) options.push(candidate);
        if (options.length === 4) break;
      }
      if (options.length !== 4) continue;
    }
    result.push({ word, options: shuffled(options, random) });
  }
  return result;
}
