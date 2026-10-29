// src/components/layout/BottomNav.jsx — barra inferior: Diaria · Calendario · Calorías + botón de alta
import { IconCalendar, IconFlame, IconListCheck, IconPlus } from '../ui/Icons';

const TABS = [
  { id: 'daily', label: 'Diaria', Icon: IconListCheck },
  { id: 'calendar', label: 'Calendario', Icon: IconCalendar },
  { id: 'calories', label: 'Calorías', Icon: IconFlame },
];

function NavTab({ active, label, Icon, badge, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`relative flex flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[11px] font-semibold transition-colors duration-200 ${
        active
          ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
          : 'text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300'
      }`}
    >
      <span className="relative">
        <Icon className="h-6 w-6" strokeWidth={active ? 2.25 : 1.75} />
        {badge > 0 && (
          <span className="absolute -right-2.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-zinc-900">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </span>
      {label}
      {/* Indicador sutil bajo la pestaña activa */}
      <span
        aria-hidden="true"
        className={`absolute bottom-0.5 h-0.5 rounded-full bg-zinc-900 transition-all duration-200 dark:bg-zinc-100 ${
          active ? 'w-4 opacity-100' : 'w-0 opacity-0'
        }`}
      />
    </button>
  );
}

export default function BottomNav({ tab, onChange, onAdd, pending }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)]" aria-label="Navegación principal">
      <div className="mx-auto flex max-w-lg items-center gap-3 px-4 pb-3">
        <div className="grid flex-1 grid-cols-3 gap-1 rounded-3xl bg-white/90 p-1.5 shadow-xl shadow-zinc-900/10 ring-1 ring-zinc-200 backdrop-blur-xl transition-colors duration-300 dark:bg-zinc-900/90 dark:shadow-black/40 dark:ring-zinc-800">
          {TABS.map(({ id, label, Icon }) => (
            <NavTab
              key={id}
              active={tab === id}
              label={label}
              Icon={Icon}
              badge={id === 'daily' ? pending : 0}
              onClick={() => onChange(id)}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={onAdd}
          aria-label="Nueva tarea"
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-lg shadow-zinc-900/30 transition hover:bg-zinc-700 active:scale-95 dark:bg-zinc-100 dark:text-zinc-900 dark:shadow-black/40 dark:hover:bg-white"
        >
          <IconPlus className="h-7 w-7" strokeWidth={2.5} />
        </button>
      </div>
    </nav>
  );
}