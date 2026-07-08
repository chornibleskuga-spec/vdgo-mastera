import { useCallback, useState, useEffect } from 'react';
import { useFirebaseSync } from '@/hooks/useFirebaseSync';
import type { WorkCase, KpiCase, Note, NoteStatus, TimesheetEntry, TimesheetRecord, CashRegister, DispatcherRecord, StoredExcelFile } from '@/types';

// xlsx export disabled (package not installed)
function xlsxNotAvailable() { alert('Excel export недоступен'); }

interface User {
  username: string;
  password: string;
  name: string;
}

const USERS_KEY = 'vdgo_users_v1';
const SESSION_KEY = 'vdgo_session';
const THEME_KEY = 'vdgo_theme';

function getDefaultUsers(): User[] {
  return [
    { username: 'mulenkov_md', password: '111qqqAAA', name: 'Муленков М.Д.' },
    { username: 'lipchanskii_as', password: '111qqqAAA', name: 'Липчанский А.С.' },
    { username: 'mulenkov_dv', password: '111qqqAAA', name: 'Муленков Д.В.' },
  ];
}

function loadUsers(): User[] {
  try { const raw = localStorage.getItem(USERS_KEY); if (raw) return JSON.parse(raw); } catch { /* ignore */ }
  const defaults = getDefaultUsers();
  localStorage.setItem(USERS_KEY, JSON.stringify(defaults));
  return defaults;
}

function saveUsers(users: User[]) { localStorage.setItem(USERS_KEY, JSON.stringify(users)); }
function getSession(): string | null { return localStorage.getItem(SESSION_KEY); }
function setSession(username: string) { localStorage.setItem(SESSION_KEY, username); }
function clearSession() { localStorage.removeItem(SESSION_KEY); }

export const WORKERS = [
  { id: 'w01', name: 'Анисимов', initials: 'АН' },
  { id: 'w02', name: 'Бастеев', initials: 'БС' },
  { id: 'w04', name: 'Белоусов', initials: 'БЛ' },
  { id: 'w05', name: 'Белолипецкий', initials: 'БЛП' },
  { id: 'w03', name: 'Бочкарев', initials: 'БЧ' },
  { id: 'w06', name: 'Ершов', initials: 'ЕР' },
  { id: 'w07', name: 'Китаев', initials: 'КТ' },
  { id: 'w08', name: 'Клопов', initials: 'КЛ' },
  { id: 'w09', name: 'Кувакин', initials: 'КВ' },
  { id: 'w10', name: 'Липчанский', initials: 'ЛП' },
  { id: 'w11', name: 'Лукьяненко', initials: 'ЛК' },
  { id: 'w12', name: 'Нерозников', initials: 'НР' },
  { id: 'w19', name: 'Овчинников', initials: 'ОВ' },
  { id: 'w13', name: 'Романенко', initials: 'РМ' },
  { id: 'w14', name: 'Севастьянов', initials: 'СВ' },
  { id: 'w15', name: 'Соловьев', initials: 'СЛ' },
  { id: 'w16', name: 'Тюрин', initials: 'ТР' },
  { id: 'w17', name: 'Усов', initials: 'УС' },
  { id: 'w18', name: 'Шибанов', initials: 'ШБ' },
];

const CASH_REGISTERS_KEY = 'vdgo_cash_registers_v1';

const DEFAULT_CASH_REGISTERS: CashRegister[] = [
  { id: 1,  code: 'БП-00028451', name: 'Касса ККТ "aQsi-5Ф"', inv: 'БП-00002598', workerId: null, status: 'В работе' },
  { id: 2,  code: 'БП-00028452', name: 'Касса ККТ "aQsi-5Ф"', inv: 'БП-00002599', workerId: null, status: 'В работе' },
  { id: 3,  code: 'БП-00028454', name: 'Касса ККТ "aQsi-5Ф"', inv: 'БП-00002601', workerId: null, status: 'В работе' },
  { id: 4,  code: 'БП-00028455', name: 'Касса ККТ "aQsi-5Ф"', inv: 'БП-00002602', workerId: null, status: 'В работе' },
  { id: 5,  code: 'БП-00028457', name: 'Касса ККТ "aQsi-5Ф"', inv: 'БП-00002604', workerId: null, status: 'В работе' },
  { id: 6,  code: 'БП-00028458', name: 'Касса ККТ "aQsi-5Ф"', inv: 'БП-00002605', workerId: null, status: 'В работе' },
  { id: 7,  code: 'БП-00028459', name: 'Касса ККТ "aQsi-5Ф"', inv: 'БП-00002606', workerId: null, status: 'В работе' },
  { id: 8,  code: 'БП-00028461', name: 'Касса ККТ "aQsi-5Ф"', inv: 'БП-00002608', workerId: null, status: 'В работе' },
  { id: 9,  code: 'БП-00028462', name: 'Касса ККТ "aQsi-5Ф"', inv: 'БП-00002609', workerId: null, status: 'В работе' },
  { id: 10, code: 'БП-00028463', name: 'Касса ККТ "aQsi-5Ф"', inv: 'БП-00002610', workerId: null, status: 'В работе' },
  { id: 11, code: 'БП-00028464', name: 'Касса ККТ "aQsi-5Ф"', inv: 'БП-00002611', workerId: null, status: 'В работе' },
  { id: 12, code: 'БП-00028465', name: 'Касса ККТ "aQsi-5Ф"', inv: 'БП-00002612', workerId: null, status: 'В работе' },
  { id: 13, code: 'БП-00028535', name: 'Касса ККТ "aQsi-5Ф"', inv: 'БП-00004100', workerId: null, status: 'В работе' },
  { id: 14, code: 'БП-00028537', name: 'Касса ККТ "aQsi-5Ф"', inv: 'БП-00004102', workerId: null, status: 'В работе' },
  { id: 15, code: 'БП-00028538', name: 'Касса ККТ "aQsi-5Ф"', inv: 'БП-00004103', workerId: null, status: 'В работе' },
  { id: 16, code: 'БП-00028541', name: 'Касса ККТ "aQsi-5Ф"', inv: 'БП-00004106', workerId: null, status: 'В работе' },
  { id: 17, code: 'БП-00028542', name: 'Касса ККТ "aQsi-5Ф"', inv: 'БП-00004107', workerId: null, status: 'В работе' },
  { id: 18, code: 'БП-00028543', name: 'Касса ККТ "aQsi-5Ф"', inv: 'БП-00004109', workerId: null, status: 'В работе' },
  { id: 19, code: 'БП-00028544', name: 'Касса ККТ "aQsi-5Ф"', inv: 'БП-00004110', workerId: null, status: 'В работе' },
];

