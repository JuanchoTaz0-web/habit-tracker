// src/components/daily/ItemCard.jsx — tarjeta de tarea con swipe, contador incremental y pasos
import { useState } from 'react';
import { getColor } from '../../constants/theme';
import useSwipe from '../../hooks/useSwipe';
import { describeWeekdays, formatNumber } from '../../utils/dates';
import { segmentCount } from '../../utils/items';
import ProgressRing from '../ui/ProgressRing';
import { IconBell, IconCheck, IconChevronDown, IconDots, IconMinus, IconPlus, IconRepeat, IconStar, IconX } from '../ui/Icons';

const CARD_BY_STATUS = {
  done: 'ring-emerald-500/40 bg-emerald-50/70 dark:bg-emerald-50',
  missed: 'ring-rose-500/40 bg-rose-50/70 dark:bg-rose-500/[0.07]',
  null: 'ring-slate-200 bg-white dark:bg-slate-900 dark:ring-slate-800',
};

/* ---------- Indicador / botón de estado ---------- */
function StatusButton({ item, color, onPress }) {
  const { status, kind, progress } = item;
  const label =
    kind === 'counter'
      ? `Sumar ${formatNumber(item.step)} ${item.unit}`
      : kind === 'steps'
        ? 'Mostrar pasos'
        : status === 'done'
          ? 'Desmarcar'
          : 'Marcar como hecha';

  if (status === 'missed') {
    return (
      <button type="button" onClick={onPress} aria-label={label} className="flex h-10 w-10 shrink-0 animate-pop items-center justify-center rounded-full bg-rose-500 text-white">
        <IconX className="h-5 w-5" strokeWidth={3} />
      </button>
    );
  }
  if (status === 'done') {
    return (
      <button type="button" onClick={onPress} aria-label={label} className="flex h-10 w-10 shrink-0 animate-pop items-center justify-center rounded-full bg-emerald-500 text-white shadow-md shadow-emerald-500/30">
        <IconCheck className="h-5 w-5" strokeWidth={3} />
      </button>
    );
  }
  if (kind === 'check') {
    return (
      <button
        type="button"
        onClick={onPress}
        aria-label={label}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-[2.5px] border-slate-300 transition hover:border-emerald-500 hover:bg-emerald-50 dark:border-slate-600 dark:hover:bg-emerald-500/10"
      />
    );
  }
  return (
    <button type="button" onClick={onPress} aria-label={label} className="shrink-0 rounded-full transition active:scale-95">
      <ProgressRing value={progress.ratio} size={40} stroke={4} barClass={color.stroke}>
        <span className="text-[10px] font-bold tabular-nums">{Math.round(progress.ratio * 100)}%</span>
      </ProgressRing>
    </button>
  );
}

