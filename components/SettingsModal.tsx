import React, { useState, useEffect } from 'react';
import { X, Save, RotateCcw, ChevronDown, Globe, Sun, Moon, Monitor } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AISettings, DEFAULT_AI_SETTINGS, AIProvider } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: AISettings) => void;
  initialSettings: AISettings;
  theme: 'light' | 'dark' | 'system';
  onThemeChange: (value: 'light' | 'dark' | 'system') => void;
  language: 'en' | 'zh';
  onLanguageChange: (lang: 'en' | 'zh') => void;
}

const ANIMATION_DURATION = 420;

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialSettings,
  theme,
  onThemeChange,
  language,
  onLanguageChange
}) => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<AISettings>(initialSettings);
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(isOpen);
  const [isAiSettingsOpen, setIsAiSettingsOpen] = useState(true);

  // Reset local state when modal opens with new props
  useEffect(() => {
    setSettings(initialSettings);
    setIsAiSettingsOpen(true);
  }, [initialSettings, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      requestAnimationFrame(() => setIsVisible(true));
    } else if (isRendered) {
      setIsVisible(false);
      const timeout = window.setTimeout(() => setIsRendered(false), ANIMATION_DURATION);
      return () => window.clearTimeout(timeout);
    }
  }, [isOpen, isRendered]);

  if (!isRendered) return null;

  const handleRequestClose = () => {
    setIsVisible(false);
    onClose();
  };

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProvider = e.target.value as AIProvider;
    let defaultModel = settings.model;
    let defaultBaseUrl = settings.baseUrl;

    // Set smart defaults when switching providers
    switch (newProvider) {
      case 'gemini':
        defaultModel = 'gemini-2.5-flash';
        defaultBaseUrl = '';
        break;
      case 'openai':
        defaultModel = 'gpt-3.5-turbo';
        defaultBaseUrl = 'https://api.openai.com/v1';
        break;
      case 'anthropic':
        defaultModel = 'claude-3-haiku-20240307';
        defaultBaseUrl = 'https://api.anthropic.com/v1';
        break;
      case 'custom':
        defaultModel = '';
        defaultBaseUrl = '';
        break;
    }

    setSettings({
      ...settings,
      provider: newProvider,
      model: defaultModel,
      baseUrl: defaultBaseUrl
    });
  };

  const handleReset = () => {
    setSettings(DEFAULT_AI_SETTINGS);
  };

  const languageOptions: Array<{ value: 'en' | 'zh'; label: string; badge: string }> = [
    { value: 'en', label: t('languageEnglish'), badge: 'EN' },
    { value: 'zh', label: t('languageChinese'), badge: '中文' }
  ];

  const themeOptions: Array<{ value: 'light' | 'dark' | 'system'; label: string; icon: React.ReactNode }> = [
    { value: 'light', label: t('light'), icon: <Sun size={16} /> },
    { value: 'dark', label: t('dark'), icon: <Moon size={16} /> },
    { value: 'system', label: t('system'), icon: <Monitor size={16} /> }
  ];

  const renderLanguageControls = () => (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('languageSettingLabel')}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('languageSettingHint')}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {languageOptions.map((option) => {
          const isActive = language === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onLanguageChange(option.value)}
              className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left transition-colors ${
                isActive
                  ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm dark:border-slate-200 dark:bg-slate-100 dark:text-slate-900'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`rounded-full p-1 ${
                    isActive
                      ? 'bg-white text-brand-600 dark:bg-slate-100 dark:text-slate-900'
                      : 'bg-white/80 text-brand-600 dark:bg-slate-900/70 dark:text-brand-400'
                  }`}
                >
                  <Globe size={14} />
                </div>
                <div>
                  <p className="text-sm font-semibold">{option.label}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{option.badge}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderThemeControls = () => (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('themeSettingLabel')}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('themeSettingHint')}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3">
        {themeOptions.map((option) => {
          const isActive = theme === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onThemeChange(option.value)}
              className={`flex flex-col items-center justify-center gap-2 rounded-xl border px-3 py-3 text-center text-sm font-medium transition-all ${
                isActive
                  ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm dark:border-slate-200 dark:bg-slate-100 dark:text-slate-900'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
              }`}
            >
              <div
                className={`rounded-full p-1.5 ${
                  isActive
                    ? 'bg-white text-current dark:bg-slate-100 dark:text-slate-900'
                    : 'bg-white/80 text-current dark:bg-slate-900/70'
                }`}
              >
                {option.icon}
              </div>
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div
      className="modal-overlay modal-ease fixed inset-0 z-50 flex items-center justify-center p-4"
      data-open={isVisible}
      onClick={handleRequestClose}
    >
      <div
        className="modal-surface modal-ease flex h-full w-full max-w-xl max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
        data-open={isVisible}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/60">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{t('settings')}</h2>
          <button onClick={handleRequestClose} className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-100">
            <X size={20} />
          </button>
        </div>

        <div className="modal-scroll flex-1 space-y-5 overflow-y-auto px-6 py-6">
          <section className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/40">
            <div className="flex flex-col gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t('generalSettingsTitle')}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{t('generalSettingsDescription')}</p>
              </div>
              <div className="space-y-5 pt-2">
                {renderLanguageControls()}
                {renderThemeControls()}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setIsAiSettingsOpen((prev) => !prev)}
              className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left"
              aria-expanded={isAiSettingsOpen}
            >
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t('settingsTitle')}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{t('aiSettingsDescription')}</p>
              </div>
              <div className="flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                <span>{t(isAiSettingsOpen ? 'collapse' : 'expand')}</span>
                <ChevronDown className={`transition-transform ${isAiSettingsOpen ? 'rotate-180' : ''}`} size={18} />
              </div>
            </button>
            <div
              className={`overflow-hidden transition-[max-height,opacity] duration-500 ${
                isAiSettingsOpen ? 'max-h-[1200px] opacity-100' : 'pointer-events-none max-h-0 opacity-0'
              }`}
            >
              <div className="space-y-4 border-t border-slate-100 px-4 py-5 dark:border-slate-800">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">{t('provider')}</label>
                  <select
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    value={settings.provider}
                    onChange={handleProviderChange}
                  >
                    <option value="gemini">Google Gemini</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic (Claude)</option>
                    <option value="custom">Custom (OpenAI Compatible)</option>
                  </select>
                </div>

                {settings.provider !== 'gemini' && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">{t('baseUrl')}</label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                      value={settings.baseUrl}
                      placeholder={settings.provider === 'openai' ? 'https://api.openai.com/v1' : 'http://localhost:11434/v1'}
                      onChange={(e) => setSettings({ ...settings, baseUrl: e.target.value })}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">{t('apiKey')}</label>
                  <input
                    type="password"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    value={settings.apiKey}
                    placeholder={settings.provider === 'gemini' ? 'Auto (Env) or Enter Key' : 'sk-...'}
                    onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                  />
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{t('apiKeyHint')}</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">{t('modelName')}</label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    value={settings.model}
                    onChange={(e) => setSettings({ ...settings, model: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/60">
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            <RotateCcw size={16} /> {t('reset')}
          </button>
          <button
            onClick={() => onSave(settings)}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-2 text-sm font-semibold text-white shadow-sm shadow-brand-500/30 transition hover:bg-brand-700 active:scale-95"
          >
            <Save size={18} /> {t('saveSettings')}
          </button>
        </div>
      </div>
    </div>
  );
};