import React from 'react';
import { ArrowRight, Flame } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { buildQueue, dayOffset, emptyLog, inBook, streak, studyDay } from '../../utils/srs';
import { useCet } from './CetContext';
import { BookSelect, muted, panel, primary } from './ui';

function TaskRing({ label, done, target, color }: { label: string; done: number; target: number; color: string }) {
  const fraction = target ? Math.min(done / target, 1) : 1;
  return <div className="flex items-center gap-4"><div className="relative h-24 w-24 shrink-0"><svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" role="img" aria-label={`${label} ${done}/${target}`}><circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6" className="text-slate-100 dark:text-slate-800" /><circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${fraction * 264} 264`} className={color} /></svg><div className="absolute inset-0 flex items-center justify-center text-2xl font-bold tabular-nums">{done}</div></div><div><p className="font-semibold">{label}</p><p className={muted}>{done} / {target}</p></div></div>;
}
export function CetToday() {
  const { t } = useTranslation();
  const { data, store, now, saveSettings, startStudy } = useCet();
  const day = studyDay(now);
  const log = store.days[day] ?? emptyLog();
  const selected = data.words.filter(word => inBook(word, store.settings.book));
  const ids = new Set(selected.map(word => word.id));
  const doneNew = log.newIds.filter(id => ids.has(id)).length;
  const doneReview = log.reviewIds.filter(id => ids.has(id)).length;
  const resumable = store.session?.day === day && store.session.mode === 'daily' && store.session.book === store.settings.book && store.session.queue.length > 0 && store.session.queue.every(entry => ids.has(entry.id));
  const queue = resumable ? store.session.queue.slice(Number(!!store.session.feedback)).filter(entry => !entry.repeat) : buildQueue(data.words, store.words, store.settings, log, now);
  const learned = selected.filter(word => store.words[word.id]?.reps).length;
  const mastered = selected.filter(word => store.words[word.id]?.mastered).length;
  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-5"><div><h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('cet.greeting')}</h2><p className={`${muted} mt-2`}>{t('cet.todayHint')}</p></div><BookSelect value={store.settings.book} onChange={book => saveSettings({ ...store.settings, book })} /></header>
    <section className={`${panel} grid gap-7 sm:grid-cols-2`}>
      <TaskRing label={t('cet.new')} done={doneNew} target={doneNew + queue.filter(entry => entry.kind === 'new').length} color="text-brand-500" />
      <TaskRing label={t('cet.review')} done={doneReview} target={doneReview + queue.filter(entry => entry.kind === 'review').length} color="text-violet-500" />
      <button className={`${primary} w-full !py-4 sm:col-span-2`} onClick={() => startStudy()}>{t(resumable ? 'cet.resume' : 'cet.start')}<ArrowRight size={20} /></button>
      <p className={`${muted} sm:col-span-2`}>{t('cet.goalNote')}</p>
    </section>
    <div className="grid gap-5 sm:grid-cols-3">{[['learned', learned], ['mastered', mastered], ['total', selected.length]].map(([label, value]) => <div key={label} className={panel}><p className={muted}>{t(`cet.${label}`)}</p><p className="mt-2 text-3xl font-bold tabular-nums">{value}</p></div>)}</div>
    <section className={`${panel} space-y-5`}><h3 className="font-semibold">{t('cet.bookProgress')}</h3>{([4, 6] as const).map(level => {
      const words = data.words.filter(word => word.level === level);
      const count = words.filter(word => store.words[word.id]?.reps).length;
      const masteredCount = words.filter(word => store.words[word.id]?.mastered).length;
      return <div key={level}><div className="mb-2 flex flex-wrap justify-between gap-2 text-sm"><span>{t(`cet.level${level}`)}</span><span className={muted}>{t('cet.progressLabel', { learned: count, mastered: masteredCount, total: words.length })}</span></div><div className="flex h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className={level === 4 ? 'bg-brand-600' : 'bg-violet-600'} style={{ width: `${words.length ? masteredCount / words.length * 100 : 0}%` }} /><div className={level === 4 ? 'bg-brand-500/40' : 'bg-violet-500/40'} style={{ width: `${words.length ? (count - masteredCount) / words.length * 100 : 0}%` }} /></div></div>;
    })}</section>
    <section className={`${panel} space-y-5`}><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">{t('cet.heatmap')}</h3><p className="flex items-center gap-2 text-sm"><Flame size={18} className="text-amber-500" />{t('cet.streak')} <strong>{streak(store.days, day)}</strong> {t('cet.daysUnit')}</p></div><div className="grid grid-flow-col grid-rows-7 gap-1.5">{Array.from({ length: 84 }, (_, index) => {
      const date = dayOffset(day, index - 83);
      const item = store.days[date] ?? emptyLog();
      const count = item.new + item.review;
      const label = t('cet.heatLabel', { date, new: item.new, review: item.review });
      return <div key={date} role="img" aria-label={label} title={label} className={`h-4 rounded-sm ${count === 0 ? 'bg-slate-100 dark:bg-slate-800' : count < 10 ? 'bg-brand-100 dark:bg-brand-900' : count < 30 ? 'bg-brand-500/50' : count < 60 ? 'bg-brand-500' : 'bg-brand-700'}`} />;
    })}</div><div className="flex items-center justify-between text-xs text-slate-400"><span>{dayOffset(day, -83)} — {day}</span><span>{t('cet.less')} ░ ▒ ▓ {t('cet.more')}</span></div></section>
  </div>;
}
