import type { CetStore } from '../types/cet';

export const CET_STORAGE_KEY = 'lingovault_cet_v1';
export const createCetStore = (): CetStore => ({
  version: 1, words: {}, days: {}, session: null,
  settings: { book: '4', dailyNew: 30, dailyReview: 200, accent: 'en-US', autoSpeak: false },
});
const isObject = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);

/** Check the version and basic backup structure; session is optional in v1. */
export function parseCetStore(raw: string): CetStore {
  const data = JSON.parse(raw);
  if (data?.version !== 1 || !isObject(data.words) || !isObject(data.days) || !isObject(data.settings)
    || (data.session != null && (!isObject(data.session) || !Array.isArray(data.session.queue)))) throw new Error('Invalid CET backup');
  return { ...data, session: data.session ?? null };
}

export function readCetStore(storage: Pick<Storage, 'getItem'> = localStorage): CetStore {
  try {
    const raw = storage.getItem(CET_STORAGE_KEY);
    return raw ? parseCetStore(raw) : createCetStore();
  } catch { return createCetStore(); }
}
export function writeCetStore(data: CetStore, storage: Pick<Storage, 'setItem'> = localStorage): void {
  storage.setItem(CET_STORAGE_KEY, JSON.stringify(data));
}
