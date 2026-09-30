// src/components/daily/DaySummary.jsx — progreso del día + recordatorios
import ProgressRing from '../ui/ProgressRing';
import { IconBell, IconClock, IconStar } from '../ui/Icons';

function Stat({ value, label, className = '' }) {
  return (
    <div className="rounded-2xl bg-slate-50 py-2 dark:bg-slate-800/60">
      <p className={`text-lg font-black tabular-nums leading-none ${className}`}>{value}</p>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}

const TONES = {
  indigo: 'bg-indigo-50 text-indigo-800 dark:bg-indigo-500/10 dark:text-indigo-200',
  amber: 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200',
  rose: 'bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-200',
};

function Reminder({ tone, Icon, label, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left text-sm transition hover:brightness-95 ${TONES[tone]}`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide opacity-70">{label}</span>
      <span className="min-w-0 flex-1 truncate font-medium">{children}</span>
    </button>
  );
}

export default function DaySummary({ summary, isToday, onOpenItem }) {
  const { total, done, missed, pending, ratio, high, next, late } = summary;
  const pct = Math.round(ratio * 100);

  const message =
    total === 0
      ? 'Nada programado para este día'
      : ratio >= 0.999
        ? '¡Día completado! 🎉'
        : pending === 0
          ? 'Día cerrado'
          : `${pending} ${pending === 1 ? 'tarea pendiente' : 'tareas pendientes'}${isToday ? ' hoy' : ''}`;

  return (
    <section className="card p-4" aria-label="Resumen del día">
      <div className="flex items-center gap-4">
        <ProgressRing value={ratio} size={76} stroke={8} barClass={ratio >= 0.999 ? 'stroke-emerald-500' : 'stroke-indigo-500'}>
          <span className="text-lg font-black tabular-nums">{pct}%</span>
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{message}</p>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            <Stat value={done} label="Hechas" className="text-emerald-600 dark:text-emerald-400" />
            <Stat value={missed} label="Fallidas" className="text-rose-500 dark:text-rose-400" />
            <Stat value={pending} label="Pendientes" />
          </div>
        </div>
      </div>

      {(next || late.length > 0 || high.length > 0) && (
        <div className="mt-3 space-y-2">
          {late.length > 0 && (
            <Reminder tone="rose" Icon={IconClock} label="Atrasado" onClick={() => onOpenItem(late[0].id)}>
              {late.map((i) => `${i.reminder} ${i.title}`).join(' · ')}
            </Reminder>
          )}
          {next && (
            <Reminder tone="indigo" Icon={IconBell} label={next.reminder} onClick={() => onOpenItem(next.id)}>
              {next.title}
            </Reminder>
          )}
          {high.length > 0 && (
            <Reminder tone="amber" Icon={IconStar} label="Prioridad" onClick={() => onOpenItem(high[0].id)}>
              {high.map((i) => i.title).join(' · ')}
            </Reminder>
          )}
        </div>
      )}
    </section>
  );
}
