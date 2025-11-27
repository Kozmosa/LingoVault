import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      appName: "LingoVault",
      exportJson: "Export JSON",
      exportCsv: "Export CSV",
      import: "Import",
      addWord: "Add Word",
      newEntry: "New Entry",
      englishLabel: "English Word",
      englishPlaceholder: "e.g., Epiphany",
      aiFill: "AI Fill",
      meaningLabel: "Meaning (Chinese)",
      meaningPlaceholder: "e.g., 顿悟",
      exampleLabel: "Example Sentence",
      examplePlaceholder: "e.g., He had an epiphany about the solution.",
      proTip: "Pro tip: Press Ctrl+Enter to save",
      saveBtn: "Save to Vault",
      searchPlaceholder: "Search words, meanings...",
      entry: "entry",
      entries: "entries",
      aiError: "AI Service unavailable or key missing. Check Settings.",
      fileError: "Failed to parse file. Ensure it is valid JSON or CSV.",
      switchTo: "Switch to Chinese",
      english: "English",
      chinese: "Chinese",
      example: "Example",
      cancel: "Cancel",
      save: "Save",
      added: "Added",
      noWords: "No words found.",
      startAdding: "Start by adding a new word or importing a file.",
      langCode: "en",
      // Settings
      settings: "Settings",
      settingsTitle: "AI Service Settings",
      provider: "Provider",
      baseUrl: "Base URL",
      apiKey: "API Key",
      apiKeyHint: "Your key is stored locally in your browser.",
      modelName: "Model Name",
      saveSettings: "Save Settings",
      reset: "Reset Defaults",
      theme: "Theme",
      light: "Light",
      dark: "Dark",
      system: "System"
    }
  },
  zh: {
    translation: {
      appName: "单词宝库",
      exportJson: "导出 JSON",
      exportCsv: "导出 CSV",
      import: "导入",
      addWord: "添加单词",
      newEntry: "新增词条",
      englishLabel: "英文单词",
      englishPlaceholder: "例如：Epiphany",
      aiFill: "AI 填充",
      meaningLabel: "中文释义",
      meaningPlaceholder: "例如：顿悟",
      exampleLabel: "例句",
      examplePlaceholder: "例如：He had an epiphany about the solution.",
      proTip: "提示：按 Ctrl+Enter 快捷保存",
      saveBtn: "保存到词库",
      searchPlaceholder: "搜索单词、释义...",
      entry: "个词条",
      entries: "个词条",
      aiError: "AI 服务不可用或缺少密钥，请检查设置。",
      fileError: "文件解析失败，请确保是有效的 JSON 或 CSV 文件。",
      switchTo: "切换为英文",
      english: "英文",
      chinese: "中文",
      example: "例句",
      cancel: "取消",
      save: "保存",
      added: "添加于",
      noWords: "暂无单词",
      startAdding: "开始添加新单词或导入文件.",
      langCode: "zh",
      // Settings
      settings: "设置",
      settingsTitle: "AI 服务设置",
      provider: "服务商",
      baseUrl: "API 地址 (Base URL)",
      apiKey: "API 密钥 (Key)",
      apiKeyHint: "密钥仅保存在您的浏览器本地。",
      modelName: "模型名称",
      saveSettings: "保存设置",
      reset: "恢复默认",
      theme: "外观主题",
      light: "浅色模式",
      dark: "深色模式",
      system: "跟随系统"
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'zh', // Default to Chinese
    supportedLngs: ['en', 'zh'],
    load: 'languageOnly',
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'lingovault_lang',
    },
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;