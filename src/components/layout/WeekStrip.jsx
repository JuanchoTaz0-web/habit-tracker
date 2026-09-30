// src/components/layout/WeekStrip.jsx — selector de día semanal con indicador de progreso
import { WEEKDAY_SHORT, addDays, parseDateKey, startOfWeek, todayKey } from '../../utils/dates';
import { IconChevronLeft, IconChevronRight } from '../ui/Icons';

function dotClass(ratio, selected) {
  if (ratio === null) return 'bg-transparent';
  if (ratio >= 0.999) return selected ? 'bg-white' : 'bg-emerald-500';
  if (ratio > 0) return selected ? 'bg-indigo-200' : 'bg-amber-400';
  return selected ? 'bg-indigo-300' : 'bg-slate-300 dark:bg-slate-600';
}

export default function WeekStrip({ selectedDate, onSelect, dayRatio }) {
  const start = startOfWeek(selectedDate);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const today = todayKey();

  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={() => onSelect(addDays(selectedDate, -7))} aria-label="Semana anterior" className="icon-btn -ml-2">
        <IconChevronLeft className="h-4 w-4" />
      </button>

      <div className="grid flex-1 grid-cols-7 gap-1">
        {days.map((d) => {
          const date = parseDateKey(d);
          const selected = d === selectedDate;
          const isToday = d === today;
          return (
            <button
              key={d}
              type="button"
              onClick={() => onSelect(d)}
              aria-current={selected ? 'date' : undefined}
              className={`flex flex-col items-center gap-1 rounded-2xl py-2 transition ${
                selected
                  ? 'bg-indigo-600 text-white dark:text-slate-950 shadow-lg shadow-indigo-600/30'
                  : 'hover:bg-white dark:hover:bg-slate-900'
              }`}
            >
              <span
                className={`text-[10px] font-bold uppercase ${
                  selected ? 'text-indigo-100' : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {WEEKDAY_SHORT[date.getDay()]}
              </span>
              <span
                className={`text-sm font-bold tabular-nums ${
                  !selected && isToday ? 'text-indigo-600 dark:text-indigo-400' : ''
                }`}
              >
                {date.getDate()}
              </span>
              <span className={`h-1.5 w-1.5 rounded-full ${dotClass(dayRatio(d), selected)}`} />
            </button>
          );
        })}
      </div>

      <button type="button" onClick={() => onSelect(addDays(selectedDate, 7))} aria-label="Semana siguiente" className="icon-btn -mr-2">
        <IconChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
