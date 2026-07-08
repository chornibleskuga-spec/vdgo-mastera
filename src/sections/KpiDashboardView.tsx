import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Save, Shield, Plus, ChevronLeft, ChevronRight, Loader } from 'lucide-react';
import type { KpiSession, KpiEntry, Worker } from '@/types';

interface KpiDashboardViewProps {
  workers: Worker[];
  activeSession: KpiSession | null;
  onUpsertEntry: (sessionId: number, workerId: string, day: number, value: string) => void;
  onDeleteEntry: (sessionId: number, workerId: string, day: number) => void;
  onSaveSession: (month: number, year: number) => void;
  toggleDuty?: (workerId: string, dayType: 'saturday' | 'sunday') => void;
  clearDuties?: () => void;
  duties?: { workerId: string; dayType: 'saturday' | 'sunday' }[];
}

// Duty colors for saturday/sunday
const DUTY_COLORS: Record<string, { bg: string; text: string; border: string; label: string }> = {
  saturday: { bg: 'rgba(175,82,222,0.15)', text: '#AF52DE', border: 'rgba(175,82,222,0.3)', label: 'Сб' },
  sunday: { bg: 'rgba(255,149,0,0.15)', text: '#FF9500', border: 'rgba(255,149,0,0.3)', label: 'Вс' },
  both: { bg: 'linear-gradient(135deg, rgba(175,82,222,0.15) 0%, rgba(255,149,0,0.15) 100%)', text: '#8E8E93', border: 'rgba(175,82,222,0.2)', label: 'Сб+Вс' },
};

// Month names for selector
const MONTH_NAMES = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

// Cell background — rgba colors visible in both light and dark themes
const getCellStyle = (val: string): React.CSSProperties => {
  const v = val.toUpperCase();
  if (!v) return {};
  if (v === 'В') return { background: 'rgba(255, 59, 48, 0.22)', color: '#FF3B30' };
  if (v === 'ДО') return { background: 'rgba(255, 149, 0, 0.22)', color: '#FF9500' };
  if (v === 'ОТ') return { background: 'rgba(0, 122, 255, 0.22)', color: '#007AFF' };
  if (v === 'Б') return { background: 'rgba(175, 82, 222, 0.22)', color: '#AF52DE' };
  // Numeric value = green
  if (/^\d+$/.test(v)) return { background: 'rgba(48, 209, 88, 0.22)', color: '#30D858' };
  return {};
};

interface KpiCellData {
  value: string;
  ts: number;
}

