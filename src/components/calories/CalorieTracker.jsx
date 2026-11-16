// src/components/calories/CalorieTracker.jsx
// Rastreador y planificador de comidas: registro del día, gráfico semanal, menús anticipados,
// plantillas, catálogo de alimentos y favoritos. SVG puro y persistencia en localStorage
// (misma clave y formato que la versión anterior: los datos existentes se conservan).
import { useCallback, useEffect, useMemo, useState } from 'react';

/* ============================================================================
 * Configuración
 * ========================================================================== */

const STORAGE_KEY = 'habit-tracker:calories:v1';
const KCAL_PER_KG = 7700; // energía aproximada de 1 kg de grasa corporal
const KEEP_DAYS = 120; // historial de registros que se conserva
const KEEP_PLAN_DAYS = 7; // planes vencidos sin confirmar que se conservan

const ACTIVITY = [
  { value: 1.2, label: 'Sedentario', hint: 'Poco o nada de ejercicio' },
  { value: 1.375, label: 'Ligera', hint: '1–3 días por semana' },
  { value: 1.55, label: 'Moderada', hint: '3–5 días por semana' },
  { value: 1.725, label: 'Alta', hint: '6–7 días por semana' },
  { value: 1.9, label: 'Muy alta', hint: 'Trabajo físico + entrenamiento' },
];

const PACE = [
  { id: 0, label: 'Mantener' },
  { id: 0.25, label: '−0,25 kg' },
  { id: 0.5, label: '−0,5 kg' },
  { id: 0.75, label: '−0,75 kg' },
];

// Los ids se mantienen iguales a la versión anterior ('Snack') para no romper datos guardados.
const MEALS = ['Desayuno', 'Almuerzo', 'Cena', 'Snack'];
const mealLabel = (m) => (m === 'Snack' ? 'Snacks' : m);

const VIEWS = [
  { id: 'today', label: 'Hoy' },
  { id: 'planner', label: 'Planificador' },
];

const DEFAULT_PROFILE = { sex: 'male', age: 25, height: 170, weight: 70, activity: 1.375, pace: 0.5, proteinGoal: null };

// Catálogo local. Valores aproximados por `per` unidades (g, ml o porción); `def` = cantidad inicial.
const CATALOG = [
  { id: 'huevo', name: 'Huevo', unit: 'ud', per: 1, kcal: 78, protein: 6.3, def: 2, step: 1 },
  { id: 'pollo', name: 'Pechuga de pollo cocida', unit: 'g', per: 100, kcal: 165, protein: 31, def: 150, step: 25 },
  { id: 'res', name: 'Carne de res magra cocida', unit: 'g', per: 100, kcal: 200, protein: 27, def: 120, step: 20 },
  { id: 'atun', name: 'Atún en agua', unit: 'g', per: 100, kcal: 116, protein: 26, def: 120, step: 20 },
  { id: 'arroz', name: 'Arroz blanco cocido', unit: 'g', per: 100, kcal: 130, protein: 2.7, def: 150, step: 25 },
  { id: 'pasta', name: 'Pasta cocida', unit: 'g', per: 100, kcal: 158, protein: 5.8, def: 180, step: 20 },
  { id: 'papa', name: 'Papa cocida', unit: 'g', per: 100, kcal: 87, protein: 1.9, def: 150, step: 25 },
  { id: 'platano', name: 'Plátano maduro cocido', unit: 'g', per: 100, kcal: 122, protein: 1.3, def: 100, step: 25 },
  { id: 'lentejas', name: 'Lentejas cocidas', unit: 'g', per: 100, kcal: 116, protein: 9, def: 150, step: 25 },
  { id: 'frijoles', name: 'Fríjoles cocidos', unit: 'g', per: 100, kcal: 127, protein: 8.7, def: 150, step: 25 },
  { id: 'arepa', name: 'Arepa de maíz', unit: 'ud', per: 1, kcal: 165, protein: 3.5, def: 1, step: 1 },
  { id: 'pan', name: 'Pan tajado', unit: 'tajada', per: 1, kcal: 75, protein: 2.5, def: 2, step: 1 },
  { id: 'avena', name: 'Avena en hojuelas', unit: 'g', per: 100, kcal: 389, protein: 16.9, def: 40, step: 10 },
  { id: 'leche', name: 'Leche entera', unit: 'ml', per: 100, kcal: 61, protein: 3.2, def: 200, step: 50 },
  { id: 'yogur', name: 'Yogur natural', unit: 'g', per: 100, kcal: 61, protein: 3.5, def: 150, step: 25 },
  { id: 'queso', name: 'Queso campesino', unit: 'g', per: 100, kcal: 264, protein: 18, def: 30, step: 10 },
  { id: 'banano', name: 'Banano', unit: 'ud', per: 1, kcal: 105, protein: 1.3, def: 1, step: 1 },
  { id: 'manzana', name: 'Manzana', unit: 'ud', per: 1, kcal: 95, protein: 0.5, def: 1, step: 1 },
  { id: 'aguacate', name: 'Aguacate', unit: 'g', per: 100, kcal: 160, protein: 2, def: 70, step: 10 },
  { id: 'mani', name: 'Maní', unit: 'g', per: 100, kcal: 567, protein: 26, def: 30, step: 10 },
  { id: 'aceite', name: 'Aceite de oliva', unit: 'cda', per: 1, kcal: 119, protein: 0, def: 1, step: 1 },
];

/* ============================================================================
 * Utilidades
 * ========================================================================== */

const pad = (n) => String(n).padStart(2, '0');
const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayKey = () => toKey(new Date());
const parseKey = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const addDays = (key, n) => {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
};
const fmt = (n) => Math.round(n).toLocaleString('es-CO');
const grams = (n) => `${Math.round(n)} g`;
const nowTime = () => new Date().toTimeString().slice(0, 5);
const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);
const sumBy = (list, key) => list.reduce((acc, x) => acc + (Number(x[key]) || 0), 0);
const defaultMeal = () => {
  const h = new Date().getHours();
  return h < 11 ? 'Desayuno' : h < 16 ? 'Almuerzo' : h < 21 ? 'Cena' : 'Snack';
};

