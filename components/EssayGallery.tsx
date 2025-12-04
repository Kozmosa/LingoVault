import React from 'react';
import { CalendarDays, BookOpenCheck, Library } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EssayRecord } from '../types';

interface EssayGalleryProps {
  essays: EssayRecord[];
  onSelect: (essay: EssayRecord) => void;
}

const formatEssayDate = (timestamp: number, locale: string): string => {
  try {
    return new Date(timestamp).toLocaleDateString(locale.startsWith('zh') ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    console.warn('Failed to format date', error);
    return '';
  }
};

export const EssayGallery: React.FC<EssayGalleryProps> = ({ essays, onSelect }) => {
  const { t, i18n } = useTranslation();

  if (essays.length === 0) {
    return (
      <section className="bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center shadow-inner">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">
          <Library size={28} />
        </div>
        <h2 className="mt-6 text-2xl font-semibold text-slate-800 dark:text-slate-100">
          {t('essayGalleryEmpty')}
        </h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
          {t('essayGalleryEmptyHint')}
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-500">
              {t('essayGalleryEyebrow')}
            </p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-50">
              {t('essayGalleryTitle')}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
              {t('essayGalleryDescription')}
            </p>
          </div>
          <span className="rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-sm font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-200">
            {t('essayGalleryCount', { count: essays.length })}
          </span>
        </div>
      </header>

      <div className="columns-1 gap-6 space-y-6 md:columns-2">
        {essays.map((essay) => (
          <article key={essay.id} className="break-inside-avoid">
            <button
              type="button"
              onClick={() => onSelect(essay)}
              className="w-full text-left"
            >
              <div className="group h-full rounded-3xl border border-slate-200 bg-white/90 p-6 text-slate-700 shadow-sm ring-1 ring-transparent transition-all hover:-translate-y-1 hover:border-brand-200 hover:bg-white hover:shadow-lg hover:ring-brand-100 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:border-brand-900/40 dark:hover:bg-slate-900">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    <CalendarDays size={16} />
                    <span>{formatEssayDate(essay.createdAt, i18n.language)}</span>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                    {t('essayGallerySource', { source: essay.source || 'AI' })}
                  </span>
                </div>
                <h3 className="mt-3 text-xl font-bold text-slate-900 dark:text-slate-100">
                  {essay.title?.trim() || t('essayUntitled')}
                </h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-h-24 overflow-hidden">
                  {essay.content}
                </p>
                <div className="mt-5 flex items-center gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">
                    <BookOpenCheck size={14} />
                    {t('essayGalleryReciteCount', { count: essay.reciteLog.length })}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                    📖 {t('essayGalleryReadCount', { count: essay.readLog.length })}
                  </span>
                </div>
              </div>
            </button>
          </article>
        ))}
      </div>
    </section>
  );
};
