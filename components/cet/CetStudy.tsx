import React, { useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Feedback } from '../../types/cet';
import { studyDay } from '../../utils/srs';
import { speakCetWord } from '../../utils/cetSpeech';
import { useCet } from './CetContext';
import { CetWordDetail, CetWordHeading } from './CetWordDetail';
import { muted, panel, primary, secondary } from './ui';
import { useStudyTimer } from './useStudyTimer';

export function CetStudy() {
  const { t, i18n } = useTranslation();
  const { data, store, now, paused, update, startStudy, navigate, answer, reconsider, next, toggleStar } = useCet();
  const session = store.session;
  const current = session?.queue[0];
  const word = data.words.find(word => word.id === current?.id);
  const day = studyDay(now);
  const nextButton = useRef<HTMLButtonElement>(null);
  useStudyTimer(!!word && !paused, update);

  useEffect(() => {
    if (!session || session.day !== day || (current && !word)) startStudy();
  }, [session, day, current, word, startStudy]);
  useEffect(() => {
    if (word && store.settings.autoSpeak && !paused) speakCetWord(word.word, store.settings.accent);
    return () => { try { window.speechSynthesis?.cancel(); } catch { /* optional */ } };
  }, [word?.id, store.settings.autoSpeak, store.settings.accent, paused]);
  useEffect(() => {
    if (session?.feedback) nextButton.current?.focus({ preventScroll: true });
    else window.scrollTo({ top: 0 });
  }, [word?.id, session?.feedback]);
  useEffect(() => {
    if (!word || paused) return;
    const handle = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.repeat || event.ctrlKey || event.altKey || event.metaKey || target.closest('input,textarea,select,[contenteditable="true"],dialog')) return;
      const key = event.key.toLowerCase();
      const ratings: Record<string, Feedback> = { '1': 'known', arrowleft: 'known', '2': 'fuzzy', arrowdown: 'fuzzy', '3': 'unknown', arrowright: 'unknown' };
      if (ratings[key] && !session?.feedback) { event.preventDefault(); answer(ratings[key]); }
      else if ((key === '2' || key === 'arrowdown') && session?.feedback === 'known') { event.preventDefault(); reconsider(); }
      else if ((key === ' ' || key === 'enter') && session?.feedback) { event.preventDefault(); next(); }
      else if (key === 'p') { event.preventDefault(); speakCetWord(word.word, store.settings.accent); }
      else if (key === 's') { event.preventDefault(); toggleStar(word.id); }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [word, session?.feedback, paused, answer, reconsider, next, toggleStar, store.settings.accent]);

  if (!word) return <section className={`${panel} flex min-h-[55vh] flex-col items-center justify-center gap-5 text-center`}>
    <CheckCircle2 className="text-brand-500" size={48} />
    <h2 className="text-2xl font-bold">{t(session?.completed ? 'cet.sessionDone' : 'cet.noTasks')}</h2>
    <p className={`${muted} max-w-md`}>{t(session?.completed ? 'cet.sessionDoneHint' : 'cet.noTasksHint')}</p>
    <button className={primary} onClick={() => navigate('cetToday')}>{t('cet.backToday')}</button>
  </section>;
  const state = store.words[word.id];
  const revealed = !!session.feedback;
  return <section className="mx-auto max-w-3xl space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3"><button className={secondary} onClick={() => navigate('cetToday')}><ArrowLeft size={16} />{t('cet.exit')}</button><p className={muted} aria-live="polite">{t('cet.queueProgress', { completed: session.completed, total: session.total, remaining: session.queue.length - Number(revealed) })}</p></header>
    <div role="progressbar" aria-label={t('cet.study')} aria-valuenow={session.completed} aria-valuemin={0} aria-valuemax={session.total} className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${session.total ? session.completed / session.total * 100 : 0}%` }} /></div>
    <article className={`${panel} flex min-h-[340px] flex-col justify-center gap-8 !py-10 sm:!px-10`}>
      <CetWordHeading word={word} large />
      {revealed ? <div className="space-y-6"><CetWordDetail word={word} /><p className={`${muted} border-t border-slate-100 pt-4 dark:border-slate-800`}>{t('cet.saved')} · {session.feedback === 'unknown' || (session.feedback === 'fuzzy' && (!current.fuzzyRepeated || current.mustRecall)) ? t('cet.repeatHint') : t('cet.dueHint', { date: new Date(state.due).toLocaleString(i18n.language) })}</p></div> : <p className={`${muted} text-center`}>{t('cet.recallHint')}</p>}
    </article>
    {revealed ? <div className="space-y-3"><button ref={nextButton} className={`${primary} w-full`} onClick={next}>{t('cet.next')}<ArrowRight size={18} /></button>{session.feedback === 'known' && <button className={`${secondary} w-full`} onClick={reconsider}>{t('cet.unclear')}<kbd className="ml-2 text-xs text-slate-400">2</kbd></button>}</div> :<div className="grid grid-cols-3 gap-2 sm:gap-4">{(['known', 'fuzzy', 'unknown'] as const).map((rating, index) => <button key={rating} onClick={() => answer(rating)} className={`${secondary} flex-col !py-4 ${rating === 'known' ? '!border-brand-300 !text-brand-600 dark:!text-brand-300' : ''}`}><span>{t(`cet.${rating}`)}</span><kbd className="text-xs text-slate-400">{index + 1}</kbd></button>)}</div>}
    <p className="text-center text-xs leading-relaxed text-slate-400">{t('cet.shortcuts')}</p>
  </section>;
}
