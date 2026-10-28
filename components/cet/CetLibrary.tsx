import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Search, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { inNotebook } from '../../utils/srs';
import { useCet } from './CetContext';
import { CetWordDetail, CetWordHeading } from './CetWordDetail';
import { CetDialog, input, muted, PageTitle, panel, primary, secondary } from './ui';

const PAGE_SIZE = 40;
export function CetLibrary({ notebook = false }: { notebook?: boolean }) {
  const { t } = useTranslation();
  const { data, store, startStudy, markWord, toggleStar } = useCet();
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('all');
  const [status, setStatus] = useState('all');
  const [initial, setInitial] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const filtered = useMemo(() => data.words.filter(word => {
    const state = store.words[word.id];
    const term = search.trim().toLocaleLowerCase();
    return (!notebook || inNotebook(state))
      && (level === 'all' || String(word.level) === level)
      && (initial === 'all' || word.word.toLowerCase().startsWith(initial))
      && (!term || [word.word, word.meaning, ...(word.alts ?? [])].some(value => value.toLocaleLowerCase().includes(term)))
      && (status === 'all' || (status === 'unlearned' && !state?.reps) || (status === 'learning' && state?.reps > 0 && !state.mastered) || (status === 'mastered' && state?.mastered) || (status === 'notebook' && inNotebook(state)));
  }), [data.words, store.words, search, level, initial, status, notebook]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const selected = data.words.find(word => word.id === selectedId);
  const notebookCount = data.words.filter(word => inNotebook(store.words[word.id])).length;
  return <div className="space-y-6">
    <PageTitle title={t(notebook ? 'cet.notebook' : 'cet.library')} hint={notebook ? t('cet.notebookHint') : undefined}>{notebook && <button className={primary} onClick={() => startStudy('notebook')} disabled={!notebookCount}>{t('cet.startNotebook')}</button>}</PageTitle>
    <section className={`${panel} space-y-4`}><label className="relative block"><Search size={18} className="absolute left-3 top-3 text-slate-400" /><input className={`${input} pl-10`} aria-label={t('cet.search')} placeholder={t('cet.search')} value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></label>
      <div className="grid gap-3 sm:grid-cols-3"><label className={muted}>{t('cet.level')}<select aria-label={t('cet.level')} className={`${input} mt-1`} value={level} onChange={e => { setLevel(e.target.value); setPage(1); }}><option value="all">{t('cet.all')}</option><option value="4">{t('cet.level4')}</option><option value="6">{t('cet.level6')}</option></select></label><label className={muted}>{t('cet.status')}<select aria-label={t('cet.status')} className={`${input} mt-1`} value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>{['all', 'unlearned', 'learning', 'mastered', 'notebook'].map(value => <option key={value} value={value}>{t(`cet.${value}`)}</option>)}</select></label><label className={muted}>{t('cet.initial')}<select aria-label={t('cet.initial')} className={`${input} mt-1`} value={initial} onChange={e => { setInitial(e.target.value); setPage(1); }}><option value="all">{t('cet.all')}</option>{'abcdefghijklmnopqrstuvwxyz'.split('').map(letter => <option key={letter} value={letter}>{letter.toUpperCase()}</option>)}</select></label></div>
    </section>
    <p className={muted} aria-live="polite">{t('cet.count', { count: filtered.length })}</p>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      {filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map(word => {
        const state = store.words[word.id];
        return <div key={word.id} data-testid="library-row" className="flex items-center gap-3 border-b border-slate-100 px-4 last:border-b-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"><button className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3 py-4 text-left" onClick={() => setSelectedId(word.id)}><div className="min-w-0"><span className="break-words text-lg font-semibold">{word.word}</span>{word.homograph && <sup className="ml-1 text-slate-400">{word.homograph}</sup>}<p className={`${muted} mt-1 line-clamp-1`}>{word.meaning || t('cet.noMeaning')}</p></div><div className="flex flex-wrap gap-2 text-xs"><span className={word.level === 4 ? 'text-brand-600 dark:text-brand-400' : 'text-violet-500'}>{t(`cet.level${word.level}`)}</span><span className="text-slate-400">{t(`cet.${state?.mastered ? 'mastered' : state?.reps ? 'learning' : 'unlearned'}`)}</span>{notebook && !!state?.lapses && <span className="text-amber-600">{t('cet.lapses', { count: state.lapses })}</span>}</div></button><button className="rounded-lg p-2 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950" onClick={() => toggleStar(word.id)} aria-label={`${t(state?.starred ? 'cet.unstar' : 'cet.star')} ${word.word}`} aria-pressed={!!state?.starred}><Star size={18} fill={state?.starred ? 'currentColor' : 'none'} /></button></div>;
      })}
      {!filtered.length && <div className="px-6 py-16 text-center"><p className="font-semibold">{t(notebook && !notebookCount ? 'cet.emptyNotebook' : 'cet.noResults')}</p>{notebook && !notebookCount && <p className={`${muted} mt-2`}>{t('cet.emptyNotebookHint')}</p>}</div>}
    </section>
    <nav className="flex items-center justify-between gap-2" aria-label={t('cet.library')}><button className={secondary} disabled={currentPage <= 1} onClick={() => { setPage(currentPage - 1); window.scrollTo({ top: 0 }); }} aria-label={t('cet.previous')}><ChevronLeft size={18} /></button><span className={muted}>{t('cet.pagination', { page: currentPage, pages })}</span><button className={secondary} disabled={currentPage >= pages} onClick={() => { setPage(currentPage + 1); window.scrollTo({ top: 0 }); }} aria-label={t('cet.nextPage')}><ChevronRight size={18} /></button></nav>
    {selected && <CetDialog title={t('cet.details')} onClose={() => setSelectedId(null)}><div className="space-y-8"><CetWordHeading word={selected} /><CetWordDetail word={selected} /><div className="flex flex-wrap gap-3"><button className={primary} onClick={() => markWord(selected.id, true)} disabled={store.words[selected.id]?.mastered}>{t('cet.markMastered')}</button><button className={secondary} onClick={() => { if (window.confirm(t('cet.resetConfirm'))) markWord(selected.id, false); }}>{t('cet.resetWord')}</button></div></div></CetDialog>}
  </div>;
}
