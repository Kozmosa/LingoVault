import { describe, expect, it } from 'vitest';
import { createCetStore, parseCetStore, readCetStore, writeCetStore } from './cetStore';
import { emptyProgress, logStudy, emptyLog } from './srs';

describe('CET progress and backups', () => {
  it('round trips progress and settings independently from Vault', () => {
    const data = createCetStore();
    data.words.a = { ...emptyProgress(), starred: true };
    data.days['2026-10-27'] = logStudy(emptyLog(), 'a', true, 3);
    const entries = new Map([['lingovault_data', 'original']]);
    writeCetStore(data, { setItem: (key, value) => { entries.set(key, value); } });
    expect(readCetStore({ getItem: key => entries.get(key) ?? null })).toEqual(data);
    expect(entries.get('lingovault_data')).toBe('original');
    const { session, ...backup } = data;
    expect(parseCetStore(JSON.stringify(backup))).toEqual(data);
  });
  it.each([
    { version: 2 },
    { words: [] },
  ])('rejects malformed or unsupported backups: %j', change => {
    expect(() => parseCetStore(JSON.stringify({ ...createCetStore(), ...change }))).toThrow();
  });
  it('starts with defaults when saved progress is missing or unreadable', () => {
    expect(readCetStore({ getItem: () => null })).toEqual(createCetStore());
    expect(readCetStore({ getItem: () => '{' })).toEqual(createCetStore());
    expect(readCetStore({ getItem: () => { throw new Error('unavailable'); } })).toEqual(createCetStore());
  });
});
