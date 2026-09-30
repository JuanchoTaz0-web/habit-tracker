// src/components/calendar/StatsPanel.jsx — estadísticas del mes
import { useState } from 'react';
import { getColor } from '../../constants/theme';
import { MONTH_NAMES } from '../../utils/dates';
import { IconFlame } from '../ui/Icons';

function Kpi({ value, label, icon }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-2 py-3 text-center dark:bg-slate-800/60">
      <p className="flex items-center justify-center gap-1 text-xl font-black tabular-nums leading-none">
        {icon}
        {value}
      </p>
      <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}

/* Barras de cumplimiento diario (una sola serie, un solo tono) */
function DailyBars({ ratios, month, todayDay }) {
  const [active, setActive] = useState(null);
  const H = 64;
  const shown = active ?? todayDay;
  const shownRatio = shown ? ratios[shown - 1] : null;

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Cumplimiento por día</p>
        <p className="text-xs tabular-nums text-slate-500 dark:text-slate-400" aria-live="polite">
          {shown ? (
            <>
              {shown} {MONTH_NAMES[month - 1].slice(0, 3)} ·{' '}
              <span className="font-bold text-slate-800 dark:text-slate-100">
                {shownRatio === null ? 'sin datos' : `${Math.round(shownRatio * 100)}%`}
              </span>
            </>
          ) : (
            'Toca una barra'
          )}
        </p>
      </div>

      <div className="flex items-end gap-[2px]" style={{ height: H }} onPointerLeave={() => setActive(null)}>
        {ratios.map((r, i) => {
          const day = i + 1;
          const h = r === null ? 0 : Math.max(3, r * H);
          const isActive = day === shown;
          return (
            <button
              key={day}
              type="button"
              onPointerEnter={() => setActive(day)}
              onFocus={() => setActive(day)}
              onClick={() => setActive(day)}
              aria-label={`Día ${day}: ${r === null ? 'sin datos' : `${Math.round(r * 100)}%`}`}
              className="relative flex h-full flex-1 items-end justify-center"
            >
              <span className="absolute inset-x-0 bottom-0 top-0 rounded-t bg-slate-100 dark:bg-slate-800/60" />
              <span
                className={`relative w-full rounded-t transition-all duration-300 ${
                  isActive ? 'bg-indigo-700 dark:bg-indigo-300' : 'bg-indigo-500 dark:bg-indigo-400'
                }`}
                style={{ height: h }}
              />
            </button>
          );
        })}
      </div>

      <div className="mt-1 flex justify-between text-[10px] tabular-nums text-slate-400">
        <span>1</span>
        <span>{Math.ceil(ratios.length / 2)}</span>
        <span>{ratios.length}</span>
      </div>
    </div>
  );
}

export default function StatsPanel({ stats, period, onSelectHabit }) {
  const { completion, perfectDays, bestStreak, dailyRatios, habits, trackedDays } = stats;
  const now = new Date();
  const todayDay =
    period.year === now.getFullYear() && period.month === now.getMonth() + 1 ? now.getDate() : null;

  return (
    <section className="card space-y-5 p-4" aria-label="Estadísticas del mes">
      <h2 className="text-sm font-bold">Estadísticas del mes</h2>

      <div className="grid grid-cols-3 gap-2">
        <Kpi value={`${Math.round(completion * 100)}%`} label="Cumplimiento" />
        <Kpi value={`${perfectDays}/${trackedDays}`} label="Días perfectos" />
        <Kpi value={bestStreak} label="Mejor racha" icon={<IconFlame className="h-4 w-4 text-orange-500" />} />
      </div>

      <DailyBars ratios={dailyRatios} month={period.month} todayDay={todayDay} />

      {habits.length > 0 ? (
        <ul className="space-y-3.5">
          {habits.map((h) => {
            const color = getColor(h.color);
            return (
              <li key={h.id}>
                <button type="button" onClick={() => onSelectHabit(h.id)} className="w-full text-left">
                  <div className="flex items-center gap-2 text-sm">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${color.dot}`} />
                    <span className="min-w-0 flex-1 truncate font-medium">{h.name}</span>
                    {h.current > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-slate-600 dark:text-slate-300" title="Racha actual">
                        <IconFlame className="h-3.5 w-3.5 text-orange-500" />
                        {h.current}
                      </span>
                    )}
                    <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
                      ✓{h.done} · ✕{h.missed}
                    </span>
                    <span className="w-10 text-right text-xs font-bold tabular-nums">{Math.round(h.rate * 100)}%</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className={`h-full rounded-full ${color.bar} transition-all duration-500`} style={{ width: `${h.rate * 100}%` }} />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400">Aún no hay hábitos fijos para medir.</p>
      )}
    </section>
  );
}
