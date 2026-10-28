import { describe, expect, it } from 'vitest';
import { makeQuiz, matchesSpelling, meaningsOverlap } from './cetQuiz';
import type { CetWord } from '../types/cet';
const word = (id: string, meaning: string, level: 4 | 6 = 4): CetWord => ({ id, word: id, meaning, level });
describe('local quiz generation', () => {
  it('accepts alternative spelling and normalizes case and whitespace', () => {
    expect(matchesSpelling({ ...word('organize', '组织'), alts: ['organise'] }, ' Organise ')).toBe(true);
    expect(matchesSpelling(word('in spite of', '尽管'), 'IN   SPITE OF')).toBe(true);
    expect(matchesSpelling(word('ability', '能力'), 'abilities')).toBe(false);
  });
  it('screens overlapping senses, variants and homographs', () => {
    expect(meaningsOverlap(word('grow', 'v. 增长'), word('increase', 'v. 增加；增长'))).toBe(true);
    expect(meaningsOverlap(word('grow', 'v. 增长'), { ...word('expand', '扩展'), senses: [{ pos: 'v.', text: '增长' }] })).toBe(true);
    expect(meaningsOverlap(word('well', '好'), { ...word('well2', '井'), word: 'well' })).toBe(true);
  });
  it('uses four distinct same-level options and only learned question words', () => {
    const a = word('ability', '能力');
    const all = [a, word('friend', '朋友'), word('journey', '旅程'), word('nature', '自然'), word('hypothesis', '假说', 6)];
    const quiz = makeQuiz([a], all, 'choice', 10, () => 0.5);
    expect(quiz).toHaveLength(1);
    expect(quiz[0].options).toHaveLength(4);
    expect(quiz[0].options.every(x => x.level === 4)).toBe(true);
    expect(makeQuiz([a], all.slice(0, 3), 'choice', 10)).toEqual([]);
    expect(makeQuiz([a], all, 'spelling', 10)).toHaveLength(1);
  });
});