function dayLabel(key) {
  const today = todayKey();
  if (key === today) return 'Hoy';
  if (key === addDays(today, -1)) return 'Ayer';
  if (key === addDays(today, 1)) return 'Mañana';
  return parseKey(key).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** TMB (Mifflin-St Jeor) → TDEE → meta diaria con piso de seguridad */
export function calcTargets(profile) {
  const { sex, age, height, weight, activity, pace } = profile;
  const valid = [age, height, weight].every((v) => Number.isFinite(v) && v > 0);
  if (!valid) return null;

  const bmr = 10 * weight + 6.25 * height - 5 * age + (sex === 'female' ? -161 : 5);
  const tdee = bmr * activity;
  const raw = tdee - (pace * KCAL_PER_KG) / 7;
  const floor = sex === 'female' ? 1200 : 1500;
  const goal = Math.max(floor, raw);

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    goal: Math.round(goal),
    deficit: Math.round(tdee - goal),
    clamped: raw < floor,
    floor,
  };
}

/** Barra SVG con esquinas superiores redondeadas, anclada a la línea base */
function barPath(x, base, w, h, r) {
  const rr = Math.min(r, w / 2, h);
  const top = base - h;
  return `M ${x} ${base} V ${top + rr} Q ${x} ${top} ${x + rr} ${top} H ${x + w - rr} Q ${x + w} ${top} ${x + w} ${top + rr} V ${base} Z`;
}

/* ---------- Persistencia (compatible con los datos de la versión anterior) ---------- */

function loadData() {
  const base = { configured: false, profile: DEFAULT_PROFILE, days: {}, plans: {}, templates: [], favorites: [] };
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (parsed) {
      return {
        configured: Boolean(parsed.configured),
        profile: { ...DEFAULT_PROFILE, ...parsed.profile },
        days: parsed.days ?? {},
        plans: parsed.plans ?? {},
        templates: Array.isArray(parsed.templates) ? parsed.templates : [],
        favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
      };
    }
  } catch {
    /* datos corruptos o storage bloqueado */
  }
  return base;
}

function saveData(data) {
  try {
    const today = todayKey();
    const dayCutoff = addDays(today, -KEEP_DAYS);
    const planCutoff = addDays(today, -KEEP_PLAN_DAYS);
    const days = Object.fromEntries(Object.entries(data.days).filter(([k]) => k >= dayCutoff));
    const plans = Object.fromEntries(Object.entries(data.plans).filter(([k, v]) => k >= planCutoff && v.length));
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, days, plans }));
  } catch {
    /* cuota excedida o modo privado */
  }
}

/* ============================================================================
 * Piezas de UI
 * ========================================================================== */

const card = 'rounded-3xl bg-white p-4 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800';
const eyebrow = 'text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400';
const label = `mb-1.5 block ${eyebrow}`;
const input =
  'w-full rounded-xl bg-zinc-100 px-3.5 py-2.5 text-base text-zinc-900 ring-1 ring-inset ring-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-700 dark:placeholder:text-zinc-500 dark:focus:ring-zinc-300';
const primaryBtn =
  'flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-30 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white';
const softBtn =
  'rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-200 disabled:opacity-40 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700';
const iconBtn =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-20 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-200';

const PATHS = {
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  close: 'M18 6 6 18M6 6l12 12',
  check: 'M20 6 9 17l-5-5',
  left: 'm15 18-6-6 6-6',
  right: 'm9 18 6-6-6-6',
  down: 'm6 9 6 6 6-6',
  star: 'm12 3 2.7 5.6 6.1.8-4.5 4.3 1.1 6.1L12 16.9 6.6 19.8l1.1-6.1L3.2 9.4l6.1-.8Z',
};

function Glyph({ name, className = 'h-4 w-4', strokeWidth = 2 }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}

