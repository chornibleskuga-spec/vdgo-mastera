import { FolderOpen, MapPin, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { WorkCase, Worker } from '@/types';

interface CaseHistoryViewProps {
  cases: WorkCase[];
  workers: Worker[];
  onDeleteCase: (caseId: number) => void;
  formatDateDMY: (iso: string) => string;
}

export const CaseHistoryView = ({ cases, workers, onDeleteCase, formatDateDMY }: CaseHistoryViewProps) => {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const closedCases = cases.filter(c => c.status === 'closed').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="h-full flex flex-col p-4 md:p-8 overflow-hidden">
      <div className="mb-4 md:mb-6 flex-shrink-0">
        <h2 className="text-[20px] md:text-[24px] font-semibold text-[var(--text-primary)] tracking-tight">История кейсов</h2>
        <p className="text-[12px] md:text-[13px] text-[var(--text-secondary)] mt-1">
          {closedCases.length} {closedCases.length === 1 ? 'закрытый кейс' : closedCases.length >= 2 && closedCases.length <= 4 ? 'закрытых кейса' : 'закрытых кейсов'}
        </p>
      </div>

      {closedCases.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-[var(--input-bg)] flex items-center justify-center mx-auto mb-3 md:mb-4">
              <FolderOpen size={24} className="text-[var(--text-tertiary)] md:hidden" />
              <FolderOpen size={28} className="text-[var(--text-tertiary)] hidden md:block" />
            </div>
            <p className="text-[14px] md:text-[16px] font-medium text-[var(--text-secondary)]">Нет закрытых кейсов</p>
            <p className="text-[12px] md:text-[13px] text-[var(--text-tertiary)] mt-1">Закройте активный кейс</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-2 md:space-y-3">
          {closedCases.map(c => {
            const isExpanded = expandedId === c.id;
            const totalAddresses = c.assignments.reduce((s, a) => s + a.addresses.length, 0);
            return (
              <div key={c.id} className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 md:gap-4 px-4 md:px-5 py-3 md:py-4">
                  <button onClick={() => setExpandedId(isExpanded ? null : c.id)} className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  <div className="w-8 h-8 md:w-9 md:h-9 rounded-[10px] bg-[var(--input-bg)] flex items-center justify-center flex-shrink-0">
                    <FolderOpen size={14} className="text-[var(--text-secondary)] md:hidden" />
                    <FolderOpen size={16} className="text-[var(--text-secondary)] hidden md:block" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] md:text-[15px] font-semibold text-[var(--text-primary)] truncate">Кейс — {formatDateDMY(c.date)}</p>
                    <p className="text-[11px] md:text-[12px] text-[var(--text-secondary)]">{totalAddresses} адресов, {c.assignments.length} слесарей</p>
                  </div>
                  <button onClick={() => { if (confirm('Удалить кейс навсегда?')) onDeleteCase(c.id); }}
                    className="p-2 text-[#FF3B30] hover:bg-[#FF3B30]/8 rounded-lg transition-all flex-shrink-0">
                    <Trash2 size={14} className="md:hidden" />
                    <Trash2 size={16} className="hidden md:block" />
                  </button>
                </div>

                {isExpanded && (
                  <div className="border-t border-[var(--border)] px-4 md:px-5 pb-3 md:pb-4 pt-2 md:pt-3">
                    {c.assignments.map(wa => {
                      const worker = workers.find(w => w.id === wa.workerId);
                      if (!worker) return null;
                      return (
                        <div key={wa.workerId} className="mb-3 md:mb-4 last:mb-0">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#0071E3] to-[#00C6FF] flex items-center justify-center text-white text-[10px] font-semibold">{worker.initials}</div>
                            <span className="text-[13px] md:text-[14px] font-semibold text-[var(--text-primary)]">{worker.name}</span>
                            <span className="text-[11px] md:text-[12px] text-[var(--text-secondary)]">({wa.addresses.length})</span>
                          </div>
                          <div className="ml-8 space-y-1 md:space-y-1.5">
                            {wa.addresses.map(addr => (
                              <div key={addr.id} className="flex items-center gap-2 text-[12px] md:text-[13px]">
                                <span className="text-[var(--text-secondary)] font-mono w-5">{addr.orderNum}</span>
                                <MapPin size={12} className="text-[var(--text-tertiary)]" />
                                <span className="text-[var(--text-primary)]">{addr.street} {addr.house}{addr.apartment ? `-${addr.apartment}` : ''}</span>
                                <span className={`ml-auto px-2 py-0.5 rounded-full text-[9px] md:text-[10px] font-semibold ${addr.timeSlot === 'I п.д.' ? 'bg-[#34C759]/10 text-[#248A3D]' : addr.timeSlot === 'II п.д.' ? 'bg-[#FF9500]/10 text-[#C77500]' : 'bg-[#0071E3]/10 text-[#0071E3]'}`}>{addr.timeSlot}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
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
