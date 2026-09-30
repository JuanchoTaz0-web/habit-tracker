// src/components/tracker/HabitLabels.jsx
// SVG que comparte la escala del RadialGrid. Con labelWidth = 0 los nombres ocupan
// el cuadrante libre de la "C" (ideal en móvil); con labelWidth > 0 se extienden a la izquierda.
import { useMemo } from 'react';
import { getColor } from '../../constants/theme';
import { DEFAULT_GEOMETRY, getRingRadii } from '../../utils/geometry';

const NO_OVERRIDES = {};
const truncate = (text, max) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

export default function HabitLabels({ habits = [], geometry = NO_OVERRIDES, labelWidth = 0, className = '' }) {
  const cfg = useMemo(() => ({ ...DEFAULT_GEOMETRY, ...geometry }), [geometry]);
  const size = cfg.cy * 2;
  const totalWidth = labelWidth + cfg.cx;
  const maxChars = Math.floor((totalWidth - 30) / 7.5);

  const rows = useMemo(
    () =>
      Array.from({ length: cfg.rings }, (_, i) => {
        const { rInner, rOuter } = getRingRadii(i, cfg);
        return { ring: i, top: cfg.cy - rOuter, bottom: cfg.cy - rInner, mid: cfg.cy - (rOuter + rInner) / 2 };
      }),
    [cfg]
  );
  const lastBottom = rows.at(-1)?.bottom ?? cfg.cy;

  return (
    <svg
      viewBox={`0 0 ${totalWidth} ${size}`}
      className={`pointer-events-none h-auto w-full select-none ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <g className="stroke-slate-300 stroke-[1px] dark:stroke-slate-700">
        {rows.map((r) => (
          <line key={`t-${r.ring}`} x1={0} y1={r.top} x2={totalWidth} y2={r.top} />
        ))}
        <line x1={0} y1={lastBottom} x2={totalWidth} y2={lastBottom} />
      </g>

      {rows.map((r) => {
        const habit = habits[r.ring];
        if (!habit) return null;
        return (
          <g key={`n-${r.ring}`}>
            <circle cx={12} cy={r.mid} r={4.5} fill={getColor(habit.color).hex} />
            <text
              x={24}
              y={r.mid}
              dominantBaseline="central"
              className="fill-slate-700 text-[13px] font-semibold dark:fill-slate-200"
            >
              {truncate(habit.name, maxChars)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
