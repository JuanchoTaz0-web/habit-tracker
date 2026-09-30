// src/App.jsx — shell móvil: cabecera, pestañas (Diaria / Calendario), barra inferior y editores
import { useCallback, useState } from 'react';
import useHabits from './hooks/useHabits';
import useTheme from './hooks/useTheme';
import AppHeader from './components/layout/AppHeader';
import BottomNav from './components/layout/BottomNav';
import DailyView from './components/daily/DailyView';
import ItemEditor from './components/daily/ItemEditor';
import SectionEditor from './components/daily/SectionEditor';
import CalendarView from './components/calendar/CalendarView';

export default function App() {
  const store = useHabits();
  const theme = useTheme();
  const [tab, setTab] = useState('daily');
  // { item?: Item, defaults?: { sectionId, recurrence } } | null
  const [itemEditor, setItemEditor] = useState(null);
  // { section?: Section } | null
  const [sectionEditor, setSectionEditor] = useState(null);

  const closeItemEditor = useCallback(() => setItemEditor(null), []);
  const closeSectionEditor = useCallback(() => setSectionEditor(null), []);

  const openNewItem = (defaults = {}) =>
    setItemEditor({ item: null, defaults: { recurrence: 'daily', ...defaults } });
  const openEditItem = (id) => {
    const item = store.items.find((i) => i.id === id);
    if (item) setItemEditor({ item, defaults: {} });
  };
  const openEditSection = (id) => {
    const section = store.sections.find((s) => s.id === id);
    if (section) setSectionEditor({ section });
  };

  const saveItem = (data) => {
    if (itemEditor?.item) store.updateItem(itemEditor.item.id, data);
    else store.addItem(data);
    closeItemEditor();
  };

  const saveSection = (data) => {
    if (sectionEditor?.section) store.updateSection(sectionEditor.section.id, data);
    else store.addSection(data);
    closeSectionEditor();
  };

  const changeTab = (next) => {
    setTab(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetPeriod = () => {
    const d = new Date();
    store.setPeriod(d.getFullYear(), d.getMonth() + 1);
  };

  const editingItem = itemEditor?.item;
  const editingSection = sectionEditor?.section;

  return (
    <div className="min-h-dvh bg-slate-100 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
        <AppHeader
          tab={tab}
          theme={theme}
          selectedDate={store.selectedDate}
          onSelectDate={store.setSelectedDate}
          dayRatio={store.dayRatio}
          period={store.period}
          onShiftPeriod={store.shiftPeriod}
          onResetPeriod={resetPeriod}
        />

        <main className="flex-1 px-4 pb-36 pt-2">
          {tab === 'daily' ? (
            <DailyView
              store={store}
              onEditItem={openEditItem}
              onNewItem={openNewItem}
              onEditSection={openEditSection}
              onNewSection={() => setSectionEditor({})}
            />
          ) : (
            <CalendarView
              store={store}
              onEditItem={openEditItem}
              onNewHabit={() => openNewItem({ recurrence: 'daily' })}
            />
          )}
        </main>
      </div>

      <BottomNav tab={tab} onChange={changeTab} onAdd={() => openNewItem()} pending={store.summary.pending} />

      {itemEditor && (
        <ItemEditor
          key={editingItem?.id ?? 'new'}
          item={editingItem}
          defaults={itemEditor.defaults}
          sections={store.sections}
          selectedDate={store.selectedDate}
          calendarCount={store.calendarCount}
          onSave={saveItem}
          onClose={closeItemEditor}
          onDelete={() => {
            store.removeItem(editingItem.id);
            closeItemEditor();
          }}
          onMove={(dir) => store.moveItem(editingItem.id, dir)}
          onPostpone={() => {
            store.postponeItem(editingItem.id, 1);
            closeItemEditor();
          }}
        />
      )}

      {sectionEditor && (
        <SectionEditor
          key={editingSection?.id ?? 'new'}
          section={editingSection}
          itemCount={editingSection ? store.items.filter((i) => i.sectionId === editingSection.id).length : 0}
          onSave={saveSection}
          onClose={closeSectionEditor}
          onDelete={() => {
            store.removeSection(editingSection.id);
            closeSectionEditor();
          }}
          onMove={(dir) => store.moveSection(editingSection.id, dir)}
        />
      )}
    </div>
  );
}
