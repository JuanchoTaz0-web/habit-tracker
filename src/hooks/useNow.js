// src/hooks/useNow.js — hora actual 'HH:mm', se refresca cada 30 s
import { useEffect, useState } from 'react';
import { nowTime } from '../utils/dates';

export default function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(nowTime);
  useEffect(() => {
    const id = setInterval(() => setNow(nowTime()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
