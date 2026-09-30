# Habit Tracker

Tracker de hábitos y tareas diarias con estética de app móvil: secciones personalizables, hábitos fijos, progreso cuantificable, swipe para marcar, calendario radial mensual con estadísticas y modo oscuro. React + Vite + Tailwind CSS, datos en LocalStorage.

## Scripts

```bash
npm install
npm run dev       # desarrollo
npm run build     # compila a dist/
npm run deploy    # publica dist/ en la rama gh-pages (paquete gh-pages)
```

También incluye `.github/workflows/deploy.yml` para publicar en GitHub Pages con Actions al hacer push a `main` (Settings → Pages → Source: GitHub Actions). `vite.config.js` usa `base: './'`, así que funciona con cualquier nombre de repositorio.

## Estructura

```
src/
├── App.jsx                      # shell móvil, pestañas y editores
├── main.jsx
├── constants/theme.js           # paleta de colores (clases Tailwind), emojis, límites
├── hooks/
│   ├── useHabits.js             # estado global + CRUD + selectores (LocalStorage v3)
│   ├── useTheme.js              # claro / oscuro / sistema
│   ├── useSwipe.js              # swipe con Pointer Events
│   └── useNow.js
├── utils/
│   ├── items.js                 # reglas del modelo: programación, progreso, estado, estadísticas
│   ├── storage.js               # estado inicial, persistencia y migración v1/v2 → v3
│   ├── dates.js · geometry.js · id.js
├── components/
│   ├── layout/   AppHeader · WeekStrip · BottomNav
│   ├── daily/    DailyView · DaySummary · SectionBlock · ItemCard · ItemEditor · SectionEditor
│   ├── calendar/ CalendarView · StatsPanel
│   ├── tracker/  RadialGrid · RadialCell · HabitLabels
│   └── ui/       Sheet · Controls · ProgressRing · Icons
└── styles/index.css
```

## Paleta de colores

Los colores de la interfaz viven como variables CSS en `src/styles/index.css` (un juego para `:root` / tema claro y otro para `.dark`). `tailwind.config.js` conecta esas variables con las escalas `slate` (fondos, superficies, bordes, textos), `indigo` (primario) y `emerald` (verde de acento), así que para cambiar un tono basta con editar la variable.

| Uso | Claro | Oscuro |
|---|---|---|
| Fondo | `#F7F7F5` | `#121416` |
| Tarjetas / superficies | `#FFFFFF` | `#1C1F22` |
| Bordes / divisores | `#E5E7EB` | `#2E3338` |
| Texto secundario | `#6B7280` | `#9CA3AF` |
| Texto principal | `#1F2328` | `#E6E8EA` |
| Primario | `#2F3E46` | `#A9B8C0` |
| Verde (acento) | `#4A7C59` | `#6FA383` |
| Verde hover | `#3D6649` | `#86B597` |
| Verde fondo suave | `#E8F0EA` | `#1E2B23` |

## Modelo de datos (`habit-tracker:v3`)

```js
{
  version: 3,
  sections: [{ id, name, emoji, color, order, collapsed }],
  items: [{
    id, title, sectionId,
    recurrence: 'daily' | 'once',   // 'daily' = fija, se repite
    weekdays: [0..6], startDate,    // solo 'daily'
    date,                           // solo 'once'
    kind: 'check' | 'counter' | 'steps',
    target, step, unit,             // 'counter' (ej. 3 L en pasos de 1 L)
    subtasks: [{ id, title }],      // 'steps'
    priority: 'normal' | 'high', reminder: 'HH:mm' | null,
    color, showInCalendar, order, createdAt
  }],
  logs: { 'YYYY-MM-DD': { [itemId]: { status: null|'done'|'missed', value, done: [subtaskId] } } },
  notes: { 'YYYY-MM': '...' }
}
```

- Las tareas fijas guardan su definición una sola vez; el avance de cada día vive en `logs`.
- Un contador o una lista de pasos se marca como realizada sola al completarse.
- Swipe → marca realizada (y rellena el progreso); swipe ← marca no realizada; repetir el gesto desmarca.
- El calendario radial muestra hasta 8 hábitos fijos con “Mostrar en el calendario”.
- Los datos de versiones anteriores (`habit-tracker:v1` / `v2`) se migran automáticamente.
