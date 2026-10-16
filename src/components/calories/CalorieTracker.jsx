// src/components/calories/CalorieTracker.jsx
// Control de déficit calórico diario: meta (Mifflin-St Jeor + actividad + ritmo),
// registro de comidas y ejercicio, balance del día y persistencia en localStorage.
import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'habit-tracker:calories:v1';
const KCAL_PER_KG = 7700; // energía aproximada de 1 kg de grasa corporal
const KEEP_DAYS = 120; // historial que se conserva en localStorage

const ACTIVITY = [
  { value: 1.2, label: 'Sedentario', hint: 'Poco o nada de ejercicio' },
  { value: 1.375, label: 'Ligera', hint: '1–3 días por semana' },
  { value: 1.55, label: 'Moderada', hint: '3–5 días por semana' },
  { value: 1.725, label: 'Alta', hint: '6–7 días por semana' },
  { value: 1.9, label: 'Muy alta', hint: 'Trabajo físico + entrenamiento' },
];

const PACE = [
  { value: 0, label: 'Mantener' },
  { value: 0.25, label: '−0,25 kg' },
  { value: 0.5, label: '−0,5 kg' },
  { value: 0.75, label: '−0,75 kg' },
];

const MEALS = ['Desayuno', 'Almuerzo', 'Cena', 'Snack'];

const DEFAULT_PROFILE = { sex: 'male', age: 25, height: 170, weight: 70, activity: 1.375, pace: 0.5 };

// ---------------- utilidades ----------------

const pad = (n) => String(n).padStart(2, '0');
const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayKey = () => toKey(new Date());
const addDays = (key, n) => {
  const [y, m, d] = key.split('-').map(Number);
  return toKey(new Date(y, m - 1, d + n));
};
const fmt = (n) => Math.round(n).toLocaleString('es-CO');
const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);

function dayLabel(key) {
  const today = todayKey();
  if (key === today) return 'Hoy';
  if (key === addDays(today, -1)) return 'Ayer';
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** TMB (Mifflin-St Jeor) → TDEE → meta diaria con piso de seguridad */
export function calcTargets(profile) {
  const { sex, age, height, weight, activity, pace } = profile;
  const valid = [age, height, weight].every((v) => Number.isFinite(v) && v > 0);
  if (!valid) return null;

  const bmr = 10 * weight + 6.25 * height - 5 * age + (sex === 'female' ? -161 : 5);
  const tdee = bmr * activity;
  const raw = tdee - (pace * KCAL_PER_KG) / 7;
  const floor = sex === 'female' ? 1200 : 1500;
  const goal = Math.max(floor, raw);

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    goal: Math.round(goal),
    deficit: Math.round(tdee - goal),
    clamped: raw < floor,
    floor,
  };
}

function loadData() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (parsed) {
      return {
        configured: Boolean(parsed.configured),
        profile: { ...DEFAULT_PROFILE, ...parsed.profile },
        days: parsed.days ?? {},
      };
    }
  } catch {
    /* datos corruptos o storage bloqueado */
  }
  return { configured: false, profile: DEFAULT_PROFILE, days: {} };
}

function saveData(data) {
  try {
    const cutoff = addDays(todayKey(), -KEEP_DAYS);
    const days = Object.fromEntries(Object.entries(data.days).filter(([k]) => k >= cutoff));
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, days }));
  } catch {
    /* cuota excedida o modo privado */
  }
}

// ---------------- piezas de UI ----------------

const card = 'rounded-3xl bg-white p-4 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800';
const label = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400';
const input =
  'w-full rounded-xl bg-zinc-100 px-3.5 py-2.5 text-sm text-zinc-900 ring-1 ring-inset ring-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-700 dark:placeholder:text-zinc-500 dark:focus:ring-zinc-300';

function Segmented({ value, onChange, options, ariaLabel }) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="grid gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`truncate rounded-lg px-2 py-2 text-xs font-semibold transition ${
              active
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-600 dark:text-white'
                : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Stat({ title, value, sign, tone = '' }) {
  return (
    <div className="rounded-2xl bg-zinc-50 px-2 py-2.5 text-center dark:bg-zinc-800/60">
      <p className={`text-base font-bold tabular-nums leading-none ${tone}`}>
        {sign}
        {fmt(value)}
      </p>
      <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{title}</p>
    </div>
  );
}

function NumberField({ title, unit, value, onChange, min, max }) {
  return (
    <label className="block min-w-0">
      <span className={label}>{title}</span>
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          value={Number.isFinite(value) ? value : ''}
          onChange={(e) => onChange(e.target.value === '' ? NaN : Number(e.target.value))}
          className={`${input} pr-10`}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-zinc-400">{unit}</span>
      </div>
    </label>
  );
}

