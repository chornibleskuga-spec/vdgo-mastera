import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, Plus, X, MapPin, Briefcase, FolderOpen, ChevronLeft as ChevronLeftIcon, Trash2, Pencil, ArrowLeftRight, Save, FileSpreadsheet, ChevronDown, ChevronUp, Download, User } from 'lucide-react';
import type { WorkCase, Worker, AssignedAddress } from '@/types';

interface WorkViewProps {
  activeCase: WorkCase | null;
  workers: Worker[];
  workCases: WorkCase[];
  onCreateCase: (date: string) => void;
  onSaveCase: (caseId: number) => void;
  onCloseCase: (caseId: number) => void;
  onDeleteCase: (caseId: number) => void;
  onAddAddress: (caseId: number, workerId: string, street: string, house: string, apartment: string) => void;
  onRemoveAddress: (caseId: number, addressId: number) => void;
  onEditAddress: (caseId: number, addressId: number, s: string, h: string, a: string) => void;
  onSwapAddress: (caseId: number, addressId: number, toWorkerId: string) => void;
  getWorkerAddresses: (caseId: number, workerId: string) => Array<{ id: number; assignmentId: number; street: string; house: string; apartment: string; orderNum: number }>;
  searchAllAddresses: (query: string) => Array<{ address: { street: string; house: string; apartment: string; orderNum: number; id: number; assignmentId: number }; workerName: string; caseDate: string }>;
  formatDateDMY: (iso: string) => string;
  onExportCase?: (caseId: number) => void;
}

const statusBadge = (status: string) => {
  switch (status) {
    case 'active': return { text: 'Редактирование', class: 'bg-[rgba(0,120,212,0.1)]', color: 'var(--accent)' };
    case 'saved': return { text: 'Сохранён', class: 'bg-[rgba(16,124,16,0.1)]', color: 'var(--success)' };
    case 'closed': return { text: 'Закрыт', class: 'bg-[var(--input-bg)]', color: 'var(--text-secondary)' };
    default: return { text: status, class: 'bg-[var(--input-bg)]', color: 'var(--text-secondary)' };
  }
};

