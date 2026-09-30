const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const scale = (prefix) =>
  Object.fromEntries(SHADES.map((n) => [n, `rgb(var(--${prefix}-${n}) / <alpha-value>)`]));

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // Paleta sobria: cada escala toma sus valores de variables CSS (src/styles/index.css),
      // con un juego para el tema claro y otro para el oscuro.
      //   slate   → fondos, superficies, bordes y textos
      //   indigo  → color primario (azul pizarra)
      //   emerald → verde de acento / "realizado"
      colors: {
        slate: scale('g'),
        indigo: scale('p'),
        emerald: scale('a'),
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      keyframes: {
        'sheet-up': { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        pop: {
          '0%': { transform: 'scale(0.6)' },
          '60%': { transform: 'scale(1.15)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        'sheet-up': 'sheet-up 280ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        'fade-in': 'fade-in 200ms ease-out',
        pop: 'pop 320ms ease-out',
      },
    },
  },
  plugins: [],
};
