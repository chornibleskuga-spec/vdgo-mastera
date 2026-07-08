import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Headset, Calendar, Save, Trash2, ChevronRight, Plus } from 'lucide-react';
import type { DispatcherRecord } from '@/types';

const DISPATCHER_WORKERS = ['Широкова', 'Пузикова', 'Помощник', 'Липчанский', 'Муленков'];

interface WorkerEntry {
  total: string;
  nextDay: string;
  entries: Array<{ total: string; nextDay: string }>;
}

interface DispatcherViewProps {
  dispatcherData: DispatcherRecord[];
  onSaveDispatcher: (records: DispatcherRecord[]) => void;
  onDeleteDispatcher: (ids: string[]) => void;
}

const STORAGE_KEY = 'vdgo_dispatcher';

function parseEntries(r: DispatcherRecord): Array<{ total: string; nextDay: string }> {
  const totalParts = (r.totalRaw || '').split('+').map(s => s.trim()).filter(Boolean);
  const nextDayParts = (r.nextDayRaw || '').split('+').map(s => s.trim()).filter(Boolean);
  const entries: Array<{ total: string; nextDay: string }> = [];
  const maxLen = Math.max(totalParts.length, nextDayParts.length);
  for (let i = 0; i < maxLen; i++) {
    entries.push({ total: totalParts[i] || '0', nextDay: nextDayParts[i] || '0' });
  }
  return entries;
}

function loadAllRecords(): DispatcherRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === 'object') {
      const result: DispatcherRecord[] = [];
      for (const date of Object.keys(parsed)) {
        const arr = parsed[date];
        if (Array.isArray(arr)) result.push(...arr);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
      return result;
    }
    return [];
  } catch { return []; }
}