function Pills({ value, onChange, options, ariaLabel, size = 'md' }) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="grid gap-1 rounded-full bg-zinc-100 p-1 dark:bg-zinc-800/80"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={String(o.id)}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.id)}
            className={`truncate rounded-full px-2 font-semibold transition-colors ${size === 'sm' ? 'py-1.5 text-xs' : 'py-2 text-sm'} ${
              active
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-600 dark:text-white'
                : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Stat({ title, value, tone = '' }) {
  return (
    <div className="min-w-0 rounded-2xl bg-zinc-50 px-2 py-2.5 text-center dark:bg-zinc-800/60">
      <p className={`truncate text-base font-bold tabular-nums leading-none ${tone}`}>{value}</p>
      <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{title}</p>
    </div>
  );
}

function NumberField({ title, unit, value, onChange, min, max, placeholder }) {
  return (
    <label className="block min-w-0">
      <span className={label}>{title}</span>
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          placeholder={placeholder}
          value={Number.isFinite(value) ? value : ''}
          onChange={(e) => onChange(e.target.value === '' ? NaN : Number(e.target.value))}
          className={`${input} pr-10`}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-zinc-400">{unit}</span>
      </div>
    </label>
  );
}

/** Barra de progreso: consumido sobre el total; opcionalmente marca un tramo "extra" (ejercicio) */
function Meter({ value, total, extraFrom = null, ariaLabel, thin = false }) {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  const over = value > total && total > 0;
  return (
    <div
      className={`relative overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800 ${thin ? 'h-1.5' : 'h-3'}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={Math.round(total)}
      aria-valuenow={Math.round(value)}
      aria-label={ariaLabel}
    >
      {extraFrom !== null && extraFrom < 100 && (
        <div className="absolute inset-y-0 right-0 bg-emerald-500/20 dark:bg-emerald-400/15" style={{ left: `${extraFrom}%` }} />
      )}
      <div
        className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ease-out ${
          over ? 'bg-rose-500 dark:bg-rose-400' : 'bg-zinc-900 dark:bg-zinc-100'
        }`}
        style={{ width: `${pct}%` }}
      />
      {extraFrom !== null && extraFrom < 100 && (
        <div className="absolute inset-y-0 w-0.5 bg-white dark:bg-zinc-900" style={{ left: `${extraFrom}%` }} />
      )}
    </div>
  );
}

/* ============================================================================
 * Vista "Hoy" · resumen, gráfico semanal, comidas y ejercicio
 * ========================================================================== */

function BalanceCard({ targets, consumed, burned, protein, proteinGoal }) {
  if (!targets) {
    return (
      <section className={card}>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Completa tu perfil (abajo) para calcular la meta diaria.</p>
      </section>
    );
  }
  const budget = targets.goal + burned;
  const remaining = budget - consumed;
  const over = remaining < 0;

  return (
    <section className={card} aria-label="Balance del día">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className={eyebrow}>{over ? 'Excedido' : 'Restantes'}</p>
          <p className={`text-4xl font-black tabular-nums tracking-tight ${over ? 'text-rose-500 dark:text-rose-400' : 'text-zinc-900 dark:text-zinc-50'}`}>
            {fmt(Math.abs(remaining))}
            <span className="ml-1 text-base font-semibold text-zinc-400">kcal</span>
          </p>
        </div>
        <p className="pb-1.5 text-right text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
          {fmt(consumed)} / {fmt(budget)}
          <br />
          <span className="text-zinc-400">{Math.round((consumed / Math.max(1, budget)) * 100)}% usado</span>
        </p>
      </div>

      <div className="mt-3">
        <Meter
          value={consumed}
          total={budget}
          extraFrom={burned > 0 ? (targets.goal / budget) * 100 : null}
          ariaLabel="Calorías consumidas del presupuesto del día"
        />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Stat title="Meta" value={fmt(targets.goal)} />
        <Stat title="Comidas" value={`−${fmt(consumed)}`} />
        <Stat title="Ejercicio" value={`+${fmt(burned)}`} tone="text-emerald-600 dark:text-emerald-400" />
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-baseline justify-between text-xs">
          <span className={eyebrow}>Proteína</span>
          <span className="tabular-nums text-zinc-500 dark:text-zinc-400">
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">{grams(protein)}</span>
            {proteinGoal ? ` / ${grams(proteinGoal)}` : ''}
          </span>
        </div>
        {proteinGoal ? (
          <Meter value={Math.min(protein, proteinGoal)} total={proteinGoal} ariaLabel="Proteína consumida frente a la meta" thin />
        ) : (
          <p className="text-[11px] text-zinc-400">Define una meta de proteína en “Mi meta” para ver tu avance.</p>
        )}
      </div>
    </section>
  );
}

function WeekBars({ days, goal, selected, onSelect }) {
  const W = 320;
  const H = 128;
  const TOP = 16;
  const BASE = 100;
  const slot = W / days.length;
  const bw = 22;
  const max = Math.max(...days.map((d) => d.kcal), goal ?? 0, 1) * 1.08;
  const y = (v) => BASE - (v / max) * (BASE - TOP);
  const today = todayKey();
  const goalY = goal ? y(goal) : null;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full select-none" role="img" aria-label="Calorías consumidas en los últimos 7 días">
      <line x1="0" x2={W} y1={BASE} y2={BASE} strokeWidth="1" className="stroke-zinc-200 dark:stroke-zinc-800" />

      {days.map((d, i) => {
        const x = i * slot + (slot - bw) / 2;
        const isSel = d.date === selected;
        return (
          <g key={d.date}>
            {d.kcal > 0 ? (
              <path
                d={barPath(x, BASE, bw, Math.max(3, BASE - y(d.kcal)), 4)}
                className={isSel ? 'fill-zinc-900 dark:fill-zinc-100' : 'fill-zinc-300 dark:fill-zinc-600'}
              />
            ) : (
              <rect x={x} y={BASE - 2} width={bw} height="2" rx="1" className="fill-zinc-200 dark:fill-zinc-700" />
            )}
            {isSel && d.kcal > 0 && (
              <text x={x + bw / 2} y={Math.max(9, y(d.kcal) - 4)} textAnchor="middle" className="fill-zinc-700 text-[9px] font-semibold dark:fill-zinc-200">
                {fmt(d.kcal)}
              </text>
            )}
            <text
              x={x + bw / 2}
              y={BASE + 15}
              textAnchor="middle"
              className={`text-[10px] ${isSel ? 'fill-zinc-900 font-bold dark:fill-zinc-100' : 'fill-zinc-400 dark:fill-zinc-500'}`}
            >
              {d.date === today ? 'Hoy' : parseKey(d.date).toLocaleDateString('es-CO', { weekday: 'short' }).slice(0, 3)}
            </text>
          </g>
        );
      })}

      {goalY !== null && (
        <g className="pointer-events-none">
          <line x1="0" x2={W} y1={goalY} y2={goalY} strokeDasharray="4 3" strokeWidth="1" className="stroke-zinc-400 dark:stroke-zinc-500" />
          <text
            x="2"
            y={goalY - 4}
            strokeWidth="3"
            strokeLinejoin="round"
            style={{ paintOrder: 'stroke' }}
            className="fill-zinc-500 stroke-white text-[9px] font-semibold dark:fill-zinc-400 dark:stroke-zinc-900"
          >
            Meta {fmt(goal)}
          </text>
        </g>
      )}

      {days.map((d, i) => (
        <rect key={d.date} x={i * slot} y="0" width={slot} height={H} fill="transparent" className="cursor-pointer" onClick={() => onSelect(d.date)}>
          <title>{`${dayLabel(d.date)}: ${fmt(d.kcal)} kcal`}</title>
        </rect>
      ))}
    </svg>
  );
}

function FoodRow({ item, planned = false, onConfirm, onRemove }) {
  return (
    <li
      className={`flex items-center gap-2 rounded-2xl px-3 py-2 ${
        planned ? 'border border-dashed border-zinc-300 dark:border-zinc-700' : 'bg-zinc-50 dark:bg-zinc-800/50'
      }`}
    >
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-sm ${planned ? 'text-zinc-500 dark:text-zinc-400' : 'font-medium text-zinc-900 dark:text-zinc-100'}`}>{item.name}</span>
        <span className="block text-[11px] tabular-nums text-zinc-400">
          {planned ? 'Planeado' : item.time}
          {item.protein > 0 && ` · ${grams(item.protein)} prot.`}
        </span>
      </span>
      <span className={`shrink-0 text-sm font-semibold tabular-nums ${planned ? 'text-zinc-400' : 'text-zinc-900 dark:text-zinc-100'}`}>{fmt(item.kcal)}</span>
      {planned && (
        <button
          type="button"
          onClick={onConfirm}
          aria-label={`Confirmar ${item.name}`}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white transition active:scale-95 dark:bg-zinc-100 dark:text-zinc-900"
        >
          <Glyph name="check" strokeWidth={2.5} />
        </button>
      )}
      <button type="button" onClick={onRemove} aria-label={`${planned ? 'Quitar del plan' : 'Eliminar'} ${item.name}`} className={iconBtn}>
        <Glyph name="close" />
      </button>
    </li>
  );
}

