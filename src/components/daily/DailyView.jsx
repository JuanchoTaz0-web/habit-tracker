// src/components/daily/DailyView.jsx — vista "Diaria": resumen + secciones con tareas
import { todayKey } from '../../utils/dates';
import { IconPlus } from '../ui/Icons';
import DaySummary from './DaySummary';
import SectionBlock from './SectionBlock';

export default function DailyView({ store, onEditItem, onNewItem, onEditSection, onNewSection }) {
  const { groups, summary, selectedDate } = store;
  const isToday = selectedDate === todayKey();

  const handlers = {
    setStatus: store.setStatus,
    addToCounter: store.addToCounter,
    setCounter: store.setCounter,
    toggleStep: store.toggleStep,
    editItem: onEditItem,
  };

  // Desde los recordatorios: desplaza hasta la tarjeta (o abre el editor si está oculta)
  const focusItem = (id) => {
    const el = document.getElementById(`item-${id}`);
    if (!el) return onEditItem(id);
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.animate?.(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.03)' }, { transform: 'scale(1)' }],
      { duration: 450, delay: 250, easing: 'ease-out' }
    );
    return undefined;
  };

  return (
    <div className="space-y-6">
      <DaySummary summary={summary} isToday={isToday} onOpenItem={focusItem} />

      {groups.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 px-6 py-10 text-center">
          <span className="text-4xl">🗂️</span>
          <p className="font-bold">Crea tu primera sección</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Agrupa tus hábitos en bloques como “Mañana”, “Salud” o “Trabajo”.
          </p>
          <button type="button" onClick={onNewSection} className="btn-primary mt-2">
            <IconPlus className="h-4 w-4" />
            Nueva sección
          </button>
        </div>
      ) : (
        groups.map((group) => (
          <SectionBlock
            key={group.section.id ?? 'general'}
            group={group}
            handlers={handlers}
            onToggle={() => store.toggleSection(group.section.id)}
            onEditSection={() => onEditSection(group.section.id)}
            onAddItem={() => onNewItem({ sectionId: group.section.id })}
          />
        ))
      )}

      {groups.length > 0 && (
        <button
          type="button"
          onClick={onNewSection}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white/60 py-3.5 text-sm font-semibold text-indigo-600 ring-1 ring-slate-900/5 transition hover:bg-white dark:bg-slate-900/60 dark:text-indigo-400 dark:ring-white/5 dark:hover:bg-slate-900"
        >
          <IconPlus className="h-4 w-4" />
          Nueva sección
        </button>
      )}

      <p className="px-4 text-center text-xs text-slate-400 dark:text-slate-500">
        Desliza una tarea → para marcarla <span className="font-semibold text-emerald-600 dark:text-emerald-400">realizada</span> o ← para{' '}
        <span className="font-semibold text-rose-500 dark:text-rose-400">no realizada</span>.
      </p>
    </div>
  );
}
