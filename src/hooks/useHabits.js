// src/hooks/useHabits.js — estado global persistido en LocalStorage (modelo v3)
import { useCallback, useEffect, useMemo, useState } from 'react';
import { addDays, getDaysInMonth, monthKey, parseDateKey, todayKey } from '../utils/dates';
import { uid } from '../utils/id';
import {
  byOrder,
  getCalendarItems,
  getDailyItemsSorted,
  getDayItems,
  getDayRatio,
  getDaySummary,
  getMonthEntries,
  getMonthStats,
  getStatus,
  groupBySection,
  normalizeItem,
} from '../utils/items';
import { loadState, persistState } from '../utils/storage';
import useNow from './useNow';

const EMPTY_LOG = { status: null, value: 0, done: [] };
const STATUS_CYCLE = { null: 'done', done: 'missed', missed: null };
const isEmptyLog = (l) => !l || (!l.status && !l.value && !l.done?.length);
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const round2 = (n) => Math.round(n * 100) / 100;

/** Aplica un estado explícito rellenando el progreso cuando se marca como hecho */
function applyStatus(log, item, status) {
  if (!status) return null; // desmarcar = limpiar el registro del día
  if (status === 'missed') return { ...log, status };
  if (item.kind === 'counter') return { ...log, status, value: item.target };
  if (item.kind === 'steps') return { ...log, status, done: item.subtasks.map((s) => s.id) };
  return { ...log, status };
}

const reorder = (list) => list.map((x, order) => ({ ...x, order }));

