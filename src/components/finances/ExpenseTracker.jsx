// src/components/finances/ExpenseTracker.jsx
// Módulo de finanzas: gastos e ingresos con tres vistas (Resumen · Actividad · Análisis),
// registro rápido en 3 pasos y persistencia en localStorage. Gráficos en SVG puro, sin librerías.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/* ============================================================================
 * Configuración
 * ========================================================================== */

const STORAGE_KEY = 'habit_tracker_finances_v1';

// c = color en tema claro · cd = color en tema oscuro (tonos apagados, validados para ambos fondos)
const EXPENSE_CATEGORIES = [
  { id: 'vivienda', label: 'Vivienda', icon: 'home', c: '#5b84c4', cd: '#6590d2' },
  { id: 'comida', label: 'Comida', icon: 'food', c: '#d07a4e', cd: '#d07a4e' },
  { id: 'supermercado', label: 'Supermercado', icon: 'cart', c: '#4f9d69', cd: '#55a570' },
  { id: 'transporte', label: 'Transporte', icon: 'bus', c: '#22a3a8', cd: '#25a5aa' },
  { id: 'servicios', label: 'Servicios', icon: 'bolt', c: '#c9a13a', cd: '#b0902a' },
  { id: 'compras', label: 'Compras', icon: 'bag', c: '#d2739c', cd: '#cc6b95' },
  { id: 'salir', label: 'Salir', icon: 'glass', c: '#cf5c5c', cd: '#cc5568' },
  { id: 'entretenimiento', label: 'Entretenimiento', icon: 'play', c: '#8a6fc9', cd: '#9479d4' },
  { id: 'otros', label: 'Otros', icon: 'dots', c: '#a1a1aa', cd: '#71717a' },
];

const INCOME_CATEGORIES = [
  { id: 'salario', label: 'Salario', icon: 'briefcase', c: '#4a7c59', cd: '#6fa383' },
  { id: 'freelance', label: 'Freelance', icon: 'laptop', c: '#4a7c59', cd: '#6fa383' },
  { id: 'regalo', label: 'Regalo', icon: 'gift', c: '#4a7c59', cd: '#6fa383' },
  { id: 'otros-ingresos', label: 'Otros', icon: 'plus', c: '#4a7c59', cd: '#6fa383' },
];

// Orden fijo de los segmentos del anillo: colores vecinos siempre distinguibles entre sí.
const DONUT_ORDER = ['vivienda', 'supermercado', 'entretenimiento', 'comida', 'transporte', 'salir', 'servicios', 'compras', 'otros'];

const CATEGORY_BY_ID = Object.fromEntries([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].map((c) => [c.id, c]));
const categoriesFor = (type) => (type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES);
const categoryOf = (tx) =>
  CATEGORY_BY_ID[tx.category] ?? (tx.type === 'income' ? CATEGORY_BY_ID['otros-ingresos'] : CATEGORY_BY_ID.otros);

const VIEWS = [
  { id: 'summary', label: 'Resumen' },
  { id: 'activity', label: 'Actividad' },
  { id: 'analysis', label: 'Análisis' },
];

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/* ============================================================================
 * Utilidades
 * ========================================================================== */

const pad = (n) => String(n).padStart(2, '0');
const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayKey = () => toKey(new Date());
const currentMonth = () => todayKey().slice(0, 7);
const parseKey = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const shiftMonth = (ym, delta) => {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};
const daysInMonth = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m, 0).getDate();
};
const monthName = (ym) => MONTHS[Number(ym.slice(5, 7)) - 1];
const monthShort = (ym) => monthName(ym).slice(0, 3);
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const money = (n) => `${n < 0 ? '−' : ''}$${Math.abs(Math.round(n)).toLocaleString('es-CO')}`;
const compact = (n) => {
  if (n >= 1e6) return `${(n / 1e6).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`;
  if (n >= 1e3) return `${Math.round(n / 1e3)} mil`;
  return String(Math.round(n));
};
const sum = (list) => list.reduce((acc, t) => acc + t.amount, 0);

const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);

function dayHeading(key) {
  const today = todayKey();
  if (key === today) return 'Hoy';
  const y = new Date();
  y.setDate(y.getDate() - 1);
  if (key === toKey(y)) return 'Ayer';
  return capitalize(parseKey(key).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'short' }));
}

/** Techo "redondo" para la escala de un gráfico (1, 2, 2.5, 5 o 10 × 10ⁿ) */
function niceMax(value) {
  if (value <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(value));
  const n = value / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * pow;
}

/** Barra con las esquinas superiores redondeadas, anclada a la línea base */
function barPath(x, base, w, h, r) {
  const rr = Math.min(r, w / 2, h);
  const top = base - h;
  return `M ${x} ${base} V ${top + rr} Q ${x} ${top} ${x + rr} ${top} H ${x + w - rr} Q ${x + w} ${top} ${x + w} ${top + rr} V ${base} Z`;
}

