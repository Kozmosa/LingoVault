import React from 'react';
import { useTranslation } from 'react-i18next';
import { dayOffset, emptyLog, studyDay } from '../../utils/srs';
import { useCet } from './CetContext';
import { muted, PageTitle, panel } from './ui';

export function CetStats() {
  const { t } = useTranslation();
  const { store, data, now } = useCet();
  const today = studyDay(now);
  const logs = Object.values(store.days);
  const chart = Array.from({ length: 30 }, (_, index) => { const date = dayOffset(today, index - 29); return { date, ...(store.days[date] ?? emptyLog()) }; });
  const max = Math.max(2, ...chart.map(log => log.new + log.review));
  const stages = Array.from({ length: 8 }, (_, stage) => data.words.filter(word => store.words[word.id]?.reps > 0 && store.words[word.id].stage === stage).length);
  const maxStage = Math.max(1, ...stages);
  return <div className="space-y-6"><PageTitle title={t('cet.stats')} /><div className="grid gap-5 sm:grid-cols-2"><div className={panel}><p className={muted}>{t('cet.studyDays')}</p><p className="mt-2 text-3xl font-bold">{logs.filter(log => log.new + log.review > 0).length} <span className="text-sm font-normal text-slate-400">{t('cet.daysUnit')}</span></p></div><div className={panel}><p className={muted}>{t('cet.studyTime')}</p><p className="mt-2 text-3xl font-bold">{t('cet.minutes', { count: Math.round(logs.reduce((sum, log) => sum + log.seconds, 0) / 60) })}</p></div></div>
    <section className={`${panel} space-y-5`}><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">{t('cet.last30')}</h3><div className="flex gap-4 text-xs"><span className="text-brand-500">● {t('cet.new')}</span><span className="text-violet-500">● {t('cet.review')}</span></div></div><svg viewBox="0 0 720 260" className="w-full" role="img" aria-label={t('cet.chartLabel')}>
      {[0, 0.5, 1].map(fraction => <g key={fraction}><line x1="35" y1={220 - fraction * 190} x2="715" y2={220 - fraction * 190} stroke="currentColor" className="text-slate-100 dark:text-slate-800" /><text x="28" y={224 - fraction * 190} textAnchor="end" fontSize="11" fill="currentColor" className="text-slate-400">{Math.round(max * fraction)}</text></g>)}
      {chart.map((log, i) => { const x = 40 + i * 22.4; const fresh = log.new / max * 190; const review = log.review / max * 190; return <g key={log.date}><title>{t('cet.heatLabel', { date: log.date, new: log.new, review: log.review })}</title><rect x={x} y={220 - fresh} width="14" height={fresh} rx="2" fill="currentColor" className="text-brand-500" /><rect x={x} y={220 - fresh - review} width="14" height={review} rx="2" fill="currentColor" className="text-violet-500" />{(i % 5 === 0 || i === 29) && <text x={x + 7} y="246" textAnchor="middle" fontSize="11" fill="currentColor" className="text-slate-400">{log.date.slice(5)}</text>}</g>; })}
    </svg>{!chart.some(log => log.new + log.review) && <p className={muted}>{t('cet.noStats')}</p>}</section>
    <section className={`${panel} space-y-4`}><h3 className="font-semibold">{t('cet.stageDistribution')}</h3>{stages.map((count, stage) => <div key={stage} className="flex items-center gap-4 text-sm"><span className="w-20 shrink-0">{t('cet.stage', { stage })}</span><div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className={`h-full rounded-full ${stage >= 6 ? 'bg-emerald-500' : 'bg-brand-500'}`} style={{ width: `${count / maxStage * 100}%` }} /></div><span className="w-12 text-right tabular-nums text-slate-500">{count}</span></div>)}</section>
  </div>;
}
