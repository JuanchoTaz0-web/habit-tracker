// src/utils/storage.js — persistencia, estado inicial y migración desde v1/v2
import { COLORS } from '../constants/theme';
import { pad, todayKey } from './dates';
import { uid } from './id';
import { normalizeItem } from './items';

export const STORAGE_KEY = 'habit-tracker:v3';
const LEGACY_KEYS = ['habit-tracker:v2', 'habit-tracker:v1'];

const currentPeriod = () => {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
};

/*
  State v3 = {
    version: 3,
    selectedDate: 'YYYY-MM-DD',
    selectedPeriod: { year, month },
    sections: [{ id, name, emoji, color, order, collapsed }],
    items: Item[],                                  // ver utils/items.js
    logs: { 'YYYY-MM-DD': { [itemId]: Log } },
    notes: { 'YYYY-MM': string },
  }
*/
export function createInitialState({ seed = true } = {}) {
  const today = todayKey();
  const base = {
    version: 3,
    selectedDate: today,
    selectedPeriod: currentPeriod(),
    sections: [],
    items: [],
    logs: {},
    notes: {},
  };
  if (!seed) return base;

  const sections = [
    { id: 'sec_manana', name: 'Mañana', emoji: '🌅', color: 'amber', order: 0, collapsed: false },
    { id: 'sec_salud', name: 'Salud', emoji: '💧', color: 'sky', order: 1, collapsed: false },
    { id: 'sec_pendientes', name: 'Pendientes', emoji: '📋', color: 'violet', order: 2, collapsed: false },
  ];
  const items = [
    normalizeItem(
      { title: 'Tender la cama', sectionId: 'sec_manana', kind: 'check', color: 'amber', reminder: '07:00' },
      { date: today, order: 0 }
    ),
    normalizeItem(
      { title: 'Beber agua', sectionId: 'sec_salud', kind: 'counter', target: 3, step: 1, unit: 'L', color: 'sky' },
      { date: today, order: 0 }
    ),
    normalizeItem(
      {
        title: 'Rutina de ejercicio',
        sectionId: 'sec_salud',
        kind: 'steps',
        color: 'emerald',
        weekdays: [1, 2, 3, 4, 5],
        subtasks: [{ title: 'Calentamiento 5 min' }, { title: 'Cardio 20 min' }, { title: 'Estiramiento' }],
      },
      { date: today, order: 1 }
    ),
    normalizeItem(
      {
        title: 'Planear la semana',
        sectionId: 'sec_pendientes',
        recurrence: 'once',
        kind: 'check',
        priority: 'high',
        color: 'violet',
      },
      { date: today, order: 0 }
    ),
  ];
  return { ...base, sections, items };
}

const hexToColorKey = (hex) =>
  Object.entries(COLORS).find(([, c]) => c.hex.toLowerCase() === String(hex).toLowerCase())?.[0] ??
  'emerald';

/** v1/v2 → v3: hábitos mensuales → ítems fijos; tareas por fecha → ítems 'once' */
function migrateLegacy(old) {
  const base = createInitialState({ seed: false });
  const habitsSection = { id: uid('sec'), name: 'Hábitos', emoji: '🎯', color: 'emerald', order: 0, collapsed: false };
  const tasksSection = { id: uid('sec'), name: 'Tareas', emoji: '📋', color: 'violet', order: 1, collapsed: false };
  const items = [];
  const logs = {};
  const notes = {};
  const byName = new Map();
  const setLog = (date, id, log) => {
    logs[date] = { ...(logs[date] ?? {}), [id]: log };
  };

  for (const [mk, month] of Object.entries(old.months ?? {}).sort(([a], [b]) => a.localeCompare(b))) {
    if (month.notes) notes[mk] = month.notes;
    for (const h of month.habits ?? []) {
      const nameKey = String(h.name).toLowerCase();
      let item = byName.get(nameKey);
      if (!item) {
        item = normalizeItem(
          {
            title: h.name,
            sectionId: habitsSection.id,
            kind: 'check',
            color: hexToColorKey(h.color),
            startDate: `${mk}-01`,
          },
          { order: items.length }
        );
        byName.set(nameKey, item);
        items.push(item);
      }
      for (const [day, status] of Object.entries(month.entries?.[h.id] ?? {})) {
        if (status) setLog(`${mk}-${pad(Number(day))}`, item.id, { status, value: 0, done: [] });
      }
    }
  }

  for (const [date, list] of Object.entries(old.tasks ?? {})) {
    (list ?? []).forEach((t, i) => {
      const subs = t.subtasks ?? [];
      const item = normalizeItem(
        {
          id: t.id,
          title: t.title,
          sectionId: tasksSection.id,
          recurrence: 'once',
          date,
          kind: subs.length ? 'steps' : 'check',
          subtasks: subs.map((s) => ({ id: s.id, title: s.title })),
          priority: t.priority === 'high' ? 'high' : 'normal',
          reminder: t.reminder,
          color: 'violet',
        },
        { order: i }
      );
      items.push(item);
      const done = subs.filter((s) => s.done).map((s) => s.id);
      if (t.status || done.length) setLog(date, item.id, { status: t.status ?? null, value: 0, done });
    });
  }

  if (!items.length) return createInitialState();
  const sections = [habitsSection, tasksSection]
    .filter((s) => items.some((i) => i.sectionId === s.id))
    .map((s, order) => ({ ...s, order }));
  return { ...base, sections, items, logs, notes };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.version === 3) {
        // La app siempre abre en el día y mes actuales
        return {
          ...createInitialState({ seed: false }),
          ...parsed,
          selectedDate: todayKey(),
          selectedPeriod: currentPeriod(),
        };
      }
    }
    for (const key of LEGACY_KEYS) {
      const legacy = localStorage.getItem(key);
      if (legacy) return migrateLegacy(JSON.parse(legacy));
    }
  } catch {
    /* datos corruptos o storage bloqueado: se arranca limpio */
  }
  return createInitialState();
}

export function persistState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* cuota excedida o modo privado */
  }
}