/** Arco de circunferencia; ángulos en grados, en sentido horario desde las 12 */
function arcPath(cx, cy, r, a0, a1) {
  const point = (a) => {
    const rad = ((a - 90) * Math.PI) / 180;
    return `${(cx + r * Math.cos(rad)).toFixed(2)} ${(cy + r * Math.sin(rad)).toFixed(2)}`;
  };
  return `M ${point(a0)} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${point(a1)}`;
}

/* ---------- Persistencia ---------- */

const isValidTx = (t) =>
  t &&
  typeof t.id === 'string' &&
  (t.type === 'expense' || t.type === 'income') &&
  Number.isFinite(t.amount) &&
  t.amount > 0 &&
  /^\d{4}-\d{2}-\d{2}$/.test(t.date ?? '');

function loadTransactions() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(parsed?.transactions)) return parsed.transactions.filter(isValidTx);
  } catch {
    /* datos corruptos o storage bloqueado: se arranca vacío */
  }
  return [];
}

function saveTransactions(transactions) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, transactions }));
  } catch {
    /* cuota excedida o modo privado */
  }
}

/** Espacio que tapa el teclado en pantalla, para mantener la hoja visible en móviles */
function useKeyboardInset() {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return undefined;
    const update = () => setInset(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)));
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);
  return inset;
}

/* ============================================================================
 * Piezas de UI
 * ========================================================================== */

const card = 'rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/90';
const eyebrow = 'text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400';
const field =
  'w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-600';
const primaryBtn =
  'flex w-full items-center justify-center rounded-2xl bg-zinc-900 py-3.5 text-sm font-semibold text-white transition hover:bg-zinc-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-30 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white';
const iconBtn =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 disabled:opacity-20 dark:text-zinc-400 dark:hover:bg-zinc-800';

// El color de cada categoría viaja en --c / --cd y se resuelve en --k según el tema activo.
const TONE = '[--k:var(--c)] dark:[--k:var(--cd)]';
const toneVars = (cat) => ({ '--c': cat.c, '--cd': cat.cd });

const GLYPHS = {
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z" />,
  food: <path d="M7 3v18M4 3v5a3 3 0 0 0 6 0V3M17 21V3c-2 1.2-3 3.8-3 7.5h3" />,
  cart: (
    <>
      <path d="M3 4h2l2.4 10.2a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L20 7H6" />
      <circle cx="9.5" cy="19" r="1.3" />
      <circle cx="17" cy="19" r="1.3" />
    </>
  ),
  bus: (
    <>
      <rect x="5" y="3" width="14" height="14" rx="3" />
      <path d="M5 11h14M8 17v3M16 17v3M8.5 14h.01M15.5 14h.01" />
    </>
  ),
  bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7Z" />,
  bag: <path d="M6 8h12l1 12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1ZM9 8V6a3 3 0 0 1 6 0v2" />,
  glass: <path d="M5 4h14l-7 8ZM12 12v8M8 20h8" />,
  play: (
    <>
      <rect x="3" y="5" width="18" height="12" rx="2" />
      <path d="M8 21h8M10.5 8.5l4 2.5-4 2.5Z" />
    </>
  ),
  dots: <path d="M6 12h.01M12 12h.01M18 12h.01" strokeWidth="3" />,
  briefcase: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18" />
    </>
  ),
  laptop: (
    <>
      <rect x="5" y="5" width="14" height="10" rx="1.5" />
      <path d="M3 19h18" />
    </>
  ),
  gift: (
    <>
      <rect x="4" y="9" width="16" height="4" rx="1" />
      <path d="M6 13v7a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-7M12 9v12M12 9c-1.5-4-6-3.5-5-1 .6 1.2 3 1 5 1Zm0 0c1.5-4 6-3.5 5-1-.6 1.2-3 1-5 1Z" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="M18 6 6 18M6 6l12 12" />,
  left: <path d="m15 18-6-6 6-6" />,
  right: <path d="m9 18 6-6-6-6" />,
  trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M9 7V4h6v3" />,
};

function Glyph({ name, className = 'h-5 w-5', strokeWidth = 1.8 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {GLYPHS[name]}
    </svg>
  );
}

function CategoryBadge({ cat, className = 'h-10 w-10' }) {
  return (
    <span
      style={toneVars(cat)}
      className={`${TONE} flex shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-[color:var(--k)] dark:bg-zinc-800 ${className}`}
    >
      <Glyph name={cat.icon} />
    </span>
  );
}

