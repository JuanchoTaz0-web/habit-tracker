// src/utils/items.js — reglas del modelo y selectores puros (sin React)
import { MAX_CALENDAR_HABITS } from '../constants/theme';
import { ALL_WEEKDAYS, addDays, dateFromParts, getDaysInMonth, weekdayOf } from './dates';
import { uid } from './id';

/*
  Item = {
    id, title, sectionId,
    recurrence: 'daily' | 'once',     // 'daily' = tarea fija que se repite
    date: 'YYYY-MM-DD' | null,        // solo 'once'
    startDate: 'YYYY-MM-DD' | null,   // solo 'daily': visible desde esta fecha
    weekdays: number[],               // solo 'daily': 0=dom … 6=sáb
    kind: 'check' | 'counter' | 'steps',
    target, step, unit,               // 'counter': ej. 3 L en pasos de 1 L
    subtasks: [{ id, title }],        // 'steps': pasos con nombre
    priority: 'normal' | 'high',
    reminder: 'HH:mm' | null,
    color, showInCalendar, order, createdAt
  }
  Log (por fecha e ítem) = { status: null | 'done' | 'missed', value: number, done: subtaskId[] }
*/

const EPS = 1e-9;
export const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0);
const round2 = (n) => Math.round(n * 100) / 100;

export const segmentCount = (item) =>
  item.kind === 'counter' ? Math.max(1, Math.ceil(item.target / item.step - EPS)) : 0;

// ---------------- Normalización ----------------

export function normalizeItem(data, { date, order = 0 } = {}) {
  const kind = ['check', 'counter', 'steps'].includes(data.kind) ? data.kind : 'check';
  const recurrence = data.recurrence === 'once' ? 'once' : 'daily';
  const target = round2(Math.max(0.01, Number(data.target) || 1));
  const step = round2(Math.min(target, Math.max(0.01, Number(data.step) || 1)));
  const weekdays = Array.isArray(data.weekdays) && data.weekdays.length
    ? [...new Set(data.weekdays.map(Number))].sort((a, b) => a - b)
    : ALL_WEEKDAYS;

  return {
    id: data.id ?? uid('it'),
    title: String(data.title ?? '').trim(),
    sectionId: data.sectionId ?? null,
    recurrence,
    date: recurrence === 'once' ? data.date ?? date : null,
    startDate: recurrence === 'daily' ? data.startDate ?? date : null,
    weekdays: recurrence === 'daily' ? weekdays : ALL_WEEKDAYS,
    kind,
    target: kind === 'counter' ? target : null,
    step: kind === 'counter' ? step : null,
    unit: kind === 'counter' ? String(data.unit ?? '').trim() : '',
    subtasks:
      kind === 'steps'
        ? (data.subtasks ?? [])
            .filter((s) => s?.title?.trim())
            .map((s) => ({ id: s.id ?? uid('st'), title: s.title.trim() }))
        : [],
    priority: data.priority === 'high' ? 'high' : 'normal',
    reminder: data.reminder || null,
    color: data.color ?? 'indigo',
    showInCalendar: recurrence === 'daily' ? data.showInCalendar !== false : false,
    order: data.order ?? order,
    createdAt: data.createdAt ?? new Date().toISOString(),
  };
}

// ---------------- Reglas por ítem ----------------

export function matchesWeekday(item, date) {
  return !item.weekdays?.length || item.weekdays.includes(weekdayOf(date));
}

export function isScheduled(item, date) {
  if (item.recurrence === 'once') return item.date === date;
  if (item.startDate && date < item.startDate) return false;
  return matchesWeekday(item, date);
}

/** Programado ese día, o un hábito fijo registrado antes de su fecha de inicio (relleno desde el calendario) */
export function isActiveOn(item, date, log) {
  if (isScheduled(item, date)) return true;
  return item.recurrence === 'daily' && Boolean(log) && matchesWeekday(item, date);
}

export function getProgress(item, log) {
  if (item.kind === 'counter') {
    const total = item.target || 1;
    const value = Math.min(total, Math.max(0, log?.value ?? 0));
    return { value, total, ratio: value / total };
  }
  if (item.kind === 'steps') {
    const ids = new Set(log?.done ?? []);
    const total = item.subtasks.length;
    const value = item.subtasks.filter((s) => ids.has(s.id)).length;
    return { value, total, ratio: total ? value / total : 0 };
  }
  const value = log?.status === 'done' ? 1 : 0;
  return { value, total: 1, ratio: value };
}

/** Estado efectivo: explícito (swipe) o derivado del progreso completo */
export function getStatus(item, log) {
  if (log?.status) return log.status;
  if (item.kind !== 'check') {
    const p = getProgress(item, log);
    if (p.total > 0 && p.value >= p.total - EPS) return 'done';
  }
  return null;
}

/** Puntaje 0..1 usado en resúmenes y estadísticas */
export function getScore(item, log) {
  const status = getStatus(item, log);
  if (status === 'done') return 1;
  if (status === 'missed') return 0;
  return getProgress(item, log).ratio;
}

// ---------------- Selectores diarios ----------------

export function getDayItems(items, logs, date) {
  const dayLogs = logs[date] ?? {};
  return items
    .filter((item) => isActiveOn(item, date, dayLogs[item.id]))
    .map((item) => {
      const log = dayLogs[item.id];
      return {
        ...item,
        log,
        status: getStatus(item, log),
        progress: getProgress(item, log),
        score: getScore(item, log),
      };
    });
}

