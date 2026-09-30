// src/components/tracker/RadialGrid.jsx
import { useMemo } from 'react';
import { DEFAULT_GEOMETRY, buildGrid } from '../../utils/geometry';
import RadialCell from './RadialCell';

const NO_OVERRIDES = {};

/**
 * props:
 *  habits       : [{ id, name }]      (máx. cfg.rings; índice 0 = anillo exterior)
 *  entries      : { [habitId]: { [day]: 'done' | 'missed' | null } }
 *  daysInMonth  : días activos del mes (28–31)
 *  onToggle     : (habitId, day) => void
 *  isEnabled    : (habitId, day) => boolean   (días no programados quedan deshabilitados)
 *  highlightDay : día resaltado (hoy)
 */
export default function RadialGrid({
  habits = [],
  entries = {},
  daysInMonth = 31,
  onToggle,
  isEnabled,
  highlightDay = null,
  geometry = NO_OVERRIDES,
  className = '',
}) {
  const cfg = useMemo(() => ({ ...DEFAULT_GEOMETRY, ...geometry }), [geometry]);
  const { cells, labels } = useMemo(() => buildGrid(cfg), [cfg]);
  const size = cfg.cx * 2;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      overflow="visible"
      className={`h-auto w-full select-none ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <g>
        {cells.map(({ ring, day, d }) => {
          const habit = habits[ring];
          const dayNumber = day + 1;
          const disabled =
            !habit || dayNumber > daysInMonth || (isEnabled ? !isEnabled(habit.id, dayNumber) : false);
          const status = habit ? entries[habit.id]?.[dayNumber] ?? null : null;

          return (
            <RadialCell
              key={`${ring}-${day}`}
              d={d}
              status={status}
              disabled={disabled}
              title={habit && dayNumber <= daysInMonth ? `${habit.name} · día ${dayNumber}` : undefined}
              onClick={() => onToggle?.(habit.id, dayNumber)}
            />
          );
        })}
      </g>

      <g className="pointer-events-none text-[13px] font-semibold">
        {labels.map(({ day, x, y, rotate }) => {
          const isHighlight = day === highlightDay;
          return (
            <text
              key={day}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              transform={`rotate(${rotate.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)})`}
              className={
                day > daysInMonth
                  ? 'fill-slate-300 dark:fill-slate-700'
                  : isHighlight
                    ? 'fill-indigo-600 font-black dark:fill-indigo-400'
                    : 'fill-slate-500 dark:fill-slate-400'
              }
            >
              {day}
            </text>
          );
        })}
      </g>
    </svg>
  );
}
