// src/hooks/useSwipe.js — swipe horizontal con Pointer Events (mouse + touch), sin dependencias
import { useRef, useState } from 'react';

const INTENT = 8; // px antes de decidir si el gesto es horizontal o scroll vertical
const MAX = 140; // desplazamiento libre; más allá aplica resistencia

export default function useSwipe({ onSwipeLeft, onSwipeRight, threshold = 80 } = {}) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [armed, setArmed] = useState(null); // 'left' | 'right' | null
  const g = useRef({ id: null, x: 0, y: 0, active: false, moved: false, armed: null });

  const finish = (fire) => {
    const st = g.current;
    if (fire && st.active) {
      if (st.armed === 'right') onSwipeRight?.();
      else if (st.armed === 'left') onSwipeLeft?.();
    }
    st.id = null;
    st.active = false;
    st.armed = null;
    setDragging(false);
    setDx(0);
    setArmed(null);
  };

  const bind = {
    onPointerDown(e) {
      if (e.button !== 0) return;
      if (e.target.closest('input, textarea, select, [data-noswipe]')) return;
      g.current = { id: e.pointerId, x: e.clientX, y: e.clientY, active: false, moved: false, armed: null };
    },
    onPointerMove(e) {
      const st = g.current;
      if (st.id !== e.pointerId) return;
      const mx = e.clientX - st.x;
      const my = e.clientY - st.y;

      if (!st.active) {
        if (Math.abs(mx) < INTENT && Math.abs(my) < INTENT) return;
        if (Math.abs(my) > Math.abs(mx)) {
          st.id = null; // es scroll vertical: se abandona el gesto
          return;
        }
        st.active = true;
        st.moved = true;
        setDragging(true);
        e.currentTarget.setPointerCapture?.(e.pointerId);
      }

      const abs = Math.abs(mx);
      const eased = abs <= MAX ? abs : MAX + (abs - MAX) * 0.25;
      setDx(Math.sign(mx) * eased);

      const next = mx > threshold ? 'right' : mx < -threshold ? 'left' : null;
      if (next !== st.armed) {
        st.armed = next;
        setArmed(next);
        if (next) {
          try {
            navigator.vibrate?.(8);
          } catch {
            /* no soportado */
          }
        }
      }
    },
    onPointerUp(e) {
      if (g.current.id === e.pointerId) finish(true);
    },
    onPointerCancel(e) {
      if (g.current.id === e.pointerId) finish(false);
    },
    // Evita que el clic final de un arrastre active botones internos
    onClickCapture(e) {
      if (g.current.moved) {
        e.preventDefault();
        e.stopPropagation();
        g.current.moved = false;
      }
    },
  };

  return { dx, dragging, armed, bind };
}