/* ---------- Balance del día ---------- */
function BalanceCard({ targets, consumed, burned }) {
  if (!targets) {
    return (
      <section className={card}>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Completa tu perfil para calcular la meta diaria.</p>
      </section>
    );
  }
  const budget = targets.goal + burned;
  const remaining = budget - consumed;
  const over = remaining < 0;
  const usedPct = budget > 0 ? Math.min(100, (consumed / budget) * 100) : 0;
  const goalMark = budget > 0 ? (targets.goal / budget) * 100 : 100;

  return (
    <section className={card} aria-label="Balance del día">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {over ? 'Excedido' : 'Restantes'}
          </p>
          <p
            className={`text-4xl font-black tabular-nums tracking-tight ${
              over ? 'text-rose-500 dark:text-rose-400' : 'text-zinc-900 dark:text-zinc-50'
            }`}
          >
            {fmt(Math.abs(remaining))}
            <span className="ml-1 text-base font-semibold text-zinc-400">kcal</span>
          </p>
        </div>
        <p className="pb-1.5 text-right text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
          {fmt(consumed)} / {fmt(budget)}
          <br />
          <span className="text-zinc-400">{Math.round((consumed / Math.max(1, budget)) * 100)}% usado</span>
        </p>
      </div>

      {/* Barra: consumido sobre presupuesto (meta + ejercicio). La marca indica dónde termina la meta base. */}
      <div
        className="relative mt-3 h-3 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={budget}
        aria-valuenow={consumed}
        aria-label="Calorías consumidas del presupuesto del día"
      >
        {burned > 0 && (
          <div
            className="absolute inset-y-0 right-0 bg-emerald-500/20 dark:bg-emerald-400/15"
            style={{ left: `${goalMark}%` }}
          />
        )}
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ease-out ${
            over ? 'bg-rose-500 dark:bg-rose-400' : 'bg-zinc-900 dark:bg-zinc-100'
          }`}
          style={{ width: `${usedPct}%` }}
        />
        {burned > 0 && (
          <div className="absolute inset-y-0 w-0.5 bg-white dark:bg-zinc-900" style={{ left: `${goalMark}%` }} />
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Stat title="Meta" value={targets.goal} />
        <Stat title="Comidas" value={consumed} sign="−" />
        <Stat title="Ejercicio" value={burned} sign="+" tone="text-emerald-600 dark:text-emerald-400" />
      </div>

      <p className="mt-3 text-center text-[11px] tabular-nums text-zinc-400">
        {fmt(targets.goal)} − {fmt(consumed)} + {fmt(burned)} = {fmt(remaining)} kcal
        {targets.deficit > 0 && <span className="block">Déficit planeado: {fmt(targets.deficit)} kcal/día</span>}
      </p>
    </section>
  );
}

/* ---------- Formulario de registro ---------- */
function EntryForm({ onAdd }) {
  const [type, setType] = useState('food');
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [meal, setMeal] = useState(() => {
    const h = new Date().getHours();
    return h < 11 ? 'Desayuno' : h < 16 ? 'Almuerzo' : h < 21 ? 'Cena' : 'Snack';
  });

  const value = Number(kcal);
  const valid = Number.isFinite(value) && value > 0 && value <= 5000;

  const submit = (e) => {
    e.preventDefault();
    if (!valid) return;
    onAdd(type, {
      id: uid(),
      name: name.trim() || (type === 'food' ? meal : 'Actividad'),
      kcal: Math.round(value),
      ...(type === 'food' ? { meal } : {}),
      time: new Date().toTimeString().slice(0, 5),
    });
    setName('');
    setKcal('');
  };

  return (
    <form onSubmit={submit} className={`${card} space-y-3`} aria-label="Registrar calorías">
      <Segmented
        ariaLabel="Tipo de registro"
        value={type}
        onChange={setType}
        options={[
          { value: 'food', label: 'Comida' },
          { value: 'exercise', label: 'Ejercicio' },
        ]}
      />

      {type === 'food' && (
        <div className="flex flex-wrap gap-1.5">
          {MEALS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMeal(m)}
              aria-pressed={meal === m}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                meal === m
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'bg-zinc-100 text-zinc-500 hover:text-zinc-800 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          placeholder={type === 'food' ? 'Ej. Arepa con huevo' : 'Ej. Caminar 30 min'}
          aria-label="Descripción"
          className={`${input} min-w-0 flex-1`}
        />
        <div className="relative w-28 shrink-0">
          <input
            type="number"
            inputMode="numeric"
            min="1"
            max="5000"
            value={kcal}
            onChange={(e) => setKcal(e.target.value)}
            placeholder="0"
            aria-label="Calorías"
            className={`${input} pr-11 text-right tabular-nums`}
          />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-zinc-400">kcal</span>
        </div>
      </div>

      <button
        type="submit"
        disabled={!valid}
        className="w-full rounded-xl bg-zinc-900 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-30 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
      >
        {type === 'food' ? 'Añadir comida' : 'Añadir ejercicio'}
      </button>
    </form>
  );
}

/* ---------- Listas del día ---------- */
function EntryRow({ entry, sign, tone, onRemove }) {
  return (
    <li className="group flex items-center gap-3 py-2.5">
      <span className="w-10 shrink-0 text-[11px] tabular-nums text-zinc-400">{entry.time}</span>
      <span className="min-w-0 flex-1 truncate text-sm text-zinc-800 dark:text-zinc-200">{entry.name}</span>
      <span className={`shrink-0 text-sm font-semibold tabular-nums ${tone}`}>
        {sign}
        {fmt(entry.kcal)}
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Eliminar ${entry.name}`}
        className="-mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-zinc-300 transition hover:bg-zinc-100 hover:text-rose-500 dark:text-zinc-600 dark:hover:bg-zinc-800"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </li>
  );
}

