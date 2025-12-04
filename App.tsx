import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { WordItem, AISettings, DEFAULT_AI_SETTINGS, EssayRecord } from './types';
import { wordsToCsv, csvToWords, downloadFile } from './utils/csvHelper';
import { formatImportSource } from './utils/importUtils';
import { WordList } from './components/WordList';
import { NavigationDrawer, DrawerItem } from './components/NavigationDrawer';
import { FullScreenDrill } from './components/FullScreenDrill';
import { SmartImport } from './components/SmartImport';
import { EssayGallery } from './components/EssayGallery';
import { EssayRecital } from './components/EssayRecital';
import { enhanceWord } from './services/aiService';
import { checkAndroidUpdate } from './services/androidUpdateService';
import { SettingsModal } from './components/SettingsModal';
import { AddWordModal } from './components/AddWordModal';
import { useTranslation } from 'react-i18next';
import { APP_VERSION } from './utils/version';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Upload, 
  Sparkles, 
  Loader2, 
  FileJson, 
  FileSpreadsheet, 
  X,
  Globe,
  Settings,
  Sun,
  Moon,
  Monitor,
  CheckCircle2
} from 'lucide-react';
import { fetch } from '@tauri-apps/plugin-http';

type Theme = 'light' | 'dark' | 'system';
type AppPage = 'vault' | 'practice' | 'drill' | 'smartImport' | 'essays' | 'essayRecite';
type ToastVariant = 'info' | 'error' | 'success';
interface ToastEntry {
  id: string;
  text: string;
  variant: ToastVariant;
}
interface ToastOptions {
  variant?: ToastVariant;
  duration?: number;
}
const ANDROID_MANIFEST_URL = 'https://github.com/Kozmosa/LingoVault/releases/latest/download/latest.json';
const GITHUB_RELEASES_API = 'https://api.github.com/repos/Kozmosa/LingoVault/releases/latest';
const ESSAY_STORAGE_KEY = 'lingovault_essays';

const coerceTimestampArray = (input: unknown): number[] => {
  if (!Array.isArray(input)) return [];
  return input
    .map(entry => (typeof entry === 'number' ? entry : Number(entry)))
    .filter(value => Number.isFinite(value));
};

const normalizeEssayRecord = (record: any): EssayRecord => ({
  id: typeof record?.id === 'string' && record.id.trim() ? record.id : crypto.randomUUID(),
  createdAt: typeof record?.createdAt === 'number' ? record.createdAt : Date.now(),
  source: typeof record?.source === 'string' && record.source.trim() ? record.source : 'import',
  rawInput: typeof record?.rawInput === 'string' ? record.rawInput : '',
  reciteLog: coerceTimestampArray(record?.reciteLog),
  readLog: coerceTimestampArray(record?.readLog),
  structureComplete: Boolean(record?.structureComplete),
  formatFixed: Boolean(record?.formatFixed),
  titleRestored: Boolean(record?.titleRestored),
  title: typeof record?.title === 'string' ? record.title : '',
  content: typeof record?.content === 'string' ? record.content : ''
});

const isSameDay = (timestamp: number, comparison: number): boolean => {
  const a = new Date(timestamp);
  const b = new Date(comparison);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
};

const normalizeWordItem = (word: any, defaultSource: string = 'user'): WordItem => ({
  id: word.id || crypto.randomUUID(),
  english: word.english || '',
  chinese: word.chinese || '',
  example: word.example ?? '',
  tags: word.tags,
  isMastered: typeof word.isMastered === 'number' ? word.isMastered : 0,
  createdAt: typeof word.createdAt === 'number' ? word.createdAt : Date.now(),
  source: typeof word.source === 'string' && word.source.trim() ? word.source : defaultSource
});

