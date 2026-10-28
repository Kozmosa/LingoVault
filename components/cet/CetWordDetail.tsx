import React from 'react';
import { Star, Volume2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CetWord } from '../../types/cet';
import { speakCetWord } from '../../utils/cetSpeech';
import { useCet } from './CetContext';
import { muted, secondary } from './ui';

export function CetWordHeading({ word, large = false }: { word: CetWord; large?: boolean }) {
  const { t } = useTranslation();
  const { store, toggleStar } = useCet();
  const starred = !!store.words[word.id]?.starred;
  return <div className="space-y-4 text-center">
    <h3 data-testid="study-word" className={`break-words font-bold tracking-tight ${large ? 'text-4xl sm:text-6xl' : 'text-3xl'}`}>{word.word}</h3>
    <div className="flex flex-wrap items-center justify-center gap-3"><span className={muted}>{word.phonetic ? `/${word.phonetic}/` : ''}</span><button onClick={() => speakCetWord(word.word, store.settings.accent)} className={secondary} aria-label={t('cet.pronounce')} title={`${t('cet.pronounce')} (P)`}><Volume2 size={18} /></button><button onClick={() => toggleStar(word.id)} className={`${secondary} ${starred ? '!text-amber-500' : ''}`} aria-label={t(starred ? 'cet.unstar' : 'cet.star')} aria-pressed={starred} title="S"><Star size={18} fill={starred ? 'currentColor' : 'none'} /></button></div>
    {word.homograph && <p className={muted}>{t('cet.homograph', { number: word.homograph })}</p>}
  </div>;
}
export function CetWordDetail({ word }: { word: CetWord }) {
  const { t } = useTranslation();
  return <div className="space-y-5 text-left" data-testid="word-details">
    <div className="flex flex-wrap gap-2"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${word.level === 4 ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200' : 'bg-violet-50 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200'}`}>{t(`cet.level${word.level}`)}</span></div>
    {word.senses?.length ? <dl className="space-y-3">{word.senses.map((sense, index) => <div key={`${sense.pos}-${index}`} className="flex gap-3"><dt className="min-w-10 font-medium text-brand-600 dark:text-brand-400">{sense.pos}</dt><dd className="leading-relaxed text-slate-600 dark:text-slate-300">{sense.text}</dd></div>)}</dl> : <p className="text-xl font-semibold leading-relaxed">{word.meaning || t('cet.noMeaning')}</p>}
    {!!word.alts?.length && <div><h4 className={muted}>{t('cet.alternatives')}</h4><p className="mt-1">{word.alts.join(' / ')}</p></div>}
    {!!word.exchange?.length && <div><h4 className={muted}>{t('cet.exchange')}</h4><div className="mt-2 flex flex-wrap gap-2">{word.exchange.map((form, index) => <span key={index} className="rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800"><span className="text-slate-400">{form.label}</span> {form.form}</span>)}</div></div>}
  </div>;
}
