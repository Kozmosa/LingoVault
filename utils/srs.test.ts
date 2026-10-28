import { describe, expect, it } from 'vitest';
import { answerSession, buildQueue, DAY, dayOffset, emptyLog, emptyProgress, logStudy, nextInSession, reconsiderSession, reviewWord, streak, studyDay } from './srs';
import type { CetSession, CetSettings, CetWord } from '../types/cet';

const now = new Date(2026, 9, 27, 12).getTime();
const settings: CetSettings = { book: 'all', dailyNew: 30, dailyReview: 200, accent: 'en-US', autoSpeak: false };
const word = (id: string, level: 4 | 6 = 4): CetWord => ({ id, word: id, level, meaning: '释义' });
const session = (): CetSession => ({ day: studyDay(now), book: 'all', mode: 'daily', queue: [{ id: 'a', kind: 'new', repeat: false, fuzzyRepeated: false, mustRecall: false }], total: 1, completed: 0, feedback: null });

describe('spaced repetition', () => {
  it('skips to stage 3 only on a first known response, even after starring', () => {
    const result = reviewWord({ ...emptyProgress(), starred: true }, 'known', now);
    expect(result).toMatchObject({ stage: 3, due: now + 4 * DAY, reps: 1, firstSeen: now, starred: true, mastered: false });
    expect(reviewWord(reviewWord(undefined, 'unknown', now), 'known', now).stage).toBe(1);
  });
  it('advances, marks mastery at 6, and caps at 7', () => {
    let state = reviewWord(undefined, 'known', now);
    for (const [stage, interval] of [[4, 7], [5, 15], [6, 30], [7, 60], [7, 60]]) {
      state = reviewWord(state, 'known', now);
      expect(state.stage).toBe(stage);
      expect(state.due).toBe(now + interval * DAY);
      expect(state.mastered).toBe(stage >= 6);
    }
  });
  it('keeps fuzzy stage at least one and halves the old interval with a day minimum', () => {
    expect(reviewWord(undefined, 'fuzzy', now)).toMatchObject({ stage: 1, due: now + DAY });
    const old = { ...emptyProgress(), reps: 4, stage: 5, firstSeen: now - DAY };
    expect(reviewWord(old, 'fuzzy', now)).toMatchObject({ stage: 5, due: now + 7.5 * DAY, firstSeen: old.firstSeen });
  });
  it('resets unknown, revokes mastery, increments lapses without mutating input', () => {
    const old = { ...emptyProgress(), stage: 7, reps: 10, mastered: true, lapses: 2 };
    expect(reviewWord(old, 'unknown', now)).toMatchObject({ stage: 0, due: now, lapses: 3, mastered: false });
    expect(old.stage).toBe(7);
  });
  it('takes a known answer back as fuzzy and requeues the card once', () => {
    const known = answerSession(session(), 'known');
    expect(known.queue).toHaveLength(1);
    const taken = reconsiderSession(known);
    expect(taken).toMatchObject({ feedback: 'fuzzy', total: 2, completed: 1 });
    expect(taken.queue).toHaveLength(2);
    expect(reconsiderSession(answerSession(session(), 'unknown')).feedback).toBe('unknown');
  });
  it('repeats fuzzy exactly once and ignores double answers', () => {
    let s = answerSession(session(), 'fuzzy');
    expect(s.queue).toHaveLength(2);
    expect(answerSession(s, 'unknown')).toBe(s);
    s = nextInSession(s);
    s = nextInSession(answerSession(s, 'fuzzy'));
    expect(s.queue).toHaveLength(0);
    expect(s.completed).toBe(2);
  });
  it('repeats unknown at the tail until known; unseen cards cannot be skipped', () => {
    let s = session();
    expect(nextInSession(s)).toBe(s);
    for (let i = 0; i < 4; i++) {
      s = nextInSession(answerSession(s, 'unknown'));
      expect(s.queue).toHaveLength(1);
    }
    expect(nextInSession(answerSession(s, 'known')).queue).toHaveLength(0);
  });
  it('does not let fuzzy responses end an unknown-word relearning chain', () => {
    let s = nextInSession(answerSession(session(), 'unknown'));
    for (let i = 0; i < 3; i++) {
      s = nextInSession(answerSession(s, 'fuzzy'));
      expect(s.queue).toHaveLength(1);
    }
    expect(nextInSession(answerSession(s, 'known')).queue).toHaveLength(0);
  });
});

describe('daily scheduling and accounting', () => {
  it('takes oldest due reviews and interleaves three reviews then one new word', () => {
    const words = ['r4', 'r3', 'r2', 'r1', 'n1', 'n2', 'future'].map(id => word(id));
    const progress = Object.fromEntries(['r1', 'r2', 'r3', 'r4', 'future'].map((id, i) => [id, { ...emptyProgress(), reps: 1, due: id === 'future' ? now + DAY : now, lastSeen: i }]));
    const queue = buildQueue(words, progress, settings, emptyLog(), now);
    expect(queue.map(x => x.id)).toEqual(['r1', 'r2', 'r3', 'n1', 'r4', 'n2']);
  });
  it('respects books, remaining limits, and words already counted today', () => {
    const words = [word('a'), word('b'), word('c', 6), word('d'), word('e')];
    const progress = { a: { ...emptyProgress(), reps: 1, due: now }, b: { ...emptyProgress(), reps: 1, due: now } };
    const log = logStudy(logStudy(emptyLog(), 'a', false), 'd', true);
    expect(buildQueue(words, progress, { ...settings, book: '4', dailyNew: 2, dailyReview: 2 }, log, now).map(x => x.id)).toEqual(['b', 'e']);
    expect(buildQueue(words, progress, { ...settings, dailyNew: 1, dailyReview: 1 }, log, now)).toEqual([]);
  });
  it('does not count in-session repeats or newly learned words as reviews', () => {
    let log = logStudy(emptyLog(), 'a', true, 5);
    log = logStudy(log, 'a', false, 3);
    expect(log).toMatchObject({ new: 1, review: 0, seconds: 8 });
  });
  it('does not apply sample progress to the official dataset quota', () => {
    const log = logStudy(emptyLog(), 'cet-sample-0001', true);
    expect(buildQueue([word('cet-0001')], {}, { ...settings, dailyNew: 1 }, log, now).map(entry => entry.id)).toEqual(['cet-0001']);
  });
  it('uses local 04:00 across month and year boundaries', () => {
    expect(studyDay(new Date(2026, 0, 1, 3, 59, 59).getTime())).toBe('2025-12-31');
    expect(studyDay(new Date(2026, 0, 1, 4).getTime())).toBe('2026-01-01');
    expect(dayOffset('2024-03-01', -1)).toBe('2024-02-29');
  });
  it('preserves yesterday’s streak until the current study day finishes', () => {
    const days = { '2026-10-26': { ...emptyLog(), new: 1 }, '2026-10-25': { ...emptyLog(), review: 1 } };
    expect(streak(days, '2026-10-27')).toBe(2);
    expect(streak(days, '2026-10-28')).toBe(0);
  });
});
