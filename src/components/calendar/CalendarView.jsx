// src/components/calendar/CalendarView.jsx — pestaña "Calendario": radial mensual + estadísticas + notas
import { useMemo } from 'react';
import { dateFromParts } from '../../utils/dates';
import { DEFAULT_GEOMETRY } from '../../utils/geometry';
import { matchesWeekday } from '../../utils/items';
import HabitLabels from '../tracker/HabitLabels';
import RadialGrid from '../tracker/RadialGrid';
import { IconPlus } from '../ui/Icons';
import StatsPanel from './StatsPanel';

// 0 = nombres dentro del cuadrante libre de la "C" (mejor en móvil). Súbelo (ej. 180) en pantallas anchas.
const LABEL_WIDTH = 0;

function Legend() {
  const items = [
    { label: 'Realizado', cls: 'bg-emerald-500' },
    { label: 'No realizado', cls: 'bg-rose-500' },
    { label: 'Sin marcar', cls: 'bg-white ring-1 ring-slate-300 dark:bg-slate-900 dark:ring-slate-700' },
  ];
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <span className={`h-3 w-3 rounded ${i.cls}`} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

export default function CalendarView({ store, onEditItem, onNewHabit }) {
  const { period, calendarItems, monthEntries, monthStats, daysInMonth, notes } = store;
  const { cx } = DEFAULT_GEOMETRY;

  const habits = useMemo(
    () => calendarItems.map((i) => ({ id: i.id, name: i.title, color: i.color })),
    [calendarItems]
  );

  const isEnabled = useMemo(() => {
    const byId = new Map(calendarItems.map((i) => [i.id, i]));
    return (id, day) => {
      const item = byId.get(id);
      // Solo se bloquean los días de la semana no programados: permite rellenar días pasados
      return item ? matchesWeekday(item, dateFromParts(period.year, period.month, day)) : false;
    };
  }, [calendarItems, period.year, period.month]);

  const now = new Date();
  const todayDay =
    period.year === now.getFullYear() && period.month === now.getMonth() + 1 ? now.getDate() : null;

  return (
    <div className="space-y-5">
      <section className="card space-y-4 p-3 sm:p-5" aria-label="Calendario radial">
        {habits.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
            <span className="text-4xl">🌀</span>
            <p className="font-bold">Tu calendario radial está vacío</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Los hábitos fijos con “Mostrar en el calendario” ocupan un anillo cada uno (máx. 8).
            </p>
            <button type="button" onClick={onNewHabit} className="btn-primary mt-2">
              <IconPlus className="h-4 w-4" />
              Nuevo hábito fijo
            </button>
          </div>
        ) : (
          <div
            className="grid w-full"
            style={{
              gridTemplateColumns: `minmax(0, ${LABEL_WIDTH}fr) minmax(0, ${cx}fr) minmax(0, ${cx}fr)`,
              gridTemplateRows: '1fr',
            }}
          >
            <div className="relative z-10" style={{ gridColumn: '1 / 3', gridRow: 1 }}>
              <HabitLabels habits={habits} labelWidth={LABEL_WIDTH} />
            </div>
            <div style={{ gridColumn: '2 / 4', gridRow: 1 }}>
              <RadialGrid
                habits={habits}
                entries={monthEntries}
                daysInMonth={daysInMonth}
                isEnabled={isEnabled}
                highlightDay={todayDay}
                onToggle={(id, day) => store.cycleStatus(id, dateFromParts(period.year, period.month, day))}
              />
            </div>
          </div>
        )}
        {habits.length > 0 && (
          <>
            <Legend />
            <p className="text-center text-[11px] text-slate-400 dark:text-slate-500">
              Toca una celda: vacío → realizado → no realizado.
            </p>
          </>
        )}
      </section>

      <StatsPanel stats={monthStats} period={period} onSelectHabit={onEditItem} />

      <section className="card p-4" aria-label="Notas del mes">
        <h2 className="mb-3 text-sm font-bold">Notas</h2>
        <div className="grid-paper overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <textarea
            value={notes}
            onChange={(e) => store.setNotes(e.target.value)}
            placeholder="Escribe tus notas del mes…"
            spellCheck={false}
            className="block h-56 w-full resize-y bg-transparent p-3 font-mono text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none dark:text-slate-200 dark:placeholder:text-slate-600"
            style={{ lineHeight: '24px' }}
          />
        </div>
      </section>
    </div>
  );
}
