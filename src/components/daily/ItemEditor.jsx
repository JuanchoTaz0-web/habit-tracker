// src/components/daily/ItemEditor.jsx — crear / editar tarea o hábito (bottom sheet)
import { useState } from 'react';
import { MAX_CALENDAR_HABITS } from '../../constants/theme';
import { ALL_WEEKDAYS, WEEK_ORDER, WEEKDAY_SHORT, formatNumber, formatShortDate } from '../../utils/dates';
import { uid } from '../../utils/id';
import { ColorPicker, ConfirmButton, Field, Segmented, Toggle } from '../ui/Controls';
import Sheet from '../ui/Sheet';
import { IconArrowRight, IconChevronDown, IconChevronUp, IconPlus, IconStar, IconTrash, IconX } from '../ui/Icons';

const PRESETS = [
  { label: '💧 Agua 3 L', target: 3, step: 1, unit: 'L' },
  { label: '🥛 8 vasos', target: 8, step: 1, unit: 'vasos' },
  { label: '📖 20 págs', target: 20, step: 5, unit: 'págs' },
  { label: '🚶 10k pasos', target: 10000, step: 1000, unit: 'pasos' },
];

const WEEKDAY_PRESETS = [
  { label: 'Todos', days: ALL_WEEKDAYS },
  { label: 'L–V', days: [1, 2, 3, 4, 5] },
  { label: 'Fin de semana', days: [0, 6] },
];

const sameDays = (a, b) => a.length === b.length && a.every((d) => b.includes(d));