function loadCashRegisters(): CashRegister[] {
  try { const raw = localStorage.getItem(CASH_REGISTERS_KEY); if (raw) return JSON.parse(raw); } catch { /* ignore */ }
  localStorage.setItem(CASH_REGISTERS_KEY, JSON.stringify(DEFAULT_CASH_REGISTERS));
  return DEFAULT_CASH_REGISTERS;
}

export function useStore() {
  const [users, setUsers] = useState<User[]>(loadUsers);
  const [currentUser, setCurrentUser] = useState<string | null>(getSession);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try { const saved = localStorage.getItem(THEME_KEY); if (saved === 'light' || saved === 'dark') return saved; } catch { /* ignore */ }
    return 'dark';
  });

  // Data states
  const [localCases, setLocalCases] = useState<WorkCase[]>([]);
  const [localNotes, setLocalNotes] = useState<Note[]>([]);
  const [localKpiCases, setLocalKpiCases] = useState<KpiCase[]>([]);
  // Timestamp-based KPI session: { "workerId_day": { value: "5", ts: 1699012345678 } }
  const [localKpiSession, setLocalKpiSession] = useState<Record<string, { value: string; ts: number }>>(() => {
    try { const raw = localStorage.getItem('vdgo_kpiSession'); if (raw) return JSON.parse(raw); } catch { /* */ }
    return {};
  });
  const [kpiSessionId, setKpiSessionId] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'connecting' | 'online' | 'offline'>('connecting');
  const [duties, setDuties] = useState<Array<{ workerId: string; dayType: string; weekNum: number }>>([]);
  const [notHomeEntries, setNotHomeEntries] = useState<Array<{ id: number; address: string; createdAt: number; timerEndAt: number }>>(() => {
    try { const raw = localStorage.getItem('vdgo_not_home'); if (raw) return JSON.parse(raw); } catch { /* */ }
    return [];
  });
  const [localTimesheets, setLocalTimesheets] = useState<TimesheetRecord[]>(() => {
    try { const raw = localStorage.getItem('vdgo_timesheets'); if (raw) return JSON.parse(raw); } catch { /* ignore */ }
    return [];
  });
  const [excelFiles, setExcelFiles] = useState<StoredExcelFile[]>(() => {
    try { const raw = localStorage.getItem('vdgo_excel_files'); if (raw) return JSON.parse(raw); } catch { /* ignore */ }
    return [];
  });
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>(loadCashRegisters);
  const [dispatcherData, setDispatcherData] = useState<DispatcherRecord[]>(() => {
    try {
      const raw = localStorage.getItem('vdgo_dispatcher');
      if (raw) {
        const parsed = JSON.parse(raw);
        // Handle old object format { "date": [...] } → migrate to flat array
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          const result: DispatcherRecord[] = [];
          for (const date of Object.keys(parsed)) {
            const arr = parsed[date];
            if (Array.isArray(arr)) result.push(...arr);
          }
          // Save migrated format immediately
          localStorage.setItem('vdgo_dispatcher', JSON.stringify(result));
          return result;
        }
        if (Array.isArray(parsed)) return parsed;
      }
    } catch { /* ignore */ }
    return [];
  });

  // ========== LOAD DATA (localStorage) ==========
  const loadFromStorage = useCallback(() => {
    try {
      const casesRaw = localStorage.getItem('vdgo_cases');
      if (casesRaw) { try { const parsed = JSON.parse(casesRaw); if (Array.isArray(parsed)) setLocalCases(parsed); else { console.warn('[Store] vdgo_cases is not array, resetting'); setLocalCases([]); localStorage.setItem('vdgo_cases', '[]'); } } catch { setLocalCases([]); } }
      const notesRaw = localStorage.getItem('vdgo_notes');
      if (notesRaw) { try { setLocalNotes(JSON.parse(notesRaw)); } catch { /* ignore */ } }
      const kpiRaw = localStorage.getItem('vdgo_kpiCases');
      if (kpiRaw) { try { setLocalKpiCases(JSON.parse(kpiRaw)); } catch { /* ignore */ } }
      const sessionRaw = localStorage.getItem('vdgo_kpiSession');
      if (sessionRaw) { try { setLocalKpiSession(JSON.parse(sessionRaw)); } catch { /* ignore */ } }
      const sessionIdRaw = localStorage.getItem('vdgo_kpiSessionId');
      if (sessionIdRaw) { try { setKpiSessionId(JSON.parse(sessionIdRaw)); } catch { /* ignore */ } }
      const dutiesRaw = localStorage.getItem('vdgo_duties');
      if (dutiesRaw) { try { setDuties(JSON.parse(dutiesRaw)); } catch { /* ignore */ } }
    } catch (err) {
      console.error('Load error:', err);
    }
  }, []);

  // ========== AUTO-SYNC: Save to localStorage + Supabase ==========
  const autoSave = useCallback((key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
    try {
      const tableMap: Record<string, string> = {
        'vdgo_cases': 'work_cases',
        'vdgo_notes': 'notes',
        'vdgo_kpiCases': 'kpi_cases',
        'vdgo_kpiSession': 'kpi_session_entries',
        'vdgo_duties': 'kpi_duties',
      };
      // Supabase disabled — corporate firewall blocks it
    } catch { /* ignore */ }
  }, []);

  // ========== INITIAL LOAD ==========
  useEffect(() => {
    loadFromStorage();
    setIsLoading(false);
    setSyncStatus('offline');
  }, [loadFromStorage]);

  // ========== POLLING SYNC ==========
  useEffect(() => {
    if (!kpiSessionId) return;
    let pollCount = 0;
    // Supabase polling disabled — corporate firewall blocks it. Firebase sync handles all data.
  }, [kpiSessionId]);

  // ========== P2P SYNC ==========
  // handleP2PData — handles ALL incoming sync data from Firebase
  const handleP2PData = useCallback((type: string, data: any) => {
    try {
      switch (type) {
        case 'cases': {
          if (Array.isArray(data)) { setLocalCases(data); localStorage.setItem('vdgo_cases', JSON.stringify(data)); }
          break;
        }
        case 'notes': {
          setLocalNotes(data);
          localStorage.setItem('vdgo_notes', JSON.stringify(data));
          break;
        }
        case 'kpi': {
          setLocalKpiSession(data);
          localStorage.setItem('vdgo_kpiSession', JSON.stringify(data));
          break;
        }
        case 'kpiCases': {
          setLocalKpiCases(data);
          localStorage.setItem('vdgo_kpiCases', JSON.stringify(data));
          break;
        }
        case 'duties': {
          setDuties(data);
          localStorage.setItem('vdgo_duties', JSON.stringify(data));
          break;
        }
        case 'cash': {
          setCashRegisters(data);
          localStorage.setItem(CASH_REGISTERS_KEY, JSON.stringify(data));
          break;
        }
        case 'timesheets': {
          setLocalTimesheets(data);
          localStorage.setItem('vdgo_timesheets', JSON.stringify(data));
          break;
        }
        case 'dispatcher': {
          setDispatcherData(data);
          localStorage.setItem('vdgo_dispatcher', JSON.stringify(data));
          break;
        }
        case 'excelFiles': {
          setExcelFiles(data);
          localStorage.setItem('vdgo_excel_files', JSON.stringify(data));
          break;
        }
        case 'notHome': {
          setNotHomeEntries(data);
          localStorage.setItem('vdgo_not_home', JSON.stringify(data));
          break;
        }
        case 'theme': {
          if (data === 'light' || data === 'dark') {
            setTheme(data);
            localStorage.setItem(THEME_KEY, data);
          }
          break;
        }
        default:
          break;
      }
    } catch (err) {
      console.error('[Sync] handle data error:', err);
    }
  }, []);

  // P2P disabled — corporate firewall blocks PeerJS. Firebase REST sync only.

  // Firebase sync — single shared database for all users (no rooms)
  const fbSync = useFirebaseSync(handleP2PData);

  // Helper to broadcast data change to peers (Firebase REST only — P2P disabled)
  // IMMEDIATE push to Firebase — no delay, no throttle
  // fire-and-forget, UI never blocks
  const broadcast = useCallback((type: string, data: any) => {
    try { fbSync.pushData(); } catch { /* ignore */ }
  }, [fbSync.pushData]);

  // ========== DUTIES ==========
  // ========== NOT HOME ==========
  const addNotHomeEntry = useCallback((address: string) => {
    const newEntry = { id: Date.now(), address, createdAt: Date.now(), timerEndAt: Date.now() + 60000 };
    setNotHomeEntries(prev => {
      const updated = [newEntry, ...prev];
      localStorage.setItem('vdgo_not_home', JSON.stringify(updated));
      return updated;
    });
    broadcast('notHome', [newEntry, ...notHomeEntries]);
  }, [notHomeEntries, broadcast]);

  const removeNotHomeEntry = useCallback((id: number) => {
    setNotHomeEntries(prev => {
      const updated = prev.filter(e => e.id !== id);
      localStorage.setItem('vdgo_not_home', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const toggleDuty = useCallback((input: { month: number; year: number; workerId: string; dayType: "saturday" | "sunday" }) => {
    window.dispatchEvent(new CustomEvent('vdgo_data_changed'));
    const existingDuty = duties.find(d => d.workerId === input.workerId);
    let updated;
    if (existingDuty) {
      if (existingDuty.dayType === input.dayType) {
        updated = duties.filter(d => d.workerId !== input.workerId);
      } else {
        updated = duties.map(d => d.workerId === input.workerId ? { ...d, dayType: input.dayType } : d);
      }
    } else {
      updated = [...duties, { workerId: input.workerId, dayType: input.dayType, weekNum: 1 }];
    }
    setDuties(updated);
    localStorage.setItem('vdgo_duties', JSON.stringify(updated));
    broadcast('duties', updated);
    // Double-push for reliability
    setTimeout(() => { try { fbSync.pushData(); } catch { /* */ } }, 100);
  }, [duties, broadcast, fbSync.pushData]);

  const clearDuties = useCallback((input: { month: number; year: number }) => {
    if (confirm('Очистить все дежурства за ' + input.month + '.' + input.year + '?')) {
      setDuties([]);
      localStorage.setItem('vdgo_duties', '[]');
      broadcast('duties', []);
    }
  }, [broadcast]);

  // ========== CASH REGISTERS ==========
  const updateCashRegister = useCallback((id: number, updates: Partial<CashRegister>) => {
    window.dispatchEvent(new CustomEvent('vdgo_data_changed'));
    const updated = cashRegisters.map(cr => cr.id === id ? { ...cr, ...updates } : cr);
    setCashRegisters(updated);
    localStorage.setItem(CASH_REGISTERS_KEY, JSON.stringify(updated));
    broadcast('cash', updated);
  }, [cashRegisters, broadcast]);

  const assignCashRegister = useCallback((id: number, workerId: string | null) => {
    updateCashRegister(id, { workerId });
  }, [updateCashRegister]);

  const setCashRegisterStatus = useCallback((id: number, status: CashRegister['status']) => {
    updateCashRegister(id, { status });
  }, [updateCashRegister]);

  // ========== AUTH ==========
  const login = useCallback((username: string, password: string): boolean => {
    const u = users.find(u => u.username === username && u.password === password);
    if (u) { setCurrentUser(username); setSession(username); return true; }
    return false;
  }, [users]);

  const logout = useCallback(() => { setCurrentUser(null); clearSession(); }, []);
  const changePassword = useCallback((username: string, newPassword: string) => {
    setUsers(prev => { const updated = prev.map(u => u.username === username ? { ...u, password: newPassword } : u); saveUsers(updated); return updated; });
  }, []);
  const getUserName = useCallback(() => {
    if (!currentUser) return '';
    return users.find(u => u.username === currentUser)?.name || currentUser;
  }, [currentUser, users]);
  const toggleTheme = useCallback(() => {
    setTheme(prev => { const next = prev === 'dark' ? 'light' : 'dark'; localStorage.setItem(THEME_KEY, next); return next; });
  }, []);

  // ========== WORK CASES ==========
  const createCase = useCallback((date: string) => {
    const safeCases = Array.isArray(localCases) ? localCases : [];
    const now = Date.now();
    const newCase: WorkCase = { id: now, date, status: 'active', assignments: [], createdAt: now, updatedAt: now };
    const updated = [newCase, ...safeCases];
    setLocalCases(updated);
    localStorage.setItem('vdgo_cases', JSON.stringify(updated));
    broadcast('cases', updated);
    return newCase.id;
  }, [localCases, broadcast]);

  const saveCase = useCallback((caseId: number) => {
    const updated = localCases.map(c => c.id === caseId ? { ...c, status: 'saved' as const } : c);
    setLocalCases(updated);
    localStorage.setItem('vdgo_cases', JSON.stringify(updated));
    broadcast('cases', updated);
  }, [localCases, broadcast]);

  const closeCase = useCallback((caseId: number) => {
    const updated = localCases.map(c => c.id === caseId ? { ...c, status: 'closed' as const } : c);
    setLocalCases(updated);
    localStorage.setItem('vdgo_cases', JSON.stringify(updated));
    broadcast('cases', updated);
  }, [localCases, broadcast]);

  const deleteCase = useCallback((caseId: number) => {
    window.dispatchEvent(new CustomEvent('vdgo_data_changed'));
    localStorage.setItem('_vdgo_deleting', Date.now().toString());
    const deletedIds = JSON.parse(localStorage.getItem('vdgo_deleted_ids') || '[]');
    deletedIds.push({ id: String(caseId), deletedAt: Date.now() });
    localStorage.setItem('vdgo_deleted_ids', JSON.stringify(deletedIds));
    const updated = localCases.filter(c => c.id !== caseId);
    setLocalCases(updated);
    localStorage.setItem('vdgo_cases', JSON.stringify(updated));
    broadcast('cases', updated);
    try { fbSync.pushData(); } catch { /* */ }
  }, [localCases, broadcast, fbSync.pushData]);

  const addAddress = useCallback(async (caseId: number, workerId: string, street: string, house: string, apartment: string) => {
    window.dispatchEvent(new CustomEvent('vdgo_data_changed'));
    const now = Date.now();
    setLocalCases(prev => {
      const next = prev.map(cs => {
        if (cs.id !== caseId) return cs;
        const assignment = cs.assignments.find(a => a.workerId === workerId);
        if (!assignment) {
          const newAssignmentId = now + Math.random();
          return { ...cs, updatedAt: now, assignments: [...cs.assignments, { id: newAssignmentId, caseId, workerId, addresses: [{ id: now, assignmentId: newAssignmentId, street, house, apartment, orderNum: 1 }] }] };
        }
        const existingCount = assignment.addresses.length;
        return { ...cs, updatedAt: now, assignments: cs.assignments.map(a => a.id !== assignment.id ? a : { ...a, addresses: [...a.addresses, { id: now, assignmentId: a.id, street, house, apartment, orderNum: existingCount + 1 }] }) };
      });
      localStorage.setItem('vdgo_cases', JSON.stringify(next));
      return next;
    });
    setTimeout(() => {
      try {
        const fresh = localStorage.getItem('vdgo_cases');
        if (fresh) broadcast('cases', JSON.parse(fresh));
      } catch { /* */ }
    }, 50);
    setTimeout(() => { try { fbSync.pushData(); } catch { /* */ } }, 100);
  }, [broadcast, fbSync.pushData]);

  const removeAddress = useCallback(async (caseId: number, addressId: number) => {
    window.dispatchEvent(new CustomEvent('vdgo_data_changed'));
    localStorage.setItem('_vdgo_deleting', Date.now().toString());
    const now = Date.now();
    setLocalCases(prev => prev.map(cs => cs.id !== caseId ? cs : { ...cs, updatedAt: now, assignments: cs.assignments.map(a => ({ ...a, addresses: a.addresses.filter(ad => ad.id !== addressId) })).filter(a => a.addresses.length > 0) }));
    setTimeout(() => {
      try {
        const fresh = localStorage.getItem('vdgo_cases');
        if (fresh) broadcast('cases', JSON.parse(fresh));
      } catch { /* */ }
    }, 50);
    setTimeout(() => {
      try {
        const fresh = localStorage.getItem('vdgo_cases');
        if (fresh) broadcast('cases', JSON.parse(fresh));
      } catch { /* */ }
    }, 200);
    setTimeout(() => { try { fbSync.pushData(); } catch { /* */ } }, 300);
  }, [broadcast, fbSync.pushData]);

  const editAddress = useCallback(async (caseId: number, addressId: number, street: string, house: string, apartment: string) => {
    window.dispatchEvent(new CustomEvent('vdgo_data_changed'));
    const now = Date.now();
    setLocalCases(prev => prev.map(cs => cs.id !== caseId ? cs : { ...cs, updatedAt: now, assignments: cs.assignments.map(a => ({ ...a, addresses: a.addresses.map(ad => ad.id === addressId ? { ...ad, street, house, apartment } : ad) })) }));
    setTimeout(() => {
      try {
        const fresh = localStorage.getItem('vdgo_cases');
        if (fresh) broadcast('cases', JSON.parse(fresh));
      } catch { /* */ }
    }, 50);
    setTimeout(() => {
      try {
        const fresh = localStorage.getItem('vdgo_cases');
        if (fresh) broadcast('cases', JSON.parse(fresh));
      } catch { /* */ }
    }, 200);
    setTimeout(() => { try { fbSync.pushData(); } catch { /* */ } }, 300);
  }, [broadcast, fbSync.pushData]);

  const swapAddress = useCallback((caseId: number, addressId: number, toWorkerId: string) => {
    window.dispatchEvent(new CustomEvent('vdgo_data_changed'));
    const now = Date.now();
    setLocalCases(prev => {
      const cs = prev.find(c => c.id === caseId);
      if (!cs) return prev;
      let movingAddr: any = null;
      let sourceAssignmentId: number | null = null;
      for (const a of cs.assignments) { const addr = a.addresses.find(ad => ad.id === addressId); if (addr) { movingAddr = addr; sourceAssignmentId = a.id; break; } }
      if (!movingAddr) return prev;
      let targetAssignment = cs.assignments.find(a => a.workerId === toWorkerId);
      if (!targetAssignment) {
        const newAssignmentId = now + Math.random();
        return prev.map(c => c.id !== caseId ? c : { ...c, updatedAt: now, assignments: [...c.assignments.filter(a => a.id !== sourceAssignmentId).map(a => ({ ...a, addresses: a.addresses.filter(ad => ad.id !== addressId) })), { id: newAssignmentId, caseId, workerId: toWorkerId, addresses: [{ ...movingAddr, assignmentId: newAssignmentId }] }].filter(a => a.addresses.length > 0) });
      }
      return prev.map(c => c.id !== caseId ? c : { ...c, updatedAt: now, assignments: c.assignments.map(a => { if (a.id === sourceAssignmentId) return { ...a, addresses: a.addresses.filter(ad => ad.id !== addressId) }; if (a.id === targetAssignment!.id) return { ...a, addresses: [...a.addresses, { ...movingAddr, assignmentId: targetAssignment!.id }] }; return a; }).filter(a => a.addresses.length > 0 || a.id === sourceAssignmentId) });
    });
    setTimeout(() => {
      try {
        const fresh = localStorage.getItem('vdgo_cases');
        if (fresh) broadcast('cases', JSON.parse(fresh));
      } catch { /* */ }
    }, 50);
    setTimeout(() => {
      try {
        const fresh = localStorage.getItem('vdgo_cases');
        if (fresh) broadcast('cases', JSON.parse(fresh));
      } catch { /* */ }
    }, 200);
    setTimeout(() => { try { fbSync.pushData(); } catch { /* */ } }, 300);
  }, [broadcast, fbSync.pushData]);

  // ========== KPI ==========
  // Timestamp-based: { "workerId_day": { value: "5", ts: 1699012345678 } }
  const activeKpiSession = {
    id: kpiSessionId,
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    status: 'active',
    entries: Object.entries(localKpiSession).map(([key, data]) => {
      const [workerId, day] = key.split('_');
      return { workerId, day: parseInt(day, 10), value: data.value, ts: data.ts };
    }),
  };

  const upsertKpiEntry = useCallback((_sessionId: number, workerId: string, day: number, value: string) => {
    const ts = Date.now();
    const updated = { ...localKpiSession, [`${workerId}_${day}`]: { value, ts } };
    setLocalKpiSession(updated);
    localStorage.setItem('vdgo_kpiSession', JSON.stringify(updated));
    broadcast('kpi', updated);
    window.dispatchEvent(new CustomEvent('vdgo_data_changed'));
  }, [localKpiSession, broadcast]);

  const deleteKpiEntry = useCallback(async (_sessionId: number, workerId: string, day: number) => {
    window.dispatchEvent(new CustomEvent('vdgo_data_changed'));
    const key = `${workerId}_${day}`;
    
    // Remove from local session
    setLocalKpiSession(prev => { 
      const n = { ...prev }; 
      delete n[key]; 
      localStorage.setItem('vdgo_kpiSession', JSON.stringify(n)); 
      return n; 
    });
    
    setTimeout(() => {
      try {
        const fresh = localStorage.getItem('vdgo_kpiSession');
        if (fresh) broadcast('kpi', JSON.parse(fresh));
      } catch { /* */ }
    }, 50);
    try { fbSync.pushData(); } catch { /* */ }
  }, [kpiSessionId, broadcast, fbSync.pushData]);

  const saveKpiSession = useCallback(async (_sessionId: number, month: number, year: number) => {
    const entries = Object.entries(localKpiSession)
      .map(([key, data], idx) => {
        const [workerId, day] = key.split('_');
        return { id: idx + 1, kpiCaseId: 0, workerId, day: parseInt(day, 10), value: data.value, ts: data.ts };
      })
      .filter(e => e.value.trim() !== '');
    const newCase: KpiCase = { id: Date.now(), month, year, label: `${month}.${year}`, entries, savedAt: new Date() };
    setLocalKpiCases(prev => [newCase, ...prev]);
    setLocalKpiSession({});
    localStorage.setItem('vdgo_kpiCases', JSON.stringify([newCase, ...localKpiCases]));
    localStorage.setItem('vdgo_kpiSession', '{}');
    broadcast('kpiCases', [newCase, ...localKpiCases]);
    broadcast('kpi', {});
  }, [localKpiSession, localKpiCases, kpiSessionId, broadcast]);

  const deleteKpiCase = useCallback(async (id: number) => {
    window.dispatchEvent(new CustomEvent('vdgo_data_changed'));
    localStorage.setItem('_vdgo_deleting', Date.now().toString());
    const deletedIds = JSON.parse(localStorage.getItem('vdgo_deleted_ids') || '[]');
    deletedIds.push({ id: String(id), deletedAt: Date.now() });
    localStorage.setItem('vdgo_deleted_ids', JSON.stringify(deletedIds));
    setLocalKpiCases(prev => {
      const updated = prev.filter(c => c.id !== id);
      localStorage.setItem('vdgo_kpiCases', JSON.stringify(updated));
      setTimeout(() => broadcast('kpiCases', updated), 50);
      return updated;
    });
    try { fbSync.pushData(); } catch { /* */ }
  }, [broadcast, fbSync.pushData]);

  // ========== TIMESHEET ==========
  const saveTimesheet = useCallback((month: number, year: number, entries: TimesheetEntry[]) => {
    const newRecord: TimesheetRecord = { id: Date.now(), month, year, entries, savedAt: new Date() };
    setLocalTimesheets(prev => {
      const filtered = prev.filter(r => !(r.month === month && r.year === year));
      const updated = [newRecord, ...filtered];
      localStorage.setItem('vdgo_timesheets', JSON.stringify(updated));
      broadcast('timesheets', updated);
      return updated;
    });
  }, [broadcast]);

  const deleteTimesheet = useCallback((id: number) => {
    window.dispatchEvent(new CustomEvent('vdgo_data_changed'));
    localStorage.setItem('_vdgo_deleting', Date.now().toString());
    const deletedIds = JSON.parse(localStorage.getItem('vdgo_deleted_ids') || '[]');
    deletedIds.push({ id: String(id), deletedAt: Date.now() });
    localStorage.setItem('vdgo_deleted_ids', JSON.stringify(deletedIds));
    setLocalTimesheets(prev => {
      const updated = prev.filter(r => r.id !== id);
      localStorage.setItem('vdgo_timesheets', JSON.stringify(updated));
      broadcast('timesheets', updated);
      return updated;
    });
    try { fbSync.pushData(); } catch { /* */ }
  }, [broadcast, fbSync.pushData]);

  const uploadExcelFile = useCallback((file: Omit<StoredExcelFile, 'id' | 'uploadedAt'>) => {
    window.dispatchEvent(new CustomEvent('vdgo_data_changed'));
    const newFile: StoredExcelFile = { ...file, id: Date.now(), uploadedAt: Date.now() };
    setExcelFiles(prev => {
      const updated = [...prev, newFile];
      localStorage.setItem('vdgo_excel_files', JSON.stringify(updated));
      broadcast('excelFiles', updated);
      return updated;
    });
    try { fbSync.pushData(); } catch { /* */ }
  }, [broadcast, fbSync.pushData]);

  const deleteExcelFile = useCallback((id: number) => {
    window.dispatchEvent(new CustomEvent('vdgo_data_changed'));
    localStorage.setItem('_vdgo_deleting', Date.now().toString());
    const deletedIds = JSON.parse(localStorage.getItem('vdgo_deleted_ids') || '[]');
    deletedIds.push({ id: String(id), deletedAt: Date.now() });
    localStorage.setItem('vdgo_deleted_ids', JSON.stringify(deletedIds));
    setExcelFiles(prev => {
      const updated = prev.filter(f => f.id !== id);
      localStorage.setItem('vdgo_excel_files', JSON.stringify(updated));
      broadcast('excelFiles', updated);
      return updated;
    });
    try { fbSync.pushData(); } catch { /* */ }
  }, [broadcast, fbSync.pushData]);

  const saveDispatcher = useCallback((records: DispatcherRecord[]) => {
    window.dispatchEvent(new CustomEvent('vdgo_data_changed'));
    setDispatcherData(prev => {
      const safePrev = Array.isArray(prev) ? prev : [];
      const keysToReplace = new Set(records.map(r => `${r.date}:${r.workerName}`));
      const kept = safePrev.filter(p => !keysToReplace.has(`${p.date}:${p.workerName}`));
      const merged = [...kept, ...records];
      localStorage.setItem('vdgo_dispatcher', JSON.stringify(merged));
      broadcast('dispatcher', merged);
      return merged;
    });
    try { fbSync.pushData(); } catch { /* */ }
  }, [broadcast, fbSync.pushData]);

  const deleteDispatcher = useCallback((ids: string[]) => {
    window.dispatchEvent(new CustomEvent('vdgo_data_changed'));
    localStorage.setItem('_vdgo_deleting', Date.now().toString());
    // Track deleted IDs for merge filtering
    const deletedIds = JSON.parse(localStorage.getItem('vdgo_deleted_ids') || '[]');
    for (const id of ids) deletedIds.push({ id, deletedAt: Date.now() });
    localStorage.setItem('vdgo_deleted_ids', JSON.stringify(deletedIds));
    setDispatcherData(prev => {
      const safePrev = Array.isArray(prev) ? prev : [];
      const idSet = new Set(ids);
      const updated = safePrev.filter(r => !idSet.has(r.id));
      localStorage.setItem('vdgo_dispatcher', JSON.stringify(updated));
      broadcast('dispatcher', updated);
      return updated;
    });
    try { fbSync.pushData(); } catch { /* */ }
  }, [broadcast, fbSync.pushData]);

  const exportTimesheetToExcel = useCallback(async (_month: number, _year: number, _workersList: { id: string; name: string }[], _entries: TimesheetEntry[]) => {
    xlsxNotAvailable(); return; // disabled
  }, []);

  // ========== NOTES ==========
  const createNote = useCallback(async (text: string) => {
    const newNote: Note = { id: Date.now(), date: new Date().toISOString().split('T')[0], text, status: 'Не решен', createdAt: new Date() };
    setLocalNotes(prev => {
      const updated = [newNote, ...prev];
      localStorage.setItem('vdgo_notes', JSON.stringify(updated));
      broadcast('notes', updated);
      return updated;
    });
  }, [broadcast]);

  const updateNoteStatus = useCallback((id: number, status: NoteStatus) => {
    window.dispatchEvent(new CustomEvent('vdgo_data_changed'));
    setLocalNotes(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, status } : n);
      localStorage.setItem('vdgo_notes', JSON.stringify(updated));
      broadcast('notes', updated);
      return updated;
    });
  }, [broadcast]);

  const deleteNote = useCallback(async (id: number) => {
    window.dispatchEvent(new CustomEvent('vdgo_data_changed'));
    localStorage.setItem('_vdgo_deleting', Date.now().toString());
    const deletedIds = JSON.parse(localStorage.getItem('vdgo_deleted_ids') || '[]');
    deletedIds.push({ id: String(id), deletedAt: Date.now() });
    localStorage.setItem('vdgo_deleted_ids', JSON.stringify(deletedIds));
    setLocalNotes(prev => {
      const updated = prev.filter(n => n.id !== id);
      localStorage.setItem('vdgo_notes', JSON.stringify(updated));
      broadcast('notes', updated);
      return updated;
    });
    try { fbSync.pushData(); } catch { /* */ }
  }, [broadcast, fbSync.pushData]);

  // ========== EXPORT ==========
  const exportCaseToExcel = useCallback(async (_workCase: WorkCase) => { xlsxNotAvailable(); }, []);
  const exportKpiToExcel = useCallback(async (_kpiCase: KpiCase) => { xlsxNotAvailable(); }, []);

  const exportAllData = useCallback(() => {
    const data = { cases: localCases, notes: localNotes, kpiCases: localKpiCases, kpiSession: localKpiSession, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VDGO_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [localCases, localNotes, localKpiCases, localKpiSession]);

  // ========== SHARE CODE (Level 3 sync - works through any messenger) ==========
  const exportShareCode = useCallback((): string => {
    const data = {
      cases: localCases,
      notes: localNotes,
      kpiCases: localKpiCases,
      kpiSession: localKpiSession,
      duties,
      cashRegisters,
      timesheets: localTimesheets,
      v: 1,
    };
    try {
      const json = JSON.stringify(data);
      return btoa(unescape(encodeURIComponent(json)));
    } catch { return ''; }
  }, [localCases, localNotes, localKpiCases, localKpiSession, duties, cashRegisters, localTimesheets]);

  const importShareCode = useCallback((code: string): boolean => {
    try {
      const json = decodeURIComponent(escape(atob(code)));
      const data = JSON.parse(json);
      if (!data || data.v !== 1) return false;
      if (confirm('Загрузить данные от коллеги? Текущие данные будут дополнены.')) {
        if (data.cases) { setLocalCases(data.cases); localStorage.setItem('vdgo_cases', JSON.stringify(data.cases)); broadcast('cases', data.cases); }
        if (data.notes) { setLocalNotes(data.notes); localStorage.setItem('vdgo_notes', JSON.stringify(data.notes)); broadcast('notes', data.notes); }
        if (data.kpiCases) { setLocalKpiCases(data.kpiCases); localStorage.setItem('vdgo_kpiCases', JSON.stringify(data.kpiCases)); broadcast('kpiCases', data.kpiCases); }
        if (data.kpiSession) { setLocalKpiSession(data.kpiSession); localStorage.setItem('vdgo_kpiSession', JSON.stringify(data.kpiSession)); broadcast('kpi', data.kpiSession); }
        if (data.duties) { setDuties(data.duties); localStorage.setItem('vdgo_duties', JSON.stringify(data.duties)); broadcast('duties', data.duties); }
        if (data.cashRegisters) { setCashRegisters(data.cashRegisters); localStorage.setItem('vdgo_cash_registers_v1', JSON.stringify(data.cashRegisters)); broadcast('cash', data.cashRegisters); }
        if (data.timesheets) { setLocalTimesheets(data.timesheets); localStorage.setItem('vdgo_timesheets', JSON.stringify(data.timesheets)); broadcast('timesheets', data.timesheets); }
        return true;
      }
    } catch (e) { console.error('Import error:', e); }
    return false;
  }, [broadcast]);

  // ========== HELPERS ==========
  const getActiveCase = useCallback(() => localCases.find(c => c.status === 'active') || null, [localCases]);
  const getWorkCases = useCallback(() => (Array.isArray(localCases) ? localCases : []).filter(c => c.status !== 'closed'), [localCases]);
  const getWorkerAddresses = useCallback((caseId: number, workerId: string) => {
    const c = localCases.find(cs => cs.id === caseId); if (!c) return []; const a = c.assignments.find(as => as.workerId === workerId); return a?.addresses ?? [];
  }, [localCases]);
  const searchAllAddresses = useCallback((query: string) => {
    const q = query.toLowerCase().trim(); if (!q) return [];
    // Parse "Гули Корол 2-7" → street="Гули Корол", housePart="2-7"
    let streetQ = q, houseQ = '';
    const lastSpace = q.lastIndexOf(' ');
    if (lastSpace > 0) {
      streetQ = q.substring(0, lastSpace);
      houseQ = q.substring(lastSpace + 1);
    }
    const results: Array<{ address: { id: number; assignmentId: number; street: string; house: string; apartment: string; orderNum: number }; workerName: string; caseDate: string }> = [];
    for (const c of localCases) {
      for (const a of c.assignments) {
        const worker = WORKERS.find(w => w.id === a.workerId);
        for (const addr of a.addresses) {
          const fullAddress = (addr.house + '-' + addr.apartment).toLowerCase();
          const matchStreet = addr.street.toLowerCase().includes(streetQ);
          const matchHouse = !houseQ || addr.house.toLowerCase().includes(houseQ) || fullAddress.includes(houseQ);
          // Also support searching by just house-apt without street (e.g. "2-7")
          const matchFullOnly = !matchStreet && fullAddress.includes(q);
          if ((matchStreet && matchHouse) || matchFullOnly) {
            results.push({ address: { id: addr.id, assignmentId: addr.assignmentId, street: addr.street, house: addr.house, apartment: addr.apartment, orderNum: addr.orderNum }, workerName: worker?.name || a.workerId, caseDate: c.date });
          }
        }
      }
    }
    return results;
  }, [localCases]);
  const formatDateDMY = useCallback((iso: string) => { const d = new Date(iso + 'T00:00:00'); return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }); }, []);
  const getNotesByDate = useCallback((date: string) => localNotes.filter(n => n.date === date), [localNotes]);
  const getDatesWithNotes = useCallback(() => Array.from(new Set(localNotes.map(n => n.date))), [localNotes]);
  const addNote = useCallback((date: string, text: string) => {
    const newNote: Note = { id: Date.now(), date, text, status: 'Не решен', createdAt: new Date() };
    setLocalNotes(prev => {
      const updated = [newNote, ...prev];
      localStorage.setItem('vdgo_notes', JSON.stringify(updated));
      broadcast('notes', updated);
      return updated;
    });
  }, [broadcast]);
  const removeNote = useCallback((id: number) => {
    window.dispatchEvent(new CustomEvent('vdgo_data_changed'));
    localStorage.setItem('_vdgo_deleting', Date.now().toString());
    const deletedIds = JSON.parse(localStorage.getItem('vdgo_deleted_ids') || '[]');
    deletedIds.push({ id: String(id), deletedAt: Date.now() });
    localStorage.setItem('vdgo_deleted_ids', JSON.stringify(deletedIds));
    setLocalNotes(prev => {
      const updated = prev.filter(n => n.id !== id);
      localStorage.setItem('vdgo_notes', JSON.stringify(updated));
      broadcast('notes', updated);
      return updated;
    });
    try { fbSync.pushData(); } catch { /* */ }
  }, [broadcast, fbSync.pushData]);

  // ========== SYNC STATUS ==========
  const p2pStatus = fbSync.status;
  const p2pPeers = fbSync.peerCount;
  const peerNames = fbSync.peerNames || [];
  const syncError = fbSync.errorMessage || '';

  return {
    workers: WORKERS, cases: localCases, notes: localNotes, kpiCases: localKpiCases,
    activeKpiSession, kpiSessionEntries: localKpiSession,
    theme, currentUser, isLoading, syncStatus,
    login, logout, changePassword, getUserName, toggleTheme,
    createCase, saveCase, closeCase, deleteCase,
    addAddress, removeAddress, editAddress, swapAddress,
    createNote, deleteNote, updateNoteStatus,
    upsertKpiEntry, deleteKpiEntry, saveKpiSession, deleteKpiCase,
    toggleDuty, clearDuties, duties,
    cashRegisters, updateCashRegister, assignCashRegister, setCashRegisterStatus,
    exportCaseToExcel, exportKpiToExcel, exportAllData, exportShareCode, importShareCode,
    getActiveCase, getWorkCases, getWorkerAddresses, searchAllAddresses, formatDateDMY,
    getNotesByDate, getDatesWithNotes, addNote, removeNote,
    saveTimesheet, deleteTimesheet, exportTimesheetToExcel,
    dispatcherData, saveDispatcher, deleteDispatcher,
    excelFiles, uploadExcelFile, deleteExcelFile,
    notHomeEntries, addNotHomeEntry, removeNotHomeEntry,
    data: { cases: localCases, kpiCases: localKpiCases, notes: localNotes, timesheets: localTimesheets },
    // P2P / Sync
    p2pStatus, p2pPeers, peerNames, syncError,
  };
}
