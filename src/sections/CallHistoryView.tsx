import { useState, useMemo } from 'react';
import { PhoneCall, ChevronLeft, ChevronRight, Calendar, Headset } from 'lucide-react';
import type { DispatcherRecord } from '@/types';

const STORAGE_KEY = 'vdgo_dispatcher';
const HISTORY_PER_PAGE = 10;

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
      return result;
    }
    return [];
  } catch { return []; }
}

function formatDateDisplay(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export const CallHistoryView = () => {
  const [historyPage, setHistoryPage] = useState(0);

  const allRecords = useMemo(() => {
    return loadAllRecords().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, []);

  const allDates = useMemo(() => {
    const dates = new Set<string>();
    for (const r of allRecords) if (r.date) dates.add(r.date);
    return Array.from(dates).sort().reverse();
  }, [allRecords]);

  const totalHistoryPages = Math.ceil(allDates.length / HISTORY_PER_PAGE);
  const historyDates = allDates.slice(historyPage * HISTORY_PER_PAGE, (historyPage + 1) * HISTORY_PER_PAGE);

  return (
    <div className="h-full flex flex-col p-4 md:p-6 overflow-y-auto">
      <div className="max-w-2xl mx-auto w-full">
        <div className="text-center mb-5">
          <div className="w-10 h-10 rounded-[6px] flex items-center justify-center mx-auto mb-2" style={{ background: 'var(--accent)' }}>
            <PhoneCall size={18} className="text-white" />
          </div>
          <h2 className="text-[18px] font-semibold" style={{ color: 'var(--text-primary)' }}>История обзвона</h2>
          <p className="text-[12px] mt-1" style={{ color: 'var(--text-secondary)' }}>Сохранённые данные из раздела Диспетчер</p>
        </div>

        {allDates.length === 0 ? (
          <div className="text-center py-12">
            <Headset size={32} className="mx-auto mb-3" style={{ color: 'var(--text-tertiary)' }} />
            <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>История пуста</p>
            <p className="text-[11px] mt-1" style={{ color: 'var(--text-tertiary)' }}>Сохраняйте данные в разделе Диспетчер — они появятся здесь</p>
          </div>
        ) : (
          <div className="space-y-3">
            {historyDates.map(d => {
              const records = loadAllRecords().filter(r => r.date === d);
              const totalAll = records.reduce((s, r) => s + (r.totalRaw || '').split('+').reduce((a, b) => a + (parseInt(b) || 0), 0), 0);
              const nextAll = records.reduce((s, r) => s + (r.nextDayRaw || '').split('+').reduce((a, b) => a + (parseInt(b) || 0), 0), 0);
              return (
                <div key={d} className="rounded-[12px] p-3 border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} style={{ color: 'var(--accent)' }} />
                      <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{formatDateDisplay(d)}</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--badge-blue)', color: 'var(--accent)' }}>{records.length} записей</span>
                  </div>
                  <table className="w-full text-[12px]">
                    <tbody>
                      {records.map(r => (
                        <tr key={r.id} className="border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                          <td className="py-1.5" style={{ color: 'var(--text-secondary)' }}>{r.workerName}</td>
                          <td className="py-1.5 text-right font-medium" style={{ color: 'var(--accent)' }}>
                            {(r.totalRaw || '').split('+').reduce((a, b) => a + (parseInt(b) || 0), 0)}
                          </td>
                          <td className="py-1.5 text-right font-medium" style={{ color: 'var(--success)' }}>
                            {r.nextDayRaw && r.nextDayRaw !== '0' ? `(${(r.nextDayRaw || '').split('+').reduce((a, b) => a + (parseInt(b) || 0), 0)})` : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-2 pt-2 flex items-center gap-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                    <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>Итого:</span>
                    <span className="text-[12px] font-bold" style={{ color: 'var(--accent)' }}>{totalAll}</span>
                    {nextAll > 0 && <span className="text-[12px] font-bold" style={{ color: 'var(--success)' }}>({nextAll})</span>}
                  </div>
                </div>
              );
            })}

            {totalHistoryPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <button onClick={() => setHistoryPage(p => Math.max(0, p - 1))} disabled={historyPage === 0} className="p-1.5 rounded-lg disabled:opacity-30 text-[12px]" style={{ background: 'var(--bg-secondary)' }}><ChevronLeft size={16} /></button>
                <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{historyPage + 1} / {totalHistoryPages}</span>
                <button onClick={() => setHistoryPage(p => Math.min(totalHistoryPages - 1, p + 1))} disabled={historyPage >= totalHistoryPages - 1} className="p-1.5 rounded-lg disabled:opacity-30 text-[12px]" style={{ background: 'var(--bg-secondary)' }}><ChevronRight size={16} /></button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
