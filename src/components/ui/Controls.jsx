// src/components/ui/Controls.jsx — controles de formulario reutilizables
import { useEffect, useState } from 'react';
import { COLOR_KEYS, COLORS } from '../../constants/theme';

export function Field({ label, hint, children, className = '' }) {
  return (
    <div className={className}>
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-slate-400 dark:text-slate-500">{hint}</span>}
    </div>
  );
}

export function Segmented({ value, onChange, options, label }) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition ${
              active
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {o.icon}
            <span className="truncate">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({ checked, onChange, label, description, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-xl bg-slate-100 px-3.5 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-800"
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        {description && <span className="block text-xs text-slate-500 dark:text-slate-400">{description}</span>}
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </span>
    </button>
  );
}

export function ColorPicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {COLOR_KEYS.map((key) => (
        <button
          key={key}
          type="button"
          aria-label={`Color ${COLORS[key].label}`}
          aria-pressed={value === key}
          onClick={() => onChange(key)}
          className={`h-8 w-8 rounded-full ${COLORS[key].dot} ring-offset-2 ring-offset-white transition dark:ring-offset-slate-900 ${
            value === key ? `ring-2 ${COLORS[key].ring} scale-110` : 'hover:scale-105'
          }`}
        />
      ))}
    </div>
  );
}

/** Botón de borrado en dos toques (evita confirm() nativo) */
export function ConfirmButton({ onConfirm, children, confirmLabel = '¿Seguro?', className = '' }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return undefined;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);

  return (
    <button
      type="button"
      onClick={() => (armed ? onConfirm() : setArmed(true))}
      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
        armed
          ? 'bg-rose-600 text-white hover:bg-rose-500'
          : 'text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10'
      } ${className}`}
    >
      {armed ? confirmLabel : children}
    </button>
  );
}
