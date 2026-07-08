import { useState, useEffect, useRef, useCallback } from 'react';
import { Home, Plus, Trash2, Clock, Bell } from 'lucide-react';

interface NotHomeEntry {
  id: number;
  address: string;
  createdAt: number;
  timerEndAt: number;
}

const STORAGE_KEY = 'vdgo_not_home';

function loadEntries(): NotHomeEntry[] {
  try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) return JSON.parse(raw); } catch { /* */ }
  return [];
}

function saveEntries(entries: NotHomeEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

interface NotHomeViewProps {
  addNote?: (date: string, text: string) => void;
}

export const NotHomeView = ({ addNote }: NotHomeViewProps) => {
  const [entries, setEntries] = useState<NotHomeEntry[]>(loadEntries);
  const [address, setAddress] = useState('');
  const [now, setNow] = useState(Date.now());
  const timersRef = useRef<Record<number, boolean>>({});

  // Tick every second
  useEffect(() => {
    const interval = setInterval(() => {
      const currentTime = Date.now();
      setNow(currentTime);

      // Check for expired entries
      setEntries(prev => {
        const expired = prev.filter(e => currentTime >= e.timerEndAt && !timersRef.current[e.id]);
        if (expired.length > 0) {
          for (const e of expired) {
            timersRef.current[e.id] = true;
            // Send internal notification via app notification system
            if (addNote) {
              const today = new Date().toISOString().split('T')[0];
              addNote(today, `Нет дома — срок истек: ${e.address}`);
            }
          }
          // Remove expired entries after notification
          const remaining = prev.filter(e => currentTime < e.timerEndAt);
          if (remaining.length !== prev.length) {
            saveEntries(remaining);
            return remaining;
          }
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [addNote]);

  const addEntry = useCallback(() => {
    const trimmed = address.trim();
    if (!trimmed) return;
    const newEntry: NotHomeEntry = {
      id: Date.now(),
      address: trimmed,
      createdAt: Date.now(),
      timerEndAt: Date.now() + 60000, // 1 minute
    };
    setEntries(prev => {
      const updated = [newEntry, ...prev];
      saveEntries(updated);
      return updated;
    });
    setAddress('');
  }, [address]);

  const removeEntry = useCallback((id: number) => {
    timersRef.current[id] = true; // prevent notification
    setEntries(prev => {
      const updated = prev.filter(e => e.id !== id);
      saveEntries(updated);
      return updated;
    });
  }, []);

  const formatTimeLeft = (endAt: number): string => {
    const diff = endAt - now;
    if (diff <= 0) return '00:00';
    const seconds = Math.floor(diff / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getProgressPercent = (entry: NotHomeEntry): number => {
    const total = entry.timerEndAt - entry.createdAt;
    const remaining = entry.timerEndAt - now;
    if (remaining <= 0) return 0;
    return Math.max(0, Math.min(100, (remaining / total) * 100));
  };

  return (
    <div className="h-full flex flex-col items-center justify-start p-4 md:p-6 overflow-y-auto">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center mx-auto mb-3" style={{ background: 'var(--danger)' }}>
            <Home size={20} className="text-white" />
          </div>
          <h2 className="text-[18px] md:text-[22px] font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>Нет дома</h2>
          <p className="text-[12px] md:text-[13px] mt-1" style={{ color: 'var(--text-secondary)' }}>
            Адрес добавляется на 1 минуту. По истечении — уведомление в приложении.
          </p>
        </div>

        {/* Add address */}
        <div className="rounded-[14px] p-3 md:p-4 mb-4" style={{
          background: 'var(--bg-secondary)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.04)',
        }}>
          <label className="text-[11px] font-medium uppercase tracking-[0.06em] mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Адрес</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addEntry()}
              placeholder="ул. Ленина, д. 10, кв. 5"
              className="flex-1 rounded-[10px] px-3 py-2 text-[14px] outline-none transition-all focus:ring-2 focus:ring-[var(--accent)]/20"
              style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '0.5px solid rgba(0,0,0,0.08)' }}
            />
            <button
              onClick={addEntry}
              disabled={!address.trim()}
              className="px-3 md:px-4 py-2 text-white text-[13px] font-medium rounded-[10px] transition-all active:scale-[0.97] flex items-center gap-1 disabled:opacity-40"
              style={{ background: 'var(--danger)' }}
            >
              <Plus size={15} strokeWidth={2.5} /> <span className="hidden sm:inline">Добавить</span>
            </button>
          </div>
        </div>

        {/* Entries list */}
        {entries.length === 0 ? (
          <div className="text-center py-12">
            <Clock size={32} className="mx-auto mb-3" style={{ color: 'var(--text-tertiary)' }} />
            <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>Нет активных адресов</p>
            <p className="text-[11px] mt-1" style={{ color: 'var(--text-tertiary)' }}>Добавьте адрес — запустится таймер на 1 минуту</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map(entry => {
              const progress = getProgressPercent(entry);
              const timeLeft = formatTimeLeft(entry.timerEndAt);
              const isExpiringSoon = entry.timerEndAt - now < 15000;

              return (
                <div
                  key={entry.id}
                  className="rounded-xl border p-3 transition-all"
                  style={{
                    background: 'var(--bg-secondary)',
                    borderColor: isExpiringSoon ? 'var(--danger)' : 'var(--border)',
                    boxShadow: isExpiringSoon ? '0 0 0 1px rgba(209,52,56,0.2)' : '0 1px 4px rgba(0,0,0,0.03)',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: isExpiringSoon ? 'var(--danger)' : 'var(--accent)' }}>
                      <Bell size={14} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{entry.address}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {/* Progress bar */}
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--input-bg)' }}>
                          <div
                            className="h-full rounded-full transition-all duration-1000"
                            style={{
                              width: `${progress}%`,
                              background: isExpiringSoon ? 'var(--danger)' : 'var(--accent)',
                            }}
                          />
                        </div>
                        <span className={`text-[12px] font-mono font-bold flex-shrink-0 ${isExpiringSoon ? 'animate-pulse' : ''}`} style={{ color: isExpiringSoon ? 'var(--danger)' : 'var(--text-primary)' }}>
                          {timeLeft}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => removeEntry(entry.id)}
                      className="p-1.5 rounded-lg transition-colors flex-shrink-0"
                      style={{ color: 'var(--text-tertiary)' }}
                      title="Удалить"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
