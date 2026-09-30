// src/components/tracker/RadialCell.jsx
import { memo } from 'react';

const FILL_BY_STATUS = {
  done: 'fill-emerald-500 hover:fill-emerald-600 dark:fill-emerald-500 dark:hover:fill-emerald-600',
  missed: 'fill-rose-500 hover:fill-rose-600 dark:fill-rose-500 dark:hover:fill-rose-400',
  empty: 'fill-white hover:fill-indigo-50 dark:fill-slate-900 dark:hover:fill-slate-800',
};

function RadialCell({ d, status = null, disabled = false, onClick, title }) {
  const fill = disabled
    ? 'fill-slate-100 dark:fill-slate-800/50'
    : FILL_BY_STATUS[status ?? 'empty'] ?? FILL_BY_STATUS.empty;

  return (
    <path
      d={d}
      className={[
        'stroke-slate-300 stroke-[1px] outline-none transition-colors duration-150 dark:stroke-slate-700',
        'focus-visible:stroke-indigo-500 focus-visible:stroke-[2.5px]',
        disabled ? 'cursor-not-allowed' : 'cursor-pointer',
        fill,
      ].join(' ')}
      onClick={disabled ? undefined : onClick}
      role={disabled ? undefined : 'button'}
      aria-label={title}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick?.(e);
        }
      }}
    >
      {title && <title>{title}</title>}
    </path>
  );
}

export default memo(RadialCell);
