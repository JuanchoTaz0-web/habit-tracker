// src/hooks/useTheme.js — claro / oscuro / sistema con la clase `dark` en <html>
import { useCallback, useEffect, useState } from 'react';

export const THEME_KEY = 'habit-tracker:theme';
const MODES = ['light', 'dark', 'system'];
const query = () => window.matchMedia?.('(prefers-color-scheme: dark)');

export default function useTheme() {
  const [mode, setMode] = useState(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      return MODES.includes(saved) ? saved : 'system';
    } catch {
      return 'system';
    }
  });
  const [systemDark, setSystemDark] = useState(() => query()?.matches ?? false);

  useEffect(() => {
    const mq = query();
    if (!mq) return undefined;
    const onChange = (e) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const isDark = mode === 'dark' || (mode === 'system' && systemDark);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', isDark);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', isDark ? '#020617' : '#f1f5f9');
    try {
      localStorage.setItem(THEME_KEY, mode);
    } catch {
      /* ignorar */
    }
  }, [isDark, mode]);

  const cycle = useCallback(
    () => setMode((m) => MODES[(MODES.indexOf(m) + 1) % MODES.length]),
    []
  );

  return { mode, isDark, setMode, cycle };
}