export default function ItemEditor({
  item,
  defaults = {},
  sections,
  selectedDate,
  calendarCount,
  onSave,
  onDelete,
  onMove,
  onPostpone,
  onClose,
}) {
  const editing = Boolean(item);
  const defaultSection = sections.find((s) => s.id === defaults.sectionId) ?? sections[0];

  const [form, setForm] = useState(() => ({
    title: '',
    sectionId: defaultSection?.id ?? null,
    recurrence: defaults.recurrence ?? 'daily',
    date: selectedDate,
    startDate: selectedDate,
    weekdays: ALL_WEEKDAYS,
    kind: 'check',
    subtasks: [],
    priority: 'normal',
    color: defaultSection?.color ?? 'indigo',
    showInCalendar: calendarCount < MAX_CALENDAR_HABITS,
    ...item,
    target: item?.target ?? 3,
    step: item?.step ?? 1,
    unit: item?.unit || (item ? '' : 'L'),
    reminder: item?.reminder ?? '',
    date: item?.date ?? selectedDate,
    startDate: item?.startDate ?? selectedDate,
  }));
  const [stepDraft, setStepDraft] = useState('');

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const target = Number(form.target);
  const step = Number(form.step);
  const segments = target > 0 && step > 0 ? Math.ceil(target / step - 1e-9) : 0;
  const cleanSubtasks = form.subtasks.filter((s) => s.title.trim());

  const calendarFull =
    calendarCount - (item?.recurrence === 'daily' && item?.showInCalendar ? 1 : 0) >= MAX_CALENDAR_HABITS;

  const valid =
    form.title.trim() &&
    (form.kind !== 'counter' || (target > 0 && step > 0 && step <= target)) &&
    (form.kind !== 'steps' || cleanSubtasks.length > 0);

  const toggleWeekday = (d) => {
    const has = form.weekdays.includes(d);
    if (has && form.weekdays.length === 1) return; // al menos un día
    set({ weekdays: has ? form.weekdays.filter((x) => x !== d) : [...form.weekdays, d] });
  };

  const addStep = () => {
    const title = stepDraft.trim();
    if (!title) return;
    set({ subtasks: [...form.subtasks, { id: uid('st'), title }] });
    setStepDraft('');
  };

  const submit = (e) => {
    e?.preventDefault();
    if (!valid) return;
    onSave({
      ...form,
      title: form.title.trim(),
      target,
      step,
      subtasks: cleanSubtasks,
      reminder: form.reminder || null,
      showInCalendar: form.showInCalendar && !(calendarFull && !item?.showInCalendar),
    });
  };

  const footer = (
    <div className="flex items-center gap-1">
      {editing && (
        <>
          <ConfirmButton onConfirm={onDelete} className="px-2.5">
            <IconTrash className="h-4 w-4" />
          </ConfirmButton>
          <button type="button" onClick={() => onMove(-1)} aria-label="Subir en la sección" className="icon-btn">
            <IconChevronUp className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => onMove(1)} aria-label="Bajar en la sección" className="icon-btn">
            <IconChevronDown className="h-4 w-4" />
          </button>
          {item.recurrence === 'once' && (
            <button type="button" onClick={onPostpone} className="btn-ghost px-2.5 text-xs" title="Pasar a mañana">
              <IconArrowRight className="h-4 w-4" />
              Mañana
            </button>
          )}
        </>
      )}
      <div className="ml-auto flex gap-2">
        <button type="button" onClick={onClose} className="btn-ghost">
          Cancelar
        </button>
        <button type="submit" form="item-form" disabled={!valid} className="btn-primary">
          {editing ? 'Guardar' : 'Crear'}
        </button>
      </div>
    </div>
  );

  return (
    <Sheet title={editing ? 'Editar tarea' : 'Nueva tarea'} onClose={onClose} footer={footer}>
      <form id="item-form" onSubmit={submit} className="space-y-5">
        <Field label="Nombre">
          <input
            autoFocus={!editing}
            value={form.title}
            onChange={(e) => set({ title: e.target.value })}
            placeholder="Ej. Tender la cama"
            maxLength={60}
            className="input text-base"
          />
        </Field>

        {sections.length > 0 && (
          <Field label="Sección">
            <div className="flex flex-wrap gap-2">
              {sections.map((s) => {
                const active = form.sectionId === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => set({ sectionId: s.id, ...(editing ? {} : { color: s.color }) })}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                      active
                        ? 'bg-indigo-600 text-white dark:text-slate-950 shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span>{s.emoji}</span>
                    {s.name}
                  </button>
                );
              })}
            </div>
          </Field>
        )}

        <Field label="Frecuencia">
          <Segmented
            label="Frecuencia"
            value={form.recurrence}
            onChange={(recurrence) => set({ recurrence })}
            options={[
              { value: 'daily', label: 'Fija (se repite)' },
              { value: 'once', label: `Solo el ${formatShortDate(form.date)}` },
            ]}
          />
        </Field>

        {form.recurrence === 'daily' ? (
          <div className="space-y-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/40">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Días</span>
              <div className="flex gap-1">
                {WEEKDAY_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => set({ weekdays: p.days })}
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold transition ${
                      sameDays(form.weekdays, p.days)
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300'
                        : 'text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {WEEK_ORDER.map((d) => {
                const active = form.weekdays.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleWeekday(d)}
                    className={`h-9 rounded-xl text-sm font-bold transition ${
                      active
                        ? 'bg-indigo-600 text-white dark:text-slate-950'
                        : 'bg-white text-slate-400 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-500 dark:ring-slate-700'
                    }`}
                  >
                    {WEEKDAY_SHORT[d]}
                  </button>
                );
              })}
            </div>
            <label className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
              Empieza el
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => e.target.value && set({ startDate: e.target.value })}
                className="input w-auto py-1.5 text-xs"
              />
            </label>
          </div>
        ) : (
          <label className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3 text-xs font-semibold text-slate-500 dark:bg-slate-800/40 dark:text-slate-400">
            Fecha
            <input
              type="date"
              value={form.date}
              onChange={(e) => e.target.value && set({ date: e.target.value })}
              className="input w-auto py-1.5 text-xs"
            />
          </label>
        )}

        <Field label="Tipo de progreso">
          <Segmented
            label="Tipo de progreso"
            value={form.kind}
            onChange={(kind) => set({ kind })}
            options={[
              { value: 'check', label: '✓ Simple' },
              { value: 'counter', label: '🔢 Cantidad' },
              { value: 'steps', label: '☰ Pasos' },
            ]}
          />
        </Field>

        {form.kind === 'counter' && (
          <div className="space-y-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/40">
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => set({ target: p.target, step: p.step, unit: p.unit })}
                  className="rounded-full bg-white px-2.5 py-1 text-xs font-medium ring-1 ring-slate-200 transition hover:ring-indigo-400 dark:bg-slate-900 dark:ring-slate-700"
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Meta">
                <input type="number" inputMode="decimal" min="0" step="any" value={form.target} onChange={(e) => set({ target: e.target.value })} className="input" />
              </Field>
              <Field label="Cada paso">
                <input type="number" inputMode="decimal" min="0" step="any" value={form.step} onChange={(e) => set({ step: e.target.value })} className="input" />
              </Field>
              <Field label="Unidad">
                <input value={form.unit} onChange={(e) => set({ unit: e.target.value })} maxLength={8} placeholder="L" className="input" />
              </Field>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {segments > 0 && step <= target
                ? `${segments} ${segments === 1 ? 'paso' : 'pasos'} de ${formatNumber(step)} ${form.unit} hasta llegar a ${formatNumber(target)} ${form.unit}.`
                : 'El paso debe ser mayor que 0 y no superar la meta.'}
            </p>
          </div>
        )}

        {form.kind === 'steps' && (
          <div className="space-y-2 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/40">
            {form.subtasks.length === 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400">Divide la tarea en pasos. Se completa al marcarlos todos.</p>
            )}
            <ol className="space-y-1.5">
              {form.subtasks.map((s, i) => (
                <li key={s.id} className="flex items-center gap-2">
                  <span className="w-5 text-center text-xs font-bold text-slate-400">{i + 1}</span>
                  <input
                    value={s.title}
                    onChange={(e) =>
                      set({ subtasks: form.subtasks.map((x) => (x.id === s.id ? { ...x, title: e.target.value } : x)) })
                    }
                    className="input py-2"
                  />
                  <button
                    type="button"
                    onClick={() => set({ subtasks: form.subtasks.filter((x) => x.id !== s.id) })}
                    aria-label={`Quitar paso ${i + 1}`}
                    className="icon-btn h-8 w-8"
                  >
                    <IconX className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ol>
            <div className="flex gap-2">
              <input
                value={stepDraft}
                onChange={(e) => setStepDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addStep();
                  }
                }}
                placeholder="Nuevo paso…"
                className="input py-2"
              />
              <button type="button" onClick={addStep} disabled={!stepDraft.trim()} aria-label="Añadir paso" className="btn-primary px-3 py-2">
                <IconPlus className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Recordatorio">
            <input type="time" value={form.reminder} onChange={(e) => set({ reminder: e.target.value })} className="input" />
          </Field>
          <Field label="Prioridad">
            <button
              type="button"
              aria-pressed={form.priority === 'high'}
              onClick={() => set({ priority: form.priority === 'high' ? 'normal' : 'high' })}
              className={`flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                form.priority === 'high'
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              <IconStar className="h-4 w-4" fill={form.priority === 'high' ? 'currentColor' : 'none'} />
              {form.priority === 'high' ? 'Alta' : 'Normal'}
            </button>
          </Field>
        </div>

        <Field label="Color">
          <ColorPicker value={form.color} onChange={(color) => set({ color })} />
        </Field>

        {form.recurrence === 'daily' && (
          <Toggle
            checked={form.showInCalendar && !(calendarFull && !item?.showInCalendar)}
            disabled={!form.showInCalendar && calendarFull}
            onChange={(showInCalendar) => set({ showInCalendar })}
            label="Mostrar en el calendario radial"
            description={
              calendarFull && !form.showInCalendar
                ? `Máximo ${MAX_CALENDAR_HABITS} hábitos en el calendario.`
                : 'Ocupa un anillo del mes.'
            }
          />
        )}
      </form>
    </Sheet>
  );
}