export const DispatcherView = ({ dispatcherData = [], onSaveDispatcher = () => {}, onDeleteDispatcher = () => {} }: Partial<DispatcherViewProps> = {}) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [workerData, setWorkerData] = useState<Record<string, WorkerEntry>>({});
  const [justSaved, setJustSaved] = useState(false);
  const localMutationTsRef = useRef(0);

  const trackLocalMutation = () => { localMutationTsRef.current = Date.now(); };

  // Init
  useEffect(() => {
    const records = loadAllRecords().filter(r => r.date === date);
    const init: Record<string, WorkerEntry> = {};
    for (const worker of DISPATCHER_WORKERS) {
      const r = records.find(rec => rec.workerName === worker);
      init[worker] = r ? { total: '', nextDay: '', entries: parseEntries(r) } : { total: '', nextDay: '', entries: [] };
    }
    setWorkerData(init);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Date change
  useEffect(() => {
    if (Date.now() - localMutationTsRef.current < 2000) return;
    const records = loadAllRecords().filter(r => r.date === date);
    setWorkerData(prev => {
      const next: Record<string, WorkerEntry> = {};
      for (const worker of DISPATCHER_WORKERS) {
        const r = records.find(rec => rec.workerName === worker);
        const existing = prev[worker];
        next[worker] = r
          ? { total: existing?.total ?? '', nextDay: existing?.nextDay ?? '', entries: parseEntries(r) }
          : { total: existing?.total ?? '', nextDay: existing?.nextDay ?? '', entries: [] };
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  // Sync merge preserving input fields
  useEffect(() => {
    if (Date.now() - localMutationTsRef.current < 2000) return;
    const syncForDate = dispatcherData.filter(d => d.date === date);
    if (syncForDate.length === 0) return;
    setWorkerData(prev => {
      let changed = false;
      const next: Record<string, WorkerEntry> = { ...prev };
      for (const worker of DISPATCHER_WORKERS) {
        const syncRec = syncForDate.find(r => r.workerName === worker);
        if (!syncRec) continue;
        const existing = prev[worker] || { total: '', nextDay: '', entries: [] };
        const newEntries = parseEntries(syncRec);
        if (JSON.stringify(existing.entries) === JSON.stringify(newEntries)) continue;
        changed = true;
        next[worker] = { total: existing.total, nextDay: existing.nextDay, entries: newEntries };
      }
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatcherData]);

  const handleTotalChange = (worker: string, value: string) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    trackLocalMutation();
    setWorkerData(prev => ({ ...prev, [worker]: { ...prev[worker], total: cleaned } }));
  };

  const handleNextDayChange = (worker: string, value: string) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    trackLocalMutation();
    setWorkerData(prev => ({ ...prev, [worker]: { ...prev[worker], nextDay: cleaned } }));
  };

  // Build records from workerData and save
  const buildAndSave = (sourceData: Record<string, WorkerEntry>) => {
    const records: DispatcherRecord[] = [];
    for (const w of DISPATCHER_WORKERS) {
      const d = sourceData[w];
      if (!d) continue;
      const pairs = [...(d.entries || [])];
      if ((d.total || '').trim() || (d.nextDay || '').trim()) {
        pairs.push({ total: (d.total || '').trim() || '0', nextDay: (d.nextDay || '').trim() || '0' });
      }
      const totalRaw = pairs.length > 0 ? pairs.map(p => p.total || '0').join('+') : '';
      const nextDayRaw = pairs.length > 0 ? pairs.map(p => p.nextDay || '0').join('+') : '';
      records.push({ id: `${date}_${w}`, workerName: w, totalRaw, nextDayRaw, date, createdAt: Date.now() });
    }
    trackLocalMutation();
    // Always save (even empty = clear all for this date)
    onSaveDispatcher(records);
  };

  const handleAddPair = (worker: string) => {
    const data = workerData[worker];
    if (!data) return;
    const totalVal = (data.total || '').trim();
    const nextDayVal = (data.nextDay || '').trim();
    if (!totalVal && !nextDayVal) return;
    trackLocalMutation();
    const nextData = { ...workerData, [worker]: { total: '', nextDay: '', entries: [...(workerData[worker]?.entries || []), { total: totalVal || '0', nextDay: nextDayVal || '0' }] } };
    setWorkerData(nextData);
    buildAndSave(nextData);
  };

  const handleRemovePair = (worker: string, idx: number) => {
    trackLocalMutation();
    const existing = workerData[worker];
    if (!existing || !Array.isArray(existing.entries)) return;
    const nextData = { ...workerData, [worker]: { ...existing, entries: existing.entries.filter((_, i) => i !== idx) } };
    setWorkerData(nextData);
    buildAndSave(nextData);
  };

  const handleSave = useCallback(() => {
    buildAndSave(workerData);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1500);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workerData, date, onSaveDispatcher]);

  const handleClear = useCallback(() => {
    if (!confirm('Очистить все данные за ' + formatDateDisplay(date) + '?')) return;
    trackLocalMutation();
    // Clear all records for this date by saving empty records for each worker
    const emptyRecords: DispatcherRecord[] = DISPATCHER_WORKERS.map(w => ({
      id: `${date}_${w}`, workerName: w, totalRaw: '', nextDayRaw: '', date, createdAt: Date.now(),
    }));
    onSaveDispatcher(emptyRecords);
    const empty: Record<string, WorkerEntry> = {};
    for (const w of DISPATCHER_WORKERS) empty[w] = { total: '', nextDay: '', entries: [] };
    setWorkerData(empty);
  }, [date, onSaveDispatcher]);

  const totals = useMemo(() => {
    let totalSum = 0, nextDaySum = 0;
    for (const worker of DISPATCHER_WORKERS) {
      const data = workerData[worker];
      if (!data) continue;
      for (const e of data.entries || []) { totalSum += parseInt(e.total, 10) || 0; nextDaySum += parseInt(e.nextDay, 10) || 0; }
      if (data.total) totalSum += parseInt(data.total, 10) || 0;
      if (data.nextDay) nextDaySum += parseInt(data.nextDay, 10) || 0;
    }
    return { totalSum, nextDaySum };
  }, [workerData]);

  const savedWorkers = useMemo(() => {
    return new Set(loadAllRecords().filter(r => r.date === date).map(r => r.workerName));
  }, [dispatcherData, date]);

  const formatDateDisplay = (iso: string) => {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // ===== MAIN VIEW =====
  return (
    <div className="h-full flex flex-col p-4 md:p-6 overflow-y-auto">
      <div className="max-w-3xl mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-5">
          <div className="w-10 h-10 rounded-[6px] flex items-center justify-center mx-auto mb-2" style={{ background: 'var(--accent)' }}>
            <Headset size={18} className="text-white" />
          </div>
          <h2 className="text-[18px] font-semibold" style={{ color: 'var(--text-primary)' }}>Диспетчер</h2>
          <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>Учёт согласованных адресов</p>
        </div>

        {/* Date bar */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-2 rounded-[4px] px-3 py-2 border flex-1" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <Calendar size={16} style={{ color: 'var(--text-tertiary)' }} />
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="flex-1 text-[13px] outline-none bg-transparent" style={{ color: 'var(--text-primary)' }} />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-[4px] border overflow-hidden mb-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          {/* Table header */}
          <div className="grid grid-cols-[1fr_80px_80px_44px] gap-2 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider border-b" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-tertiary)' }}>
            <span>Слесарь</span>
            <span className="text-center">Всего</span>
            <span className="text-center">След. день</span>
            <span></span>
          </div>

          {/* Table rows */}
          {DISPATCHER_WORKERS.map(worker => {
            const data = workerData[worker] || { total: '', nextDay: '', entries: [] };
            const hasEntries = data.entries && data.entries.length > 0;
            const hasInput = (data.total || '').trim() || (data.nextDay || '').trim();
            const isSaved = savedWorkers.has(worker);

            return (
              <div key={worker} className="border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                {/* Input row */}
                <div className="grid grid-cols-[1fr_80px_80px_44px] gap-2 px-3 py-2 items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0" style={{ background: 'var(--accent)' }}>
                      {worker.charAt(0)}
                    </div>
                    <div>
                      <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{worker}</span>
                      {isSaved && <span className="ml-1.5 text-[9px] px-1 py-0.5 rounded-[3px] font-medium" style={{ background: 'var(--badge-blue)', color: 'var(--accent)' }}>сохр.</span>}
                    </div>
                  </div>
                  <input type="text" inputMode="numeric" value={data.total}
                    onChange={e => handleTotalChange(worker, e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddPair(worker)}
                    placeholder="0"
                    className="w-full rounded-[4px] px-2 py-1.5 text-[13px] font-medium outline-none text-center"
                    style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--input-border)' }} />
                  <input type="text" inputMode="numeric" value={data.nextDay}
                    onChange={e => handleNextDayChange(worker, e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddPair(worker)}
                    placeholder="0"
                    className="w-full rounded-[4px] px-2 py-1.5 text-[13px] font-medium outline-none text-center"
                    style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--input-border)' }} />
                  <button onClick={() => handleAddPair(worker)} disabled={!hasInput}
                    className="h-[32px] flex items-center justify-center text-white rounded-[4px] transition-all disabled:opacity-30"
                    style={{ background: 'var(--accent)' }}>
                    <Plus size={16} />
                  </button>
                </div>

                {/* Entries chips row */}
                {hasEntries && (
                  <div className="px-3 pb-2 pl-[52px]">
                    <div className="flex flex-wrap gap-1">
                      {data.entries.map((e, idx) => {
                        const t = parseInt(e.total, 10) || 0;
                        const n = parseInt(e.nextDay, 10) || 0;
                        return (
                          <button key={idx} onClick={() => handleRemovePair(worker, idx)}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-[3px] text-[11px] font-medium border transition-all hover:opacity-70"
                            style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', borderColor: 'var(--border)' }} title="Удалить">
                            <span>{t}</span>
                            {n > 0 && <span style={{ color: 'var(--success)' }}>({n})</span>}
                            <span style={{ color: 'var(--text-tertiary)' }}>×</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Totals row */}
          <div className="grid grid-cols-[1fr_80px_80px_44px] gap-2 px-3 py-2.5 text-[13px] font-semibold border-t" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
            <span>ИТОГО</span>
            <span className="text-center" style={{ color: 'var(--accent)' }}>{totals.totalSum}</span>
            <span className="text-center" style={{ color: 'var(--success)' }}>{totals.nextDaySum}</span>
            <span></span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-[13px] font-medium rounded-[4px] transition-all text-white"
            style={{ background: justSaved ? 'var(--success)' : 'var(--accent)' }}>
            <Save size={14} /> {justSaved ? 'Сохранено!' : 'Сохранить'}
          </button>
          <button onClick={handleClear}
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-[13px] font-medium rounded-[4px] transition-all border"
            style={{ background: 'transparent', color: 'var(--danger)', borderColor: 'var(--border)' }}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
