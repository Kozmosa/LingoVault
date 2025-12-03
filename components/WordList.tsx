import React, { useEffect, useState } from 'react';
import { WordItem } from '../types';
import { Trash2, Edit2, Volume2, Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface WordListProps {
  words: WordItem[];
  onDelete: (id: string) => void;
  onUpdate: (word: WordItem) => void;
}

const WordCard: React.FC<{ word: WordItem; onDelete: (id: string) => void; onUpdate: (w: WordItem) => void }> = ({ word, onDelete, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(word);
  const { t, i18n } = useTranslation();
  const isMastered = word.isMastered === 1;

  useEffect(() => {
    if (!isEditing) {
      setEditForm(word);
    }
  }, [isEditing, word]);

  const handleSpeak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  const handleSave = () => {
    onUpdate(editForm);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-brand-100 dark:border-brand-900 p-4 transition-all ring-2 ring-brand-500">
        <div className="grid gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">{t('english')}</label>
            <input 
              className="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              value={editForm.english}
              onChange={e => setEditForm({...editForm, english: e.target.value})}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">{t('chinese')}</label>
            <input 
              className="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              value={editForm.chinese}
              onChange={e => setEditForm({...editForm, chinese: e.target.value})}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">{t('example')}</label>
            <textarea 
              className="w-full mt-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              rows={2}
              value={editForm.example || ''}
              onChange={e => setEditForm({...editForm, example: e.target.value})}
            />
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <button 
              onClick={() => setIsEditing(false)}
              className="px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md flex items-center gap-1 transition-colors"
            >
              <X size={16} /> {t('cancel')}
            </button>
            <button 
              onClick={handleSave}
              className="px-3 py-1.5 text-sm bg-brand-600 text-white hover:bg-brand-700 rounded-md flex items-center gap-1 shadow-sm transition-colors"
            >
              <Check size={16} /> {t('save')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group rounded-xl border p-5 transition-all shadow-sm hover:shadow-md ${
        isMastered
          ? 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400'
          : 'border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
      } hover:border-brand-200 dark:hover:border-brand-800`}
    >
      <div className="mb-2 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <h3
            className={`text-xl font-bold ${
              isMastered ? 'text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-100'
            }`}
          >
            {word.english}
          </h3>
          <button
            onClick={() => handleSpeak(word.english)}
            className="rounded-full p-1 text-slate-400 transition-colors hover:bg-brand-50 hover:text-brand-500 dark:hover:bg-slate-800 dark:hover:text-brand-400"
            title="Listen"
          >
            <Volume2 size={18} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {isMastered && (
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {t('mastered')}
            </span>
          )}
          <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={() => setIsEditing(true)}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-slate-800 dark:hover:text-brand-400"
            >
              <Edit2 size={16} />
            </button>
            <button
              onClick={() => onDelete(word.id)}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-slate-800 dark:hover:text-red-400"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>

      <p
        className={`mb-3 text-lg font-medium ${
          isMastered ? 'text-slate-400 dark:text-slate-500' : 'text-slate-600 dark:text-slate-300'
        }`}
      >
        {word.chinese}
      </p>

      {word.example && (
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
          <p className="text-sm italic text-slate-500 dark:text-slate-400">"{word.example}"</p>
        </div>
      )}

      <div
        className={`mt-4 text-right text-xs ${
          isMastered ? 'text-slate-300 dark:text-slate-600' : 'text-slate-400 dark:text-slate-500'
        }`}
      >
        {t('added')} {new Date(word.createdAt).toLocaleDateString(i18n.language.startsWith('zh') ? 'zh-CN' : 'en-US')}
      </div>
    </div>
  );
};

export const WordList: React.FC<WordListProps> = ({ words, onDelete, onUpdate }) => {
  const { t } = useTranslation();

  if (words.length === 0) {
    return (
      <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
        <p className="text-slate-500 dark:text-slate-400 text-lg">{t('noWords')}</p>
        <p className="text-slate-400 dark:text-slate-600 text-sm mt-1">{t('startAdding')}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {words.map(word => (
        <WordCard key={word.id} word={word} onDelete={onDelete} onUpdate={onUpdate} />
      ))}
    </div>
  );
};