import React, { useEffect, useMemo, useRef, useState } from 'react';
import { WordItem } from '../types';
import { useTranslation } from 'react-i18next';

interface FullScreenDrillProps {
  words: WordItem[];
  onToggleMastered: (wordId: string, nextValue?: number) => void;
}

type PopoverPosition = { top: number; left: number } | null;

const DEFAULT_BATCH_SIZE = 80;

const estimateBatchSize = () => {
  if (typeof window === 'undefined') return DEFAULT_BATCH_SIZE;
  const lineHeightPx = 32;
  const estimatedRows = Math.ceil((window.innerHeight * 1.5) / lineHeightPx);
  return Math.max(estimatedRows * 2, DEFAULT_BATCH_SIZE);
};

export const FullScreenDrill: React.FC<FullScreenDrillProps> = ({ words, onToggleMastered }) => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const wordRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const batchSizeRef = useRef<number>(estimateBatchSize());
  const [visibleCount, setVisibleCount] = useState<number>(() => Math.min(words.length, batchSizeRef.current));
  const [activeWordId, setActiveWordId] = useState<string | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<PopoverPosition>(null);

  const visibleWords = useMemo(() => words.slice(0, visibleCount), [words, visibleCount]);
  const activeWord = useMemo(() => words.find(word => word.id === activeWordId) || null, [words, activeWordId]);

  useEffect(() => {
    const handleResize = () => {
      const nextBatch = estimateBatchSize();
      batchSizeRef.current = nextBatch;
      setVisibleCount(prev => Math.min(words.length, Math.max(prev, nextBatch)));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [words.length]);

  useEffect(() => {
    setVisibleCount(prev => Math.min(words.length, Math.max(prev, batchSizeRef.current)));
  }, [words.length]);

  useEffect(() => {
    const active = activeWordId;
    if (!active || !containerRef.current || !wordRefs.current[active]) return;

    const wordEl = wordRefs.current[active];
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const wordRect = wordEl!.getBoundingClientRect();

    const verticalOffset = 12;
    let top = wordRect.bottom - containerRect.top + container.scrollTop + verticalOffset;
    let left = wordRect.left - containerRect.left + container.scrollLeft;

    const containerWidth = container.clientWidth;
    const maxWidth = Math.min(320, containerWidth - 24);
    if (left + maxWidth > containerWidth) {
      left = Math.max(12, containerWidth - maxWidth - 12);
    }

    setPopoverPosition({ top, left });
  }, [activeWordId, words]);

  useEffect(() => {
    const container = containerRef.current;
    const sentinel = sentinelRef.current;
    if (!container || !sentinel) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          setVisibleCount(prev => Math.min(words.length, prev + batchSizeRef.current));
        }
      },
      { root: container, rootMargin: '40%' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount, words.length]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setActiveWordId(null);
        setPopoverPosition(null);
      }
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveWordId(null);
        setPopoverPosition(null);
      }
    };

    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleScroll = () => {
      setActiveWordId(null);
      setPopoverPosition(null);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!activeWord) {
      setActiveWordId(null);
      setPopoverPosition(null);
    }
  }, [activeWord]);

  const handleWordClick = (event: React.MouseEvent<HTMLDivElement>, word: WordItem) => {
    event.stopPropagation();

    const nextValue = word.isMastered === 1 ? 0 : 1;
    onToggleMastered(word.id, nextValue);
    setActiveWordId(word.id);
  };

  const handleContainerClick = () => {
    setActiveWordId(null);
    setPopoverPosition(null);
  };

  return (
    <div
      ref={containerRef}
      className="relative h-[calc(100vh-7rem)] w-full overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm"
      onClick={handleContainerClick}
    >
      {visibleWords.length === 0 ? (
        <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
          {t('drillNoWords')}
        </div>
      ) : (
        <div className="px-6 py-8">
          <div className="columns-2 gap-8">
            {visibleWords.map(word => (
              <div
                key={word.id}
                ref={el => {
                  if (el) {
                    wordRefs.current[word.id] = el;
                  } else {
                    delete wordRefs.current[word.id];
                  }
                }}
                onClick={event => handleWordClick(event, word)}
                className={`mb-4 break-inside-avoid cursor-pointer select-none text-lg font-medium transition-colors ${
                  word.isMastered === 1
                    ? 'text-slate-400 dark:text-slate-500'
                    : 'text-slate-900 dark:text-slate-100'
                }`}
                style={{ lineHeight: 1.5 }}
              >
                {word.english}
              </div>
            ))}
          </div>
          {visibleCount < words.length && (
            <div ref={sentinelRef} className="mt-6 h-12 w-full break-inside-avoid" aria-hidden="true" />
          )}
        </div>
      )}

      {activeWord && popoverPosition && (
        <div
          className="pointer-events-none absolute z-30 max-w-xs rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-xl dark:border-slate-700 dark:bg-slate-950"
          style={{ top: popoverPosition.top, left: popoverPosition.left, width: 'min(320px, calc(100% - 24px))' }}
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            {t('drillMeaning')}
          </div>
          <div className="mt-1 text-base font-medium text-slate-800 dark:text-slate-100">
            {activeWord.chinese || t('drillNoMeaning')}
          </div>
        </div>
      )}
    </div>
  );
};
