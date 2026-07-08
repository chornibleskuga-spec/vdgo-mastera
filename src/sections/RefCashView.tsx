import { useState, useRef, useMemo } from 'react';
import { CreditCard, Search, X, UserCircle2, Hash, Package, Check, Wrench, Trash2, AlertTriangle } from 'lucide-react';
import type { CashRegister, Worker, CashRegisterStatus } from '@/types';
import { CASH_REGISTER_STATUS_COLORS } from '@/types';

interface RefCashViewProps {
  cashRegisters: CashRegister[];
  workers: Worker[];
  onUpdateCash: (id: number, updates: Partial<CashRegister>) => void;
}

const STATUS_LIST: CashRegisterStatus[] = ['В работе', 'В ремонте', 'Списана'];

function getInitials(name: string): string {
  return name.substring(0, 2).toUpperCase();
}

function getWorkerColor(id: string): string {
  const colors = ['#0078D4', '#107C10', '#FF9500', '#D13438', '#8764B8', '#0099BC', '#FF8C00'];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

const STATUS_CONFIG: Record<CashRegisterStatus, { icon: typeof Wrench; label: string; desc: string }> = {
  'В работе': { icon: Check, label: 'В работе', desc: 'Касса активна' },
  'В ремонте': { icon: Wrench, label: 'В ремонте', desc: 'Требует ремонта' },
  'Списана': { icon: Trash2, label: 'Списана', desc: 'Не используется' },
};

export function RefCashView({ cashRegisters, workers, onUpdateCash }: RefCashViewProps) {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const getWorkerName = (workerId: string | null) => {
    if (!workerId) return null;
    const w = workers.find(wr => wr.id === workerId);
    return w ? w.name : null;
  };

  // Filter
  const filtered = useMemo(() => {
    if (!search.trim()) return cashRegisters;
    const q = search.trim().toLowerCase();
    return cashRegisters.filter(cr => {
      const byNumber = cr.id.toString() === q || cr.code.toLowerCase().includes(q) || cr.inv.toLowerCase().includes(q);
      const workerName = getWorkerName(cr.workerId);
      const byWorker = workerName ? workerName.toLowerCase().includes(q) : false;
      return byNumber || byWorker;
    });
  }, [cashRegisters, search]);

  // Summary
  const summary = useMemo(() => {
    const s: Record<CashRegisterStatus, number> = { 'В работе': 0, 'Списана': 0, 'В ремонте': 0 };
    cashRegisters.forEach(cr => s[cr.status]++);
    return s;
  }, [cashRegisters]);

  const selectedCash = cashRegisters.find(cr => cr.id === selectedId);

  const clearSearch = () => {
    setSearch('');
    searchInputRef.current?.focus();
  };

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* ===== HEADER ===== */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md"
            style={{ background: 'var(--success)' }}>
            <CreditCard size={18} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Кассы</h2>
            <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
              №ВГБП-000002 от 31.07.2025 · {cashRegisters.length} шт.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
          <input
            ref={searchInputRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по № кассы, артикулу или слесарю..."
            className="w-full rounded-xl text-[13px] pl-9 pr-8 py-2.5 outline-none transition-all"
            style={{
              background: 'var(--input-bg)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
            }}
          />
          {search && (
            <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* Summary badges */}
        <div className="grid grid-cols-3 gap-2">
          {(Object.entries(summary) as [CashRegisterStatus, number][]).map(([status, count]) => {
            const colors = CASH_REGISTER_STATUS_COLORS[status];
            return (
              <div key={status} className="rounded-xl px-2 py-2 text-center" style={{ background: colors.bg, border: `1px solid ${colors.border}` }}>
                <div className="text-base font-bold" style={{ color: colors.text }}>{count}</div>
                <div className="text-[10px] font-medium" style={{ color: colors.text, opacity: 0.8 }}>{status}</div>
              </div>
            );
          })}
        </div>

        {search && (
          <div className="mt-2 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            Найдено: {filtered.length} из {cashRegisters.length}
          </div>
        )}
      </div>

      {/* ===== CARDS LIST ===== */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 mt-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <Search size={32} style={{ color: 'var(--text-tertiary)' }} className="mx-auto mb-2 opacity-40" />
            <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>Ничего не найдено</p>
            <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Попробуйте другой запрос</p>
          </div>
        ) : (
          filtered.map((cr) => {
            const statusColors = CASH_REGISTER_STATUS_COLORS[cr.status];
            const workerName = getWorkerName(cr.workerId);
            const workerColor = cr.workerId ? getWorkerColor(cr.workerId) : '#999';

            return (
              <button
                key={cr.id}
                onClick={() => setSelectedId(cr.id)}
                className="w-full text-left rounded-[14px] p-3.5 transition-all duration-200 hover:shadow-md active:scale-[0.98]"
                style={{
                  background: selectedId === cr.id ? 'var(--input-bg)' : 'var(--card-bg)',
                  border: selectedId === cr.id ? `1.5px solid ${statusColors.dot}` : '1px solid var(--border)',
                  boxShadow: selectedId === cr.id ? `0 0 0 3px ${statusColors.bg}` : '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5"
                      style={{ background: statusColors.bg, color: statusColors.text }}>
                      {cr.id}
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {cr.code}
                      </div>
                      <div className="text-[11px] flex items-center gap-1 mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        <Package size={10} />
                        {cr.name}
                      </div>
                      <div className="text-[10px] font-mono mt-1" style={{ color: 'var(--text-tertiary)' }}>
                        <Hash size={9} className="inline mr-0.5" />
                        {cr.inv}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{ background: statusColors.bg, color: statusColors.text }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColors.dot }} />
                      {cr.status}
                    </span>
                    {workerName ? (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                        style={{ background: `${workerColor}12`, color: workerColor }}>
                        <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-bold text-white"
                          style={{ background: workerColor }}>
                          {getInitials(workerName)}
                        </div>
                        {workerName}
                      </div>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px]" style={{ color: 'var(--text-tertiary)', background: 'var(--input-bg)' }}>
                        <UserCircle2 size={10} />
                        Не назначен
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* ===== DETAIL PANEL (drawer) ===== */}
      {selectedCash && (
        <>
          <div className="fixed inset-0 z-[9998]" style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)' }} onClick={() => setSelectedId(null)} />
          <div className="fixed right-0 top-0 bottom-0 z-[9999] w-full max-w-[380px] flex flex-col overflow-hidden"
            style={{
              background: 'var(--bg-primary)',
              borderLeft: '1px solid var(--border)',
              boxShadow: '-20px 0 60px rgba(0,0,0,0.2)',
              animation: 'slideIn 0.2s ease-out',
            }}>
            {/* Panel header */}
            <div className="flex-shrink-0 px-5 pt-5 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold"
                    style={{ background: CASH_REGISTER_STATUS_COLORS[selectedCash.status].bg, color: CASH_REGISTER_STATUS_COLORS[selectedCash.status].text }}>
                    {selectedCash.id}
                  </div>
                  <div>
                    <div className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>{selectedCash.code}</div>
                    <div className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{selectedCash.name}</div>
                  </div>
                </div>
                <button onClick={() => setSelectedId(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                  style={{ background: 'var(--input-bg)', color: 'var(--text-secondary)' }}>
                  <X size={16} />
                </button>
              </div>
              <div className="text-[11px] font-mono" style={{ color: 'var(--text-tertiary)' }}>
                <Hash size={10} className="inline mr-1" />
                Инв. №: {selectedCash.inv}
              </div>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

              {/* Status section */}
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>
                  Статус кассы
                </div>
                <div className="space-y-2">
                  {STATUS_LIST.map(s => {
                    const sc = CASH_REGISTER_STATUS_COLORS[s];
                    const config = STATUS_CONFIG[s];
                    const Icon = config.icon;
                    const isActive = selectedCash.status === s;
                    return (
                      <button
                        key={s}
                        onClick={() => onUpdateCash(selectedCash.id, { status: s })}
                        className="w-full flex items-center gap-3 rounded-xl px-3.5 py-3 text-left transition-all active:scale-[0.98]"
                        style={{
                          background: isActive ? sc.bg : 'var(--card-bg)',
                          border: isActive ? `2px solid ${sc.dot}` : '1.5px solid var(--border)',
                        }}
                      >
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: isActive ? sc.dot : 'var(--input-bg)' }}>
                          <Icon size={16} className={isActive ? 'text-white' : ''} style={{ color: isActive ? '#fff' : sc.dot }} />
                        </div>
                        <div className="flex-1">
                          <div className="text-[13px] font-semibold" style={{ color: isActive ? sc.text : 'var(--text-primary)' }}>{config.label}</div>
                          <div className="text-[11px]" style={{ color: isActive ? sc.text : 'var(--text-secondary)', opacity: isActive ? 0.8 : 1 }}>{config.desc}</div>
                        </div>
                        {isActive && <Check size={18} style={{ color: sc.dot }} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Divider */}
              <div className="h-px" style={{ background: 'var(--border)' }} />

              {/* Worker section */}
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>
                  Закреплен за слесарем
                </div>

                {/* Current worker */}
                {selectedCash.workerId && (
                  <div className="flex items-center gap-3 rounded-xl p-3 mb-3"
                    style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ background: getWorkerColor(selectedCash.workerId) }}>
                      {getInitials(getWorkerName(selectedCash.workerId) || '')}
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {getWorkerName(selectedCash.workerId)}
                      </div>
                      <div className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>Текущий ответственный</div>
                    </div>
                  </div>
                )}

                {/* Worker list */}
                <div className="space-y-1 max-h-[280px] overflow-y-auto rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                  <button
                    onClick={() => onUpdateCash(selectedCash.id, { workerId: null })}
                    className="w-full text-left px-3 py-2.5 text-[13px] transition-colors hover:bg-[var(--input-bg)] flex items-center gap-3"
                    style={{
                      color: !selectedCash.workerId ? '#0071E3' : 'var(--text-secondary)',
                      background: !selectedCash.workerId ? 'rgba(10,132,255,0.05)' : 'transparent',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: !selectedCash.workerId ? '#0071E3' : 'var(--input-bg)' }}>
                      <X size={14} className="text-white" />
                    </div>
                    <span>Не назначен</span>
                    {!selectedCash.workerId && <Check size={14} className="ml-auto" style={{ color: '#0071E3' }} />}
                  </button>

                  {workers.map(w => {
                    const isSelected = selectedCash.workerId === w.id;
                    const wColor = getWorkerColor(w.id);
                    return (
                      <button
                        key={w.id}
                        onClick={() => onUpdateCash(selectedCash.id, { workerId: w.id })}
                        className="w-full text-left px-3 py-2.5 text-[13px] transition-colors hover:bg-[var(--input-bg)] flex items-center gap-3"
                        style={{
                          color: isSelected ? wColor : 'var(--text-primary)',
                          background: isSelected ? `${wColor}08` : 'transparent',
                          borderBottom: '1px solid var(--border)',
                        }}
                      >
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                          style={{ background: isSelected ? wColor : 'var(--text-tertiary)' }}>
                          {getInitials(w.name)}
                        </div>
                        <span>{w.name}</span>
                        {isSelected && <Check size={14} className="ml-auto" style={{ color: wColor }} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