function DayLog({ day, onRemove }) {
  const groups = MEALS.map((meal) => ({ meal, items: day.foods.filter((f) => f.meal === meal) })).filter(
    (g) => g.items.length
  );

  if (!day.foods.length && !day.exercises.length) {
    return (
      <section className={`${card} py-8 text-center`}>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Sin registros en este día.</p>
      </section>
    );
  }

  return (
    <section className={`${card} space-y-4`} aria-label="Registros del día">
      {groups.map(({ meal, items }) => (
        <div key={meal}>
          <div className="flex items-baseline justify-between border-b border-zinc-100 pb-1.5 dark:border-zinc-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{meal}</h3>
            <span className="text-xs tabular-nums text-zinc-400">{fmt(items.reduce((a, i) => a + i.kcal, 0))} kcal</span>
          </div>
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {items.map((e) => (
              <EntryRow key={e.id} entry={e} sign="" tone="text-zinc-900 dark:text-zinc-100" onRemove={() => onRemove('food', e.id)} />
            ))}
          </ul>
        </div>
      ))}

      {day.exercises.length > 0 && (
        <div>
          <div className="flex items-baseline justify-between border-b border-zinc-100 pb-1.5 dark:border-zinc-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Ejercicio</h3>
            <span className="text-xs tabular-nums text-emerald-600 dark:text-emerald-400">
              +{fmt(day.exercises.reduce((a, i) => a + i.kcal, 0))} kcal
            </span>
          </div>
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {day.exercises.map((e) => (
              <EntryRow
                key={e.id}
                entry={e}
                sign="+"
                tone="text-emerald-600 dark:text-emerald-400"
                onRemove={() => onRemove('exercise', e.id)}
              />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/* ---------- Perfil y meta ---------- */
function ProfilePanel({ profile, targets, open, onToggle, onChange, onDone }) {
  const set = (patch) => onChange({ ...profile, ...patch });
  const activity = ACTIVITY.find((a) => a.value === profile.activity) ?? ACTIVITY[1];

  return (
    <section className={card} aria-label="Meta diaria">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center justify-between text-left">
        <span>
          <span className="block text-sm font-bold text-zinc-900 dark:text-zinc-100">Mi meta</span>
          <span className="block text-xs text-zinc-500 dark:text-zinc-400">
            {targets ? `${fmt(targets.goal)} kcal/día · TDEE ${fmt(targets.tdee)}` : 'Sin calcular'}
          </span>
        </span>
        <svg
          viewBox="0 0 24 24"
          className={`h-4 w-4 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          <Segmented
            ariaLabel="Sexo"
            value={profile.sex}
            onChange={(sex) => set({ sex })}
            options={[
              { value: 'male', label: 'Hombre' },
              { value: 'female', label: 'Mujer' },
            ]}
          />

          <div className="grid grid-cols-3 gap-2">
            <NumberField title="Edad" unit="años" value={profile.age} min={15} max={99} onChange={(age) => set({ age })} />
            <NumberField title="Altura" unit="cm" value={profile.height} min={120} max={230} onChange={(height) => set({ height })} />
            <NumberField title="Peso" unit="kg" value={profile.weight} min={30} max={300} onChange={(weight) => set({ weight })} />
          </div>

          <label className="block">
            <span className={label}>Actividad</span>
            <select
              value={profile.activity}
              onChange={(e) => set({ activity: Number(e.target.value) })}
              className={input}
            >
              {ACTIVITY.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label} — {a.hint}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-[11px] text-zinc-400">Factor ×{activity.value}</span>
          </label>

          <div>
            <span className={label}>Ritmo por semana</span>
            <Segmented ariaLabel="Ritmo por semana" value={profile.pace} onChange={(pace) => set({ pace })} options={PACE} />
          </div>

          {targets && (
            <dl className="grid grid-cols-3 gap-2 rounded-2xl bg-zinc-50 p-3 text-center dark:bg-zinc-800/60">
              {[
                ['TMB', targets.bmr],
                ['TDEE', targets.tdee],
                ['Meta', targets.goal],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{k}</dt>
                  <dd className="text-sm font-bold tabular-nums text-zinc-900 dark:text-zinc-100">{fmt(v)}</dd>
                </div>
              ))}
            </dl>
          )}

          {targets?.clamped && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
              La meta se limitó a {fmt(targets.floor)} kcal/día como mínimo de seguridad; ese ritmo requeriría comer menos.
            </p>
          )}

          <p className="text-[11px] leading-relaxed text-zinc-400">
            Estimación con la fórmula Mifflin-St Jeor (1 kg ≈ 7.700 kcal). Es orientativa: para un plan personalizado consulta a
            un profesional de la salud.
          </p>

          <button
            type="button"
            onClick={onDone}
            disabled={!targets}
            className="w-full rounded-xl bg-zinc-900 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:opacity-30 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            Guardar meta
          </button>
        </div>
      )}
    </section>
  );
}

// ---------------- componente principal ----------------

export default function CalorieTracker({ className = '' }) {
  const [data, setData] = useState(loadData);
  const [date, setDate] = useState(todayKey);
  const [profileOpen, setProfileOpen] = useState(() => !loadData().configured);

  useEffect(() => saveData(data), [data]);

  // Si la app queda abierta pasada la medianoche, al volver salta al nuevo día
  useEffect(() => {
    let last = todayKey();
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const now = todayKey();
      if (now !== last) {
        setDate((d) => (d === last ? now : d));
        last = now;
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const targets = useMemo(() => calcTargets(data.profile), [data.profile]);
  const day = data.days[date] ?? { foods: [], exercises: [] };
  const consumed = day.foods.reduce((a, f) => a + f.kcal, 0);
  const burned = day.exercises.reduce((a, e) => a + e.kcal, 0);
  const isToday = date === todayKey();

  const patchDay = (fn) =>
    setData((prev) => {
      const current = prev.days[date] ?? { foods: [], exercises: [] };
      const next = fn(current);
      const days = { ...prev.days };
      if (next.foods.length || next.exercises.length) days[date] = next;
      else delete days[date];
      return { ...prev, days };
    });

  const addEntry = (type, entry) =>
    patchDay((d) => (type === 'food' ? { ...d, foods: [...d.foods, entry] } : { ...d, exercises: [...d.exercises, entry] }));

  const removeEntry = (type, id) =>
    patchDay((d) =>
      type === 'food' ? { ...d, foods: d.foods.filter((f) => f.id !== id) } : { ...d, exercises: d.exercises.filter((e) => e.id !== id) }
    );

  return (
    <div className={`mx-auto w-full max-w-lg space-y-4 text-zinc-900 dark:text-zinc-100 ${className}`}>
      {/* Navegación de día */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setDate((d) => addDays(d, -1))}
          aria-label="Día anterior"
          className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-200/70 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          ‹
        </button>
        <div className="text-center">
          <p className="text-sm font-bold capitalize">{dayLabel(date)}</p>
          {!isToday && (
            <button type="button" onClick={() => setDate(todayKey())} className="text-[11px] font-semibold text-zinc-500 underline-offset-2 hover:underline">
              Volver a hoy
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setDate((d) => addDays(d, 1))}
          disabled={isToday}
          aria-label="Día siguiente"
          className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-200/70 disabled:opacity-20 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          ›
        </button>
      </div>

      <BalanceCard targets={targets} consumed={consumed} burned={burned} />
      <EntryForm onAdd={addEntry} />
      <DayLog day={day} onRemove={removeEntry} />
      <ProfilePanel
        profile={data.profile}
        targets={targets}
        open={profileOpen}
        onToggle={() => setProfileOpen((o) => !o)}
        onChange={(profile) => setData((prev) => ({ ...prev, profile }))}
        onDone={() => {
          setData((prev) => ({ ...prev, configured: true }));
          setProfileOpen(false);
        }}
      />
    </div>
  );
}