/* ==================== Case List ==================== */
const CaseListPanel = ({ cases, formatDate, onCreate, onSelect }: {
  cases: WorkCase[]; formatDate: (s: string) => string;
  onCreate: (d: string) => void; onSelect: (id: number) => void;
}) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const safeCases = Array.isArray(cases) ? cases : [];
  const sorted = [...safeCases].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="h-full flex flex-col items-center justify-center p-4 md:p-6 overflow-y-auto">
      <div className="w-full max-w-lg">
        <div className="text-center mb-4 md:mb-6">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center mx-auto mb-2 md:mb-3"
            style={{ background: 'var(--accent)' }}>
            <Briefcase size={18} className="text-white md:hidden" />
            <Briefcase size={20} className="text-white hidden md:block" />
          </div>
          <h2 className="text-[18px] md:text-[22px] font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            {safeCases.length === 0 ? 'Нет кейсов' : 'Кейсы'}
          </h2>
          <p className="text-[12px] md:text-[13px] mt-1" style={{ color: 'var(--text-secondary)' }}>
            {safeCases.length === 0 ? 'Создайте первый кейс' : `${safeCases.length} кейсов`}
          </p>
        </div>

        <div className="rounded-[12px] md:rounded-[14px] p-3 md:p-4 mb-4" style={{
          background: 'var(--bg-secondary)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.04)',
        }}>
          <label className="text-[11px] font-medium uppercase tracking-[0.06em] mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Дата кейса</label>
          <div className="flex gap-2">
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="flex-1 rounded-[10px] px-3 py-2 text-[14px] outline-none transition-all focus:ring-2 focus:ring-[var(--accent)]/20"
              style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '0.5px solid rgba(0,0,0,0.08)' }} />
            <button onClick={() => onCreate(date)}
              className="px-3 md:px-4 py-2 text-white text-[13px] font-medium rounded-[10px] transition-all active:scale-[0.97] flex items-center gap-1"
              style={{ background: 'var(--accent)' }}>
              <Plus size={15} strokeWidth={2.5} /> <span className="hidden sm:inline">Создать</span>
            </button>
          </div>
        </div>

        {sorted.length > 0 && (
          <div className="space-y-2">
            {sorted.map(c => {
              const total = c.assignments.reduce((s, a) => s + a.addresses.length, 0);
              const st = statusBadge(c.status);
              return (
                <button key={c.id} onClick={() => onSelect(c.id)}
                  className="w-full flex items-center gap-3 md:gap-4 rounded-[12px] md:rounded-[14px] px-4 md:px-5 py-3 md:py-3.5 text-left transition-all duration-200 group active:scale-[0.99]"
                  style={{
                    background: 'var(--bg-secondary)',
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.03), 0 0 0 0.5px rgba(0,0,0,0.04)',
                  }}>
                  <div className="w-8 h-8 md:w-9 md:h-9 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: 'var(--input-bg)' }}>
                    <FolderOpen size={14} className="md:hidden" style={{ color: 'var(--text-secondary)' }} />
                    <FolderOpen size={16} className="hidden md:block" style={{ color: 'var(--text-secondary)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] md:text-[14px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>Кейс — {formatDate(c.date)}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>{total} адресов · {c.assignments.length} слесарей</p>
                  </div>
                  <span className={`text-[10px] md:text-[11px] font-medium px-2 py-1 rounded-full flex-shrink-0 ${st.class}`} style={{ color: st.color }}>{st.text}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

/* ==================== Quick Search (saved/closed only) ==================== */
const QuickSearch = ({ searchFn }: { searchFn: (query: string) => Array<{ address: { street: string; house: string; apartment: string; orderNum: number; id: number; assignmentId: number }; workerName: string; caseDate: string }> }) => {
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const results = query.trim() ? searchFn(query.trim()) : [];

  return (
    <div className="border-b px-3 md:px-5 py-2 md:py-3" style={{ background: 'var(--bg-secondary)', backdropFilter: 'blur(20px)', borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-2">
        <Search size={14} className="md:hidden flex-shrink-0" style={{ color: 'var(--text-secondary)' }} />
        <Search size={15} className="hidden md:block flex-shrink-0" style={{ color: 'var(--text-secondary)' }} />
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setShowResults(false); }}
          onKeyDown={e => e.key === 'Enter' && setShowResults(true)}
          placeholder="Улица Дом-Квартира (например: Мясн 13-12)"
          className="flex-1 bg-transparent text-[12px] md:text-[13px] outline-none placeholder:text-[var(--text-tertiary)]"
          style={{ color: 'var(--text-primary)' }}
        />
        <button
          onClick={() => setShowResults(true)}
          className="h-[28px] md:h-[32px] px-2 md:px-3 text-white text-[11px] md:text-[12px] font-medium rounded-[8px] transition-all active:scale-[0.97] flex-shrink-0"
          style={{ background: 'var(--accent)' }}>
          Найти
        </button>
        {query && (
          <button onClick={() => { setQuery(''); setShowResults(false); }} className="p-1 rounded-lg transition-colors flex-shrink-0" style={{ color: 'var(--text-secondary)' }}><X size={13} /></button>
        )}
      </div>
      {showResults && (
        <div className="mt-2 space-y-1 max-h-[180px] overflow-y-auto">
          {results.length === 0 ? (
            <p className="text-[12px] text-center py-3" style={{ color: 'var(--text-secondary)' }}>Адрес не найден</p>
          ) : results.map((r, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg px-2 md:px-3 py-2" style={{ background: 'var(--input-bg)' }}>
              <MapPin size={12} style={{ color: 'var(--accent)' }} className="flex-shrink-0" />
              <span className="text-[11px] md:text-[12px] flex-1 truncate" style={{ color: 'var(--text-primary)' }}>{r.address.street} {r.address.house}{r.address.apartment ? `-${r.address.apartment}` : ''}</span>
              <span className="text-[10px] md:text-[11px] font-medium flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>{r.workerName}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ==================== Swap Modal (center screen) ==================== */
const SwapModal = ({ isOpen, onClose, address, fromWorker, workers, onSwap }: {
  isOpen: boolean; onClose: () => void; address: string; fromWorker: Worker;
  workers: Worker[]; onSwap: (toWorkerId: string) => void;
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div className="w-full max-w-[360px] rounded-2xl p-4" style={{ background: 'var(--bg-secondary)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[12px] font-semibold" style={{ background: 'var(--warning)' }}>
            <ArrowLeftRight size={16} />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>Передать адрес</p>
            <p className="text-[11px] truncate" style={{ color: 'var(--text-tertiary)' }}>{address}</p>
          </div>
        </div>
        <p className="text-[11px] font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>От: {fromWorker.name}</p>
        <p className="text-[11px] font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>Кому:</p>
        <div className="space-y-1 max-h-[280px] overflow-y-auto">
          {workers.map(w => (
            <button
              key={w.id}
              onClick={() => { onSwap(w.id); onClose(); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all hover:scale-[1.01] active:scale-[0.99]"
              style={{ background: 'var(--input-bg)', border: '1px solid transparent' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--surface)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'var(--input-bg)'; }}
            >
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[9px] font-semibold flex-shrink-0" style={{ background: 'var(--accent)' }}>{w.initials}</div>
              <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{w.name}</span>
            </button>
          ))}
        </div>
        <button onClick={onClose} className="w-full mt-3 py-2.5 rounded-xl text-[13px] font-medium" style={{ background: 'var(--input-bg)', color: 'var(--text-secondary)' }}>Отмена</button>
      </div>
    </div>
  );
};

/* ==================== Worker Card (collapsible square) ==================== */
const WorkerCard = ({
  worker, caseId, addresses, canEdit, onToggleExpand,
  onAddAddress, onRemoveAddress, onEditAddress, onSwapAddress, allWorkers,
}: {
  worker: Worker; caseId: number; addresses: AssignedAddress[]; canEdit: boolean;
  onToggleExpand: () => void;
  onAddAddress: (caseId: number, workerId: string, street: string, house: string, apartment: string) => void;
  onRemoveAddress: (caseId: number, addressId: number) => void;
  onEditAddress: (caseId: number, addressId: number, s: string, h: string, a: string) => void;
  onSwapAddress: (caseId: number, addressId: number, toWorkerId: string) => void;
  allWorkers: Worker[];
}) => {
  const [quickInput, setQuickInput] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editStreet, setEditStreet] = useState('');
  const [editHouse, setEditHouse] = useState('');
  const [editApt, setEditApt] = useState('');
  const [swapModal, setSwapModal] = useState<{ addrId: number; address: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Parse two formats:
  // "Мясн 13-132" -> street="Мясн", house="13", apt="132" (apartment)
  // "Хользунова 1" -> street="Хользунова", house="1", apt="" (private house)
  const parseAddress = (input: string): { street: string; house: string; apt: string } | null => {
    const trimmed = input.trim();
    if (!trimmed) return null;
    const lastSpace = trimmed.lastIndexOf(' ');
    if (lastSpace === -1) return null;
    const street = trimmed.substring(0, lastSpace).trim();
    const housePart = trimmed.substring(lastSpace + 1).trim();
    if (!street || !housePart) return null;
    const dashIdx = housePart.indexOf('-');
    if (dashIdx > 0) {
      return { street, house: housePart.substring(0, dashIdx).trim(), apt: housePart.substring(dashIdx + 1).trim() };
    }
    return { street, house: housePart, apt: '' };
  };

  const handleAdd = () => {
    const parsed = parseAddress(quickInput);
    if (!parsed) return;
    onAddAddress(caseId, worker.id, parsed.street, parsed.house, parsed.apt);
    setQuickInput('');
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const startEdit = (addr: AssignedAddress) => {
    setEditingId(addr.id);
    setEditStreet(addr.street);
    setEditHouse(addr.house);
    setEditApt(addr.apartment);
  };

  const saveEdit = () => {
    if (editingId !== null) {
      onEditAddress(caseId, editingId, editStreet, editHouse, editApt);
      setEditingId(null);
    }
  };

  return (
    <div className="rounded-xl border transition-all" style={{
      background: 'var(--bg-secondary)',
      borderColor: 'var(--border)',
      boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
    }}>
      {/* Expanded header */}
      <button
        onClick={onToggleExpand}
        className="w-full flex items-center justify-between px-3 py-2 rounded-t-xl transition-colors"
        style={{ background: 'var(--surface)' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0" style={{ background: 'var(--accent)' }}>
            {worker.initials}
          </div>
          <span className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{worker.name}</span>
          {addresses.length > 0 && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: 'var(--input-bg)', color: 'var(--text-secondary)' }}>
              {addresses.length}
            </span>
          )}
        </div>
        <ChevronUp size={14} style={{ color: 'var(--text-tertiary)' }} />
      </button>

      {/* Expanded content */}
      <div className="p-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
        {/* Add address input */}
        {canEdit && (
          <div className="flex gap-2 mb-3">
            <input
              ref={inputRef}
              type="text"
              value={quickInput}
              onChange={e => setQuickInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="Улица Дом-Кв или Улица Дом"
              className="flex-1 rounded-lg px-3 py-1.5 text-[12px] outline-none"
              style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '0.5px solid rgba(0,0,0,0.08)' }}
            />
            <button
              onClick={handleAdd}
              disabled={!quickInput.trim()}
              className="px-3 py-1.5 text-white text-[12px] font-medium rounded-lg transition-all disabled:opacity-40 flex-shrink-0"
              style={{ background: 'var(--accent)' }}
            >
              <Plus size={14} />
            </button>
          </div>
        )}

        {/* Addresses list — numbered, with scroll for 20+ */}
        {addresses.length === 0 ? (
          <p className="text-[11px] text-center py-3" style={{ color: 'var(--text-tertiary)' }}>Нет работ</p>
        ) : (
          <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
            {[...addresses].sort((a, b) => a.orderNum - b.orderNum).map((addr, idx) => (
              <div key={addr.id} className="group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-all" style={{ background: 'var(--input-bg)' }}>
                <span className="text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent)', color: '#fff' }}>
                  {idx + 1}
                </span>

                {editingId === addr.id ? (
                  <div className="flex-1 flex items-center gap-1">
                    <input value={editStreet} onChange={e => setEditStreet(e.target.value)} className="flex-1 rounded px-2 py-1 text-[11px] outline-none" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '0.5px solid var(--border)' }} />
                    <input value={editHouse} onChange={e => setEditHouse(e.target.value)} className="w-12 rounded px-2 py-1 text-[11px] outline-none" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '0.5px solid var(--border)' }} />
                    <input value={editApt} onChange={e => setEditApt(e.target.value)} className="w-10 rounded px-2 py-1 text-[11px] outline-none" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '0.5px solid var(--border)' }} placeholder="Кв" />
                    <button onClick={saveEdit} className="px-2 py-1 text-white text-[10px] rounded" style={{ background: 'var(--accent)' }}>OK</button>
                  </div>
                ) : (
                  <>
                    <span className="text-[11px] md:text-[12px] flex-1 truncate" style={{ color: 'var(--text-primary)' }}>
                      {addr.street} {addr.house}{addr.apartment ? `-${addr.apartment}` : ''}
                    </span>
                    {canEdit && (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button onClick={() => startEdit(addr)} className="p-1 rounded" style={{ color: 'var(--accent)' }} title="Редактировать"><Pencil size={10} /></button>
                        <button onClick={() => setSwapModal({ addrId: addr.id, address: `${addr.street} ${addr.house}${addr.apartment ? `-${addr.apartment}` : ''}` })} className="p-1 rounded" style={{ color: 'var(--warning)' }} title="Передать"><ArrowLeftRight size={10} /></button>
                        <button onClick={() => onRemoveAddress(caseId, addr.id)} className="p-1 rounded" style={{ color: 'var(--danger)' }} title="Удалить"><Trash2 size={10} /></button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Swap modal */}
      <SwapModal
        isOpen={swapModal !== null}
        onClose={() => setSwapModal(null)}
        address={swapModal?.address ?? ''}
        fromWorker={worker}
        workers={allWorkers.filter(w => w.id !== worker.id)}
        onSwap={(toWorkerId) => { if (swapModal) onSwapAddress(caseId, swapModal.addrId, toWorkerId); }}
      />
    </div>
  );
};

/* ==================== Excel Export ==================== */
function exportCaseToExcel(workCase: WorkCase, workers: Worker[], formatDateDMY: (s: string) => string) {
  const rows: string[][] = [];
  // Header
  rows.push(['Кейс', formatDateDMY(workCase.date), 'Статус', workCase.status === 'closed' ? 'Закрыт' : workCase.status]);
  rows.push(['Слесарь', '№', 'Улица', 'Дом', 'Квартира']);
  
  for (const assignment of workCase.assignments) {
    const worker = workers.find(w => w.id === assignment.workerId);
    const workerName = worker ? worker.name : assignment.workerId;
    const sorted = [...assignment.addresses].sort((a, b) => a.orderNum - b.orderNum);
    for (let i = 0; i < sorted.length; i++) {
      const addr = sorted[i];
      rows.push([i === 0 ? workerName : '', String(i + 1), addr.street, addr.house, addr.apartment]);
    }
    if (sorted.length === 0) {
      rows.push([workerName, '', '', '', '']);
    }
  }
  
  // Build TSV
  const tsv = rows.map(r => r.join('\t')).join('\n');
  const blob = new Blob([tsv], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Кейс_${formatDateDMY(workCase.date).replace(/\./g, '_')}.xls`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ==================== Case Detail (4x4 grid) ==================== */
const CaseDetail = ({
  workCase, workers, onAddAddress, onRemoveAddress, onEditAddress, onSwapAddress,
  onSaveCase, onCloseCase, onDeleteCase, onBack, searchFn, formatDateDMY,
}: {
  workCase: WorkCase; workers: Worker[];
  onAddAddress: WorkViewProps['onAddAddress']; onRemoveAddress: WorkViewProps['onRemoveAddress'];
  onEditAddress: WorkViewProps['onEditAddress']; onSwapAddress: WorkViewProps['onSwapAddress'];
  onSaveCase: WorkViewProps['onSaveCase']; onCloseCase: WorkViewProps['onCloseCase']; onDeleteCase: WorkViewProps['onDeleteCase'];
  onBack: () => void; searchFn: WorkViewProps['searchAllAddresses']; formatDateDMY: (s: string) => string;
}) => {
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const w of workers) init[w.id] = true;
    return init;
  });
  const isActive = workCase.status === 'active';
  const isSaved = workCase.status === 'saved';
  const canEdit = isActive;
  const totalAddresses = workCase.assignments.reduce((s, a) => s + a.addresses.length, 0);
  const st = statusBadge(workCase.status);

  const toggleCard = (workerId: string) => {
    setExpandedCards(prev => ({ ...prev, [workerId]: !prev[workerId] }));
  };

  const getAddresses = (workerId: string): AssignedAddress[] => {
    const assignment = workCase.assignments.find(a => a.workerId === workerId);
    return assignment ? assignment.addresses : [];
  };

  return (
    <div className="h-full flex flex-col">
      {/* Top bar */}
      <div className="border-b px-3 md:px-5 py-2 md:py-3 flex items-center justify-between flex-shrink-0" style={{ background: 'var(--bg-secondary)', backdropFilter: 'blur(20px)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
          <button onClick={onBack} className="p-1.5 md:p-2 rounded-lg transition-colors hover:bg-black/[0.04] flex-shrink-0"><ChevronLeftIcon size={16} className="md:hidden" style={{ color: 'var(--text-secondary)' }} /><ChevronLeftIcon size={18} className="hidden md:block" style={{ color: 'var(--text-secondary)' }} /></button>
          <div className="min-w-0">
            <h2 className="text-[14px] md:text-[16px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>Кейс — {formatDateDMY(workCase.date)}</h2>
            <p className="text-[11px] md:text-[12px]" style={{ color: 'var(--text-secondary)' }}>{totalAddresses} адр. · {workCase.assignments.length} слес.</p>
          </div>
          <span className={`text-[9px] md:text-[11px] font-medium px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-full flex-shrink-0 ${st.class}`} style={{ color: st.color }}>{st.text}</span>
        </div>
        <div className="flex items-center gap-1 md:gap-2 flex-shrink-0 ml-2">
          {isActive && (
            <>
              <button onClick={() => { if (confirm('Сохранить кейс?')) onSaveCase(workCase.id); }}
                className="flex items-center gap-1 px-2 md:px-4 py-1.5 md:py-2 text-[11px] md:text-[13px] font-medium rounded-[8px] md:rounded-[10px] transition-all active:scale-[0.97]"
                style={{ background: 'rgba(48,209,88,0.1)', color: '#1d8c3b' }}>
                <Save size={12} className="md:hidden" /><Save size={14} className="hidden md:block" /> <span className="hidden sm:inline">Сохранить</span>
              </button>
              <button onClick={() => { if (confirm('Закрыть кейс?')) onCloseCase(workCase.id); }}
                className="px-2 md:px-4 py-1.5 md:py-2 text-[11px] md:text-[13px] font-medium rounded-[8px] md:rounded-[10px] transition-all active:scale-[0.97]"
                style={{ background: 'rgba(255,59,48,0.08)', color: 'var(--danger)' }}><span className="hidden sm:inline">Закрыть</span><span className="sm:hidden">✕</span></button>
            </>
          )}
          {workCase.status === 'closed' && (
            <>
              <button onClick={() => exportCaseToExcel(workCase, workers, formatDateDMY)}
                className="flex items-center gap-1 px-2 md:px-3 py-1.5 md:py-2 text-[11px] md:text-[13px] font-medium rounded-[8px] md:rounded-[10px] transition-all active:scale-[0.97]"
                style={{ background: 'rgba(10,132,255,0.08)', color: 'var(--accent)' }} title="Скачать Excel">
                <Download size={14} /> <span className="hidden sm:inline">Excel</span>
              </button>
              <button onClick={() => { if (confirm('Удалить?')) onDeleteCase(workCase.id); }}
                className="px-2 md:px-4 py-1.5 md:py-2 text-[11px] md:text-[13px] font-medium rounded-[8px] md:rounded-[10px] transition-all"
                style={{ background: 'rgba(255,59,48,0.08)', color: 'var(--danger)' }}><Trash2 size={14} /></button>
            </>
          )}
          {isSaved && (
            <>
              <button onClick={() => { if (confirm('Закрыть кейс?')) onCloseCase(workCase.id); }}
                className="px-2 md:px-4 py-1.5 md:py-2 text-[11px] md:text-[13px] font-medium rounded-[8px] md:rounded-[10px] transition-all"
                style={{ background: 'rgba(142,142,147,0.1)', color: 'var(--text-secondary)' }}>Закрыть</button>
            </>
          )}
        </div>
      </div>

      {/* Quick search — only for saved/closed cases */}
      {!isActive && <QuickSearch searchFn={searchFn} />}

      {/* Expanded worker cards grid */}
      <div className="flex-1 overflow-y-auto p-3 md:p-5" style={{ background: 'var(--bg-primary)' }}>
        {/* Expanded cards */}
        {workers.filter(w => expandedCards[w.id]).length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {workers.filter(w => expandedCards[w.id]).map(worker => (
              <WorkerCard
                key={worker.id}
                worker={worker}
                caseId={workCase.id}
                addresses={getAddresses(worker.id)}
                canEdit={canEdit}
                onToggleExpand={() => toggleCard(worker.id)}
                onAddAddress={onAddAddress}
                onRemoveAddress={onRemoveAddress}
                onEditAddress={onEditAddress}
                onSwapAddress={onSwapAddress}
                allWorkers={workers}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Все карточки свёрнуты. Разверните из панели ниже ↓</div>
        )}
      </div>

      {/* Collapsed panel — compact strip at bottom */}
      {workers.filter(w => !expandedCards[w.id]).length > 0 && (
        <div className="flex-shrink-0 border-t px-3 md:px-5 py-2" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium uppercase tracking-wider flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>Свёрнуто ({workers.filter(w => !expandedCards[w.id]).length}):</span>
            <div className="flex-1 flex items-center gap-1.5 overflow-x-auto">
              {workers.filter(w => !expandedCards[w.id]).map(worker => {
                const addrCount = getAddresses(worker.id).length;
                return (
                  <button
                    key={worker.id}
                    onClick={() => toggleCard(worker.id)}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all hover:scale-[1.03] active:scale-[0.97] flex-shrink-0"
                    style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}
                    title={worker.name}
                  >
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-semibold" style={{ background: addrCount > 0 ? 'var(--success)' : 'var(--accent)' }}>
                      {worker.initials}
                    </div>
                    <span className="text-[10px] font-medium truncate max-w-[80px]" style={{ color: 'var(--text-primary)' }}>{worker.name.split(' ')[0]}</span>
                    {addrCount > 0 && (
                      <span className="text-[9px] font-bold px-1 py-0.5 rounded-full flex-shrink-0" style={{ background: 'var(--input-bg)', color: 'var(--accent)' }}>{addrCount}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ==================== Main WorkView ==================== */
export const WorkView = (props: WorkViewProps) => {
  const { activeCase, workCases, onCreateCase, formatDateDMY, ...rest } = props;
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);

  if (activeCase) {
    return <CaseDetail workCase={activeCase} onBack={() => {}} formatDateDMY={formatDateDMY} workers={rest.workers} {...rest} />;
  }

  const safeWorkCases = Array.isArray(workCases) ? workCases : [];
  if (selectedCaseId) {
    const selected = safeWorkCases.find(c => c.id === selectedCaseId);
    if (selected) {
      return <CaseDetail workCase={selected} onBack={() => setSelectedCaseId(null)} formatDateDMY={formatDateDMY} workers={rest.workers} {...rest} />;
    }
    setSelectedCaseId(null);
  }

  return <CaseListPanel cases={safeWorkCases} formatDate={formatDateDMY} onCreate={onCreateCase} onSelect={setSelectedCaseId} />;
};
