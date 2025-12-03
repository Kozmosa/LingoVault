import React, { RefObject, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Plus, Sparkles, X } from 'lucide-react';

interface AddWordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  english: string;
  chinese: string;
  example: string;
  onEnglishChange: (value: string) => void;
  onChineseChange: (value: string) => void;
  onExampleChange: (value: string) => void;
  onAiFill: () => void;
  isAiLoading: boolean;
  englishInputRef: RefObject<HTMLInputElement>;
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
}

const ANIMATION_DURATION = 360;

export const AddWordModal: React.FC<AddWordModalProps> = ({
  isOpen,
  onClose,
  onSave,
  english,
  chinese,
  example,
  onEnglishChange,
  onChineseChange,
  onExampleChange,
  onAiFill,
  isAiLoading,
  englishInputRef,
  onKeyDown
}) => {
  const { t } = useTranslation();
  const [isMounted, setIsMounted] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(isOpen);
  const enterFrameRef = useRef<number>();
  const enterDelayRef = useRef<number>();

  useEffect(() => {
    let exitTimer: number | undefined;

    if (isOpen) {
      setIsMounted(true);
      enterFrameRef.current = window.requestAnimationFrame(() => {
        enterDelayRef.current = window.requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });
    } else {
      setIsVisible(false);
      exitTimer = window.setTimeout(() => setIsMounted(false), ANIMATION_DURATION);
    }

    return () => {
      if (exitTimer) {
        window.clearTimeout(exitTimer);
      }
      if (enterFrameRef.current) {
        window.cancelAnimationFrame(enterFrameRef.current);
        enterFrameRef.current = undefined;
      }
      if (enterDelayRef.current) {
        window.cancelAnimationFrame(enterDelayRef.current);
        enterDelayRef.current = undefined;
      }
    }
  }, [isOpen]);

  if (!isMounted) return null;

  return (
    <div
      className={`fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm py-6 px-4 transition-opacity duration-[360ms] modal-ease ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`w-full max-w-2xl overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-2xl transition-all duration-[360ms] modal-ease dark:border-slate-800 dark:bg-slate-900 ${isVisible ? 'scale-100 opacity-100 translate-y-0' : 'scale-[0.96] opacity-0 translate-y-4'}`}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center justify-between border-b border-brand-50 bg-brand-50/60 px-6 py-4 dark:border-slate-800 dark:bg-brand-900/10">
          <h2 className="text-lg font-semibold text-brand-900 dark:text-brand-100 flex items-center gap-2">
            <Plus size={18} /> {t('newEntry')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label={t('cancel')}
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-6 px-6 py-6">
          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {t('englishLabel')}
              </label>
              <input
                ref={englishInputRef}
                type="text"
                value={english}
                onChange={(event) => onEnglishChange(event.target.value)}
                placeholder={t('englishPlaceholder')}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 transition-all focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
            <button
              type="button"
              onClick={onAiFill}
              disabled={!english || isAiLoading}
              className="flex items-center justify-center gap-2 rounded-lg border border-purple-100 bg-purple-50 px-4 py-2 text-purple-600 transition-colors hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-purple-900 dark:bg-purple-900/20 dark:text-purple-300 dark:hover:bg-purple-900/40"
            >
              {isAiLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              <span className="text-sm font-medium">{t('aiFill')}</span>
            </button>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {t('meaningLabel')}
            </label>
            <input
              type="text"
              value={chinese}
              onChange={(event) => onChineseChange(event.target.value)}
              placeholder={t('meaningPlaceholder')}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 transition-all focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {t('exampleLabel')}
            </label>
            <input
              type="text"
              value={example}
              onChange={(event) => onExampleChange(event.target.value)}
              placeholder={t('examplePlaceholder')}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-900 transition-all focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-slate-100 bg-slate-50 px-6 py-4 text-center text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <span>{t('proTip')}</span>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={!english.trim()}
              className="flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white shadow-brand-500/20 transition-all hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={16} />
              {t('saveBtn')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