function Pills({ value, onChange, options, label }) {
  return (
    <div role="tablist" aria-label={label} className="grid gap-1 rounded-full bg-zinc-100 p-1 dark:bg-zinc-800/80" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.id)}
            className={`rounded-full py-2 text-sm font-semibold transition-colors ${
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

function MonthNav({ month, onChange }) {
  const isCurrent = month === currentMonth();
  return (
    <div className="flex items-center justify-between">
      <button type="button" onClick={() => onChange(shiftMonth(month, -1))} aria-label="Mes anterior" className={iconBtn}>
        <Glyph name="left" className="h-4 w-4" strokeWidth={2} />
      </button>
      <div className="text-center leading-tight">
        <p className="text-sm font-bold capitalize">
          {monthName(month)} {month.slice(0, 4)}
        </p>
        {!isCurrent && (
          <button type="button" onClick={() => onChange(currentMonth())} className="text-[11px] font-semibold text-zinc-500 underline-offset-2 hover:underline dark:text-zinc-400">
            Volver a este mes
          </button>
        )}
      </div>
      <button type="button" onClick={() => onChange(shiftMonth(month, 1))} disabled={isCurrent} aria-label="Mes siguiente" className={iconBtn}>
        <Glyph name="right" className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>
  );
}

function Stat({ title, value, tone = '' }) {
  return (
    <div className="min-w-0 rounded-2xl bg-zinc-50 px-2 py-2.5 text-center dark:bg-zinc-800/60">
      <p className={`truncate text-sm font-bold tabular-nums ${tone}`}>{value}</p>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{title}</p>
    </div>
  );
}

/* ============================================================================
 * Vista 1 · Resumen (anillo por categorías)
 * ========================================================================== */

function Donut({ segments, selected, onSelect, children }) {
  const SIZE = 260;
  const STROKE = 20;
  const R = SIZE / 2 - 14;
  const gapDeg = segments.length > 1 ? (3 / (2 * Math.PI * R)) * 360 : 0;
  let acc = 0;

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[240px]">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full" role="img" aria-label="Gasto del mes por categoría">
        <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" strokeWidth={STROKE} className="stroke-zinc-100 dark:stroke-zinc-800" />
        {segments.map((s) => {
          const start = acc * 360;
          acc += s.share;
          const a0 = start + gapDeg / 2;
          const a1 = Math.min(Math.max(acc * 360 - gapDeg / 2, a0 + 0.6), start + 359.99);
          const isSel = selected === s.cat.id;
          return (
            <path
              key={s.cat.id}
              d={arcPath(SIZE / 2, SIZE / 2, R, a0, a1)}
              fill="none"
              strokeWidth={isSel ? STROKE + 6 : STROKE}
              style={toneVars(s.cat)}
              className={`${TONE} cursor-pointer stroke-[color:var(--k)] transition-[opacity,stroke-width] duration-200`}
              opacity={selected && !isSel ? 0.3 : 1}
              onClick={() => onSelect(isSel ? null : s.cat.id)}
            >
              <title>{`${s.cat.label}: ${money(s.total)} (${Math.round(s.share * 100)}%)`}</title>
            </path>
          );
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-9 text-center">{children}</div>
    </div>
  );
}

function SummaryView({ month, transactions, onAdd }) {
  const [selected, setSelected] = useState(null);

  const { rows, total, change, compareLabel } = useMemo(() => {
    const expenses = transactions.filter((t) => t.type === 'expense' && t.date.startsWith(month));
    const totalSpent = sum(expenses);
    const byCat = new Map();
    for (const t of expenses) {
      const cat = categoryOf(t);
      const row = byCat.get(cat.id) ?? { cat, count: 0, total: 0 };
      row.count += 1;
      row.total += t.amount;
      byCat.set(cat.id, row);
    }
    const list = [...byCat.values()].map((r) => ({ ...r, share: totalSpent ? r.total / totalSpent : 0 }));

    // Variación frente al mes anterior. En el mes en curso se compara contra el mismo
    // tramo de días (1 → hoy) para no comparar un mes incompleto con uno completo.
    const prev = shiftMonth(month, -1);
    const isCurrent = month === currentMonth();
    const cutoff = isCurrent ? new Date().getDate() : 31;
    const prevTotal = sum(
      transactions.filter((t) => t.type === 'expense' && t.date.startsWith(prev) && Number(t.date.slice(8)) <= cutoff)
    );
    const label = !isCurrent ? `frente a ${monthShort(prev)}` : cutoff === 1 ? `vs. 1 ${monthShort(prev)}` : `vs. 1–${cutoff} ${monthShort(prev)}`;

    return {
      rows: list,
      total: totalSpent,
      change: prevTotal > 0 ? (totalSpent - prevTotal) / prevTotal : null,
      compareLabel: prevTotal > 0 ? label : `Sin datos de ${monthShort(shiftMonth(month, -1))}`,
    };
  }, [transactions, month]);

  const ring = DONUT_ORDER.map((id) => rows.find((r) => r.cat.id === id)).filter(Boolean);
  const list = [...rows].sort((a, b) => b.total - a.total);
  const selRow = rows.find((r) => r.cat.id === selected) ?? null;
  const shown = selRow ? selRow.total : total;
  const shownText = money(shown);

  return (
    <div className="space-y-4">
      <section className={card} aria-label="Resumen del mes">
        <Donut segments={ring} selected={selected} onSelect={setSelected}>
          <p className={eyebrow}>{selRow ? selRow.cat.label : monthName(month)}</p>
          <p className={`font-black tabular-nums tracking-tight text-zinc-900 dark:text-zinc-50 ${shownText.length > 11 ? 'text-2xl' : 'text-[28px]'} leading-tight`}>
            {shownText}
          </p>
          {selRow ? (
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{Math.round(selRow.share * 100)}% del gasto</p>
          ) : total === 0 ? (
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Sin gastos este mes</p>
          ) : change === null ? (
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{compareLabel}</p>
          ) : (
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              <span className={`font-semibold ${change > 0 ? 'text-rose-500 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {change > 0 ? '↑' : change < 0 ? '↓' : '='} {Math.abs(Math.round(change * 100))}%
              </span>{' '}
              {compareLabel}
            </p>
          )}
        </Donut>
      </section>

      {list.length === 0 ? (
        <section className={`${card} flex flex-col items-center gap-3 py-8 text-center`}>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Aún no hay gastos en {monthName(month)}.</p>
          <button type="button" onClick={onAdd} className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
            Registrar un gasto
          </button>
        </section>
      ) : (
        <section className={`${card} p-2`} aria-label="Gasto por categoría">
          <ul>
            {list.map((r) => {
              const isSel = selected === r.cat.id;
              return (
                <li key={r.cat.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(isSel ? null : r.cat.id)}
                    aria-pressed={isSel}
                    className={`flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition-colors ${
                      isSel ? 'bg-zinc-100 dark:bg-zinc-800/70' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                    }`}
                  >
                    <CategoryBadge cat={r.cat} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{r.cat.label}</span>
                        <span className="shrink-0 text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{money(r.total)}</span>
                      </span>
                      <span className="mt-0.5 flex items-baseline justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                        <span>
                          {r.count} {r.count === 1 ? 'movimiento' : 'movimientos'}
                        </span>
                        <span className="tabular-nums">{Math.round(r.share * 100)}%</span>
                      </span>
                      <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <span
                          style={{ ...toneVars(r.cat), width: `${Math.max(2, r.share * 100)}%` }}
                          className={`${TONE} block h-full rounded-full bg-[color:var(--k)]`}
                        />
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

/* ============================================================================
 * Vista 2 · Actividad (gasto por día + historial)
 * ========================================================================== */

function DailyBars({ month, values, average, elapsed, selectedDay, onSelect }) {
  const W = 320;
  const TOP = 14;
  const BASE = 108;
  const H = 126;
  const days = values.length;
  const slot = W / days;
  const bw = Math.min(8, slot - 2.4);
  const max = Math.max(...values, average, 1);
  const y = (v) => BASE - (v / max) * (BASE - TOP);
  const avgY = y(average);
  const ticks = [1, 5, 10, 15, 20, 25, days >= 30 ? 30 : days];
  const today = month === currentMonth() ? new Date().getDate() : null;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full select-none" role="img" aria-label={`Gasto por día de ${monthName(month)}`}>
      <line x1="0" x2={W} y1={BASE} y2={BASE} className="stroke-zinc-200 dark:stroke-zinc-800" strokeWidth="1" />

      {values.map((v, i) => {
        const day = i + 1;
        if (day > elapsed) return null;
        const x = i * slot + (slot - bw) / 2;
        const dim = selectedDay && selectedDay !== day;
        return v > 0 ? (
          <path
            key={day}
            d={barPath(x, BASE, bw, Math.max(2, BASE - y(v)), 2.5)}
            opacity={dim ? 0.3 : 1}
            className="fill-zinc-800 transition-opacity dark:fill-zinc-200"
          />
        ) : (
          <rect key={day} x={x} y={BASE - 1.5} width={bw} height="1.5" className="fill-zinc-300 dark:fill-zinc-700" />
        );
      })}

      {average > 0 && (
        <g className="pointer-events-none">
          <line x1="0" x2={W} y1={avgY} y2={avgY} strokeDasharray="3 3" strokeWidth="1" className="stroke-zinc-400 dark:stroke-zinc-500" />
          <text
            x={W - 2}
            y={avgY < 16 ? avgY + 11 : avgY - 4}
            textAnchor="end"
            strokeWidth="3"
            strokeLinejoin="round"
            style={{ paintOrder: 'stroke' }}
            className="fill-zinc-500 stroke-white text-[10px] font-semibold dark:fill-zinc-400 dark:stroke-zinc-900"
          >
            Prom. {money(average)}
          </text>
        </g>
      )}

      {ticks.map((d) => (
        <text
          key={d}
          x={(d - 0.5) * slot}
          y={H - 5}
          textAnchor="middle"
          className={`text-[10px] ${d === today ? 'fill-zinc-900 font-bold dark:fill-zinc-100' : 'fill-zinc-400 dark:fill-zinc-500'}`}
        >
          {d}
        </text>
      ))}

      {/* Zonas de toque: toda la columna del día, no solo la barra */}
      {values.map((v, i) => {
        const day = i + 1;
        if (day > elapsed) return null;
        return (
          <rect key={day} x={i * slot} y="0" width={slot} height={BASE} fill="transparent" className="cursor-pointer" onClick={() => onSelect(selectedDay === day ? null : day)}>
            <title>{`${day} ${monthShort(month)}: ${money(v)}`}</title>
          </rect>
        );
      })}
    </svg>
  );
}

function TransactionRow({ tx, armed, onEdit, onArm, onDelete }) {
  const cat = categoryOf(tx);
  const income = tx.type === 'income';
  return (
    <li className="flex items-center gap-1">
      <button type="button" onClick={onEdit} className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-2 py-2 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
        <CategoryBadge cat={cat} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{tx.note || cat.label}</span>
          <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">{tx.note ? cat.label : income ? 'Ingreso' : 'Gasto'}</span>
        </span>
        <span className={`shrink-0 text-sm font-semibold tabular-nums ${income ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
          {income ? '+' : '−'}
          {money(tx.amount)}
        </span>
      </button>
      {armed ? (
        <button type="button" onClick={onDelete} className="shrink-0 rounded-full bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white">
          Borrar
        </button>
      ) : (
        <button type="button" onClick={onArm} aria-label={`Eliminar ${tx.note || cat.label}`} className={`${iconBtn} text-zinc-300 hover:text-rose-500 dark:text-zinc-600`}>
          <Glyph name="trash" className="h-4 w-4" />
        </button>
      )}
    </li>
  );
}

function ActivityView({ month, transactions, onEdit, onDelete }) {
  const [selectedDay, setSelectedDay] = useState(null);
  const [armedId, setArmedId] = useState(null);

  useEffect(() => {
    if (!armedId) return undefined;
    const t = setTimeout(() => setArmedId(null), 3000);
    return () => clearTimeout(t);
  }, [armedId]);

  const { values, total, average, elapsed, monthTx } = useMemo(() => {
    const days = daysInMonth(month);
    const list = transactions
      .filter((t) => t.date.startsWith(month))
      .sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
    const perDay = Array(days).fill(0);
    for (const t of list) if (t.type === 'expense') perDay[Number(t.date.slice(8)) - 1] += t.amount;
    const now = currentMonth();
    const passed = month === now ? new Date().getDate() : month < now ? days : 0;
    const spent = perDay.reduce((a, v) => a + v, 0);
    return { values: perDay, total: spent, average: passed ? spent / passed : 0, elapsed: passed, monthTx: list };
  }, [transactions, month]);

  const visible = selectedDay ? monthTx.filter((t) => Number(t.date.slice(8)) === selectedDay) : monthTx;
  const groups = [];
  for (const t of visible) {
    const last = groups[groups.length - 1];
    if (last?.date === t.date) last.items.push(t);
    else groups.push({ date: t.date, items: [t] });
  }

  return (
    <div className="space-y-4">
      <section className={card} aria-label="Gasto diario">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className={eyebrow}>{selectedDay ? `${selectedDay} de ${monthName(month)}` : 'Gastado en el mes'}</p>
            <p className="text-2xl font-black tabular-nums tracking-tight text-zinc-900 dark:text-zinc-50">
              {money(selectedDay ? values[selectedDay - 1] : total)}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className={eyebrow}>Promedio diario</p>
            <p className="text-sm font-bold tabular-nums text-zinc-700 dark:text-zinc-300">{money(average)}</p>
          </div>
        </div>
        <DailyBars month={month} values={values} average={average} elapsed={elapsed} selectedDay={selectedDay} onSelect={setSelectedDay} />
      </section>

      <section className={`${card} p-2`} aria-label="Historial de movimientos">
        {selectedDay && (
          <div className="flex items-center justify-between px-2 pb-1 pt-1.5">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Solo el {selectedDay} de {monthName(month)}
            </p>
            <button type="button" onClick={() => setSelectedDay(null)} className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
              Ver todo el mes
            </button>
          </div>
        )}

        {groups.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            {selectedDay ? 'Sin movimientos ese día.' : `Sin movimientos en ${monthName(month)}.`}
          </p>
        ) : (
          groups.map((g) => {
            const spent = sum(g.items.filter((t) => t.type === 'expense'));
            return (
              <div key={g.date} className="pt-2">
                <div className="flex items-baseline justify-between px-2 pb-1">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{dayHeading(g.date)}</h3>
                  {spent > 0 && <span className="text-xs tabular-nums text-zinc-400">−{money(spent)}</span>}
                </div>
                <ul>
                  {g.items.map((tx) => (
                    <TransactionRow
                      key={tx.id}
                      tx={tx}
                      armed={armedId === tx.id}
                      onEdit={() => onEdit(tx)}
                      onArm={() => setArmedId(tx.id)}
                      onDelete={() => {
                        onDelete(tx.id);
                        setArmedId(null);
                      }}
                    />
                  ))}
                </ul>
              </div>
            );
          })
        )}
      </section>

      {groups.length > 0 && <p className="text-center text-[11px] text-zinc-400">Toca un movimiento para editarlo o una barra para ver solo ese día.</p>}
    </div>
  );
}

/* ============================================================================
 * Vista 3 · Análisis (ingresos vs. gastos, últimos 6 meses)
 * ========================================================================== */

function MonthlyBars({ data, selected, onSelect }) {
  const W = 320;
  const H = 172;
  const LEFT = 36;
  const TOP = 12;
  const BASE = 138;
  const group = (W - LEFT) / data.length;
  const bw = 13;
  const max = niceMax(Math.max(...data.map((d) => Math.max(d.income, d.expense))));
  const y = (v) => BASE - (v / max) * (BASE - TOP);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full select-none" role="img" aria-label="Ingresos y gastos de los últimos 6 meses">
      <rect x={LEFT + selected * group + 3} y={TOP - 6} width={group - 6} height={H - TOP + 2} rx="10" className="fill-zinc-100 dark:fill-zinc-800/70" />

      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={LEFT} x2={W} y1={y(max * f)} y2={y(max * f)} strokeWidth="1" className={f === 0 ? 'stroke-zinc-300 dark:stroke-zinc-700' : 'stroke-zinc-200/70 dark:stroke-zinc-800'} />
          <text x={LEFT - 6} y={y(max * f) + 3} textAnchor="end" className="fill-zinc-400 text-[9px] dark:fill-zinc-500">
            {f === 0 ? '0' : compact(max * f)}
          </text>
        </g>
      ))}

      {data.map((d, i) => {
        const cx = LEFT + i * group + group / 2;
        return (
          <g key={d.ym}>
            {d.income > 0 && <path d={barPath(cx - bw - 1, BASE, bw, Math.max(2, BASE - y(d.income)), 3)} className="fill-emerald-500 dark:fill-emerald-400" />}
            {d.expense > 0 && <path d={barPath(cx + 1, BASE, bw, Math.max(2, BASE - y(d.expense)), 3)} className="fill-zinc-800 dark:fill-zinc-200" />}
            <text
              x={cx}
              y={BASE + 18}
              textAnchor="middle"
              className={`text-[10px] ${i === selected ? 'fill-zinc-900 font-bold dark:fill-zinc-100' : 'fill-zinc-400 dark:fill-zinc-500'}`}
            >
              {monthShort(d.ym)}
            </text>
            <rect x={LEFT + i * group} y="0" width={group} height={H} fill="transparent" className="cursor-pointer" onClick={() => onSelect(i)}>
              <title>{`${monthName(d.ym)}: ingresos ${money(d.income)}, gastos ${money(d.expense)}`}</title>
            </rect>
          </g>
        );
      })}
    </svg>
  );
}

function AnalysisView({ month, transactions }) {
  const data = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => {
        const ym = shiftMonth(month, i - 5);
        const list = transactions.filter((t) => t.date.startsWith(ym));
        return {
          ym,
          income: sum(list.filter((t) => t.type === 'income')),
          expense: sum(list.filter((t) => t.type === 'expense')),
        };
      }),
    [transactions, month]
  );
  const [selected, setSelected] = useState(5);

  const focus = data[selected];
  const { income, expense } = data[5];
  const balance = income - expense;
  const usedPct = income > 0 ? Math.min(100, (expense / income) * 100) : expense > 0 ? 100 : 0;
  const over = balance < 0;
  const withSpend = data.filter((d) => d.expense > 0);
  const avgExpense = withSpend.length ? withSpend.reduce((acc, d) => acc + d.expense, 0) / withSpend.length : 0;

  return (
    <div className="space-y-4">
      <section className={card} aria-label={`Balance de ${monthName(month)}`}>
        <p className={eyebrow}>
          {income === 0 && expense === 0 ? `Balance de ${monthName(month)}` : over ? `Te pasaste en ${monthName(month)}` : `Te queda de ${monthName(month)}`}
        </p>
        <p className={`text-4xl font-black tabular-nums tracking-tight ${over ? 'text-rose-500 dark:text-rose-400' : 'text-zinc-900 dark:text-zinc-50'}`}>
          {money(Math.abs(balance))}
        </p>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          {income === 0
            ? expense === 0
              ? 'Registra tus ingresos y gastos para ver tu balance.'
              : 'Aún no registras ingresos este mes.'
            : over
              ? `Gastaste más de lo que ingresó (${Math.round((expense / income) * 100)}% de tus ingresos).`
              : `Has usado el ${Math.round((expense / income) * 100)}% de tus ingresos.`}
        </p>

        <div
          className="mt-3 h-2.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(usedPct)}
          aria-label="Porcentaje de los ingresos ya gastado"
        >
          <div
            className={`h-full rounded-full transition-[width] duration-500 ease-out ${over ? 'bg-rose-500 dark:bg-rose-400' : 'bg-zinc-900 dark:bg-zinc-100'}`}
            style={{ width: `${usedPct}%` }}
          />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat title="Ingresos" value={money(income)} tone="text-emerald-600 dark:text-emerald-400" />
          <Stat title="Gastos" value={money(expense)} />
          <Stat title="Ahorro" value={income > 0 ? `${Math.round((balance / income) * 100)}%` : '—'} />
        </div>
      </section>

      <section className={card} aria-label="Ingresos vs. gastos">
        <div className="mb-1 flex items-baseline justify-between">
          <p className={eyebrow}>Ingresos vs. gastos</p>
          <p className="text-xs font-semibold capitalize text-zinc-700 dark:text-zinc-300">
            {monthName(focus.ym)} {focus.ym.slice(0, 4)}
          </p>
        </div>
        <div className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500 dark:bg-emerald-400" />
            <span className="text-zinc-500 dark:text-zinc-400">Ingresos</span>
            <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{money(focus.income)}</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-zinc-800 dark:bg-zinc-200" />
            <span className="text-zinc-500 dark:text-zinc-400">Gastos</span>
            <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{money(focus.expense)}</span>
          </span>
        </div>
        <MonthlyBars data={data} selected={selected} onSelect={setSelected} />
        {avgExpense > 0 && (
          <p className="mt-2 text-center text-[11px] text-zinc-400">
            Gasto promedio: {money(avgExpense)} al mes
          </p>
        )}
      </section>
    </div>
  );
}

/* ============================================================================
 * Registro rápido en 3 pasos (monto → categoría → detalle)
 * ========================================================================== */

const STEP_TITLES = { 1: '¿Cuánto fue?', 2: '¿En qué categoría?', 3: 'Detalles' };

function EntrySheet({ initial, defaultDate, onSave, onDelete, onClose }) {
  const editing = Boolean(initial);
  const [type, setType] = useState(initial?.type ?? 'expense');
  const [digits, setDigits] = useState(initial ? String(Math.round(initial.amount)) : '');
  const [category, setCategory] = useState(initial?.category ?? null);
  const [note, setNote] = useState(initial?.note ?? '');
  const [date, setDate] = useState(initial?.date ?? defaultDate);
  const [step, setStep] = useState(editing ? 3 : 1);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const amountRef = useRef(null);
  const inset = useKeyboardInset();

  const amount = Number(digits || 0);
  const cats = categoriesFor(type);
  const cat = cats.find((c) => c.id === category) ?? null;
  const canSave = amount > 0 && cat && date;

  useEffect(() => {
    if (step === 1) amountRef.current?.focus();
  }, [step]);

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

  const changeType = (next) => {
    setType(next);
    if (!categoriesFor(next).some((c) => c.id === category)) {
      setCategory(null);
      if (step === 3) setStep(2);
    }
  };

  const save = (e) => {
    e?.preventDefault();
    if (canSave) onSave({ type, amount, category: cat.id, note: note.trim(), date });
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4"
      style={inset ? { paddingBottom: inset } : undefined}
      role="dialog"
      aria-modal="true"
      aria-label={editing ? 'Editar movimiento' : 'Nuevo movimiento'}
    >
      <button type="button" aria-label="Cerrar" onClick={onClose} className="absolute inset-0 animate-fade-in bg-zinc-950/50 backdrop-blur-sm" />

      <div className="relative w-full max-w-lg animate-sheet-up rounded-t-3xl border border-zinc-200 bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 sm:rounded-3xl">
        {/* Cabecera */}
        <div className="mb-4 flex items-center gap-2">
          {step > 1 ? (
            <button type="button" onClick={() => setStep(step - 1)} aria-label="Paso anterior" className={iconBtn}>
              <Glyph name="left" className="h-4 w-4" strokeWidth={2} />
            </button>
          ) : (
            <span className="h-9 w-9" />
          )}
          <div className="flex-1 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              {editing ? 'Editar' : 'Nuevo'} · paso {step} de 3
            </p>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{STEP_TITLES[step]}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className={iconBtn}>
            <Glyph name="close" className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <Pills
          label="Tipo de movimiento"
          value={type}
          onChange={changeType}
          options={[
            { id: 'expense', label: 'Gasto' },
            { id: 'income', label: 'Ingreso' },
          ]}
        />

        <div className="my-4 grid grid-cols-3 gap-1.5" aria-hidden="true">
          {[1, 2, 3].map((n) => (
            <span key={n} className={`h-1 rounded-full transition-colors ${n <= step ? 'bg-zinc-900 dark:bg-zinc-100' : 'bg-zinc-200 dark:bg-zinc-800'}`} />
          ))}
        </div>

        {/* Paso 1 · Monto */}
        {step === 1 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (amount > 0) setStep(cat ? 3 : 2);
            }}
          >
            <input
              ref={amountRef}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              enterKeyHint="next"
              aria-label="Monto"
              placeholder="$0"
              value={digits ? `$${Number(digits).toLocaleString('es-CO')}` : ''}
              onChange={(e) => setDigits(e.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 10))}
              className={`w-full bg-transparent py-6 text-center text-5xl font-black tabular-nums tracking-tight placeholder:text-zinc-300 focus:outline-none dark:placeholder:text-zinc-700 ${
                type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-900 dark:text-zinc-50'
              }`}
            />
            <button type="submit" disabled={amount <= 0} className={primaryBtn}>
              Continuar
            </button>
          </form>
        )}

        {/* Paso 2 · Categoría */}
        {step === 2 && (
          <div>
            <p className="mb-3 text-center text-sm text-zinc-500 dark:text-zinc-400">
              {type === 'income' ? 'Ingreso' : 'Gasto'} de <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{money(amount)}</span>
            </p>
            <div className="grid grid-cols-3 gap-2">
              {cats.map((c) => {
                const active = c.id === category;
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setCategory(c.id);
                      setStep(3);
                    }}
                    className={`flex min-w-0 flex-col items-center gap-1.5 rounded-2xl border px-1 py-3 transition-colors ${
                      active
                        ? 'border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-800'
                        : 'border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/60'
                    }`}
                  >
                    <CategoryBadge cat={c} />
                    <span className="w-full truncate text-center text-[11px] font-medium text-zinc-700 dark:text-zinc-300">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Paso 3 · Detalle y guardar */}
        {step === 3 && cat && (
          <form onSubmit={save} className="space-y-3">
            <div className="flex items-center gap-3 rounded-2xl bg-zinc-50 p-3 dark:bg-zinc-800/60">
              <button type="button" onClick={() => setStep(2)} aria-label={`Cambiar categoría (${cat.label})`}>
                <CategoryBadge cat={cat} className="h-11 w-11 bg-white dark:bg-zinc-900" />
              </button>
              <button type="button" onClick={() => setStep(2)} className="min-w-0 flex-1 text-left">
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{type === 'income' ? 'Ingreso' : 'Gasto'}</span>
                <span className="block truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{cat.label}</span>
              </button>
              <button
                type="button"
                onClick={() => setStep(1)}
                aria-label="Cambiar monto"
                className={`shrink-0 text-xl font-black tabular-nums ${type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-900 dark:text-zinc-50'}`}
              >
                {money(amount)}
              </button>
            </div>

            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={40}
              enterKeyHint="done"
              aria-label="Nombre o descripción (opcional)"
              placeholder={type === 'income' ? 'Nombre (opcional) · ej. Pago de octubre' : 'Nombre (opcional) · ej. Almuerzo'}
              className={field}
            />

            <label className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-400">
              Fecha
              <input
                type="date"
                value={date}
                max={todayKey()}
                onChange={(e) => e.target.value && setDate(e.target.value)}
                className="bg-transparent py-1 text-base font-medium text-zinc-900 focus:outline-none dark:text-zinc-100 dark:[color-scheme:dark]"
              />
            </label>

            <div className="flex gap-2 pt-1">
              {editing && (
                <button
                  type="button"
                  onClick={() => (confirmDelete ? onDelete() : setConfirmDelete(true))}
                  className={`shrink-0 rounded-2xl px-4 text-sm font-semibold transition-colors ${
                    confirmDelete ? 'bg-rose-500 text-white' : 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10'
                  }`}
                >
                  {confirmDelete ? '¿Seguro?' : 'Eliminar'}
                </button>
              )}
              <button type="submit" disabled={!canSave} className={primaryBtn}>
                {editing ? 'Guardar cambios' : 'Guardar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* ============================================================================
 * Componente principal
 * ========================================================================== */

export default function ExpenseTracker({ className = '' }) {
  const [transactions, setTransactions] = useState(loadTransactions);
  const [month, setMonth] = useState(currentMonth);
  const [view, setView] = useState('summary');
  const [sheet, setSheet] = useState(null); // null | { tx: Transaction | null }

  useEffect(() => saveTransactions(transactions), [transactions]);

  const closeSheet = useCallback(() => setSheet(null), []);
  const openNew = () => setSheet({ tx: null });

  // Al registrar desde un mes pasado, la fecha por defecto cae dentro de ese mes
  const defaultDate = month === currentMonth() ? todayKey() : `${month}-${pad(daysInMonth(month))}`;

  const saveTx = (data) => {
    const editing = sheet?.tx;
    setTransactions((prev) =>
      editing
        ? prev.map((t) => (t.id === editing.id ? { ...t, ...data } : t))
        : [...prev, { id: uid(), ...data, createdAt: new Date().toISOString() }]
    );
    setMonth(data.date.slice(0, 7)); // siempre se muestra el mes donde quedó el movimiento
    setSheet(null);
  };

  const deleteTx = (id) => setTransactions((prev) => prev.filter((t) => t.id !== id));

  return (
    <div className={`mx-auto w-full max-w-lg space-y-4 text-zinc-900 dark:text-zinc-100 ${className}`}>
      <MonthNav month={month} onChange={setMonth} />
      <Pills label="Vistas de finanzas" value={view} onChange={setView} options={VIEWS} />

      {view === 'summary' && <SummaryView key={month} month={month} transactions={transactions} onAdd={openNew} />}
      {view === 'activity' && (
        <ActivityView key={month} month={month} transactions={transactions} onEdit={(tx) => setSheet({ tx })} onDelete={deleteTx} />
      )}
      {view === 'analysis' && <AnalysisView key={month} month={month} transactions={transactions} />}

      {/* Botón flotante: usa la misma rejilla que la barra inferior de la app, así que
          queda exactamente sobre su "+" y lo reemplaza mientras esta pestaña está abierta. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[45] pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-lg justify-end px-4 pb-3">
          <button
            type="button"
            onClick={openNew}
            aria-label="Registrar gasto o ingreso"
            className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-lg shadow-zinc-900/30 transition hover:bg-zinc-700 active:scale-95 dark:bg-zinc-100 dark:text-zinc-900 dark:shadow-black/40 dark:hover:bg-white"
          >
            <Glyph name="plus" className="h-7 w-7" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {sheet && (
        <EntrySheet
          key={sheet.tx?.id ?? 'new'}
          initial={sheet.tx}
          defaultDate={defaultDate}
          onSave={saveTx}
          onClose={closeSheet}
          onDelete={() => {
            deleteTx(sheet.tx.id);
            setSheet(null);
          }}
        />
      )}
    </div>
  );
}