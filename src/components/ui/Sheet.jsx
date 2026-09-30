// src/components/ui/Sheet.jsx — hoja inferior (bottom sheet) estilo app móvil
import { useEffect } from 'react';

export default function Sheet({ title, onClose, children, footer }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-slate-950/40 backdrop-blur-sm"
      />
      <div className="relative flex max-h-[92dvh] w-full max-w-lg animate-sheet-up flex-col rounded-t-3xl bg-white shadow-2xl dark:bg-slate-900 sm:rounded-3xl">
        <div className="shrink-0 px-5 pb-2 pt-3">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-200 dark:bg-slate-700 sm:hidden" />
          <h2 className="text-lg font-bold tracking-tight">{title}</h2>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-5">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-slate-100 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-slate-800">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
