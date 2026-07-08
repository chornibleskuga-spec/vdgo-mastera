import { useState, useRef, useEffect, useCallback } from 'react';
import { LayoutGrid, Calculator, Calendar, Map as MapIcon, ChevronLeft, Navigation, Search } from 'lucide-react';
import { CalculatorView } from './CalculatorView';
import { RemindersView } from './RemindersView';

type AppsTab = 'menu' | 'calculator' | 'reminders' | 'map';

interface AppsViewProps {
  onNavigate: (view: string) => void;
}

const appItems = [
  { id: 'calculator' as AppsTab, label: 'Калькулятор', Icon: Calculator, desc: 'Расчёт стоимости работ', color: 'var(--accent)' },
  { id: 'reminders' as AppsTab, label: 'Напоминания', Icon: Calendar, desc: 'Задачи и напоминания', color: 'var(--success)' },
  { id: 'map' as AppsTab, label: 'Карта', Icon: MapIcon, desc: 'Яндекс Карты', color: 'var(--warning)' },
];

export const AppsView = ({ onNavigate }: AppsViewProps) => {
  const [activeTab, setActiveTab] = useState<AppsTab>('menu');
  const [notesTick, setNotesTick] = useState(0);

  const refreshNotes = () => setNotesTick(t => t + 1);

  if (activeTab === 'calculator') {
    return (
      <div className="h-full flex flex-col">
        <div className="border-b px-3 md:px-5 py-2 md:py-3 flex items-center gap-2 flex-shrink-0" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          <button onClick={() => setActiveTab('menu')} className="p-1.5 rounded-lg transition-colors hover:bg-black/[0.04] flex-shrink-0">
            <ChevronLeft size={18} style={{ color: 'var(--text-secondary)' }} />
          </button>
          <span className="text-[14px] md:text-[16px] font-semibold" style={{ color: 'var(--text-primary)' }}>Калькулятор</span>
        </div>
        <div className="flex-1 overflow-hidden">
          <CalculatorView />
        </div>
      </div>
    );
  }

  if (activeTab === 'reminders') {
    return (
      <div className="h-full flex flex-col">
        <div className="border-b px-3 md:px-5 py-2 md:py-3 flex items-center gap-2 flex-shrink-0" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          <button onClick={() => setActiveTab('menu')} className="p-1.5 rounded-lg transition-colors hover:bg-black/[0.04] flex-shrink-0">
            <ChevronLeft size={18} style={{ color: 'var(--text-secondary)' }} />
          </button>
          <span className="text-[14px] md:text-[16px] font-semibold" style={{ color: 'var(--text-primary)' }}>Напоминания</span>
        </div>
        <div className="flex-1 overflow-hidden">
          <RemindersView
            key={notesTick}
            getNotesByDate={(date: string) => {
              try { const raw = localStorage.getItem('vdgo_notes'); if (raw) { const n = JSON.parse(raw); return Array.isArray(n) ? n.filter((x: any) => x.date === date) : []; } } catch { /* */ }
              return [];
            }}
            getDatesWithNotes={() => {
              try { const raw = localStorage.getItem('vdgo_notes'); if (raw) { const n = JSON.parse(raw); return Array.isArray(n) ? [...new Set(n.map((x: any) => x.date))] : []; } } catch { /* */ }
              return [];
            }}
            addNote={(date: string, text: string) => {
              try {
                const raw = localStorage.getItem('vdgo_notes');
                const notes = raw ? JSON.parse(raw) : [];
                const newNote = { id: Date.now(), date, text, status: 'Не решен', createdAt: new Date() };
                const updated = [newNote, ...notes];
                localStorage.setItem('vdgo_notes', JSON.stringify(updated));
                refreshNotes();
              } catch { /* */ }
            }}
            removeNote={(id: number) => {
              try {
                const raw = localStorage.getItem('vdgo_notes');
                if (!raw) return;
                const notes = JSON.parse(raw);
                const updated = notes.filter((n: any) => n.id !== id);
                localStorage.setItem('vdgo_notes', JSON.stringify(updated));
                refreshNotes();
              } catch { /* */ }
            }}
            updateNoteStatus={(id: number, status: string) => {
              try {
                const raw = localStorage.getItem('vdgo_notes');
                if (!raw) return;
                const notes = JSON.parse(raw);
                const updated = notes.map((n: any) => n.id === id ? { ...n, status } : n);
                localStorage.setItem('vdgo_notes', JSON.stringify(updated));
                refreshNotes();
              } catch { /* */ }
            }}
          />
        </div>
      </div>
    );
  }

  if (activeTab === 'map') {
    return <MapYandexView onBack={() => setActiveTab('menu')} />;
  }

/* ==================== Yandex Map Widget + Nominatim Search ==================== */
function MapYandexView({ onBack }: { onBack: () => void }) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Default: Moscow
  const [mapUrl, setMapUrl] = useState('https://yandex.ru/map-widget/v1/?ll=37.6173%2C55.7558&z=12');

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      // Use Nominatim (OpenStreetMap) for free geocoding
      const encoded = encodeURIComponent(query.trim());
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1`, {
        headers: { 'Accept-Language': 'ru' },
      });
      const data = await res.json();
      if (data && data.length > 0) {
        const { lon, lat, display_name } = data[0];
        // Update Yandex map widget with found coordinates
        setMapUrl(`https://yandex.ru/map-widget/v1/?ll=${lon}%2C${lat}&z=16&pt=${lon}%2C${lat}&description=${encodeURIComponent(display_name)}`);
      } else {
        alert('Адрес не найден');
      }
    } catch {
      alert('Ошибка поиска. Попробуйте ещё раз.');
    } finally {
      setIsSearching(false);
    }
  }, [query]);

  return (
    <div className="h-full flex flex-col">
      {/* Header with search */}
      <div className="border-b px-3 md:px-5 py-2 md:py-3 flex items-center gap-2 flex-shrink-0" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <button onClick={onBack} className="p-1.5 rounded-lg transition-colors hover:bg-black/[0.04] flex-shrink-0">
          <ChevronLeft size={18} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <Navigation size={16} style={{ color: 'var(--warning)' }} />
        <span className="text-[14px] md:text-[16px] font-semibold hidden sm:inline" style={{ color: 'var(--text-primary)' }}>Карта</span>
        <div className="flex-1 flex items-center gap-2 ml-2">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Поиск адреса..."
            className="flex-1 rounded-lg px-3 py-1.5 text-[12px] outline-none"
            style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '0.5px solid rgba(0,0,0,0.08)' }}
          />
          <button
            onClick={handleSearch}
            disabled={!query.trim() || isSearching}
            className="px-3 py-1.5 text-white text-[12px] font-medium rounded-lg transition-all disabled:opacity-40 flex items-center gap-1 flex-shrink-0"
            style={{ background: 'var(--warning)' }}
          >
            <Search size={14} /> <span className="hidden sm:inline">{isSearching ? '...' : 'Найти'}</span>
          </button>
        </div>
      </div>
      <div className="flex-1 relative">
        <iframe
          ref={iframeRef}
          src={mapUrl}
          width="100%"
          height="100%"
          frameBorder="0"
          allowFullScreen
          style={{ border: 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
          title="Яндекс Карты"
        />
      </div>
    </div>
  );
}

  // Menu
  return (
    <div className="h-full flex flex-col items-center justify-center p-4 md:p-6 overflow-y-auto">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center mx-auto mb-3" style={{ background: 'var(--accent)' }}>
            <LayoutGrid size={20} className="text-white" />
          </div>
          <h2 className="text-[18px] md:text-[22px] font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>Приложения</h2>
          <p className="text-[12px] md:text-[13px] mt-1" style={{ color: 'var(--text-secondary)' }}>Вспомогательные инструменты</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {appItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="flex flex-col items-center gap-3 p-5 rounded-[14px] border text-center transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'var(--bg-secondary)',
                borderColor: 'var(--border)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
              }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: item.color + '15' }}>
                <item.Icon size={22} style={{ color: item.color }} />
              </div>
              <div>
                <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{item.label}</p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{item.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
