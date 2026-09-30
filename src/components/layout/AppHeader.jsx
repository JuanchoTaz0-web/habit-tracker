// src/components/layout/AppHeader.jsx — cabecera fija con título, tema y navegación de fecha/mes
import { MONTH_NAMES, formatLongDate, relativeDayTitle, todayKey } from '../../utils/dates';
import { IconChevronLeft, IconChevronRight, IconMonitor, IconMoon, IconSun } from '../ui/Icons';
import WeekStrip from './WeekStrip';

const THEME_META = {
  light: { Icon: IconSun, label: 'Tema claro' },
  dark: { Icon: IconMoon, label: 'Tema oscuro' },
  system: { Icon: IconMonitor, label: 'Tema del sistema' },
};

function ThemeButton({ theme }) {
  const { Icon, label } = THEME_META[theme.mode];
  return (
    <button
      type="button"
      onClick={theme.cycle}
      title={`${label} (toca para cambiar)`}
      aria-label={label}
      className="icon-btn bg-white shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-900 dark:ring-white/10"
    >
      <Icon className="h-[18px] w-[18px]" />
    </button>
  );
}

function MonthSwitcher({ period, onShift, onReset }) {
  const now = new Date();
  const isCurrent = period.year === now.getFullYear() && period.month === now.getMonth() + 1;
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-900 dark:ring-white/5">
      <button type="button" onClick={() => onShift(-1)} aria-label="Mes anterior" className="icon-btn">
        <IconChevronLeft className="h-4 w-4" />
      </button>
      <div className="text-center leading-tight">
        <p className="text-sm font-bold capitalize">
          {MONTH_NAMES[period.month - 1]} {period.year}
        </p>
        {!isCurrent && (
          <button type="button" onClick={onReset} className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
            Ir al mes actual
          </button>
        )}
      </div>
      <button type="button" onClick={() => onShift(1)} aria-label="Mes siguiente" className="icon-btn">
        <IconChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function AppHeader({ tab, theme, selectedDate, onSelectDate, dayRatio, period, onShiftPeriod, onResetPeriod }) {
  const today = todayKey();
  const isToday = selectedDate === today;

  return (
    <header className="sticky top-0 z-30 bg-slate-100/85 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-xl transition-colors duration-300 dark:bg-slate-950/85">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
            Habit Tracker
          </p>
          <h1 className="truncate text-[28px] font-black leading-tight tracking-tight">
            {tab === 'daily' ? relativeDayTitle(selectedDate) : 'Calendario'}
          </h1>
          {tab === 'daily' && (
            <p className="text-sm text-slate-500 first-letter:uppercase dark:text-slate-400">{formatLongDate(selectedDate)}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2 pt-1">
          {tab === 'daily' && !isToday && (
            <button type="button" onClick={() => onSelectDate(today)} className="chip">
              Hoy
            </button>
          )}
          <ThemeButton theme={theme} />
        </div>
      </div>

      {tab === 'daily' ? (
        <WeekStrip selectedDate={selectedDate} onSelect={onSelectDate} dayRatio={dayRatio} />
      ) : (
        <MonthSwitcher period={period} onShift={onShiftPeriod} onReset={onResetPeriod} />
      )}
    </header>
  );
}
