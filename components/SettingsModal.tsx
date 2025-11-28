import React, { useState, useEffect } from 'react';
import { X, Save, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AISettings, DEFAULT_AI_SETTINGS, AIProvider } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: AISettings) => void;
  initialSettings: AISettings;
}

const ANIMATION_DURATION = 420;

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave, initialSettings }) => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<AISettings>(initialSettings);
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(isOpen);

  // Reset local state when modal opens with new props
  useEffect(() => {
    setSettings(initialSettings);
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

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 transition-opacity duration-[420ms] modal-ease ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      onClick={handleRequestClose}
    >
      <div
        className={`bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 transition-colors transition-transform transition-opacity duration-[420ms] modal-ease ${isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-[0.96] translate-y-4'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{t('settingsTitle')}</h2>
          <button onClick={handleRequestClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          
          {/* Provider Selection */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">{t('provider')}</label>
            <select 
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              value={settings.provider}
              onChange={handleProviderChange}
            >
              <option value="gemini">Google Gemini</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="custom">Custom (OpenAI Compatible)</option>
            </select>
          </div>

          {/* Base URL */}
          {settings.provider !== 'gemini' && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">{t('baseUrl')}</label>
              <input 
                type="text" 
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none font-mono text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                value={settings.baseUrl}
                placeholder={settings.provider === 'openai' ? 'https://api.openai.com/v1' : 'http://localhost:11434/v1'}
                onChange={(e) => setSettings({...settings, baseUrl: e.target.value})}
              />
            </div>
          )}

          {/* API Key */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">{t('apiKey')}</label>
            <input 
              type="password" 
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none font-mono text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              value={settings.apiKey}
              placeholder={settings.provider === 'gemini' ? 'Auto (Env) or Enter Key' : 'sk-...'}
              onChange={(e) => setSettings({...settings, apiKey: e.target.value})}
            />
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t('apiKeyHint')}</p>
          </div>

          {/* Model Name */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">{t('modelName')}</label>
            <input 
              type="text" 
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none font-mono text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              value={settings.model}
              onChange={(e) => setSettings({...settings, model: e.target.value})}
            />
          </div>

        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex justify-between">
            <button 
              onClick={handleReset}
              className="px-4 py-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
            >
              <RotateCcw size={16} /> {t('reset')}
            </button>
            <button 
              onClick={() => onSave(settings)}
              className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 shadow-sm shadow-brand-500/30 font-medium flex items-center gap-2 transition-all active:scale-95"
            >
              <Save size={18} /> {t('saveSettings')}
            </button>
        </div>
      </div>
    </div>
  );
};