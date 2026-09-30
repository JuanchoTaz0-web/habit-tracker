// src/components/layout/Sidebar.jsx
import { useState } from 'react';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6'];

export default function Sidebar({ habits, maxHabits, stats, onAdd, onRemove, onRename }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('daily');
  const [color, setColor] = useState(COLORS[0]);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');

  const full = habits.length >= maxHabits;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || full) return;
    if (onAdd({ name, type, color })) {
      setName('');
      setColor(COLORS[(COLORS.indexOf(color) + 1) % COLORS.length]);
    }
  };

  const startEdit = (h) => {
    setEditingId(h.id);
    setEditValue(h.name);
  };

  const commitEdit = () => {
    if (editingId && editValue.trim()) onRename(editingId, { name: editValue.trim() });
    setEditingId(null);
  };

  return (
    <aside className="w-full lg:w-72 shrink-0 bg-white border border-gray-200 rounded-2xl p-5 flex flex-col gap-6 shadow-sm">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Metas</h2>
        <p className="text-xs text-gray-500">
          {habits.length}/{maxHabits} metas diarias
        </p>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nueva meta…"
          maxLength={40}
          disabled={full}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:bg-gray-100"
        />

        <div className="flex gap-2">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 px-2 py-2 text-sm bg-white"
          >
            <option value="daily">Diaria</option>
            <option value="secondary">Secundaria</option>
          </select>

          <div className="flex items-center gap-1">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Color ${c}`}
                style={{ backgroundColor: c }}
                className={`h-5 w-5 rounded-full border-2 transition ${
                  color === c ? 'border-gray-900 scale-110' : 'border-transparent'
                }`}
              />
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={full || !name.trim()}
          className="w-full rounded-lg bg-gray-900 text-white text-sm font-semibold py-2 hover:bg-gray-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {full ? 'Límite alcanzado' : 'Agregar meta'}
        </button>
      </form>

      {/* Listado */}
      <ul className="flex flex-col gap-2 overflow-y-auto">
        {habits.length === 0 && (
          <li className="text-sm text-gray-400 italic">Aún no hay metas.</li>
        )}
        {habits.map((h, i) => (
          <li
            key={h.id}
            className="group flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 hover:bg-gray-50"
          >
            <span className="text-xs text-gray-400 w-4">{i + 1}</span>
            <span
              className="h-3 w-3 rounded-full shrink-0"
              style={{ backgroundColor: h.color }}
            />

            {editingId === h.id ? (
              <input
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitEdit();
                  if (e.key === 'Escape') setEditingId(null);
                }}
                className="flex-1 min-w-0 text-sm border-b border-gray-900 focus:outline-none bg-transparent"
              />
            ) : (
              <button
                type="button"
                onDoubleClick={() => startEdit(h)}
                title="Doble clic para editar"
                className="flex-1 min-w-0 text-left text-sm text-gray-800 truncate"
              >
                {h.name}
              </button>
            )}

            <span className="text-[10px] text-gray-400 tabular-nums whitespace-nowrap">
              <span className="text-green-600">{stats[h.id]?.done ?? 0}</span>/
              <span className="text-red-500">{stats[h.id]?.missed ?? 0}</span>
            </span>

            <button
              type="button"
              onClick={() => onRemove(h.id)}
              aria-label={`Eliminar ${h.name}`}
              className="text-gray-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      <p className="text-[11px] text-gray-400 leading-snug mt-auto">
        Clic en una celda: vacío → <span className="text-green-600 font-medium">cumplido</span> →{' '}
        <span className="text-red-500 font-medium">incumplido</span>.
      </p>
    </aside>
  );
}