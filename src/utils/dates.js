// src/utils/dates.js — todas las fechas se manejan como claves locales 'YYYY-MM-DD'

export const pad = (n) => String(n).padStart(2, '0');

export const toDateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const parseDateKey = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const todayKey = () => toDateKey(new Date());

export const addDays = (key, n) => {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + n);
  return toDateKey(d);
};

export const monthKey = (year, month) => `${year}-${pad(month)}`;
export const dateFromParts = (year, month, day) => `${year}-${pad(month)}-${pad(day)}`;
export const getDaysInMonth = (year, month) => new Date(year, month, 0).getDate();
export const weekdayOf = (key) => parseDateKey(key).getDay();

/** Primer día de la semana (lunes por defecto) que contiene la fecha */
export const startOfWeek = (key, weekStartsOn = 1) => {
  const diff = (weekdayOf(key) - weekStartsOn + 7) % 7;
  return addDays(key, -diff);
};

export const nowTime = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
export const WEEKDAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
export const WEEKDAY_SHORT = ['D', 'L', 'M', 'X', 'J', 'V', 'S']; // índice = getDay()
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]; // lunes → domingo
export const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

export const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** "martes, 29 de septiembre" */
export function formatLongDate(key) {
  const d = parseDateKey(key);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return `${WEEKDAY_NAMES[d.getDay()]}, ${d.getDate()} de ${MONTH_NAMES[d.getMonth()]}${
    sameYear ? '' : ` de ${d.getFullYear()}`
  }`;
}

/** "29 sep" */
export function formatShortDate(key) {
  const d = parseDateKey(key);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3)}`;
}

/** Título relativo: Hoy / Ayer / Mañana / nombre del día */
export function relativeDayTitle(key) {
  const today = todayKey();
  if (key === today) return 'Hoy';
  if (key === addDays(today, -1)) return 'Ayer';
  if (key === addDays(today, 1)) return 'Mañana';
  return capitalize(WEEKDAY_NAMES[weekdayOf(key)]);
}

/** Resume los días de la semana: "Todos los días", "L–V", "L · X · V" */
export function describeWeekdays(weekdays = ALL_WEEKDAYS) {
  const set = new Set(weekdays);
  if (set.size === 7) return 'Diario';
  if (set.size === 5 && [1, 2, 3, 4, 5].every((d) => set.has(d))) return 'L–V';
  if (set.size === 2 && set.has(0) && set.has(6)) return 'Fines de semana';
  return WEEK_ORDER.filter((d) => set.has(d)).map((d) => WEEKDAY_SHORT[d]).join(' · ');
}

export const formatNumber = (n) =>
  Number(n).toLocaleString('es-CO', { maximumFractionDigits: 2 });
