// src/components/layout/BottomNav.jsx — barra inferior flotante con botón central de alta
import { IconCalendar, IconListCheck, IconPlus } from '../ui/Icons';

function NavTab({ active, label, Icon, badge, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`relative flex flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[11px] font-semibold transition ${
        active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
      }`}
    >
      <span className="relative">
        <Icon className="h-6 w-6" />
        {badge > 0 && (
          <span className="absolute -right-2.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </span>
      {label}
    </button>
  );
}

export default function BottomNav({ tab, onChange, onAdd, pending }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)]" aria-label="Navegación principal">
      <div className="mx-auto max-w-lg px-4 pb-3">
        <div className="grid grid-cols-3 items-center rounded-3xl bg-white/90 px-2 py-1.5 shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/5 backdrop-blur-xl transition-colors duration-300 dark:bg-slate-900/90 dark:shadow-black/40 dark:ring-white/10">
          <NavTab active={tab === 'daily'} label="Diaria" Icon={IconListCheck} badge={pending} onClick={() => onChange('daily')} />
          <div className="flex justify-center">
            <button
              type="button"
              onClick={onAdd}
              aria-label="Nueva tarea"
              className="-mt-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/40 ring-4 ring-slate-100 transition hover:bg-indigo-500 active:scale-95 dark:ring-slate-950"
            >
              <IconPlus className="h-7 w-7" strokeWidth={2.5} />
            </button>
          </div>
          <NavTab active={tab === 'calendar'} label="Calendario" Icon={IconCalendar} onClick={() => onChange('calendar')} />
        </div>
      </div>
    </nav>
  );
}