const App: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [words, setWords] = useState<WordItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [isAutoMeaningLoading, setIsAutoMeaningLoading] = useState(false);
  const [isAutoExampleLoading, setIsAutoExampleLoading] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activePage, setActivePage] = useState<AppPage>('vault');
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  
  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [aiSettings, setAiSettings] = useState<AISettings>(DEFAULT_AI_SETTINGS);

  // Theme State
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('lingovault_theme') as Theme) || 'system';
  });

  // New word state
  const [newEnglish, setNewEnglish] = useState('');
  const [newChinese, setNewChinese] = useState('');
  const [newExample, setNewExample] = useState('');
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const [essays, setEssays] = useState<EssayRecord[]>([]);
  const [selectedEssay, setSelectedEssay] = useState<EssayRecord | null>(null);

  const englishInputRef = useRef<HTMLInputElement>(null);
  const toastTimersRef = useRef<Map<string, number>>(new Map());
  const detailHistoryKeyRef = useRef<string | null>(null);
  const pendingPageRef = useRef<AppPage | null>(null);
  const hasInitializedRef = useRef(false);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
    const timer = toastTimersRef.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      toastTimersRef.current.delete(id);
    }
  }, []);

  const showToast = useCallback((message: string, options?: ToastOptions) => {
    const id = crypto.randomUUID();
    const variant = options?.variant ?? 'info';
    const duration = options?.duration ?? 4000;
    setToasts(prev => [...prev, { id, text: message, variant }]);
    if (duration > 0) {
      const timer = window.setTimeout(() => removeToast(id), duration);
      toastTimersRef.current.set(id, timer);
    }
    return id;
  }, [removeToast]);

  // Initial load
  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    const savedData = localStorage.getItem('lingovault_data');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (Array.isArray(parsed)) {
          const legacyDetected = parsed.some((word: any) => !word || typeof word.source !== 'string');
          const normalized = parsed.map((item: any) => normalizeWordItem(item));
          setWords(normalized);
          if (legacyDetected) {
            window.setTimeout(() => showToast(t('migrationNotice')), 50);
          }
        }
      } catch (e) {
        console.error("Failed to load local data", e);
      }
    }

    const savedSettings = localStorage.getItem('lingovault_settings');
    if (savedSettings) {
      try {
        setAiSettings({ ...DEFAULT_AI_SETTINGS, ...JSON.parse(savedSettings) });
      } catch (e) {
        console.error("Failed to load settings", e);
      }
    }

    const savedEssays = localStorage.getItem(ESSAY_STORAGE_KEY);
    if (savedEssays) {
      try {
        const parsedEssays = JSON.parse(savedEssays);
        if (Array.isArray(parsedEssays)) {
          setEssays(parsedEssays.map(normalizeEssayRecord));
        }
      } catch (error) {
        console.error('Failed to load essays', error);
      }
    }
  }, [showToast, t]);

  useEffect(() => {
    return () => {
      toastTimersRef.current.forEach(timer => window.clearTimeout(timer));
      toastTimersRef.current.clear();
    };
  }, []);

  // Theme Effect
  useEffect(() => {
    const root = window.document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = (isDark: boolean) => {
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    const handleSystemChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        applyTheme(e.matches);
      }
    };

    if (theme === 'system') {
      applyTheme(mediaQuery.matches);
      mediaQuery.addEventListener('change', handleSystemChange);
    } else {
      applyTheme(theme === 'dark');
    }

    localStorage.setItem('lingovault_theme', theme);

    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, [theme]);

  useEffect(() => {
    const handlePopState = () => {
      if (!detailHistoryKeyRef.current) {
        return;
      }
      detailHistoryKeyRef.current = null;
      setSelectedEssay(null);
      setActivePage('essays');
      if (pendingPageRef.current) {
        const target = pendingPageRef.current;
        pendingPageRef.current = null;
        if (target !== 'essayRecite') {
          setActivePage(target);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Persistence
  useEffect(() => {
    localStorage.setItem('lingovault_data', JSON.stringify(words));
  }, [words]);

  useEffect(() => {
    localStorage.setItem(ESSAY_STORAGE_KEY, JSON.stringify(essays));
  }, [essays]);

  useEffect(() => {
    localStorage.setItem('lingovault_settings', JSON.stringify(aiSettings));
  }, [aiSettings]);

  const toggleLang = () => {
    const newLang = i18n.language.startsWith('zh') ? 'en' : 'zh';
    i18n.changeLanguage(newLang);
  };

  const cycleTheme = () => {
    setTheme(prev => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'system';
      return 'light';
    });
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light': return <Sun size={18} />;
      case 'dark': return <Moon size={18} />;
      default: return <Monitor size={18} />;
    }
  };

  const navigationItems = useMemo<DrawerItem[]>(() => ([
    {
      key: 'vault',
      label: t('navWordVault'),
      description: t('navWordVaultDesc')
    },
    {
      key: 'essays',
      label: t('navEssayVault'),
      description: t('navEssayVaultDesc')
    },
    {
      key: 'smartImport',
      label: t('navSmartImport'),
      description: t('navSmartImportDesc')
    },
    {
      key: 'practice',
      label: t('navPractice'),
      description: t('navPracticeDesc')
    },
    {
      key: 'drill',
      label: t('navDrill'),
      description: t('navDrillDesc')
    }
  ]), [t]);

  const handleSelectPage = useCallback((key: string) => {
    if (key === 'vault' || key === 'practice' || key === 'drill' || key === 'smartImport' || key === 'essays') {
      const target = key as AppPage;
      if (detailHistoryKeyRef.current) {
        pendingPageRef.current = target;
        window.history.back();
        return;
      }
      setSelectedEssay(null);
      setActivePage(target);
    }
  }, []);

  const handleCheckForUpdates = useCallback(async () => {
    if (isCheckingUpdates) return;
    setIsCheckingUpdates(true);
    setIsDrawerOpen(false);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAndroid = userAgent.includes('android');

    if (!isAndroid) {
      try {
        const response = await fetch(`${GITHUB_RELEASES_API}?t=${Date.now()}`, {
          method: 'GET',
          headers: {
            Accept: 'application/vnd.github+json'
          }
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const release = await response.json();
        const version = (release?.tag_name || release?.name || '').replace(/^v/, '') || APP_VERSION;
        const notes = (release?.body ?? '').trim() || t('androidUpdateDefaultNotes');
        const assets: Array<{ name?: string; browser_download_url?: string }> = release?.assets ?? [];
        const apkAsset = assets.find(asset => asset?.name?.toLowerCase().endsWith('.apk'));
        if (!apkAsset?.browser_download_url) {
          showToast(t('androidUpdateConfigMissing'), { variant: 'error' });
          return;
        }
        window.alert(
          t('webUpdateDownloadMessage', {
            version,
            url: apkAsset.browser_download_url,
            notes
          })
        );
      } catch (error) {
        const messageText = error instanceof Error ? error.message : String(error);
        showToast(t('androidUpdateCheckError', { error: messageText }), { variant: 'error' });
      } finally {
        setIsCheckingUpdates(false);
      }
      return;
    }

    try {
      await checkAndroidUpdate({
        manifestUrl: ANDROID_MANIFEST_URL,
        strings: {
          promptTitle: t('androidUpdateTitle'),
          promptBody: (version, notes) => t('androidUpdatePrompt', {
            version,
            notes: notes.trim() || t('androidUpdateDefaultNotes')
          }),
          promptConfirm: t('androidUpdateConfirm'),
          promptCancel: t('androidUpdateLater'),
          downloadToast: t('androidUpdateDownloading'),
          installToast: t('androidUpdateInstalling'),
          configMissing: t('androidUpdateConfigMissing'),
          checkError: (reason) => t('androidUpdateCheckError', { error: reason }),
          installError: (reason) => t('androidUpdateInstallError', { error: reason }),
          alreadyLatest: t('latestVersionMessage', { version: APP_VERSION })
        },
        onStatus: (message) => showToast(message),
        notify: (message, options) => showToast(message, options)
      });
    } finally {
      setIsCheckingUpdates(false);
    }
  }, [isCheckingUpdates, showToast, t]);

  // Focus English input when adding mode is active
  useEffect(() => {
    if (isAddModalOpen) {
      window.setTimeout(() => {
        englishInputRef.current?.focus();
      }, 50);
    }
  }, [isAddModalOpen]);

  const handleAddWord = useCallback(() => {
    if (!newEnglish.trim()) return;

    const newWord: WordItem = {
      id: crypto.randomUUID(),
      english: newEnglish,
      chinese: newChinese,
      example: newExample,
      isMastered: 0,
      createdAt: Date.now(),
      source: 'user'
    };

    setWords(prev => [newWord, ...prev]);
    setNewEnglish('');
    setNewChinese('');
    setNewExample('');
    setIsAddModalOpen(false);
  }, [newEnglish, newChinese, newExample]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleAddWord();
    }
  };

  const handleDelete = useCallback((id: string) => {
    setWords(prev => prev.filter(w => w.id !== id));
  }, []);

  const handleUpdate = useCallback((updatedWord: WordItem) => {
    setWords(prev => prev.map(w => w.id === updatedWord.id ? updatedWord : w));
  }, []);

  const handleToggleMastered = useCallback((id: string, nextValue?: number) => {
    setWords(prev => prev.map(word => {
      if (word.id !== id) return word;
      const resolved = typeof nextValue === 'number' ? nextValue : (word.isMastered === 1 ? 0 : 1);
      return { ...word, isMastered: resolved };
    }));
  }, []);

  const handleAiFill = async () => {
    if (!newEnglish) return;
    setIsLoadingAi(true);
    try {
      const result = await enhanceWord(newEnglish, aiSettings);
      if (result.chinese) setNewChinese(result.chinese);
      if (result.example) setNewExample(result.example);
    } catch (e) {
      console.error(e);
      alert(t('aiError'));
    } finally {
      setIsLoadingAi(false);
    }
  };

  const handleAutoMeaning = useCallback(async () => {
    const targets = words.filter(word => !word.chinese?.trim());
    if (targets.length === 0) {
      alert(t('noMissingMeaning'));
      return;
    }

    setIsAutoMeaningLoading(true);
    try {
      for (const word of targets) {
        try {
          const result = await enhanceWord(word.english, aiSettings);
          const meaning = result.chinese?.trim();
          if (meaning) {
            setWords(prev => prev.map(w => w.id === word.id ? { ...w, chinese: meaning } : w));
          }
        } catch (error) {
          console.error('Auto meaning fill failed for', word.english, error);
          alert(t('aiError'));
          break;
        }
      }
    } finally {
      setIsAutoMeaningLoading(false);
    }
  }, [aiSettings, t, words]);

  const handleAutoExample = useCallback(async () => {
    const targets = words.filter(word => !word.example?.trim());
    if (targets.length === 0) {
      alert(t('noMissingExample'));
      return;
    }

    setIsAutoExampleLoading(true);
    try {
      for (const word of targets) {
        try {
          const result = await enhanceWord(word.english, aiSettings);
          const example = result.example?.trim();
          if (example) {
            setWords(prev => prev.map(w => w.id === word.id ? { ...w, example } : w));
          }
        } catch (error) {
          console.error('Auto example fill failed for', word.english, error);
          alert(t('aiError'));
          break;
        }
      }
    } finally {
      setIsAutoExampleLoading(false);
    }
  }, [aiSettings, t, words]);

  const handleEssaySaved = useCallback((record: EssayRecord) => {
    setEssays(prev => [normalizeEssayRecord(record), ...prev]);
  }, []);

  const openEssayRecital = useCallback((essay: EssayRecord) => {
    const normalized = normalizeEssayRecord(essay);
    setSelectedEssay(normalized);
    setActivePage('essayRecite');
    const stateId = crypto.randomUUID();
    detailHistoryKeyRef.current = stateId;
    window.history.pushState({ essayDetail: stateId }, '', `#essay-${normalized.id}`);
  }, []);

  const handleEssayBack = useCallback(() => {
    if (detailHistoryKeyRef.current) {
      window.history.back();
      return;
    }
    setSelectedEssay(null);
    setActivePage('essays');
  }, []);

  const handleEssayLogUpdate = useCallback((essayId: string, kind: 'recite' | 'read') => {
    let toastMessage: string | null = null;
    let variant: ToastVariant = 'info';
    setEssays(prev => {
      const idx = prev.findIndex(essay => essay.id === essayId);
      if (idx === -1) {
        return prev;
      }
      const essay = prev[idx];
      const logKey: 'reciteLog' | 'readLog' = kind === 'recite' ? 'reciteLog' : 'readLog';
      const log = Array.isArray(essay[logKey]) ? essay[logKey] : [];
      if (log.some(entry => isSameDay(entry, Date.now()))) {
        toastMessage = t(kind === 'recite' ? 'essayReciteAlready' : 'essayReadAlready');
        variant = 'info';
        return prev;
      }

      const updatedEssay: EssayRecord = {
        ...essay,
        [logKey]: [...log, Date.now()]
      } as EssayRecord;

      toastMessage = t(kind === 'recite' ? 'essayReciteSuccess' : 'essayReadSuccess');
      variant = 'success';
      setSelectedEssay(current => current?.id === essayId ? updatedEssay : current);
      const next = [...prev];
      next[idx] = updatedEssay;
      return next;
    });

    if (toastMessage) {
      showToast(toastMessage, { variant });
    }
  }, [showToast, t]);

  const mergeImportedWords = useCallback((incoming: WordItem[]): number => {
    if (!incoming || incoming.length === 0) {
      return 0;
    }

    let inserted = 0;
    setWords(prev => {
      const existingIds = new Set(prev.map(item => item.id));
      const existingEnglish = new Set(prev.map(item => item.english.toLowerCase()));
      const novel: WordItem[] = [];

      for (const word of incoming) {
        const englishNormalized = word.english.trim().toLowerCase();
        if (!englishNormalized) {
          continue;
        }
        if (existingIds.has(word.id) || existingEnglish.has(englishNormalized)) {
          continue;
        }
        existingIds.add(word.id);
        existingEnglish.add(englishNormalized);
        novel.push(word);
      }

      inserted = novel.length;
      if (inserted === 0) {
        return prev;
      }

      return [...novel, ...prev];
    });

    return inserted;
  }, []);

  const notifyImportResult = useCallback((count: number) => {
    if (count > 0) {
      showToast(t('importAdded', { count }));
    } else {
      showToast(t('importNone'));
    }
  }, [showToast, t]);

  const handleSmartImportMerge = useCallback((incoming: WordItem[]) => {
    const inserted = mergeImportedWords(incoming);
    notifyImportResult(inserted);
    return inserted;
  }, [mergeImportedWords, notifyImportResult]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      try {
        let importedWords: WordItem[] = [];
        if (file.name.endsWith('.json')) {
          const json = JSON.parse(content);
          importedWords = Array.isArray(json) ? json : json.words || [];
        } else if (file.name.endsWith('.csv')) {
          importedWords = csvToWords(content);
        }
        
        const importSource = formatImportSource();
        const normalized = importedWords.map(item => normalizeWordItem(item, importSource));

        const inserted = mergeImportedWords(normalized);
        notifyImportResult(inserted);

        event.target.value = '';
      } catch (err) {
        alert(t('fileError'));
      }
    };
    reader.readAsText(file);
  };

  const handleExportJson = () => {
    const data = JSON.stringify(words, null, 2);
    downloadFile(data, `lingovault_${new Date().toISOString().slice(0,10)}.json`, 'application/json');
  };

  const handleExportCsv = () => {
    const csv = wordsToCsv(words);
    downloadFile(csv, `lingovault_${new Date().toISOString().slice(0,10)}.csv`, 'text/csv');
  };

  const filteredWords = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return words.filter(w => 
      w.english.toLowerCase().includes(term) || 
      w.chinese.includes(term) ||
      (w.example && w.example.toLowerCase().includes(term))
    );
  }, [words, searchTerm]);

  return (
    <div className="min-h-screen pb-20 bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {toasts.length > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 flex w-full max-w-md -translate-x-1/2 flex-col gap-3 px-4">
          {toasts.map((toast) => {
            const variantClasses = toast.variant === 'error'
              ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/80 dark:text-red-200'
              : toast.variant === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-200'
                : 'border-slate-200 bg-white/95 text-slate-700 dark:border-slate-800 dark:bg-slate-900/95 dark:text-slate-200';
            const iconColor = toast.variant === 'error'
              ? 'text-red-500'
              : toast.variant === 'success'
                ? 'text-emerald-500'
                : 'text-brand-500';
            return (
              <div
                key={toast.id}
                className={`flex items-start gap-3 rounded-xl border shadow-lg px-4 py-3 backdrop-blur ${variantClasses}`}
              >
                <CheckCircle2 className={`${iconColor} flex-shrink-0`} size={18} />
                <span className="flex-1 min-w-0 text-sm font-medium whitespace-pre-line break-words text-left leading-snug">{toast.text}</span>
                <button
                  type="button"
                  onClick={() => removeToast(toast.id)}
                  className="ml-auto rounded-full p-1 text-current/60 transition-colors hover:bg-white/30 dark:hover:bg-slate-800/70"
                  aria-label={t('dismiss')}
                >
                  <X size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        onSave={(settings) => {
            setAiSettings(settings);
            setIsSettingsOpen(false);
        }}
        initialSettings={aiSettings}
      />

      <NavigationDrawer
        isOpen={isDrawerOpen}
        title={t('appName')}
        subtitle={t('navigationSubtitle')}
        navLabel={t('navigationLabel')}
        closeLabel={t('closeNavigation')}
        items={navigationItems}
        activeKey={activePage}
        onSelect={handleSelectPage}
        onClose={() => setIsDrawerOpen(false)}
        onCheckUpdates={handleCheckForUpdates}
        checkUpdatesLabel={t('checkForUpdates', { version: APP_VERSION })}
        isCheckingUpdates={isCheckingUpdates}
      />

      {/* Header */}
      <header
        className="fixed top-0 left-0 right-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors"
        style={{ paddingTop: 'var(--safe-area-top)' }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between min-h-16">
          <div className="flex items-center gap-2 text-brand-600 dark:text-brand-500">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="p-2 rounded-lg transition-colors hover:bg-brand-100/70 dark:hover:bg-brand-900/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 text-current"
              aria-label={t('openNavigation')}
            >
              <BookOpen className="h-6 w-6" />
            </button>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{t('appName')}</h1>
          </div>
          
          <div className="flex items-center gap-2">
            
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 gap-1 transition-colors">
                <button 
                  onClick={toggleLang}
                  className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-all flex items-center gap-1"
                  title={t('switchTo')}
                >
                  <Globe size={18} />
                  <span className="text-xs font-bold uppercase w-5 text-center">
                    {i18n.language.startsWith('zh') ? 'ZH' : 'EN'}
                  </span>
                </button>
                <div className="w-px bg-slate-300 dark:bg-slate-600 my-1"></div>
                <button 
                  onClick={cycleTheme}
                  className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-all"
                  title={t(theme)}
                >
                  {getThemeIcon()}
                </button>
                <div className="w-px bg-slate-300 dark:bg-slate-600 my-1"></div>
                <button 
                  onClick={() => setIsSettingsOpen(true)}
                  className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-all"
                  title={t('settings')}
                >
                  <Settings size={18} />
                </button>
            </div>

            <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1 hidden sm:block"></div>
            
            <div className="hidden sm:flex items-center gap-2">
                <button onClick={handleExportJson} className="p-2 text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-slate-800 rounded-lg transition-colors" title={t('exportJson')}>
                    <FileJson size={20} />
                </button>
                <button onClick={handleExportCsv} className="p-2 text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-slate-800 rounded-lg transition-colors" title={t('exportCsv')}>
                    <FileSpreadsheet size={20} />
                </button>
                <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1"></div>
            </div>
            
            <label className="cursor-pointer p-2 text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2" title={t('import')}>
              <Upload size={20} />
              <span className="hidden sm:inline text-sm font-medium">{t('import')}</span>
              <input type="file" accept=".json,.csv" className="hidden" onChange={handleFileUpload} />
            </label>
            
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="ml-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm shadow-brand-500/30 flex items-center gap-2 transition-all active:scale-95"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">{t('addWord')}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main
        className={activePage === 'drill' ? 'px-3 sm:px-6 py-6' : 'max-w-5xl mx-auto px-4 sm:px-6 py-8'}
        style={{ paddingTop: 'calc(5rem + var(--safe-area-top))' }}
      >
        {activePage === 'vault' ? (
          <>
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder={t('searchPlaceholder')} 
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-900 dark:text-slate-100 transition-all shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAutoMeaning}
                    disabled={isAutoMeaningLoading || isAutoExampleLoading}
                    className="px-3 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300 border border-purple-100 dark:border-purple-900 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/40 flex items-center gap-2 transition-colors disabled:opacity-50"
                    title={t('autoMeaningTitle')}
                  >
                    {isAutoMeaningLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    <span className="text-sm font-medium">{t('autoMeaning')}</span>
                  </button>
                  <button
                    onClick={handleAutoExample}
                    disabled={isAutoMeaningLoading || isAutoExampleLoading}
                    className="px-3 py-2 bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-300 border border-sky-100 dark:border-sky-900 rounded-lg hover:bg-sky-100 dark:hover:bg-sky-900/40 flex items-center gap-2 transition-colors disabled:opacity-50"
                    title={t('autoExampleTitle')}
                  >
                    {isAutoExampleLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    <span className="text-sm font-medium">{t('autoExample')}</span>
                  </button>
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400 font-medium px-1 text-center sm:text-left">
                  {filteredWords.length} {filteredWords.length === 1 ? t('entry') : t('entries')}
                </div>
              </div>
            </div>

            <WordList words={filteredWords} onDelete={handleDelete} onUpdate={handleUpdate} />
          </>
        ) : activePage === 'practice' ? (
          <div className="min-h-[60vh] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center text-center gap-3 p-10">
            <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">{t('comingSoonTitle')}</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-md">{t('comingSoonMessage')}</p>
          </div>
        ) : activePage === 'essays' ? (
          <EssayGallery essays={essays} onSelect={openEssayRecital} />
        ) : activePage === 'essayRecite' ? (
          selectedEssay ? (
            <EssayRecital
              essay={selectedEssay}
              onBack={handleEssayBack}
              onRecite={(essayId) => handleEssayLogUpdate(essayId, 'recite')}
              onRead={(essayId) => handleEssayLogUpdate(essayId, 'read')}
            />
          ) : (
            <div className="min-h-[60vh] bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 flex items-center justify-center text-center p-10">
              <div className="space-y-3">
                <p className="text-lg font-semibold text-slate-700 dark:text-slate-100">{t('essayRecitalMissing')}</p>
                <button
                  onClick={() => setActivePage('essays')}
                  className="text-sm font-medium text-brand-600 hover:text-brand-500"
                >
                  {t('essayRecitalReturnGallery')}
                </button>
              </div>
            </div>
          )
        ) : activePage === 'smartImport' ? (
          <SmartImport aiSettings={aiSettings} onImport={handleSmartImportMerge} onEssaySaved={handleEssaySaved} />
        ) : (
          <FullScreenDrill words={words} onToggleMastered={handleToggleMastered} />
        )}

      </main>

      {/* Mobile Sticky Action Button */}
      <div className="sm:hidden fixed bottom-6 right-6 z-20">
         <button 
           onClick={() => setIsAddModalOpen(true)}
           className="h-14 w-14 bg-brand-600 text-white rounded-full shadow-lg shadow-brand-600/40 flex items-center justify-center hover:scale-105 transition-transform"
         >
           <Plus size={24} />
         </button>
      </div>

      <AddWordModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleAddWord}
        english={newEnglish}
        chinese={newChinese}
        example={newExample}
        onEnglishChange={setNewEnglish}
        onChineseChange={setNewChinese}
        onExampleChange={setNewExample}
        onAiFill={handleAiFill}
        isAiLoading={isLoadingAi}
        englishInputRef={englishInputRef}
        onKeyDown={handleKeyDown}
      />

    </div>
  );
};

export default App;