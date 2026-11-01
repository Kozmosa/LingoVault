import { useEffect } from 'react';
import type { CetStore } from '../../types/cet';
import { dayOffset, emptyLog, studyDay } from '../../utils/srs';

const IDLE_LIMIT_MS = 60_000;
const ACTIVITY_EVENTS = ['keydown', 'pointerdown', 'pointermove', 'wheel'] as const;

/** Count foreground study time, flush every five seconds and on blur/unmount; no input for 60 s stops the clock. */
export function useStudyTimer(active: boolean, update: (change: (data: CetStore) => CetStore) => void) {
  useEffect(() => {
    if (!active) return;
    let started = Date.now();
    let lastActivity = started;
    let running = document.visibilityState === 'visible' && document.hasFocus();
    const touch = () => { lastActivity = Date.now(); };
    const flush = () => {
      const now = Date.now();
      // Stop counting once the user has been idle for IDLE_LIMIT_MS.
      const end = Math.min(now, lastActivity + IDLE_LIMIT_MS);
      if (running && end > started) {
        const from = started;
        update(store => {
          const days = { ...store.days };
          // Split exactly at 04:00, even when a tab was left open across the boundary.
          let cursor = from;
          while (cursor < end) {
            const day = studyDay(cursor);
            const [year, month, date] = dayOffset(day, 1).split('-').map(Number);
            const segmentEnd = Math.min(end, new Date(year, month - 1, date, 4).getTime());
            const log = days[day] ?? emptyLog();
            days[day] = { ...log, seconds: log.seconds + (segmentEnd - cursor) / 1000 };
            cursor = segmentEnd;
          }
          return { ...store, days };
        });
      }
      started = now;
    };
    const sync = () => { flush(); running = document.visibilityState === 'visible' && document.hasFocus(); };
    const interval = window.setInterval(flush, 5000);
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('focus', sync);
    window.addEventListener('blur', sync);
    window.addEventListener('pagehide', flush);
    ACTIVITY_EVENTS.forEach(name => window.addEventListener(name, touch, { passive: true }));
    return () => {
      flush(); window.clearInterval(interval);
      ACTIVITY_EVENTS.forEach(name => window.removeEventListener(name, touch));
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('focus', sync); window.removeEventListener('blur', sync);
      window.removeEventListener('pagehide', flush);
    };
  }, [active, update]);
}
