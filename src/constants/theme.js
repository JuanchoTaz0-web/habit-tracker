// src/constants/theme.js
// Las clases se escriben completas para que Tailwind las detecte al compilar.

export const COLORS = {
  indigo: {
    label: 'Índigo', hex: '#6366f1', dot: 'bg-indigo-500', bar: 'bg-indigo-500', barSoft: 'bg-indigo-500/40',
    soft: 'bg-indigo-100 dark:bg-indigo-500/15', text: 'text-indigo-600 dark:text-indigo-300',
    ring: 'ring-indigo-500', stroke: 'stroke-indigo-500',
  },
  emerald: {
    label: 'Esmeralda', hex: '#10b981', dot: 'bg-emerald-500', bar: 'bg-emerald-500', barSoft: 'bg-emerald-500/40',
    soft: 'bg-emerald-100 dark:bg-emerald-500/15', text: 'text-emerald-600 dark:text-emerald-300',
    ring: 'ring-emerald-500', stroke: 'stroke-emerald-500',
  },
  sky: {
    label: 'Cielo', hex: '#0ea5e9', dot: 'bg-sky-500', bar: 'bg-sky-500', barSoft: 'bg-sky-500/40',
    soft: 'bg-sky-100 dark:bg-sky-500/15', text: 'text-sky-600 dark:text-sky-300',
    ring: 'ring-sky-500', stroke: 'stroke-sky-500',
  },
  amber: {
    label: 'Ámbar', hex: '#f59e0b', dot: 'bg-amber-500', bar: 'bg-amber-500', barSoft: 'bg-amber-500/40',
    soft: 'bg-amber-100 dark:bg-amber-500/15', text: 'text-amber-600 dark:text-amber-300',
    ring: 'ring-amber-500', stroke: 'stroke-amber-500',
  },
  rose: {
    label: 'Rosa', hex: '#f43f5e', dot: 'bg-rose-500', bar: 'bg-rose-500', barSoft: 'bg-rose-500/40',
    soft: 'bg-rose-100 dark:bg-rose-500/15', text: 'text-rose-600 dark:text-rose-300',
    ring: 'ring-rose-500', stroke: 'stroke-rose-500',
  },
  violet: {
    label: 'Violeta', hex: '#8b5cf6', dot: 'bg-violet-500', bar: 'bg-violet-500', barSoft: 'bg-violet-500/40',
    soft: 'bg-violet-100 dark:bg-violet-500/15', text: 'text-violet-600 dark:text-violet-300',
    ring: 'ring-violet-500', stroke: 'stroke-violet-500',
  },
  teal: {
    label: 'Turquesa', hex: '#14b8a6', dot: 'bg-teal-500', bar: 'bg-teal-500', barSoft: 'bg-teal-500/40',
    soft: 'bg-teal-100 dark:bg-teal-500/15', text: 'text-teal-600 dark:text-teal-300',
    ring: 'ring-teal-500', stroke: 'stroke-teal-500',
  },
  orange: {
    label: 'Naranja', hex: '#f97316', dot: 'bg-orange-500', bar: 'bg-orange-500', barSoft: 'bg-orange-500/40',
    soft: 'bg-orange-100 dark:bg-orange-500/15', text: 'text-orange-600 dark:text-orange-300',
    ring: 'ring-orange-500', stroke: 'stroke-orange-500',
  },
  slate: {
    label: 'Gris', hex: '#64748b', dot: 'bg-slate-500', bar: 'bg-slate-500', barSoft: 'bg-slate-500/40',
    soft: 'bg-slate-200 dark:bg-slate-700/60', text: 'text-slate-600 dark:text-slate-300',
    ring: 'ring-slate-500', stroke: 'stroke-slate-500',
  },
};

export const COLOR_KEYS = Object.keys(COLORS);
export const getColor = (key) => COLORS[key] ?? COLORS.indigo;

export const SECTION_EMOJIS = ['🌅', '☀️', '🌙', '💧', '💪', '🧘', '📚', '🧠', '💼', '🏠', '🍎', '❤️', '🎯', '📋', '✨', '🐾'];

export const MAX_CALENDAR_HABITS = 8;
