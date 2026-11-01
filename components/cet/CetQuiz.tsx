import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { inBook } from '../../utils/srs';
import { makeQuiz, matchesSpelling, type QuizMode, type QuizQuestion } from '../../utils/cetQuiz';
import { useCet } from './CetContext';
import { CetWordDetail } from './CetWordDetail';
import { input, muted, PageTitle, panel, primary, secondary } from './ui';
import { useStudyTimer } from './useStudyTimer';

export function CetQuiz() {
  const { t } = useTranslation();
  const { data, store, quizAnswer, paused, update, navigate } = useCet();
  const [mode, setMode] = useState<QuizMode>('choice');
  const [count, setCount] = useState(10);
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [checked, setChecked] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [empty, setEmpty] = useState(false);
  const question = questions?.[index];
  const learned = data.words.filter(word => store.words[word.id]?.reps && inBook(word, store.settings.book) && word.meaning.trim());
  useStudyTimer(!!question && !paused, update);
  const check = (value: string) => {
    if (!question || checked !== null) return;
    const correct = mode === 'choice' ? value === question.word.id : matchesSpelling(question.word, value);
    quizAnswer(question.word.id, correct);
    setAnswer(value); setChecked(correct);
    if (correct) setScore(value => value + 1);
  };
  const reset = () => { setQuestions(null); setIndex(0); setAnswer(''); setChecked(null); setScore(0); };
  if (!questions) return <div className="space-y-6"><PageTitle title={t('cet.quiz')} hint={t('cet.quizHint')} /><section className={`${panel} space-y-6`}>
    <label className="block space-y-2"><span className="text-sm font-medium">{t('cet.quizMode')}</span><select className={input} value={mode} onChange={e => setMode(e.target.value as QuizMode)}><option value="choice">{t('cet.choice')}</option><option value="spelling">{t('cet.spelling')}</option></select></label>
    <label className="block space-y-2"><span className="text-sm font-medium">{t('cet.questionCount')}</span><select className={input} value={count} onChange={e => setCount(Number(e.target.value))}>{[10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}</select></label>
    <p className={muted}>{t('cet.quizAvailable', { count: learned.length })}</p>{mode === 'choice' && <p className={muted}>{t('cet.choiceHint')}</p>}
    <button className={primary} disabled={!learned.length} onClick={() => { const quiz = makeQuiz(learned, data.words, mode, count); setEmpty(!quiz.length); if (quiz.length) setQuestions(quiz); }}>{t('cet.quizStart')}</button>
    {(empty || !learned.length) && <p className={muted} role="status">{t('cet.quizEmpty')}</p>}
  </section></div>;
  if (!question) return <section className={`${panel} flex min-h-[50vh] flex-col items-center justify-center gap-5 text-center`}><CheckCircle2 size={48} className="text-brand-500" /><h2 className="text-3xl font-bold">{t('cet.quizResult', { correct: score, total: questions.length })}</h2><p className={muted}>{t('cet.quizSaved')}</p><button className={primary} onClick={reset}>{t('cet.quizAgain')}</button></section>;
  return <div className="mx-auto max-w-3xl space-y-6"><header className="flex items-center justify-between gap-3"><p className={muted}>{t('cet.quizProgress', { current: index + 1, total: questions.length })}</p><button className={secondary} onClick={() => navigate('cetToday')}>{t('cet.quizExit')}</button></header>
    <section className={`${panel} space-y-8`}><h2 className="py-8 text-center text-3xl font-bold sm:text-4xl">{mode === 'choice' ? question.word.word : question.word.meaning}{mode === 'choice' && question.word.homograph && <sup className="ml-2 text-base text-slate-400">{question.word.homograph}</sup>}</h2>
      {mode === 'choice' ? <div className="grid gap-3">{question.options.map((option, i) => <button key={option.id} disabled={checked !== null} className={`${secondary} !justify-start text-left ${checked !== null && option.id === question.word.id ? '!border-emerald-500 !text-emerald-600 !opacity-100' : checked === false && answer === option.id ? '!border-red-400 !text-red-500 !opacity-100' : ''}`} onClick={() => check(option.id)}><span className="mr-2 text-slate-400">{'ABCD'[i]}</span>{option.meaning}</button>)}</div> : <form className="space-y-4" onSubmit={e => { e.preventDefault(); check(answer); }}><input key={index} autoFocus className={input} aria-label={t('cet.spellPlaceholder')} placeholder={t('cet.spellPlaceholder')} value={answer} onChange={e => setAnswer(e.target.value)} autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} disabled={checked !== null} /><button className={`${primary} w-full`} type="submit" disabled={!answer.trim() || checked !== null}>{t('cet.submit')}</button></form>}
      {checked !== null && <div className="space-y-5" role="status"><p className={`flex items-center gap-2 font-semibold ${checked ? 'text-emerald-600' : 'text-red-500'}`}>{checked ? <CheckCircle2 size={20} /> : <XCircle size={20} />}{t(checked ? 'cet.correct' : 'cet.incorrect')}</p><p>{t('cet.answer', { word: [question.word.word, ...(question.word.alts ?? [])].join(' / ') })}</p><CetWordDetail word={question.word} /><button className={`${primary} w-full`} onClick={() => { setIndex(value => value + 1); setAnswer(''); setChecked(null); }}>{t('cet.next')}<ArrowRight size={18} /></button></div>}
    </section></div>;
}