/* ---------- Contador con segmentos (ej. 3 × 1 L) ---------- */
function CounterControl({ item, color, onAdd, onSet }) {
  const { value, total } = item.progress;
  const step = item.step;
  const segments = segmentCount(item);

  return (
    <div className="mt-3 flex items-center gap-2" data-noswipe>
      <button
        type="button"
        onClick={() => onAdd(-step)}
        disabled={value <= 0}
        aria-label={`Restar ${formatNumber(step)} ${item.unit}`}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-slate-200 active:scale-95 disabled:opacity-30 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
      >
        <IconMinus className="h-4 w-4" strokeWidth={2.5} />
      </button>

      {segments <= 12 ? (
        <div className="flex flex-1 gap-1">
          {Array.from({ length: segments }, (_, i) => {
            const segStart = i * step;
            const segEnd = Math.min(total, segStart + step);
            const filled = value >= segEnd - 1e-9;
            const partial = !filled && value > segStart;
            const isLastFilled = filled && value < segEnd + step - 1e-9;
            return (
              <button
                key={i}
                type="button"
                onClick={() => onSet(isLastFilled ? segStart : segEnd)}
                aria-label={`Marcar ${formatNumber(segEnd)} ${item.unit}`}
                className={`flex flex-1 items-center justify-center rounded-lg text-[10px] font-bold transition active:scale-95 ${
                  segments <= 6 ? 'h-9' : 'h-6'
                } ${
                  filled
                    ? `${color.bar} text-white`
                    : partial
                      ? `${color.barSoft} text-white`
                      : 'bg-slate-100 text-slate-400 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:hover:bg-slate-700'
                }`}
              >
                {segments <= 6 && `${formatNumber(segEnd)}${item.unit ? ` ${item.unit}` : ''}`}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div className={`h-full rounded-full ${color.bar} transition-all duration-300`} style={{ width: `${item.progress.ratio * 100}%` }} />
        </div>
      )}

      <button
        type="button"
        onClick={() => onAdd(step)}
        disabled={value >= total}
        aria-label={`Sumar ${formatNumber(step)} ${item.unit}`}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white transition active:scale-95 disabled:opacity-30 ${color.bar}`}
      >
        <IconPlus className="h-4 w-4" strokeWidth={2.5} />
      </button>
    </div>
  );
}

/* ---------- Lista de pasos / subtareas ---------- */
function StepsList({ item, color, onToggle }) {
  const doneIds = new Set(item.log?.done ?? []);
  return (
    <ul className="mt-2 space-y-0.5" data-noswipe>
      {item.subtasks.map((s, i) => {
        const done = doneIds.has(s.id);
        return (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onToggle(s.id)}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-slate-100/80 dark:hover:bg-slate-800/60"
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition ${
                  done ? `${color.bar} border-transparent text-white` : 'border-slate-300 dark:border-slate-600'
                }`}
              >
                {done && <IconCheck className="h-3.5 w-3.5" strokeWidth={3} />}
              </span>
              <span className={`flex-1 text-sm ${done ? 'text-slate-400 line-through dark:text-slate-500' : ''}`}>{s.title}</span>
              <span className="text-[10px] font-semibold tabular-nums text-slate-400">
                {i + 1}/{item.subtasks.length}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* ---------- Tarjeta ---------- */
export default function ItemCard({ item, onStatus, onCounterAdd, onCounterSet, onStep, onEdit }) {
  const color = getColor(item.color);
  const { status, kind, progress } = item;
  const [open, setOpen] = useState(false);

  const { dx, dragging, armed, bind } = useSwipe({
    onSwipeRight: () => onStatus(status === 'done' ? null : 'done'),
    onSwipeLeft: () => onStatus(status === 'missed' ? null : 'missed'),
  });

  const pressStatus = () => {
    if (status) return onStatus(null);
    if (kind === 'check') return onStatus('done');
    if (kind === 'counter') return onCounterAdd(item.step);
    return setOpen((o) => !o);
  };

  const meta =
    kind === 'counter'
      ? `${formatNumber(progress.value)} / ${formatNumber(progress.total)} ${item.unit}`.trim()
      : kind === 'steps'
        ? `${progress.value}/${progress.total} pasos`
        : null;

  return (
    <li id={`item-${item.id}`} className="relative scroll-mt-48">
      {/* Fondo que se revela al deslizar */}
      <div
        aria-hidden="true"
        className={`absolute inset-0 flex items-center justify-between rounded-2xl px-5 text-sm font-bold text-white transition-colors ${
          dx > 0 ? (armed === 'right' ? 'bg-emerald-500' : 'bg-emerald-400/60') : dx < 0 ? (armed === 'left' ? 'bg-rose-500' : 'bg-rose-400/60') : 'bg-transparent'
        }`}
      >
        <span className={`flex items-center gap-1.5 transition-opacity ${dx > 0 ? 'opacity-100' : 'opacity-0'}`}>
          <IconCheck className="h-5 w-5" strokeWidth={3} />
          {status === 'done' ? 'Desmarcar' : 'Realizada'}
        </span>
        <span className={`flex items-center gap-1.5 transition-opacity ${dx < 0 ? 'opacity-100' : 'opacity-0'}`}>
          {status === 'missed' ? 'Desmarcar' : 'No realizada'}
          <IconX className="h-5 w-5" strokeWidth={3} />
        </span>
      </div>

      <div
        {...bind}
        style={{
          transform: `translateX(${dx}px)`,
          transition: dragging ? 'none' : 'transform 240ms cubic-bezier(0.2, 0.8, 0.2, 1)',
          touchAction: 'pan-y',
        }}
        className={`relative select-none overflow-hidden rounded-2xl shadow-sm ring-1 transition-colors ${CARD_BY_STATUS[status]}`}
      >
        <span className={`absolute inset-y-0 left-0 w-1 ${color.bar}`} aria-hidden="true" />

        <div className="py-3 pl-4 pr-2">
          <div className="flex items-center gap-3">
            <StatusButton item={item} color={color} onPress={pressStatus} />

            <button
              type="button"
              onClick={() => (kind === 'steps' ? setOpen((o) => !o) : onEdit())}
              className="min-w-0 flex-1 text-left"
            >
              <p
                className={`truncate text-[15px] font-semibold ${
                  status === 'done' ? 'text-slate-400 line-through dark:text-slate-500' : status === 'missed' ? 'text-slate-500 dark:text-slate-400' : ''
                }`}
              >
                {item.title}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                {meta && <span className={`font-semibold tabular-nums ${color.text}`}>{meta}</span>}
                {item.recurrence === 'daily' ? (
                  <span className="inline-flex items-center gap-1">
                    <IconRepeat className="h-3 w-3" />
                    {describeWeekdays(item.weekdays)}
                  </span>
                ) : (
                  <span>Una vez</span>
                )}
                {item.reminder && (
                  <span className="inline-flex items-center gap-1">
                    <IconBell className="h-3 w-3" />
                    {item.reminder}
                  </span>
                )}
                {item.priority === 'high' && (
                  <span className="inline-flex items-center gap-0.5 font-semibold text-amber-500">
                    <IconStar className="h-3 w-3" fill="currentColor" />
                    Prioridad
                  </span>
                )}
              </div>
            </button>

            {kind === 'steps' && (
              <button type="button" onClick={() => setOpen((o) => !o)} aria-label={open ? 'Ocultar pasos' : 'Mostrar pasos'} aria-expanded={open} className="icon-btn">
                <IconChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>
            )}
            <button type="button" onClick={onEdit} aria-label={`Editar ${item.title}`} className="icon-btn">
              <IconDots className="h-5 w-5" />
            </button>
          </div>

          {kind === 'steps' && (
            <div className="mr-2 mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className={`h-full rounded-full ${color.bar} transition-all duration-300`} style={{ width: `${progress.ratio * 100}%` }} />
            </div>
          )}

          {kind === 'counter' && status !== 'missed' && (
            <div className="pr-2">
              <CounterControl item={item} color={color} onAdd={onCounterAdd} onSet={onCounterSet} />
            </div>
          )}

          {kind === 'steps' && open && <StepsList item={item} color={color} onToggle={onStep} />}
        </div>
      </div>
    </li>
  );
}