export default function useHabits() {
  const [state, setState] = useState(loadState);
  const now = useNow();

  useEffect(() => {
    persistState(state);
  }, [state]);

  // ======================= Navegación =======================

  const setSelectedDate = useCallback(
    (date) =>
      setState((p) => {
        const d = parseDateKey(date);
        return { ...p, selectedDate: date, selectedPeriod: { year: d.getFullYear(), month: d.getMonth() + 1 } };
      }),
    []
  );

  const setPeriod = useCallback(
    (year, month) => setState((p) => ({ ...p, selectedPeriod: { year, month } })),
    []
  );

  const shiftPeriod = useCallback(
    (delta) =>
      setState((p) => {
        const d = new Date(p.selectedPeriod.year, p.selectedPeriod.month - 1 + delta, 1);
        return { ...p, selectedPeriod: { year: d.getFullYear(), month: d.getMonth() + 1 } };
      }),
    []
  );

  // ======================= Secciones =======================

  const addSection = useCallback(({ name, emoji = '✨', color = 'indigo' }) => {
    const clean = name?.trim();
    if (!clean) return null;
    const id = uid('sec');
    setState((p) => ({
      ...p,
      sections: [...p.sections, { id, name: clean, emoji, color, order: p.sections.length, collapsed: false }],
    }));
    return id;
  }, []);

  const updateSection = useCallback(
    (id, changes) =>
      setState((p) => ({
        ...p,
        sections: p.sections.map((s) =>
          s.id === id
            ? { ...s, ...changes, name: changes.name !== undefined ? changes.name.trim() || s.name : s.name }
            : s
        ),
      })),
    []
  );

  const toggleSection = useCallback(
    (id) =>
      setState((p) => ({
        ...p,
        sections: p.sections.map((s) => (s.id === id ? { ...s, collapsed: !s.collapsed } : s)),
      })),
    []
  );

  const moveSection = useCallback(
    (id, dir) =>
      setState((p) => {
        const list = [...p.sections].sort(byOrder);
        const i = list.findIndex((s) => s.id === id);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= list.length) return p;
        [list[i], list[j]] = [list[j], list[i]];
        return { ...p, sections: reorder(list) };
      }),
    []
  );

  /** Borra la sección; sus tareas pasan al grupo "General" (no se pierden) */
  const removeSection = useCallback(
    (id) =>
      setState((p) => ({
        ...p,
        sections: reorder(p.sections.filter((s) => s.id !== id).sort(byOrder)),
        items: p.items.map((it) => (it.sectionId === id ? { ...it, sectionId: null } : it)),
      })),
    []
  );

  // ======================= Tareas / hábitos =======================

  const addItem = useCallback((data) => {
    if (!data?.title?.trim()) return null;
    const id = uid('it');
    setState((p) => {
      const order = p.items.filter((i) => i.sectionId === (data.sectionId ?? null)).length;
      const item = normalizeItem({ ...data, id }, { date: p.selectedDate, order });
      return { ...p, items: [...p.items, item] };
    });
    return id;
  }, []);

  const updateItem = useCallback(
    (id, changes) =>
      setState((p) => ({
        ...p,
        items: p.items.map((it) => {
          if (it.id !== id) return it;
          const movedSection = changes.sectionId !== undefined && changes.sectionId !== it.sectionId;
          const order = movedSection
            ? p.items.filter((i) => i.sectionId === changes.sectionId).length
            : it.order;
          return normalizeItem({ ...it, ...changes, id, order, createdAt: it.createdAt }, { date: p.selectedDate });
        }),
      })),
    []
  );

  const removeItem = useCallback(
    (id) =>
      setState((p) => {
        const logs = {};
        for (const [date, dayLogs] of Object.entries(p.logs)) {
          const { [id]: _removed, ...rest } = dayLogs;
          if (Object.keys(rest).length) logs[date] = rest;
        }
        return { ...p, items: p.items.filter((i) => i.id !== id), logs };
      }),
    []
  );

  const moveItem = useCallback(
    (id, dir) =>
      setState((p) => {
        const item = p.items.find((i) => i.id === id);
        if (!item) return p;
        const siblings = p.items.filter((i) => i.sectionId === item.sectionId).sort(byOrder);
        const i = siblings.findIndex((s) => s.id === id);
        const j = i + dir;
        if (j < 0 || j >= siblings.length) return p;
        [siblings[i], siblings[j]] = [siblings[j], siblings[i]];
        const orders = new Map(siblings.map((s, k) => [s.id, k]));
        return { ...p, items: p.items.map((it) => (orders.has(it.id) ? { ...it, order: orders.get(it.id) } : it)) };
      }),
    []
  );

  /** Solo tareas de un día: las mueve N días hacia adelante */
  const postponeItem = useCallback(
    (id, days = 1) =>
      setState((p) => {
        const item = p.items.find((i) => i.id === id);
        if (!item || item.recurrence !== 'once') return p;
        const logs = { ...p.logs };
        if (logs[item.date]?.[id]) {
          const { [id]: _old, ...rest } = logs[item.date];
          if (Object.keys(rest).length) logs[item.date] = rest;
          else delete logs[item.date];
        }
        return {
          ...p,
          logs,
          items: p.items.map((it) => (it.id === id ? { ...it, date: addDays(it.date, days) } : it)),
        };
      }),
    []
  );

  // ======================= Registros diarios =======================

  const patchLog = useCallback(
    (itemId, date, fn) =>
      setState((p) => {
        const item = p.items.find((i) => i.id === itemId);
        if (!item) return p;
        const d = date ?? p.selectedDate;
        const dayLogs = p.logs[d] ?? {};
        const next = fn({ ...EMPTY_LOG, ...dayLogs[itemId] }, item);
        const nextDay = { ...dayLogs };
        if (isEmptyLog(next)) delete nextDay[itemId];
        else nextDay[itemId] = next;
        const logs = { ...p.logs };
        if (Object.keys(nextDay).length) logs[d] = nextDay;
        else delete logs[d];
        return { ...p, logs };
      }),
    []
  );

  /** status: 'done' | 'missed' | null — usado por el swipe */
  const setStatus = useCallback(
    (itemId, status, date) => patchLog(itemId, date, (log, item) => applyStatus(log, item, status)),
    [patchLog]
  );

  /** null → done → missed → null — usado por el calendario radial */
  const cycleStatus = useCallback(
    (itemId, date) =>
      patchLog(itemId, date, (log, item) => applyStatus(log, item, STATUS_CYCLE[getStatus(item, log)])),
    [patchLog]
  );

  const addToCounter = useCallback(
    (itemId, delta, date) =>
      patchLog(itemId, date, (log, item) => ({
        ...log,
        status: null,
        value: round2(clamp((log.value ?? 0) + delta, 0, item.target)),
      })),
    [patchLog]
  );

  const setCounter = useCallback(
    (itemId, value, date) =>
      patchLog(itemId, date, (log, item) => ({ ...log, status: null, value: round2(clamp(value, 0, item.target)) })),
    [patchLog]
  );

  const toggleStep = useCallback(
    (itemId, subId, date) =>
      patchLog(itemId, date, (log) => ({
        ...log,
        status: null,
        done: log.done.includes(subId) ? log.done.filter((x) => x !== subId) : [...log.done, subId],
      })),
    [patchLog]
  );

  const setNotes = useCallback(
    (text) =>
      setState((p) => ({
        ...p,
        notes: { ...p.notes, [monthKey(p.selectedPeriod.year, p.selectedPeriod.month)]: text },
      })),
    []
  );

  // ======================= Derivados =======================

  const { items, logs, sections: rawSections, selectedDate, selectedPeriod: period } = state;
  const today = todayKey();

  const sections = useMemo(() => [...rawSections].sort(byOrder), [rawSections]);
  const dayItems = useMemo(() => getDayItems(items, logs, selectedDate), [items, logs, selectedDate]);
  const groups = useMemo(() => groupBySection(sections, dayItems), [sections, dayItems]);
  const summary = useMemo(
    () => getDaySummary(dayItems, { isToday: selectedDate === today, now }),
    [dayItems, selectedDate, today, now]
  );
  const dayRatio = useCallback((date) => getDayRatio(items, logs, date), [items, logs]);

  const dailyItems = useMemo(() => getDailyItemsSorted(items, sections), [items, sections]);
  const calendarItems = useMemo(() => getCalendarItems(items, sections), [items, sections]);
  const calendarCount = useMemo(
    () => items.filter((i) => i.recurrence === 'daily' && i.showInCalendar).length,
    [items]
  );
  const daysInMonth = getDaysInMonth(period.year, period.month);
  const monthEntries = useMemo(
    () => getMonthEntries(calendarItems, logs, period.year, period.month),
    [calendarItems, logs, period.year, period.month]
  );
  const monthStats = useMemo(
    () => getMonthStats(items, logs, dailyItems, period.year, period.month, today),
    [items, logs, dailyItems, period.year, period.month, today]
  );
  const notes = state.notes[monthKey(period.year, period.month)] ?? '';

  return {
    // lectura
    selectedDate,
    period,
    daysInMonth,
    sections,
    items,
    groups,
    summary,
    dayRatio,
    calendarItems,
    calendarCount,
    monthEntries,
    monthStats,
    notes,
    // navegación
    setSelectedDate,
    setPeriod,
    shiftPeriod,
    // secciones
    addSection,
    updateSection,
    toggleSection,
    moveSection,
    removeSection,
    // tareas
    addItem,
    updateItem,
    removeItem,
    moveItem,
    postponeItem,
    // registros
    setStatus,
    cycleStatus,
    addToCounter,
    setCounter,
    toggleStep,
    setNotes,
  };
}
