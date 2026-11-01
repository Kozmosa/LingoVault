import type { CetBook, CetDailyLog, CetProgress, CetQueueEntry, CetSession, CetSettings, CetWord, Feedback } from '../types/cet';

export const DAY = 86_400_000;
export const INTERVALS = [0, 1, 2, 4, 7, 15, 30, 60] as const;
export const emptyProgress = (): CetProgress => ({ stage: 0, due: 0, reps: 0, lapses: 0, firstSeen: 0, lastSeen: 0, starred: false, mastered: false });
export const emptyLog = (): CetDailyLog => ({ new: 0, review: 0, seconds: 0, newIds: [], reviewIds: [] });
export const inBook = (word: CetWord, book: CetBook) => book === 'all' || String(word.level) === book;
export const inNotebook = (progress?: CetProgress) => !!progress && (progress.starred || progress.lapses >= 2);

/** Local calendar arithmetic keeps the 04:00 boundary correct across DST. */
export function studyDay(now: number): string {
  const date = new Date(now);
  if (date.getHours() < 4) date.setDate(date.getDate() - 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function dayOffset(day: string, offset: number): string {
  const [year, month, date] = day.split('-').map(Number);
  return studyDay(new Date(year, month - 1, date + offset, 12).getTime());
}
export function streak(days: Record<string, CetDailyLog>, today: string): number {
  const active = (day: string) => (days[day]?.new ?? 0) + (days[day]?.review ?? 0) > 0;
  let day = active(today) ? today : dayOffset(today, -1);
  let count = 0;
  while (active(day)) { count++; day = dayOffset(day, -1); }
  return count;
}

export function reviewWord(previous: CetProgress | undefined, feedback: Feedback, now: number): CetProgress {
  const state = previous ?? emptyProgress();
  const first = state.reps === 0;
  const stage = feedback === 'known' ? (first ? 3 : Math.min(7, state.stage + 1))
    : feedback === 'fuzzy' ? Math.max(1, state.stage) : 0;
  // Spec's max(...) is interpreted as a one-day minimum, then half the old interval.
  const delay = feedback === 'fuzzy' ? Math.max(1, INTERVALS[state.stage] / 2) : INTERVALS[stage];
  return {
    ...state, stage, due: now + delay * DAY, reps: state.reps + 1,
    lapses: state.lapses + Number(feedback === 'unknown'),
    firstSeen: first ? now : state.firstSeen, lastSeen: now, mastered: stage >= 6,
  };
}

export function buildQueue(words: CetWord[], progress: Record<string, CetProgress>, settings: CetSettings, log: CetDailyLog, now: number): CetQueueEntry[] {
  // Sample IDs must not consume the official dataset's quota after it becomes available.
  const datasetIds = new Set(words.map(word => word.id));
  const newIds = log.newIds.filter(id => datasetIds.has(id));
  const reviewIds = log.reviewIds.filter(id => datasetIds.has(id));
  log = { ...log, newIds, reviewIds, new: newIds.length, review: reviewIds.length };
  const eligible = words.filter(word => inBook(word, settings.book));
  const reviews = eligible.filter(word => {
    const state = progress[word.id];
    return state?.reps > 0 && state.due <= now && !log.reviewIds.includes(word.id) && !log.newIds.includes(word.id);
  }).sort((a, b) => progress[a.id].lastSeen - progress[b.id].lastSeen || progress[a.id].due - progress[b.id].due)
    .slice(0, Math.max(0, settings.dailyReview - log.review));
  const fresh = eligible.filter(word => !progress[word.id]?.reps && !log.newIds.includes(word.id))
    .slice(0, Math.max(0, settings.dailyNew - log.new));
  const queue: CetQueueEntry[] = [];
  const add = (word: CetWord, kind: 'new' | 'review') => queue.push({ id: word.id, kind, repeat: false, fuzzyRepeated: false, mustRecall: false });
  let r = 0;
  let n = 0;
  while (r < reviews.length || n < fresh.length) {
    for (let i = 0; i < 3 && r < reviews.length; i++) add(reviews[r++], 'review');
    if (n < fresh.length) add(fresh[n++], 'new');
  }
  return queue;
}

/** Keep the answered head until Next, so reloads also restore the revealed card. */
export function answerSession(session: CetSession, feedback: Feedback): CetSession {
  if (!session.queue.length || session.feedback) return session;
  const current = session.queue[0];
  const repeat = feedback === 'unknown' || (feedback === 'fuzzy' && (!current.fuzzyRepeated || current.mustRecall));
  const queue = repeat ? [...session.queue, { ...current, repeat: true, fuzzyRepeated: current.fuzzyRepeated || feedback === 'fuzzy', mustRecall: current.mustRecall || feedback === 'unknown' }] : session.queue;
  return { ...session, queue, feedback, total: session.total + Number(repeat), completed: session.completed + 1 };
}
/** Turn an answered "known" card into "fuzzy" (not sure) and requeue it once. */
export function reconsiderSession(session: CetSession): CetSession {
  if (session.feedback !== 'known') return session;
  return answerSession({ ...session, feedback: null, completed: session.completed - 1 }, 'fuzzy');
}
export function nextInSession(session: CetSession): CetSession {
  return session.feedback ? { ...session, queue: session.queue.slice(1), feedback: null } : session;
}

/** Each distinct word counts at most once per study day; same-day relearning isn't a review. */
export function logStudy(log: CetDailyLog, id: string, isNew: boolean, seconds = 0): CetDailyLog {
  const seen = log.newIds.includes(id) || log.reviewIds.includes(id);
  const key = isNew ? 'new' : 'review';
  const idsKey = isNew ? 'newIds' : 'reviewIds';
  return {
    ...log, [key]: log[key] + Number(!seen),
    [idsKey]: seen ? log[idsKey] : [...log[idsKey], id],
    seconds: log.seconds + Math.max(0, seconds),
  };
}
