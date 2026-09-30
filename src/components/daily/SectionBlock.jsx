// src/components/daily/SectionBlock.jsx — bloque de sección personalizable (nombre, emoji, color)
import { getColor } from '../../constants/theme';
import { IconChevronDown, IconPencil, IconPlus } from '../ui/Icons';
import ItemCard from './ItemCard';

export default function SectionBlock({ group, handlers, onToggle, onEditSection, onAddItem }) {
  const { section, items } = group;
  const color = getColor(section.color);
  const done = items.filter((i) => i.status === 'done').length;
  const ratio = items.length ? items.reduce((a, i) => a + i.score, 0) / items.length : 0;
  const collapsed = Boolean(section.collapsed);
  const editable = section.id !== null;

  return (
    <section aria-label={section.name}>
      <header className="mb-2.5 flex items-center gap-2 px-1">
        <button
          type="button"
          onClick={editable ? onToggle : undefined}
          aria-expanded={!collapsed}
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
        >
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg ${color.soft}`}>
            {section.emoji}
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <span className="truncate text-base font-bold">{section.name}</span>
              <span className="text-xs font-semibold tabular-nums text-slate-400">
                {done}/{items.length}
              </span>
            </span>
            <span className="mt-1 block h-1 w-24 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <span className={`block h-full rounded-full ${color.bar} transition-all duration-500`} style={{ width: `${ratio * 100}%` }} />
            </span>
          </span>
          {editable && (
            <IconChevronDown className={`ml-auto h-4 w-4 shrink-0 text-slate-400 transition-transform ${collapsed ? '-rotate-90' : ''}`} />
          )}
        </button>
        {editable && (
          <button type="button" onClick={onEditSection} aria-label={`Editar sección ${section.name}`} className="icon-btn">
            <IconPencil className="h-4 w-4" />
          </button>
        )}
      </header>

      {!collapsed && (
        <ul className="space-y-2.5">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onStatus={(s) => handlers.setStatus(item.id, s)}
              onCounterAdd={(delta) => handlers.addToCounter(item.id, delta)}
              onCounterSet={(value) => handlers.setCounter(item.id, value)}
              onStep={(subId) => handlers.toggleStep(item.id, subId)}
              onEdit={() => handlers.editItem(item.id)}
            />
          ))}
          <li>
            <button
              type="button"
              onClick={onAddItem}
              className="flex w-full items-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 px-4 py-3 text-sm font-medium text-slate-400 transition hover:border-slate-300 hover:text-slate-600 dark:border-slate-800 dark:text-slate-500 dark:hover:border-slate-700 dark:hover:text-slate-300"
            >
              <IconPlus className="h-4 w-4" />
              Añadir a {section.name}
            </button>
          </li>
        </ul>
      )}
    </section>
  );
}
