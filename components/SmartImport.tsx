import React, { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AISettings, SmartImportPlan, WordItem } from '../types';
import { generateSmartImportPlan } from '../services/aiService';
import { applySmartImportPlan, formatImportSource } from '../utils/importUtils';

interface SmartImportProps {
  aiSettings: AISettings;
  onImport: (words: WordItem[]) => number;
}

export const SmartImport: React.FC<SmartImportProps> = ({ aiSettings, onImport }) => {
  const { t } = useTranslation();
  const [rawInput, setRawInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [plan, setPlan] = useState<SmartImportPlan | null>(null);
  const [importCount, setImportCount] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSmartImport = async () => {
    if (!rawInput.trim()) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setImportCount(null);

    try {
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
    } catch (error) {
      console.error('Smart import failed', error);
      setErrorMessage(t('smartImportError'));
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

  return (
    <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 p-6">
      <header className="mb-5">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{t('smartImportTitle')}</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{t('smartImportDescription')}</p>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{t('smartImportSampleHint')}</p>
      </header>

      <textarea
        className="w-full min-h-[50vh] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm text-slate-800 dark:text-slate-100 shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        placeholder={t('smartImportPlaceholder')}
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
        {importCount !== null && (
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
            {importCount > 0
              ? t('importAdded', { count: importCount })
              : t('importNone')}
          </span>
        )}
      </div>

      {errorMessage && (
        <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/40 dark:text-red-200">
          {errorMessage}
        </div>
      )}

      {plan && renderPlan(plan)}
    </section>
  );
};
