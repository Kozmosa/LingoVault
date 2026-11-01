import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CetBook } from '../../types/cet';

export const panel = 'rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900';
export const primary = 'inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2';
export const secondary = 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';
export const input = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100';
export const muted = 'text-sm text-slate-500 dark:text-slate-400';

export function PageTitle({ title, hint, children }: { title: string; hint?: string; children?: React.ReactNode }) {
  return <header className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>{hint && <p className={`${muted} mt-2 max-w-2xl`}>{hint}</p>}</div>{children}</header>;
}
export function BookSelect({ value, onChange }: { value: CetBook; onChange: (book: CetBook) => void }) {
  const { t } = useTranslation();
  return <label className="block text-sm font-medium"><span className={`${muted} mb-1 block`}>{t('cet.book')}</span><select aria-label={t('cet.book')} className={input} value={value} onChange={e => onChange(e.target.value as CetBook)}>{(['4', '6', 'all'] as const).map(book => <option key={book} value={book}>{t(`cet.${book === 'all' ? 'bookAll' : `book${book}`}`)}</option>)}</select></label>;
}
export function CetDialog({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = original; ref.current?.close(); };
  }, []);
  return <dialog ref={ref} aria-label={title} onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }} className="m-0 ml-auto h-dvh max-h-dvh w-full max-w-lg overflow-y-auto border-l border-slate-200 bg-white p-6 text-slate-900 shadow-xl backdrop:bg-slate-950/50 backdrop:backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
    <header className="mb-8 flex items-center justify-between"><h2 className="text-lg font-semibold">{title}</h2><button className={secondary} onClick={onClose} aria-label={t('cet.close')}><X size={18} /></button></header>{children}
  </dialog>;
}
