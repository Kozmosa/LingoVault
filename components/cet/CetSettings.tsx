import React, { useEffect, useState } from 'react';
import { Download, Settings, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { parseCetStore } from '../../utils/cetStore';
import { downloadFile } from '../../utils/csvHelper';
import { studyDay } from '../../utils/srs';
import { useCet } from './CetContext';
import { BookSelect, input, muted, PageTitle, panel, primary, secondary } from './ui';

export function CetSettingsPage() {
  const { t } = useTranslation();
  const { store, saveSettings, update, openAppearance } = useCet();
  const [settings, setSettings] = useState(store.settings);
  const [dailyNew, setDailyNew] = useState(String(settings.dailyNew));
  const [dailyReview, setDailyReview] = useState(String(settings.dailyReview));
  const [message, setMessage] = useState('');
  useEffect(() => { setSettings(store.settings); setDailyNew(String(store.settings.dailyNew)); setDailyReview(String(store.settings.dailyReview)); }, [store.settings]);
  const importFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const data = parseCetStore(await file.text());
      if (!window.confirm(t('cet.importConfirm', { words: Object.keys(data.words).length, days: Object.keys(data.days).length }))) return;
      update(() => data);
      setMessage('importSuccess');
    } catch { setMessage('importError'); }
  };
  return <div className="space-y-6"><PageTitle title={t('cet.settings')} />
    {message && <p role="status" className="rounded-xl bg-brand-50 p-4 text-sm text-brand-700 dark:bg-brand-900/30 dark:text-brand-200">{t(`cet.${message}`)}</p>}
    <form className={`${panel} space-y-6`} onSubmit={event => {
      event.preventDefault();
      const newCount = Number(dailyNew); const reviewCount = Number(dailyReview);
      saveSettings({ ...settings, dailyNew: newCount, dailyReview: reviewCount });
      setMessage('settingsSaved');
    }}><BookSelect value={settings.book} onChange={book => setSettings({ ...settings, book })} />
      <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium">{t('cet.dailyNew')}<input className={`${input} mt-2`} type="number" min="10" max="200" step="1" required value={dailyNew} onChange={e => setDailyNew(e.target.value)} /></label><label className="block text-sm font-medium">{t('cet.dailyReview')}<input className={`${input} mt-2`} type="number" min="1" max="10000" step="1" required value={dailyReview} onChange={e => setDailyReview(e.target.value)} /></label></div><p className={muted}>{t('cet.limitsHint')}</p>
      <label className="block text-sm font-medium">{t('cet.accent')}<select aria-label={t('cet.accent')} className={`${input} mt-2`} value={settings.accent} onChange={e => setSettings({ ...settings, accent: e.target.value as 'en-US' | 'en-GB' })}><option value="en-US">{t('cet.american')}</option><option value="en-GB">{t('cet.british')}</option></select></label>
      <label className="flex items-center gap-3 text-sm font-medium"><input className="h-4 w-4 accent-brand-600" type="checkbox" checked={settings.autoSpeak} onChange={e => setSettings({ ...settings, autoSpeak: e.target.checked })} />{t('cet.autoSpeak')}</label><p className={muted}>{t('cet.speechHint')}</p>
      <button className={primary} type="submit">{t('cet.saveSettings')}</button>
    </form>
    <section className={`${panel} space-y-4`}><h3 className="font-semibold">{t('cet.backup')}</h3><p className={muted}>{t('cet.backupHint')}</p><div className="flex flex-wrap gap-3"><button className={secondary} onClick={() => { downloadFile(JSON.stringify(store, null, 2), `lingovault-cet-${studyDay(Date.now())}.json`, 'application/json'); setMessage('exportSuccess'); }}><Download size={18} />{t('cet.export')}</button><label className={`${secondary} cursor-pointer`}><Upload size={18} />{t('cet.import')}<input aria-label={t('cet.import')} type="file" accept=".json,application/json" className="sr-only" onChange={importFile} /></label></div></section>
    <button className={secondary} onClick={openAppearance}><Settings size={18} />{t('cet.appearance')}</button>
  </div>;
}