export function getDayRatio(items, logs, date) {
  const dayLogs = logs[date] ?? {};
  const scheduled = items.filter((item) => isActiveOn(item, date, dayLogs[item.id]));
  if (!scheduled.length) return null;
  return scheduled.reduce((acc, item) => acc + getScore(item, dayLogs[item.id]), 0) / scheduled.length;
}

export const GENERAL_SECTION = { id: null, name: 'General', emoji: '📌', color: 'slate', collapsed: false };

export function groupBySection(sections, dayItems) {
  const groups = [...sections].sort(byOrder).map((section) => ({
    section,
    items: dayItems.filter((i) => i.sectionId === section.id).sort(byOrder),
  }));
  const known = new Set(sections.map((s) => s.id));
  const orphans = dayItems.filter((i) => !known.has(i.sectionId)).sort(byOrder);
  if (orphans.length) groups.push({ section: GENERAL_SECTION, items: orphans });
  return groups;
}

export function getDaySummary(dayItems, { isToday, now }) {
  const total = dayItems.length;
  const done = dayItems.filter((i) => i.status === 'done').length;
  const missed = dayItems.filter((i) => i.status === 'missed').length;
  const pendingItems = dayItems.filter((i) => i.status === null);
  const ratio = total ? dayItems.reduce((a, i) => a + i.score, 0) / total : 0;

  const withReminder = pendingItems
    .filter((i) => i.reminder)
    .sort((a, b) => a.reminder.localeCompare(b.reminder));

  return {
    total,
    done,
    missed,
    pending: pendingItems.length,
    ratio,
    high: pendingItems.filter((i) => i.priority === 'high'),
    next: isToday ? withReminder.find((i) => i.reminder >= now) ?? null : withReminder[0] ?? null,
    late: isToday ? withReminder.filter((i) => i.reminder < now) : [],
  };
}

// ---------------- Calendario y estadísticas ----------------

export function getDailyItemsSorted(items, sections) {
  const sectionOrder = new Map(sections.map((s) => [s.id, s.order]));
  return items
    .filter((i) => i.recurrence === 'daily')
    .sort(
      (a, b) =>
        (sectionOrder.get(a.sectionId) ?? 999) - (sectionOrder.get(b.sectionId) ?? 999) ||
        byOrder(a, b)
    );
}

export const getCalendarItems = (items, sections) =>
  getDailyItemsSorted(items, sections)
    .filter((i) => i.showInCalendar)
    .slice(0, MAX_CALENDAR_HABITS);

/** { [itemId]: { [day]: status } } para el RadialGrid */
export function getMonthEntries(items, logs, year, month) {
  const days = getDaysInMonth(year, month);
  const entries = {};
  for (const item of items) {
    entries[item.id] = {};
    for (let day = 1; day <= days; day++) {
      const date = dateFromParts(year, month, day);
      entries[item.id][day] = getStatus(item, logs[date]?.[item.id]);
    }
  }
  return entries;
}

export function getCurrentStreak(item, logs, fromDate) {
  let streak = 0;
  let date = fromDate;
  for (let i = 0; i < 400; i++, date = addDays(date, -1)) {
    const log = logs[date]?.[item.id];
    if (!matchesWeekday(item, date)) continue; // días no programados no rompen la racha
    if (item.startDate && date < item.startDate && !log) break;
    const status = getStatus(item, log);
    if (status === 'done') streak++;
    else if (date === fromDate) continue; // hoy aún está en curso
    else break;
  }
  return streak;
}

export function getMonthStats(items, logs, habits, year, month, today) {
  const days = getDaysInMonth(year, month);
  const dates = Array.from({ length: days }, (_, i) => dateFromParts(year, month, i + 1));
  const dailyRatios = dates.map((d) => (d > today ? null : getDayRatio(items, logs, d)));
  const elapsed = dailyRatios.filter((r) => r !== null);

  const habitStats = habits.map((item) => {
    let done = 0;
    let missed = 0;
    let scheduled = 0;
    let run = 0;
    let best = 0;
    for (const date of dates) {
      if (date > today) break;
      if (!matchesWeekday(item, date)) continue;
      const log = logs[date]?.[item.id];
      if (!isActiveOn(item, date, log)) {
        run = 0; // antes de su inicio y sin registro: corta la racha pero no cuenta como fallo
        continue;
      }
      scheduled++;
      const status = getStatus(item, log);
      if (status === 'done') {
        done++;
        run++;
        best = Math.max(best, run);
      } else {
        if (status === 'missed') missed++;
        if (date !== today) run = 0;
      }
    }
    return {
      id: item.id,
      name: item.title,
      color: item.color,
      done,
      missed,
      scheduled,
      rate: scheduled ? done / scheduled : 0,
      best,
      current: getCurrentStreak(item, logs, today),
    };
  });

  return {
    dailyRatios,
    completion: elapsed.length ? elapsed.reduce((a, r) => a + r, 0) / elapsed.length : 0,
    perfectDays: elapsed.filter((r) => r >= 1 - EPS).length,
    trackedDays: elapsed.length,
    bestStreak: habitStats.reduce((m, h) => Math.max(m, h.best), 0),
    habits: habitStats,
  };
}
