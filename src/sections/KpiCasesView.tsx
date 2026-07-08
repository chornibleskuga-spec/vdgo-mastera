import { useState } from 'react';
import { FolderOpen, Trash2, TrendingUp, Users, BarChart3, ChevronDown, ChevronRight, FileSpreadsheet } from 'lucide-react';
import type { KpiCase, Worker } from '@/types';

interface KpiCasesViewProps {
  kpiCases: KpiCase[];
  workers: Worker[];
  onDelete: (id: number) => void;
  onExport?: (kpiCase: KpiCase) => void;
}

const SPECIAL_CODES = ['В', 'ДО', 'ОТ', 'Б'];
const isWorkDay = (val: string) => val.trim() !== '' && !SPECIAL_CODES.includes(val.trim()) && !isNaN(parseFloat(val.trim()));

export const KpiCasesView = ({ kpiCases, workers, onDelete, onExport }: KpiCasesViewProps) => {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const sorted = [...kpiCases].sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());

  return (
    <div className="h-full flex flex-col p-4 md:p-8 overflow-hidden">
      <div className="mb-4 md:mb-6 flex-shrink-0">
        <h2 className="text-[20px] md:text-[24px] font-semibold text-[var(--text-primary)] tracking-tight">KPI кейсы</h2>
        <p className="text-[12px] md:text-[13px] text-[var(--text-secondary)] mt-1">История сохранённых планшетов — {sorted.length}</p>
      </div>

      {sorted.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-[var(--input-bg)] flex items-center justify-center mx-auto mb-3 md:mb-4">
              <FolderOpen size={24} className="text-[var(--text-tertiary)] md:hidden" />
              <FolderOpen size={28} className="text-[var(--text-tertiary)] hidden md:block" />
            </div>
            <p className="text-[14px] md:text-[16px] font-medium text-[var(--text-secondary)]">Нет сохранённых KPI</p>
            <p className="text-[12px] md:text-[13px] text-[var(--text-tertiary)] mt-1">Сохраните планшет в разделе «KPI планшет»</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-2 md:space-y-3">
          {sorted.map(kc => {
            const isExpanded = expandedId === kc.id;
            const workerStats: Record<string, { sum: number; workDays: number; name: string }> = {};
            for (const e of kc.entries) {
              if (isWorkDay(e.value)) {
                const w = workers.find(wr => wr.id === e.workerId);
                if (!workerStats[e.workerId]) workerStats[e.workerId] = { sum: 0, workDays: 0, name: w?.name || '' };
                workerStats[e.workerId].sum += parseFloat(e.value);
                workerStats[e.workerId].workDays++;
              }
            }
            let totalSum = 0, totalWorkDays = 0;
            for (const s of Object.values(workerStats)) { totalSum += s.sum; totalWorkDays += s.workDays; }
            const brigadeAvg = totalWorkDays > 0 ? +(totalSum / totalWorkDays).toFixed(1) : 0;

            return (
              <div key={kc.id} className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 md:gap-4 px-4 md:px-5 py-3 md:py-4">
                  <button onClick={() => setExpandedId(isExpanded ? null : kc.id)} className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  <div className="w-8 h-8 md:w-9 md:h-9 rounded-[10px] bg-gradient-to-br from-[#0071E3] to-[#00C6FF] flex items-center justify-center flex-shrink-0">
                    <TrendingUp size={14} className="text-white md:hidden" />
                    <TrendingUp size={16} className="text-white hidden md:block" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] md:text-[15px] font-semibold text-[var(--text-primary)]">{kc.label}</p>
                    <p className="text-[11px] md:text-[12px] text-[var(--text-secondary)]">{kc.entries.length} записей</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-right mr-1 md:mr-3">
                      <p className="text-[11px] md:text-[12px] text-[var(--text-secondary)]">Ср: <span className="font-semibold text-[#0071E3]">{brigadeAvg}</span></p>
                    </div>
                    {onExport && (
                      <button onClick={() => onExport(kc)}
                        className="p-2 text-[var(--accent)] hover:bg-[var(--accent)]/8 rounded-lg transition-all" title="Экспорт в Excel">
                        <FileSpreadsheet size={14} />
                      </button>
                    )}
                    <button onClick={() => { if (confirm('Удалить KPI кейс?')) onDelete(kc.id); }}
                      className="p-2 text-[#FF3B30] hover:bg-[#FF3B30]/8 rounded-lg transition-all">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-[var(--border)] px-4 md:px-5 pb-3 md:pb-4 pt-2 md:pt-3">
                    <div className="grid grid-cols-3 gap-2 md:gap-3 mb-3 md:mb-4">
                      <div className="bg-[var(--input-bg)] rounded-lg p-2 md:p-3 flex items-center gap-1.5 md:gap-2">
                        <TrendingUp size={12} className="text-[#0071E3] md:hidden" /><TrendingUp size={14} className="text-[#0071E3] hidden md:block" />
                        <div><p className="text-[9px] md:text-[11px] text-[var(--text-secondary)]">Среднее</p><p className="text-[14px] md:text-[16px] font-semibold text-[var(--text-primary)]">{brigadeAvg}</p></div>
                      </div>
                      <div className="bg-[var(--input-bg)] rounded-lg p-2 md:p-3 flex items-center gap-1.5 md:gap-2">
                        <BarChart3 size={12} className="text-[#34C759] md:hidden" /><BarChart3 size={14} className="text-[#34C759] hidden md:block" />
                        <div><p className="text-[9px] md:text-[11px] text-[var(--text-secondary)]">Работ</p><p className="text-[14px] md:text-[16px] font-semibold text-[var(--text-primary)]">{totalSum}</p></div>
                      </div>
                      <div className="bg-[var(--input-bg)] rounded-lg p-2 md:p-3 flex items-center gap-1.5 md:gap-2">
                        <Users size={12} className="text-[#FF9500] md:hidden" /><Users size={14} className="text-[#FF9500] hidden md:block" />
                        <div><p className="text-[9px] md:text-[11px] text-[var(--text-secondary)]">Дни</p><p className="text-[14px] md:text-[16px] font-semibold text-[var(--text-primary)]">{totalWorkDays}</p></div>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full" style={{ minWidth: 300 }}>
                        <thead><tr className="bg-[var(--input-bg)]"><th className="text-left px-2 md:px-3 py-1.5 md:py-2 text-[10px] md:text-[11px] font-semibold text-[var(--text-secondary)]">Слесарь</th><th className="text-right px-2 md:px-3 py-1.5 md:py-2 text-[10px] md:text-[11px] font-semibold text-[var(--text-secondary)]">Сумма</th><th className="text-right px-2 md:px-3 py-1.5 md:py-2 text-[10px] md:text-[11px] font-semibold text-[var(--text-secondary)]">Дни</th><th className="text-right px-2 md:px-3 py-1.5 md:py-2 text-[10px] md:text-[11px] font-semibold text-[var(--text-secondary)]">Среднее</th></tr></thead>
                        <tbody>
                          {Object.entries(workerStats).map(([wid, s]) => (
                            <tr key={wid} className="border-t border-[var(--border-subtle)]">
                              <td className="px-2 md:px-3 py-1.5 md:py-2 text-[11px] md:text-[13px] text-[var(--text-primary)]">{s.name}</td>
                              <td className="px-2 md:px-3 py-1.5 md:py-2 text-[11px] md:text-[13px] text-right font-medium text-[var(--text-primary)]">{s.sum}</td>
                              <td className="px-2 md:px-3 py-1.5 md:py-2 text-[11px] md:text-[13px] text-right text-[var(--text-secondary)]">{s.workDays}</td>
                              <td className="px-2 md:px-3 py-1.5 md:py-2 text-[11px] md:text-[13px] text-right font-bold text-[#0071E3]">{s.workDays > 0 ? +(s.sum / s.workDays).toFixed(1) : 0}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
