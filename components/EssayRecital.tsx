import React, { useMemo } from 'react';
import { ArrowLeft, AlignLeft, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EssayRecord } from '../types';

interface EssayRecitalProps {
  essay: EssayRecord;
  onBack: () => void;
  onRecite: (essayId: string) => void;
  onRead: (essayId: string) => void;
}

const formatLogDate = (timestamps: number[], locale: string): string => {
  if (!timestamps || timestamps.length === 0) {
    return '';
  }
  const latest = timestamps[timestamps.length - 1];
  try {
    return new Date(latest).toLocaleDateString(locale.startsWith('zh') ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    console.warn('Failed to format timestamp', error);
    return '';
  }
};

export const EssayRecital: React.FC<EssayRecitalProps> = ({ essay, onBack, onRecite, onRead }) => {
  const { t, i18n } = useTranslation();

  const lastRecite = useMemo(() => formatLogDate(essay.reciteLog, i18n.language), [essay.reciteLog, i18n.language]);
  const lastRead = useMemo(() => formatLogDate(essay.readLog, i18n.language), [essay.readLog, i18n.language]);

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-brand-900/40 dark:hover:bg-brand-900/20"
        >
          <ArrowLeft size={16} />
          {t('essayRecitalBack')}
        </button>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-500">
            {t('essayRecitalEyebrow')}
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-50">
            {t('essayRecitalTitle')}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t('essayRecitalSubtitle')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">
            ✍️ {t('essayRecitalProgress', { count: essay.reciteLog.length })}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">
            📖 {t('essayRecitalReads', { count: essay.readLog.length })}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">
            {t('essayRecitalLastRecite', { value: lastRecite || t('essayLogNever') })}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">
            {t('essayRecitalLastRead', { value: lastRead || t('essayLogNever') })}
          </span>
        </div>
      </header>

      <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          <Sparkles size={16} />
          {t('essayTitleLabel')}
        </div>
        <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-slate-100">
          {essay.title?.trim() || t('essayUntitled')}
        </p>
      </article>

      <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          <AlignLeft size={16} />
          {t('essayContentLabel')}
        </div>
        <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-slate-700 dark:text-slate-200">
          {essay.content}
        </p>
      </article>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => onRecite(essay.id)}
          className="flex-1 rounded-2xl bg-brand-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-brand-600/40 transition hover:bg-brand-700"
        >
          ✍️ {t('essayButtonRecite')}
        </button>
        <button
          type="button"
          onClick={() => onRead(essay.id)}
          className="flex-1 rounded-2xl border border-slate-300 bg-white px-6 py-3 text-base font-semibold text-slate-700 shadow-sm transition hover:border-brand-200 hover:bg-brand-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-brand-800/40 dark:hover:bg-slate-900/60"
        >
          📖 {t('essayButtonRead')}
        </button>
      </div>
    </section>
  );
};
