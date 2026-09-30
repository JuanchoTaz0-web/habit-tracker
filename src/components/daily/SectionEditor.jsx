// src/components/daily/SectionEditor.jsx — crear / renombrar / reordenar / borrar secciones
import { useState } from 'react';
import { SECTION_EMOJIS, getColor } from '../../constants/theme';
import { ColorPicker, ConfirmButton, Field } from '../ui/Controls';
import Sheet from '../ui/Sheet';
import { IconChevronDown, IconChevronUp, IconTrash } from '../ui/Icons';

// Conserva solo el último emoji/carácter escrito (respeta emojis compuestos)
const lastGrapheme = (text) => {
  if (!text) return '';
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const parts = [...new Intl.Segmenter('es', { granularity: 'grapheme' }).segment(text)];
    return parts.at(-1)?.segment ?? '';
  }
  return Array.from(text).at(-1) ?? '';
};

export default function SectionEditor({ section, itemCount = 0, onSave, onDelete, onMove, onClose }) {
  const editing = Boolean(section);
  const [name, setName] = useState(section?.name ?? '');
  const [emoji, setEmoji] = useState(section?.emoji ?? '✨');
  const [color, setColor] = useState(section?.color ?? 'indigo');
  const valid = name.trim().length > 0;

  const submit = (e) => {
    e?.preventDefault();
    if (valid) onSave({ name: name.trim(), emoji: emoji || '✨', color });
  };

  const footer = (
    <div className="flex items-center gap-1">
      {editing && (
        <>
          <ConfirmButton onConfirm={onDelete} confirmLabel={itemCount ? `Borrar (${itemCount} → General)` : '¿Seguro?'} className="px-2.5">
            <IconTrash className="h-4 w-4" />
          </ConfirmButton>
          <button type="button" onClick={() => onMove(-1)} aria-label="Subir sección" className="icon-btn">
            <IconChevronUp className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => onMove(1)} aria-label="Bajar sección" className="icon-btn">
            <IconChevronDown className="h-4 w-4" />
          </button>
        </>
      )}
      <div className="ml-auto flex gap-2">
        <button type="button" onClick={onClose} className="btn-ghost">
          Cancelar
        </button>
        <button type="submit" form="section-form" disabled={!valid} className="btn-primary">
          {editing ? 'Guardar' : 'Crear'}
        </button>
      </div>
    </div>
  );

  return (
    <Sheet title={editing ? 'Editar sección' : 'Nueva sección'} onClose={onClose} footer={footer}>
      <form id="section-form" onSubmit={submit} className="space-y-5">
        <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/40">
          <span className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${getColor(color).soft}`}>{emoji}</span>
          <input
            autoFocus={!editing}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Mañana, Salud, Trabajo…"
            maxLength={32}
            aria-label="Nombre de la sección"
            className="input bg-white text-base font-semibold dark:bg-slate-900"
          />
        </div>

        <Field label="Icono">
          <div className="grid grid-cols-8 gap-1.5">
            {SECTION_EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e)}
                aria-pressed={emoji === e}
                className={`flex h-10 items-center justify-center rounded-xl text-xl transition ${
                  emoji === e ? 'bg-indigo-100 ring-2 ring-indigo-500 dark:bg-indigo-500/20' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
          <input
            value={emoji}
            onChange={(e) => setEmoji(lastGrapheme(e.target.value.trim()))}
            aria-label="Emoji personalizado"
            placeholder="O escribe cualquier emoji"
            className="input mt-2"
          />
        </Field>

        <Field label="Color">
          <ColorPicker value={color} onChange={setColor} />
        </Field>
      </form>
    </Sheet>
  );
}
