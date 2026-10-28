import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { loadCetData, type CetDataset } from '../../services/cetData';
import type { CetPage, CetSettings, Feedback } from '../../types/cet';
import { answerSession, buildQueue, DAY, emptyLog, emptyProgress, inNotebook, logStudy, nextInSession, reconsiderSession, reviewWord, studyDay } from '../../utils/srs';
import { CetContext } from './CetContext';
import { useCetStore } from './useCetStore';
import { CetStudy } from './CetStudy';
import { CetToday } from './CetToday';
import { CetLibrary } from './CetLibrary';
import { CetQuiz } from './CetQuiz';
import { CetStats } from './CetStats';
import { CetSettingsPage } from './CetSettings';
import { muted, panel, primary } from './ui';

export function CetModule({ page, navigate, openAppearance, paused = false }: {
  page: CetPage; navigate: (page: CetPage) => void; openAppearance: () => void; paused?: boolean;
}) {
  const { t } = useTranslation();
  const [data, setData] = useState<CetDataset | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const { store, update } = useCetStore();
  const [now, setNow] = useState(Date.now);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [page]);
  useEffect(() => {
    let cancelled = false;
    setLoadError(false);
    loadCetData().then(result => { if (!cancelled) setData(result); }).catch(() => { if (!cancelled) setLoadError(true); });
    return () => { cancelled = true; };
  }, [attempt]);
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const interval = window.setInterval(refresh, 15000);
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(interval); window.removeEventListener('focus', refresh); };
  }, []);

  const startStudy = useCallback((mode: 'daily' | 'notebook' = 'daily') => {
    const currentTime = Date.now();
    const day = studyDay(currentTime);
    const ids = new Set(data.words.map(word => word.id));
    update(previous => {
      const old = previous.session;
      const book = mode === 'daily' ? previous.settings.book : 'all';
      if (old?.queue.length && old.day === day && old.book === book && old.mode === mode && old.queue.every(entry => ids.has(entry.id))) return previous;
      const queue = mode === 'daily'
        ? buildQueue(data.words, previous.words, previous.settings, previous.days[day] ?? emptyLog(), currentTime)
        : data.words.filter(word => inNotebook(previous.words[word.id])).sort((a, b) => (previous.words[b.id]?.lapses ?? 0) - (previous.words[a.id]?.lapses ?? 0)).map(word => ({ id: word.id, kind: previous.words[word.id]?.reps ? 'review' as const : 'new' as const, repeat: false, fuzzyRepeated: false, mustRecall: false }));
      return { ...previous, session: { day, book, mode, queue, completed: 0, total: queue.length, feedback: null } };
    });
    setNow(currentTime);
    navigate('cetStudy');
  }, [data, update, navigate]);
  const answer = useCallback((feedback: Feedback) => {
    const currentTime = Date.now();
    const day = studyDay(currentTime);
    update(previous => {
      const session = previous.session;
      const entry = session?.queue[0];
      if (!entry || session.feedback || session.day !== day) return previous;
      const old = previous.words[entry.id];
      return { ...previous,
        words: { ...previous.words, [entry.id]: reviewWord(old, feedback, currentTime) },
        days: { ...previous.days, [day]: logStudy(previous.days[day] ?? emptyLog(), entry.id, !old?.reps) },
        session: { ...answerSession(session, feedback), before: old ?? null },
      };
    });
    setNow(currentTime);
  }, [update]);
  const reconsider = useCallback(() => {
    const currentTime = Date.now();
    update(previous => {
      const session = previous.session;
      const entry = session?.queue[0];
      if (!entry || session.feedback !== 'known') return previous;
      return { ...previous,
        words: { ...previous.words, [entry.id]: reviewWord(session.before ?? undefined, 'fuzzy', currentTime) },
        session: { ...reconsiderSession(session), before: undefined },
      };
    });
    setNow(currentTime);
  }, [update]);
  const next = useCallback(() => {
    update(previous => previous.session ? { ...previous, session: nextInSession(previous.session) } : previous);
    setNow(Date.now());
  }, [update]);
  const toggleStar = useCallback((id: string) => {
    update(previous => {
      const state = previous.words[id] ?? emptyProgress();
      return { ...previous, words: { ...previous.words, [id]: { ...state, starred: !state.starred } } };
    });
  }, [update]);
  const markWord = useCallback((id: string, mastered: boolean) => {
    const currentTime = Date.now();
    update(previous => {
      const state = previous.words[id] ?? emptyProgress();
      const nextState = mastered ? { ...state, stage: 6, mastered: true, reps: Math.max(1, state.reps), due: currentTime + 30 * DAY, firstSeen: state.reps ? state.firstSeen : currentTime, lastSeen: currentTime } : { ...emptyProgress(), starred: state.starred };
      return { ...previous, words: { ...previous.words, [id]: nextState }, session: null };
    });
  }, [update]);
  const saveSettings = useCallback((settings: CetSettings) => update(previous => ({ ...previous, settings, session: settings.book !== previous.settings.book ? null : previous.session })), [update]);
  const quizAnswer = useCallback((id: string, correct: boolean) => {
    const currentTime = Date.now();
    const day = studyDay(currentTime);
    update(previous => {
      const old = previous.words[id];
      return { ...previous,
        words: correct ? previous.words : { ...previous.words, [id]: { ...reviewWord(old, 'unknown', currentTime), starred: true } },
        days: { ...previous.days, [day]: logStudy(previous.days[day] ?? emptyLog(), id, !old?.reps) },
      };
    });
  }, [update]);

  if (!data) return <section className={`${panel} flex min-h-[50vh] flex-col items-center justify-center gap-5 text-center`}>
    {loadError ? <><p>{t('cet.loadError')}</p><button className={primary} onClick={() => setAttempt(value => value + 1)}><RefreshCcw size={18} />{t('cet.retry')}</button></> : <><Loader2 size={30} className="animate-spin text-brand-500" /><p className={muted}>{t('cet.loading')}</p></>}
  </section>;
  return <CetContext.Provider value={{ data, store, now, paused, update, navigate, startStudy, answer, reconsider, next, toggleStar, markWord, saveSettings, quizAnswer, openAppearance }}>
    <div className="space-y-6 text-slate-900 dark:text-slate-100">
      <div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400">{t('cet.brand')}</span>{data.sample && <span title={t('cet.sampleHint')} className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-200">{t('cet.sample')}</span>}</div>
      {page === 'cetToday' && <CetToday />}
      {page === 'cetStudy' && <CetStudy />}
      {page === 'cetQuiz' && <CetQuiz />}
      {(page === 'cetLibrary' || page === 'cetNotebook') && <CetLibrary key={page} notebook={page === 'cetNotebook'} />}
      {page === 'cetStats' && <CetStats />}
      {page === 'cetSettings' && <CetSettingsPage />}
    </div>
  </CetContext.Provider>;
}