function MealBlocks({ foods, planned = [], onAdd, onRemoveFood, onConfirm, onRemovePlanned, emptyHint }) {
  return (
    <div className="space-y-4">
      {MEALS.map((meal) => {
        const eaten = foods.filter((f) => (f.meal ?? 'Snack') === meal);
        const pending = planned.filter((f) => f.meal === meal);
        return (
          <div key={meal}>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{mealLabel(meal)}</h3>
              <span className="ml-auto text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                {fmt(sumBy(eaten, 'kcal'))} kcal
                {pending.length > 0 && <span className="text-zinc-400"> · +{fmt(sumBy(pending, 'kcal'))} plan</span>}
              </span>
              <button type="button" onClick={() => onAdd(meal)} aria-label={`Añadir a ${mealLabel(meal)}`} className={`${iconBtn} bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200`}>
                <Glyph name="plus" />
              </button>
            </div>
            {eaten.length + pending.length === 0 ? (
              <p className="px-1 text-xs text-zinc-400">{emptyHint}</p>
            ) : (
              <ul className="space-y-1.5">
                {eaten.map((f) => (
                  <FoodRow key={f.id} item={f} onRemove={() => onRemoveFood(f.id)} />
                ))}
                {pending.map((f) => (
                  <FoodRow key={f.id} item={f} planned onConfirm={() => onConfirm(f.id)} onRemove={() => onRemovePlanned(f.id)} />
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ExerciseCard({ exercises, onAdd, onRemove }) {
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const value = Number(kcal);
  const valid = Number.isFinite(value) && value > 0 && value <= 5000;

  const submit = (e) => {
    e.preventDefault();
    if (!valid) return;
    onAdd({ id: uid(), name: name.trim() || 'Actividad', kcal: Math.round(value), time: nowTime() });
    setName('');
    setKcal('');
  };

  return (
    <section className={card} aria-label="Ejercicio">
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Ejercicio</h3>
        <span className="text-xs tabular-nums text-emerald-600 dark:text-emerald-400">+{fmt(sumBy(exercises, 'kcal'))} kcal</span>
      </div>
      {exercises.length > 0 && (
        <ul className="mb-3 space-y-1.5">
          {exercises.map((e) => (
            <li key={e.id} className="flex items-center gap-2 rounded-2xl bg-zinc-50 px-3 py-2 dark:bg-zinc-800/50">
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{e.name}</span>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">+{fmt(e.kcal)}</span>
              <button type="button" onClick={() => onRemove(e.id)} aria-label={`Eliminar ${e.name}`} className={iconBtn}>
                <Glyph name="close" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={submit} className="flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Ej. Caminar 30 min" aria-label="Actividad" className={`${input} min-w-0 flex-1`} />
        <input type="number" inputMode="numeric" min="1" max="5000" value={kcal} onChange={(e) => setKcal(e.target.value)} placeholder="kcal" aria-label="Calorías quemadas" className={`${input} w-20 shrink-0 text-right tabular-nums`} />
        <button type="submit" disabled={!valid} aria-label="Añadir ejercicio" className="flex w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white disabled:opacity-30 dark:bg-zinc-100 dark:text-zinc-900">
          <Glyph name="plus" />
        </button>
      </form>
    </section>
  );
}

function ProfilePanel({ profile, targets, open, onToggle, onChange, onDone }) {
  const set = (patch) => onChange({ ...profile, ...patch });
  const activity = ACTIVITY.find((a) => a.value === profile.activity) ?? ACTIVITY[1];

  return (
    <section className={card} aria-label="Meta diaria">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center justify-between text-left">
        <span>
          <span className="block text-sm font-bold text-zinc-900 dark:text-zinc-100">Mi meta</span>
          <span className="block text-xs text-zinc-500 dark:text-zinc-400">
            {targets ? `${fmt(targets.goal)} kcal/día · TDEE ${fmt(targets.tdee)}` : 'Sin calcular'}
            {profile.proteinGoal ? ` · ${grams(profile.proteinGoal)} prot.` : ''}
          </span>
        </span>
        <Glyph name="down" className={`h-4 w-4 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          <Pills
            ariaLabel="Sexo"
            size="sm"
            value={profile.sex}
            onChange={(sex) => set({ sex })}
            options={[
              { id: 'male', label: 'Hombre' },
              { id: 'female', label: 'Mujer' },
            ]}
          />

          <div className="grid grid-cols-3 gap-2">
            <NumberField title="Edad" unit="años" value={profile.age} min={15} max={99} onChange={(age) => set({ age })} />
            <NumberField title="Altura" unit="cm" value={profile.height} min={120} max={230} onChange={(height) => set({ height })} />
            <NumberField title="Peso" unit="kg" value={profile.weight} min={30} max={300} onChange={(weight) => set({ weight })} />
          </div>

          <label className="block">
            <span className={label}>Actividad</span>
            <select value={profile.activity} onChange={(e) => set({ activity: Number(e.target.value) })} className={input}>
              {ACTIVITY.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label} — {a.hint}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-[11px] text-zinc-400">Factor ×{activity.value}</span>
          </label>

          <div>
            <span className={label}>Ritmo por semana</span>
            <Pills ariaLabel="Ritmo por semana" size="sm" value={profile.pace} onChange={(pace) => set({ pace })} options={PACE} />
          </div>

          <NumberField
            title="Meta de proteína (opcional)"
            unit="g/día"
            value={profile.proteinGoal ?? NaN}
            min={0}
            max={400}
            placeholder="Ej. 120"
            onChange={(v) => set({ proteinGoal: Number.isFinite(v) && v > 0 ? v : null })}
          />

          {targets && (
            <dl className="grid grid-cols-3 gap-2 rounded-2xl bg-zinc-50 p-3 text-center dark:bg-zinc-800/60">
              {[
                ['TMB', targets.bmr],
                ['TDEE', targets.tdee],
                ['Meta', targets.goal],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{k}</dt>
                  <dd className="text-sm font-bold tabular-nums text-zinc-900 dark:text-zinc-100">{fmt(v)}</dd>
                </div>
              ))}
            </dl>
          )}

          {targets?.clamped && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
              La meta se limitó a {fmt(targets.floor)} kcal/día como mínimo de seguridad; ese ritmo requeriría comer menos.
            </p>
          )}

          <p className="text-[11px] leading-relaxed text-zinc-400">
            Estimación con la fórmula Mifflin-St Jeor (1 kg ≈ 7.700 kcal). Es orientativa: para un plan personalizado consulta a un
            profesional de la salud.
          </p>

          <button type="button" onClick={onDone} disabled={!targets} className={primaryBtn}>
            Guardar meta
          </button>
        </div>
      )}
    </section>
  );
}

function TodayView({ data, date, setDate, targets, actions, onOpenSheet, profileOpen, setProfileOpen }) {
  const today = todayKey();
  const day = data.days[date] ?? { foods: [], exercises: [] };
  const planned = data.plans[date] ?? [];
  const consumed = sumBy(day.foods, 'kcal');
  const burned = sumBy(day.exercises, 'kcal');
  const protein = sumBy(day.foods, 'protein');

  const week = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = addDays(today, i - 6);
        return { date: d, kcal: sumBy(data.days[d]?.foods ?? [], 'kcal') };
      }),
    [data.days, today]
  );
  const logged = week.filter((d) => d.kcal > 0);
  const weekAvg = logged.length ? sumBy(logged, 'kcal') / logged.length : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => setDate(addDays(date, -1))} aria-label="Día anterior" className={iconBtn}>
          <Glyph name="left" />
        </button>
        <div className="text-center">
          <p className="text-sm font-bold capitalize">{dayLabel(date)}</p>
          {date !== today && (
            <button type="button" onClick={() => setDate(today)} className="text-[11px] font-semibold text-zinc-500 underline-offset-2 hover:underline">
              Volver a hoy
            </button>
          )}
        </div>
        <button type="button" onClick={() => setDate(addDays(date, 1))} disabled={date >= today} aria-label="Día siguiente" className={iconBtn}>
          <Glyph name="right" />
        </button>
      </div>

      <BalanceCard targets={targets} consumed={consumed} burned={burned} protein={protein} proteinGoal={data.profile.proteinGoal} />

      <section className={card} aria-label="Últimos 7 días">
        <div className="mb-2 flex items-baseline justify-between">
          <p className={eyebrow}>Últimos 7 días</p>
          <p className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
            {weekAvg > 0 ? (
              <>
                Promedio <span className="font-semibold text-zinc-900 dark:text-zinc-100">{fmt(weekAvg)}</span> kcal
              </>
            ) : (
              'Sin registros'
            )}
          </p>
        </div>
        <WeekBars days={week} goal={targets?.goal ?? null} selected={date} onSelect={setDate} />
      </section>

      <section className={card} aria-label="Comidas del día">
        <button type="button" onClick={() => onOpenSheet({ mode: 'log', date, meal: defaultMeal() })} className={`${primaryBtn} mb-4`}>
          <Glyph name="plus" /> Añadir alimento
        </button>
        <MealBlocks
          foods={day.foods}
          planned={planned}
          emptyHint="Sin registros."
          onAdd={(meal) => onOpenSheet({ mode: 'log', date, meal })}
          onRemoveFood={(id) => actions.removeFood(date, id)}
          onConfirm={(id) => actions.confirmPlanned(date, id)}
          onRemovePlanned={(id) => actions.removePlanned(date, id)}
        />
        {planned.length > 0 && (
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {planned.length} {planned.length === 1 ? 'comida planeada' : 'comidas planeadas'} · {fmt(sumBy(planned, 'kcal'))} kcal
            </p>
            <button type="button" onClick={() => actions.confirmAll(date)} className={softBtn}>
              Confirmar todas
            </button>
          </div>
        )}
      </section>

      <ExerciseCard exercises={day.exercises} onAdd={(e) => actions.addExercise(date, e)} onRemove={(id) => actions.removeExercise(date, id)} />

      <ProfilePanel
        profile={data.profile}
        targets={targets}
        open={profileOpen}
        onToggle={() => setProfileOpen((o) => !o)}
        onChange={actions.setProfile}
        onDone={() => {
          actions.markConfigured();
          setProfileOpen(false);
        }}
      />
    </div>
  );
}

/* ============================================================================
 * Vista "Planificador" · menús anticipados y plantillas
 * ========================================================================== */

function PlannerView({ data, targets, actions, onOpenSheet }) {
  const today = todayKey();
  const [date, setDate] = useState(today);
  const [naming, setNaming] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [armedTemplate, setArmedTemplate] = useState(null);

  const plan = data.plans[date] ?? [];
  const kcal = sumBy(plan, 'kcal');
  const protein = sumBy(plan, 'protein');
  const goal = targets?.goal ?? null;
  const proteinGoal = data.profile.proteinGoal;
  const diff = goal ? goal - kcal : null;
  const quick = [
    { id: today, label: 'Hoy' },
    { id: addDays(today, 1), label: 'Mañana' },
    { id: addDays(today, 2), label: 'Pasado' },
  ];

  const saveTemplate = (e) => {
    e.preventDefault();
    if (!plan.length) return;
    actions.saveTemplate(templateName.trim() || `Menú ${fmt(kcal)} kcal`, plan);
    setTemplateName('');
    setNaming(false);
  };

  return (
    <div className="space-y-4">
      <section className={card} aria-label="Día a planificar">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <Pills ariaLabel="Día a planificar" size="sm" value={date} onChange={setDate} options={quick} />
          </div>
          <input
            type="date"
            value={date}
            min={today}
            onChange={(e) => e.target.value && e.target.value >= today && setDate(e.target.value)}
            aria-label="Elegir otra fecha"
            className="w-[8.75rem] shrink-0 rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-700 focus:outline-none dark:bg-zinc-800 dark:text-zinc-200 dark:[color-scheme:dark]"
          />
        </div>

        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className={eyebrow}>
              Plan · <span className="normal-case">{dayLabel(date)}</span>
            </p>
            <p className="text-3xl font-black tabular-nums tracking-tight text-zinc-900 dark:text-zinc-50">
              {fmt(kcal)}
              <span className="ml-1 text-base font-semibold text-zinc-400">{goal ? `/ ${fmt(goal)} kcal` : 'kcal'}</span>
            </p>
          </div>
          {diff !== null && plan.length > 0 && (
            <p className={`pb-1 text-right text-xs font-semibold tabular-nums ${diff < 0 ? 'text-rose-500 dark:text-rose-400' : 'text-zinc-500 dark:text-zinc-400'}`}>
              {diff < 0 ? `${fmt(-diff)} sobre la meta` : `${fmt(diff)} bajo la meta`}
            </p>
          )}
        </div>
        {goal && (
          <div className="mt-2">
            <Meter value={kcal} total={goal} ariaLabel="Calorías del plan frente a la meta diaria" />
          </div>
        )}

        <div className="mt-3">
          <div className="mb-1.5 flex items-baseline justify-between text-xs">
            <span className={eyebrow}>Proteína del plan</span>
            <span className="tabular-nums text-zinc-500 dark:text-zinc-400">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">{grams(protein)}</span>
              {proteinGoal ? ` / ${grams(proteinGoal)}` : ''}
            </span>
          </div>
          {proteinGoal ? <Meter value={Math.min(protein, proteinGoal)} total={proteinGoal} ariaLabel="Proteína del plan frente a la meta" thin /> : null}
        </div>
      </section>

      <section className={card} aria-label="Menú del día">
        <MealBlocks
          foods={[]}
          planned={plan}
          emptyHint="Nada planeado."
          onAdd={(meal) => onOpenSheet({ mode: 'plan', date, meal })}
          onRemoveFood={() => {}}
          onConfirm={(id) => actions.confirmPlanned(date, id)}
          onRemovePlanned={(id) => actions.removePlanned(date, id)}
        />
        <p className="mt-4 text-[11px] text-zinc-400">
          Lo planeado aparece en “Hoy” ese día; con ✓ lo sumas a lo consumido.
        </p>
      </section>

      <section className={card} aria-label="Plantillas de menú">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Plantillas</h3>
          {!naming && (
            <button type="button" onClick={() => setNaming(true)} disabled={!plan.length} className={softBtn}>
              Guardar este día como plantilla
            </button>
          )}
        </div>

        {naming && (
          <form onSubmit={saveTemplate} className="mb-3 flex gap-2">
            <input
              autoFocus
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              maxLength={40}
              placeholder={`Ej. Menú déficit ${fmt(kcal)} kcal`}
              aria-label="Nombre de la plantilla"
              className={`${input} min-w-0 flex-1`}
            />
            <button type="submit" className="shrink-0 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
              Guardar
            </button>
            <button type="button" onClick={() => setNaming(false)} aria-label="Cancelar" className={iconBtn}>
              <Glyph name="close" />
            </button>
          </form>
        )}

        {data.templates.length === 0 ? (
          <p className="text-xs text-zinc-400">Arma un día y guárdalo para reutilizarlo con un toque.</p>
        ) : (
          <ul className="space-y-1.5">
            {data.templates.map((t) => (
              <li key={t.id} className="flex items-center gap-2 rounded-2xl bg-zinc-50 px-3 py-2 dark:bg-zinc-800/50">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{t.name}</span>
                  <span className="block text-[11px] tabular-nums text-zinc-400">
                    {t.items.length} {t.items.length === 1 ? 'alimento' : 'alimentos'} · {fmt(sumBy(t.items, 'kcal'))} kcal · {grams(sumBy(t.items, 'protein'))} prot.
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => actions.applyTemplate(t.id, date)}
                  className="shrink-0 rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
                >
                  Aplicar
                </button>
                {armedTemplate === t.id ? (
                  <button
                    type="button"
                    onClick={() => {
                      actions.removeTemplate(t.id);
                      setArmedTemplate(null);
                    }}
                    className="shrink-0 rounded-full bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Borrar
                  </button>
                ) : (
                  <button type="button" onClick={() => setArmedTemplate(t.id)} aria-label={`Eliminar plantilla ${t.name}`} className={iconBtn}>
                    <Glyph name="close" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {data.templates.length > 0 && <p className="mt-2 text-[11px] text-zinc-400">“Aplicar” reemplaza el plan de {dayLabel(date).toLowerCase()}.</p>}
      </section>
    </div>
  );
}

/* ============================================================================
 * Hoja para agregar alimento (compartida por Registro y Planificador)
 * ========================================================================== */

function FoodSheet({ target, favorites, onAdd, onSaveFavorite, onRemoveFavorite, onClose }) {
  const [tab, setTab] = useState('quick');
  const [meal, setMeal] = useState(target.meal);
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState(null);
  const [qty, setQty] = useState(0);
  const [added, setAdded] = useState([]);
  const [form, setForm] = useState({ name: '', kcal: '', protein: '', favorite: false });

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const add = (item) => {
    onAdd({ name: item.name, kcal: Math.round(item.kcal), protein: Math.round((item.protein || 0) * 10) / 10, meal });
    setAdded((a) => [...a, item.name]);
  };

  const q = query.trim().toLowerCase();
  const results = q ? CATALOG.filter((f) => f.name.toLowerCase().includes(q)) : CATALOG;

  const manualKcal = Number(form.kcal);
  const manualValid = form.name.trim() && Number.isFinite(manualKcal) && manualKcal > 0 && manualKcal <= 5000;
  const submitManual = (e) => {
    e.preventDefault();
    if (!manualValid) return;
    const item = { name: form.name.trim(), kcal: manualKcal, protein: Math.max(0, Number(form.protein) || 0) };
    add(item);
    if (form.favorite) onSaveFavorite(item);
    setForm({ name: '', kcal: '', protein: '', favorite: false });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Agregar alimento">
      <button type="button" aria-label="Cerrar" onClick={onClose} className="absolute inset-0 animate-fade-in bg-zinc-950/50 backdrop-blur-sm" />

      <div className="relative flex max-h-[90dvh] w-full max-w-lg animate-sheet-up flex-col rounded-t-3xl bg-white shadow-2xl ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800 sm:rounded-3xl">
        <div className="shrink-0 space-y-3 p-5 pb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className={eyebrow}>
                {target.mode === 'plan' ? 'Planificar' : 'Registrar'} · <span className="normal-case">{dayLabel(target.date)}</span>
              </p>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Agregar alimento</h2>
            </div>
            <button type="button" onClick={onClose} className="shrink-0 rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
              Listo
            </button>
          </div>

          <Pills ariaLabel="Comida del día" size="sm" value={meal} onChange={setMeal} options={MEALS.map((m) => ({ id: m, label: mealLabel(m) }))} />
          <Pills
            ariaLabel="Origen del alimento"
            value={tab}
            onChange={setTab}
            options={[
              { id: 'quick', label: 'Alimentos rápidos' },
              { id: 'manual', label: 'Favoritos / Manual' },
            ]}
          />

          <p className="min-h-[1rem] truncate text-xs text-emerald-600 dark:text-emerald-400" aria-live="polite">
            {added.length > 0 && `✓ ${added.length === 1 ? 'Añadido' : `${added.length} añadidos`}: ${added[added.length - 1]}`}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {tab === 'quick' ? (
            <div className="space-y-2">
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar alimento…" aria-label="Buscar alimento" className={input} />
              {results.length === 0 && <p className="py-6 text-center text-sm text-zinc-400">Sin resultados. Prueba en “Favoritos / Manual”.</p>}
              <ul className="space-y-1.5">
                {results.map((f) => {
                  const open = openId === f.id;
                  const amount = open ? qty : f.def;
                  const kcal = (amount / f.per) * f.kcal;
                  const protein = (amount / f.per) * f.protein;
                  return (
                    <li key={f.id} className={`rounded-2xl ${open ? 'bg-zinc-100 dark:bg-zinc-800' : 'bg-zinc-50 dark:bg-zinc-800/50'}`}>
                      <button
                        type="button"
                        aria-expanded={open}
                        onClick={() => {
                          setOpenId(open ? null : f.id);
                          setQty(f.def);
                        }}
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{f.name}</span>
                          <span className="block text-[11px] tabular-nums text-zinc-400">
                            {fmt(f.kcal)} kcal · {f.protein} g prot. por {f.per === 1 ? `1 ${f.unit}` : `${f.per} ${f.unit}`}
                          </span>
                        </span>
                        <Glyph name="down" className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                      </button>

                      {open && (
                        <div className="flex items-center gap-2 px-3 pb-3">
                          <button type="button" onClick={() => setQty((v) => Math.max(f.step, v - f.step))} aria-label="Menos cantidad" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-zinc-700 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:text-zinc-200 dark:ring-zinc-700">
                            <Glyph name="minus" />
                          </button>
                          <div className="relative w-24 shrink-0">
                            <input
                              type="number"
                              inputMode="decimal"
                              min="0"
                              value={qty || ''}
                              onChange={(e) => setQty(Math.max(0, Math.min(5000, Number(e.target.value) || 0)))}
                              aria-label={`Cantidad en ${f.unit}`}
                              className="h-10 w-full rounded-xl bg-white pl-2 pr-9 text-center text-base font-semibold tabular-nums text-zinc-900 ring-1 ring-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-zinc-700 dark:focus:ring-zinc-300"
                            />
                            <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[11px] text-zinc-400">{f.unit}</span>
                          </div>
                          <button type="button" onClick={() => setQty((v) => Math.min(5000, v + f.step))} aria-label="Más cantidad" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-zinc-700 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:text-zinc-200 dark:ring-zinc-700">
                            <Glyph name="plus" />
                          </button>
                          <p className="min-w-0 flex-1 text-right text-xs leading-tight tabular-nums text-zinc-500 dark:text-zinc-400">
                            <span className="block text-sm font-bold text-zinc-900 dark:text-zinc-100">{fmt(kcal)} kcal</span>
                            {grams(protein)} prot.
                          </p>
                          <button
                            type="button"
                            disabled={qty <= 0}
                            onClick={() => {
                              add({ name: `${f.name} (${qty} ${f.unit})`, kcal, protein });
                              setOpenId(null);
                            }}
                            className="shrink-0 rounded-xl bg-zinc-900 px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-30 dark:bg-zinc-100 dark:text-zinc-900"
                          >
                            Añadir
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
              <p className="pt-1 text-center text-[11px] text-zinc-400">Valores nutricionales aproximados.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className={`${eyebrow} mb-2`}>Mis favoritos</p>
                {favorites.length === 0 ? (
                  <p className="text-xs text-zinc-400">Aún no tienes favoritos. Marca “Guardar en favoritos” al crear uno abajo.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {favorites.map((f) => (
                      <li key={f.id} className="flex items-center gap-2 rounded-2xl bg-zinc-50 px-3 py-2 dark:bg-zinc-800/50">
                        <Glyph name="star" className="h-4 w-4 shrink-0 text-zinc-400" strokeWidth={1.8} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{f.name}</span>
                          <span className="block text-[11px] tabular-nums text-zinc-400">
                            {fmt(f.kcal)} kcal{f.protein > 0 && ` · ${grams(f.protein)} prot.`}
                          </span>
                        </span>
                        <button type="button" onClick={() => add(f)} className="shrink-0 rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
                          Añadir
                        </button>
                        <button type="button" onClick={() => onRemoveFavorite(f.id)} aria-label={`Quitar ${f.name} de favoritos`} className={iconBtn}>
                          <Glyph name="close" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <form onSubmit={submitManual} className="space-y-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                <p className={eyebrow}>Manual</p>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  maxLength={40}
                  placeholder="Nombre · ej. Bandeja de la casa"
                  aria-label="Nombre del alimento"
                  className={input}
                />
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <input type="number" inputMode="numeric" min="1" max="5000" value={form.kcal} onChange={(e) => setForm({ ...form, kcal: e.target.value })} placeholder="Calorías" aria-label="Calorías" className={`${input} pr-11`} />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-zinc-400">kcal</span>
                  </div>
                  <div className="relative">
                    <input type="number" inputMode="decimal" min="0" max="500" value={form.protein} onChange={(e) => setForm({ ...form, protein: e.target.value })} placeholder="Proteína (opc.)" aria-label="Proteína en gramos (opcional)" className={`${input} pr-7`} />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-zinc-400">g</span>
                  </div>
                </div>
                <label className="flex items-center gap-2 py-1 text-sm text-zinc-600 dark:text-zinc-300">
                  <input type="checkbox" checked={form.favorite} onChange={(e) => setForm({ ...form, favorite: e.target.checked })} className="h-4 w-4 accent-zinc-900 dark:accent-zinc-100" />
                  Guardar en favoritos
                </label>
                <button type="submit" disabled={!manualValid} className={primaryBtn}>
                  Añadir a {mealLabel(meal)}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 * Componente principal
 * ========================================================================== */

export default function CalorieTracker({ className = '' }) {
  const [data, setData] = useState(loadData);
  const [view, setView] = useState('today');
  const [date, setDate] = useState(todayKey);
  const [profileOpen, setProfileOpen] = useState(() => !loadData().configured);
  const [sheet, setSheet] = useState(null); // null | { mode: 'log' | 'plan', date, meal }

  useEffect(() => saveData(data), [data]);

  // Si la app queda abierta pasada la medianoche, al volver salta al nuevo día
  useEffect(() => {
    let last = todayKey();
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const now = todayKey();
      if (now !== last) {
        setDate((d) => (d === last ? now : d));
        last = now;
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const targets = useMemo(() => calcTargets(data.profile), [data.profile]);
  const closeSheet = useCallback(() => setSheet(null), []);

  const actions = useMemo(() => {
    const patchDay = (d, fn) =>
      setData((prev) => {
        const next = fn(prev.days[d] ?? { foods: [], exercises: [] });
        const days = { ...prev.days };
        if (next.foods.length || next.exercises.length) days[d] = next;
        else delete days[d];
        return { ...prev, days };
      });
    const patchPlan = (d, fn) =>
      setData((prev) => {
        const next = fn(prev.plans[d] ?? []);
        const plans = { ...prev.plans };
        if (next.length) plans[d] = next;
        else delete plans[d];
        return { ...prev, plans };
      });
    /** Mueve comidas del plan a lo consumido (una o todas) en una sola actualización */
    const confirm = (d, ids) =>
      setData((prev) => {
        const plan = prev.plans[d] ?? [];
        const moving = plan.filter((p) => ids === null || ids.includes(p.id));
        if (!moving.length) return prev;
        const day = prev.days[d] ?? { foods: [], exercises: [] };
        const rest = plan.filter((p) => !moving.includes(p));
        const plans = { ...prev.plans };
        if (rest.length) plans[d] = rest;
        else delete plans[d];
        return {
          ...prev,
          plans,
          days: { ...prev.days, [d]: { ...day, foods: [...day.foods, ...moving.map((p) => ({ ...p, id: uid(), time: nowTime() }))] } },
        };
      });

    return {
      addFood: (d, item) => patchDay(d, (day) => ({ ...day, foods: [...day.foods, { id: uid(), time: nowTime(), ...item }] })),
      removeFood: (d, id) => patchDay(d, (day) => ({ ...day, foods: day.foods.filter((f) => f.id !== id) })),
      addExercise: (d, item) => patchDay(d, (day) => ({ ...day, exercises: [...day.exercises, item] })),
      removeExercise: (d, id) => patchDay(d, (day) => ({ ...day, exercises: day.exercises.filter((e) => e.id !== id) })),
      addPlanned: (d, item) => patchPlan(d, (plan) => [...plan, { id: uid(), ...item }]),
      removePlanned: (d, id) => patchPlan(d, (plan) => plan.filter((p) => p.id !== id)),
      confirmPlanned: (d, id) => confirm(d, [id]),
      confirmAll: (d) => confirm(d, null),
      saveTemplate: (name, plan) =>
        setData((prev) => ({
          ...prev,
          templates: [...prev.templates, { id: uid(), name, items: plan.map(({ name: n, kcal, protein, meal }) => ({ name: n, kcal, protein: protein || 0, meal })) }],
        })),
      removeTemplate: (id) => setData((prev) => ({ ...prev, templates: prev.templates.filter((t) => t.id !== id) })),
      applyTemplate: (id, d) =>
        setData((prev) => {
          const tpl = prev.templates.find((t) => t.id === id);
          if (!tpl) return prev;
          return { ...prev, plans: { ...prev.plans, [d]: tpl.items.map((it) => ({ ...it, id: uid() })) } };
        }),
      saveFavorite: (item) =>
        setData((prev) =>
          prev.favorites.some((f) => f.name.toLowerCase() === item.name.toLowerCase())
            ? prev
            : { ...prev, favorites: [...prev.favorites, { id: uid(), ...item }] }
        ),
      removeFavorite: (id) => setData((prev) => ({ ...prev, favorites: prev.favorites.filter((f) => f.id !== id) })),
      setProfile: (profile) => setData((prev) => ({ ...prev, profile })),
      markConfigured: () => setData((prev) => ({ ...prev, configured: true })),
    };
  }, []);

  return (
    <div className={`mx-auto w-full max-w-lg space-y-4 text-zinc-900 dark:text-zinc-100 ${className}`}>
      <Pills ariaLabel="Vistas de calorías" value={view} onChange={setView} options={VIEWS} />

      {view === 'today' ? (
        <TodayView
          data={data}
          date={date}
          setDate={setDate}
          targets={targets}
          actions={actions}
          onOpenSheet={setSheet}
          profileOpen={profileOpen}
          setProfileOpen={setProfileOpen}
        />
      ) : (
        <PlannerView data={data} targets={targets} actions={actions} onOpenSheet={setSheet} />
      )}

      {sheet && (
        <FoodSheet
          target={sheet}
          favorites={data.favorites}
          onAdd={(item) => (sheet.mode === 'plan' ? actions.addPlanned(sheet.date, item) : actions.addFood(sheet.date, item))}
          onSaveFavorite={actions.saveFavorite}
          onRemoveFavorite={actions.removeFavorite}
          onClose={closeSheet}
        />
      )}
    </div>
  );
}