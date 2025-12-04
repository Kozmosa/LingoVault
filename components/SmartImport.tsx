import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, FileText, Loader2, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AISettings, EssayRecord, SmartImportMode, SmartImportPlan, WordItem } from '../types';
import { buildEssayImportResult, generateSmartImportPlan } from '../services/aiService';
import { applySmartImportPlan, formatImportSource } from '../utils/importUtils';

const ESSAY_STORAGE_KEY = 'lingovault_essays';

interface SmartImportProps {
  aiSettings: AISettings;
  onImport: (words: WordItem[]) => number;
  onEssaySaved?: (record: EssayRecord) => void;
}

export const SmartImport: React.FC<SmartImportProps> = ({ aiSettings, onImport, onEssaySaved }) => {
  const { t } = useTranslation();
  const [rawInput, setRawInput] = useState('');
  const [mode, setMode] = useState<SmartImportMode>('words');
  const [isLoading, setIsLoading] = useState(false);
  const [plan, setPlan] = useState<SmartImportPlan | null>(null);
  const [importCount, setImportCount] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [essayResult, setEssayResult] = useState<EssayRecord | null>(null);

  useEffect(() => {
    setPlan(null);
    setImportCount(null);
    setErrorMessage(null);
    setEssayResult(null);
  }, [mode]);

  const persistEssayRecord = (record: EssayRecord) => {
    try {
      const existingRaw = localStorage.getItem(ESSAY_STORAGE_KEY);
      const existing: EssayRecord[] = existingRaw ? JSON.parse(existingRaw) : [];
      localStorage.setItem(ESSAY_STORAGE_KEY, JSON.stringify([record, ...existing]));
    } catch (storageError) {
      console.error('Failed to persist essay data', storageError);
    }
  };

  const modeOptions = useMemo(() => ([
    { value: 'words', label: `📚 ${t('smartImportModeWords')}` },
    { value: 'essay', label: `📝 ${t('smartImportModeEssay')}` }
  ]), [t]);

  const handleSmartImport = async () => {
    if (!rawInput.trim()) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setImportCount(null);
    setPlan(null);
    setEssayResult(null);

    try {
      if (mode === 'words') {
        const sample = rawInput.trim().split(/\r?\n/).slice(0, 5).join('\n');
        const generatedPlan = await generateSmartImportPlan(sample, aiSettings);
        setPlan(generatedPlan);

        const sourceLabel = formatImportSource();
        const importedWords = applySmartImportPlan(rawInput, generatedPlan, sourceLabel);

        if (importedWords.length === 0) {
          setImportCount(0);
          return;
        }

        const inserted = onImport(importedWords);
        setImportCount(inserted);
        return;
      }

      const essay = await buildEssayImportResult(rawInput.trim(), aiSettings);
      const record: EssayRecord = {
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        source: formatImportSource(),
        rawInput: rawInput.trim(),
        reciteLog: [],
        readLog: [],
        ...essay
      };

      persistEssayRecord(record);
      onEssaySaved?.(record);
      setEssayResult(record);
    } catch (error) {
      console.error('Smart import failed', error);
      if (mode === 'essay') {
        const isContentMissing = error instanceof Error && error.message === 'essay_content_missing';
        setErrorMessage(t(isContentMissing ? 'essayImportMissingContent' : 'essayImportError'));
      } else {
        setErrorMessage(t('smartImportError'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const renderPlan = (currentPlan: SmartImportPlan) => {
    const formatted = JSON.stringify(currentPlan, null, 2);
    return (
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">{t('smartImportPlanTitle')}</h3>
        {currentPlan.notes && (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t('smartImportNotes', { notes: currentPlan.notes })}</p>
        )}
        <pre className="mt-3 max-h-64 overflow-auto rounded-xl bg-slate-900/90 p-4 text-xs text-slate-100 shadow-inner">{formatted}</pre>
        {typeof currentPlan.confidence === 'number' && (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {t('smartImportConfidence', { value: Math.round(currentPlan.confidence * 100) })}
          </p>
        )}
      </div>
    );
  };

  const renderEssayResult = (record: EssayRecord) => (
    <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 dark:border-emerald-900/40 dark:bg-emerald-900/20">
      <header className="flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-300">{t('essayResultTitle')}</span>
        <h3 className="text-xl font-bold text-emerald-900 dark:text-emerald-100 flex items-center gap-2">
          <FileText size={18} />
          {record.title || t('essayUntitled')}
        </h3>
      </header>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-200">
          {record.structureComplete ? <CheckCircle2 className="text-emerald-500" size={18} /> : <AlertCircle className="text-amber-500" size={18} />}
          <span>{t('essayStructureComplete', { value: t(record.structureComplete ? 'essayStatusTrue' : 'essayStatusFalse') })}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-200">
          {(record.formatFixed) ? <CheckCircle2 className="text-emerald-500" size={18} /> : <AlertCircle className="text-amber-500" size={18} />}
          <span>{t('essayFormatFixed', { value: t(record.formatFixed ? 'essayStatusTrue' : 'essayStatusFalse') })}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-200">
          {record.titleRestored ? <CheckCircle2 className="text-emerald-500" size={18} /> : <AlertCircle className="text-amber-500" size={18} />}
          <span>{t('essayTitleRestored', { value: t(record.titleRestored ? 'essayStatusTrue' : 'essayStatusFalse') })}</span>
        </div>
      </div>
      <dl className="mt-4 space-y-3 text-sm text-slate-700 dark:text-slate-200">
        <div>
          <dt className="font-semibold text-slate-900 dark:text-slate-50">{t('essayTitleLabel')}</dt>
          <dd className="mt-1 rounded-lg bg-white/70 px-3 py-2 text-slate-700 shadow-sm dark:bg-slate-950/30 dark:text-slate-200">{record.title || t('essayUntitled')}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-900 dark:text-slate-50">{t('essayContentLabel')}</dt>
          <dd className="mt-1 rounded-lg bg-white/80 px-3 py-3 text-slate-700 shadow-inner dark:bg-slate-950/40 dark:text-slate-100 whitespace-pre-line leading-relaxed">{record.content}</dd>
        </div>
      </dl>
    </div>
  );

  const placeholder = mode === 'words' ? t('smartImportPlaceholder') : t('essayImportPlaceholder');
  const helperText = mode === 'words' ? t('smartImportSampleHint') : t('essayImportHint');

  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 p-6">
      <header className="mb-5">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{t('smartImportTitle')}</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{t('smartImportDescription')}</p>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{helperText}</p>
      </header>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('smartImportModeLabel')}</label>
        <select
          className="w-full sm:w-auto rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          value={mode}
          onChange={(event) => setMode(event.target.value as SmartImportMode)}
        >
          {modeOptions.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      <textarea
        className="w-full min-h-[50vh] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm text-slate-800 dark:text-slate-100 shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        placeholder={placeholder}
        value={rawInput}
        onChange={(event) => setRawInput(event.target.value)}
      />

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={handleSmartImport}
          disabled={isLoading || !rawInput.trim()}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
          {t('smartImportButton')}
        </button>
        {mode === 'words' && importCount !== null && (
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
            {importCount > 0
              ? t('importAdded', { count: importCount })
              : t('importNone')}
          </span>
        )}
        {mode === 'essay' && essayResult && (
          <span className="text-sm font-medium text-emerald-600 dark:text-emerald-300">{t('essayImportSaved')}</span>
        )}
      </div>

      {errorMessage && (
        <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/40 dark:text-red-200">
          {errorMessage}
        </div>
      )}

      {mode === 'words' && plan && renderPlan(plan)}
      {mode === 'essay' && essayResult && renderEssayResult(essayResult)}
    </section>
  );
};