export const KpiDashboardView = ({ workers, activeSession, onUpsertEntry, onDeleteEntry, onSaveSession, toggleDuty, clearDuties, duties: propDuties }: KpiDashboardViewProps) => {
  const now = new Date();
  const [month, setMonth] = useState(activeSession?.month ?? (now.getMonth() + 1));
  const [year, setYear] = useState(activeSession?.year ?? now.getFullYear());
  const [saved, setSaved] = useState(false);
  const [dutyModalWorker, setDutyModalWorker] = useState<Worker | null>(null);

  // Timestamp-based local entries — allows reliable sync
  const [localEntries, setLocalEntries] = useState<Record<string, KpiCellData>>({});
  const localEntriesRef = useRef(localEntries);
  localEntriesRef.current = localEntries;

  const inputRefs = useRef<Record<string, HTMLInputElement>>({});

  const daysInMonth = useMemo(() => new Date(year, month, 0).getDate(), [month, year]);
  const days = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth]);
  const workerList = useMemo(() => [...workers].sort((a, b) => a.name.localeCompare(b.name)), [workers]);

  const duties = propDuties ?? [];

  // Build timestamped entries from active session
  const serverEntries = useMemo(() => {
    const map: Record<string, KpiCellData> = {};
    if (activeSession) {
      for (const e of activeSession.entries) {
        map[`${e.workerId}_${e.day}`] = { value: e.value, ts: e.ts || 0 };
      }
    }
    return map;
  }, [activeSession]);

  // Sync server entries to local — TIMESTAMP-BASED MERGE
  // Higher timestamp wins, regardless of local/remote
  useEffect(() => {
    setLocalEntries(prev => {
      const next = { ...prev };
      let changed = false;
      for (const [key, serverData] of Object.entries(serverEntries)) {
        const localData = prev[key];
        // If server has newer data (higher timestamp), or key doesn't exist locally
        if (!localData || (serverData.ts > localData.ts)) {
          next[key] = serverData;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [serverEntries]);

  const getKey = (workerId: string, day: number) => `${workerId}_${day}`;

  const normalizeValue = (val: string): string => {
    const t = val.trim();
    const upper = t.toUpperCase();
    if (upper === 'В' || upper === 'ДО' || upper === 'ОТ' || upper === 'Б') return upper;
    return t;
  };

  const handleChange = (workerId: string, day: number, value: string) => {
    const normalized = normalizeValue(value);
    const key = getKey(workerId, day);
    const ts = Date.now();

    // Update local immediately with new timestamp
    setLocalEntries(prev => ({ ...prev, [key]: { value: normalized, ts } }));

    if (!activeSession) return;

    // Save to store
    if (normalized === '') {
      onDeleteEntry(activeSession.id, workerId, day);
    } else {
      onUpsertEntry(activeSession.id, workerId, day, normalized);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, wIdx: number, d: number) => {
    const maxW = workerList.length - 1;
    const maxD = days.length - 1;
    const dIdx = days.indexOf(d);
    let targetW = wIdx;
    let targetD = dIdx;

    if (e.key === 'Enter') {
      e.preventDefault();
      targetW = Math.min(wIdx + 1, maxW);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      targetW = Math.min(wIdx + 1, maxW);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      targetW = Math.max(wIdx - 1, 0);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (dIdx < maxD) targetD = dIdx + 1;
      else if (wIdx < maxW) { targetW = wIdx + 1; targetD = 0; }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (dIdx > 0) targetD = dIdx - 1;
      else if (wIdx > 0) { targetW = wIdx - 1; targetD = maxD; }
    } else {
      return;
    }

    const targetWorker = workerList[targetW];
    const targetDay = days[targetD];
    if (targetWorker && targetDay !== undefined) {
      const key = getKey(targetWorker.id, targetDay);
      inputRefs.current[key]?.focus();
      inputRefs.current[key]?.select();
    }
  };

  const handleSave = () => {
    try {
      onSaveSession(month, year);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Save error:', err);
      alert('Ошибка сохранения: ' + (err as Error).message);
    }
  };

  const handleMonthChange = (delta: number) => {
    let newMonth = month + delta;
    let newYear = year;
    if (newMonth > 12) { newMonth = 1; newYear++; }
    if (newMonth < 1) { newMonth = 12; newYear--; }
    setMonth(newMonth);
    setYear(newYear);
  };

  const hasDuty = (workerId: string) => duties.some(d => d.workerId === workerId);

  const getWorkerDuties = (workerId: string) => duties.filter(d => d.workerId === workerId);

  const getWorkerRowStyle = (workerId: string): React.CSSProperties | undefined => {
    const workerDuties = getWorkerDuties(workerId);
    if (workerDuties.length === 0) return undefined;
    if (workerDuties.length === 2) return { background: DUTY_COLORS.both.bg };
    const type = workerDuties[0].dayType;
    return { background: DUTY_COLORS[type].bg };
  };

  const averages = useMemo(() => {
    const perWorker = workerList.map(w => {
      const vals = days.map(d => {
        const cell = localEntries[getKey(w.id, d)];
        const v = parseFloat(cell?.value || '0');
        return isNaN(v) ? 0 : v;
      }).filter(v => v > 0);
      return {
        workerId: w.id,
        average: vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : 0,
        total: vals.reduce((a, b) => a + b, 0),
        count: vals.length,
      };
    });
    const allVals = perWorker.flatMap(w => {
      return days.map(d => {
        const cell = localEntries[getKey(w.workerId, d)];
        const v = parseFloat(cell?.value || '0');
        return isNaN(v) ? 0 : v;
      }).filter(v => v > 0);
    });
    return {
      perWorker,
      totalAverage: allVals.length > 0 ? (allVals.reduce((a, b) => a + b, 0) / allVals.length).toFixed(1) : 0,
    };
  }, [localEntries, workerList, days]);

  return (
    <div className="h-full flex flex-col p-3 md:p-4" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-[14px] md:text-[16px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            KPI планшет
          </h2>
          <div className="flex items-center gap-1">
            <button onClick={() => handleMonthChange(-1)} className="w-7 h-7 flex items-center justify-center rounded-lg" style={{ color: 'var(--text-secondary)' }}>
              <ChevronLeft size={16} />
            </button>
            <span className="text-[13px] font-medium px-2 py-0.5 rounded" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
              {MONTH_NAMES[month - 1]} {year}
            </span>
            <button onClick={() => handleMonthChange(1)} className="w-7 h-7 flex items-center justify-center rounded-lg" style={{ color: 'var(--text-secondary)' }}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {clearDuties && (
            <button onClick={clearDuties} className="text-[11px] md:text-[12px] px-2 md:px-3 py-1.5 rounded-lg font-medium" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              Сбросить дежурства
            </button>
          )}
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-[12px] md:text-[13px] font-medium transition-all active:scale-[0.97]"
            style={{ background: saved ? 'var(--success)' : 'var(--accent)', color: '#fff' }}
          >
            {saved ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
            {saved ? 'Сохранено!' : 'Сохранить'}
          </button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-x-4 md:gap-x-6 gap-y-1 mb-2 text-[10px] md:text-[11px] flex-shrink-0">
        <span style={{ color: 'var(--text-tertiary)' }}>
          <strong style={{ color: 'var(--text-primary)' }}>{daysInMonth}</strong> дней &bull; <strong style={{ color: 'var(--text-primary)' }}>{workerList.length}</strong> слесарей
        </span>
        <span style={{ color: 'var(--text-tertiary)' }}>
          Среднее: <strong style={{ color: 'var(--accent)' }}>{averages.totalAverage}</strong>
        </span>
        <button
          onClick={() => onSaveSession(month, year)}
          className="flex items-center gap-1 text-[10px] md:text-[11px] font-medium"
          style={{ color: 'var(--accent)' }}
        >
          <Plus size={10} /> Новая сессия
        </button>
      </div>

      {/* Duty legend */}
      {toggleDuty && (
        <div className="flex items-center gap-2 md:gap-3 mb-1.5 flex-shrink-0 flex-wrap">
          <span className="text-[9px] md:text-[10px] text-[var(--text-secondary)] font-medium">Дежурства:</span>
          <span className="flex items-center gap-1 text-[9px] md:text-[10px]"><span className="w-3 h-3 md:w-3.5 md:h-3.5 rounded-[3px] inline-block" style={{ background: DUTY_COLORS.saturday.bg, border: `1px solid ${DUTY_COLORS.saturday.border}` }} /> <strong style={{ color: DUTY_COLORS.saturday.text }}>Суббота</strong></span>
          <span className="flex items-center gap-1 text-[9px] md:text-[10px]"><span className="w-3 h-3 md:w-3.5 md:h-3.5 rounded-[3px] inline-block" style={{ background: DUTY_COLORS.sunday.bg, border: `1px solid ${DUTY_COLORS.sunday.border}` }} /> <strong style={{ color: DUTY_COLORS.sunday.text }}>Воскресенье</strong></span>
          <span className="text-[9px] md:text-[10px] text-[var(--text-tertiary)]">Кликните на слесаря</span>
        </div>
      )}

      {/* Table */}
      <div className="overflow-auto flex-1 -webkit-overflow-scrolling-touch">
        <table className="w-full border-collapse" style={{ minWidth: days.length * 24 + 120 }}>
          <thead className="sticky top-0 z-10">
            <tr style={{ background: 'var(--input-bg)', borderBottom: '1px solid var(--border)' }}>
              <th className="text-left px-1 md:px-1.5 py-[2px] md:py-1 text-[9px] md:text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.05em] sticky left-0 z-20 border-r border-[var(--border)] w-[72px] md:w-[90px]" style={{ background: 'var(--input-bg)' }}>Слесарь</th>
              {days.map(d => (
                <th key={d} className="text-center px-[1px] md:px-[2px] py-[2px] md:py-1 text-[8px] md:text-[9px] font-semibold text-[var(--text-secondary)] w-[20px] md:w-[24px] border-r border-[var(--border)]">{d}</th>
              ))}
              <th className="text-center px-[2px] md:px-1 py-[2px] md:py-1 text-[8px] md:text-[9px] font-semibold text-[var(--text-secondary)] w-[26px] md:w-[30px]">Ср</th>
            </tr>
          </thead>
          <tbody>
            {workerList.map((w, wIdx) => {
              const avg = averages.perWorker.find(a => a.workerId === w.id);
              const rowStyle = getWorkerRowStyle(w.id);
              return (
                <tr key={w.id} className="border-b border-[var(--border)] hover:bg-[var(--input-bg)]/30 transition-colors" style={rowStyle}>
                  <td
                    className="px-1 md:px-1.5 py-[1px] md:py-[2px] text-[9px] md:text-[10px] font-medium text-[var(--text-primary)] sticky left-0 z-10 border-r border-[var(--border)] whitespace-nowrap leading-tight cursor-pointer"
                    style={{ background: 'var(--surface)', ...(hasDuty(w.id) ? rowStyle : {}) }}
                    onClick={() => {
                      try {
                        if (toggleDuty) setDutyModalWorker(w);
                      } catch (err) {
                        console.error('Duty click error:', err);
                        alert('Ошибка: ' + (err as Error).message);
                      }
                    }}
                  >
                    <div className="flex items-center gap-0.5">
                      {hasDuty(w.id) && <Shield size={8} style={{ color: getWorkerDuties(w.id).some(d => d.dayType === 'saturday') ? DUTY_COLORS.saturday.text : DUTY_COLORS.sunday.text, flexShrink: 0 }} />}
                      <span className="truncate">{w.name}</span>
                    </div>
                  </td>
                  {days.map(d => {
                    const key = getKey(w.id, d);
                    const cellData = localEntries[key];
                    const val = cellData?.value || '';
                    return (
                      <td key={d} className="p-[1px] border-r border-[var(--border)]">
                        <input
                          ref={el => { if (el) inputRefs.current[key] = el; }}
                          type="text"
                          value={val}
                          onChange={e => handleChange(w.id, d, e.target.value)}
                          onKeyDown={e => handleKeyDown(e, wIdx, d)}
                          onFocus={e => e.currentTarget.select()}
                          maxLength={3}
                          className="w-full h-[18px] md:h-[20px] text-center text-[8px] md:text-[10px] font-semibold rounded-[1px] border border-transparent focus:border-[#0071E3] focus:ring-[1px] focus:ring-[#0071E3]/15 outline-none transition-all"
                          style={{ background: val ? undefined : 'var(--input-bg)', color: val ? undefined : 'var(--text-primary)', ...getCellStyle(val) }}
                        />
                      </td>
                    );
                  })}
                  <td className="text-center px-[2px] md:px-1 py-[1px] md:py-[2px]">
                    <span className={`text-[8px] md:text-[10px] font-bold ${(avg?.average || 0) > 0 ? 'text-[#0071E3]' : 'text-[var(--text-tertiary)]'}`}>
                      {avg?.average || '-'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Duty modal */}
      {dutyModalWorker && toggleDuty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'var(--overlay)' }} onClick={() => setDutyModalWorker(null)}>
          <div className="w-full max-w-[320px] rounded-lg p-4" style={{ background: 'var(--bg-secondary)', boxShadow: 'var(--shadow-floating)', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-semibold" style={{ background: 'var(--accent)' }}>{dutyModalWorker.initials}</div>
              <div>
                <h3 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>{dutyModalWorker.name}</h3>
                <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Выберите дежурство</p>
              </div>
            </div>
            <div className="space-y-2">
              {(['saturday', 'sunday'] as const).map(dt => {
                const isOn = duties.some(d => d.workerId === dutyModalWorker.id && d.dayType === dt);
                const c = DUTY_COLORS[dt];
                return (
                  <button
                    key={dt}
                    onClick={() => { toggleDuty({ month, year, workerId: dutyModalWorker.id, dayType: dt }); setDutyModalWorker(null); }}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all"
                    style={{
                      borderColor: isOn ? c.border : 'var(--border)',
                      background: isOn ? c.bg : 'var(--surface)',
                    }}
                  >
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>{c.label}</span>
                    <span className="text-[13px] font-medium flex-1 text-left" style={{ color: 'var(--text-primary)' }}>{dt === 'saturday' ? 'Суббота' : 'Воскресенье'}</span>
                    {isOn && <span className="text-[11px] font-medium" style={{ color: c.text }}>✓</span>}
                  </button>
                );
              })}
            </div>
            <button onClick={() => setDutyModalWorker(null)} className="w-full mt-3 py-2 rounded-lg text-[12px] font-medium" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>Отмена</button>
          </div>
        </div>
      )}
    </div>
  );
};
