import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { ref, onValue, set, onDisconnect } from 'firebase/database';
import { db } from '@/firebase';

const DEVICE_ID = 'vdgo_' + Math.random().toString(36).substring(2, 8);
const ROOM = 'default';

// ===== NATIVE FIREBASE REALTIME SYNC =====
// Uses onValue() for instant (<100ms) data propagation
// No polling, no HTTP requests — pure WebSocket

export function useFirebaseSync(
  onData: (type: string, data: any) => void
) {
  const [status, setStatus] = useState<'offline' | 'connecting' | 'connected' | 'error'>('connecting');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [peerCount, setPeerCount] = useState(0);
  const [peerNames, setPeerNames] = useState<string[]>([]);
  const dataHandlersRef = useRef(onData);
  const lastTimestampRef = useRef<number>(0);
  const destroyedRef = useRef(false);
  const isLocalUpdateRef = useRef(false);
  const pushDataRef = useRef<() => void>(() => {});
  dataHandlersRef.current = onData;

  // References — STABLE, created once via useMemo
  const dataRef = useMemo(() => ref(db, `vdgo_rooms/${ROOM}/data`), []);
  const presenceRef = useMemo(() => ref(db, `vdgo_rooms/${ROOM}/presence/${DEVICE_ID}`), []);
  const presenceRootRef = useMemo(() => ref(db, `vdgo_rooms/${ROOM}/presence`), []);

  // Get user name from session — STABLE
  const getUserName = useCallback(() => {
    try {
      const session = localStorage.getItem('vdgo_session');
      const usersRaw = localStorage.getItem('vdgo_users_v1');
      if (session && usersRaw) {
        const users = JSON.parse(usersRaw);
        const u = users.find((x: any) => x.username === session);
        return u?.name || session;
      }
    } catch { /* */ }
    return 'Аноним';
  }, []);

  // ===== PUSH: Immediate via Firebase set() =====
  const pushData = useCallback(() => {
    const now = Date.now();
    const userName = getUserName();

    const payload = {
      cases: localStorage.getItem('vdgo_cases') || '[]',
      notes: localStorage.getItem('vdgo_notes') || '[]',
      kpi: localStorage.getItem('vdgo_kpiSession') || '{}',
      kpiCases: localStorage.getItem('vdgo_kpiCases') || '[]',
      duties: localStorage.getItem('vdgo_duties') || '[]',
      cash: localStorage.getItem('vdgo_cash_registers_v1') || '[]',
      timesheets: localStorage.getItem('vdgo_timesheets') || '[]',
      dispatcher: localStorage.getItem('vdgo_dispatcher') || '[]',
      excelFiles: localStorage.getItem('vdgo_excel_files') || '[]',
      notHome: localStorage.getItem('vdgo_not_home') || '[]',
      theme: localStorage.getItem('vdgo_theme') || 'dark',
      timestamp: now,
      from: DEVICE_ID,
      userName,
    };

    isLocalUpdateRef.current = true;
    set(dataRef, payload)
      .then(() => {
        setStatus('connected');
        setErrorMessage('');
      })
      .catch((err) => {
        console.error('[Sync] Push error:', err);
        if (err.message?.includes('permission')) {
          setStatus('error');
          setErrorMessage('Нет доступа к Firebase. Проверьте Rules в консоли.');
        }
      })
      .finally(() => {
        setTimeout(() => { isLocalUpdateRef.current = false; }, 200);
      });

    // Update presence
    set(presenceRef, { lastSeen: now, name: userName }).catch(() => {});
  }, [dataRef, presenceRef, getUserName]);

  // Keep stable ref to pushData for event listeners
  pushDataRef.current = pushData;

  // ===== MAIN EFFECT: onValue listener — runs ONCE =====
  useEffect(() => {
    destroyedRef.current = false;
    setStatus('connecting');
    console.log('[Sync] Native Firebase sync started, device:', DEVICE_ID);

    // Listen for data changes — INSTANT, no polling
    const unsubscribe = onValue(dataRef, (snapshot) => {
      if (destroyedRef.current) return;

      const val = snapshot.val();
      if (!val) return;

      // Skip our own updates
      if (val.from === DEVICE_ID) return;
      if (isLocalUpdateRef.current) return;

      // Skip old data
      if (val.timestamp && val.timestamp <= lastTimestampRef.current) return;
      if (val.timestamp) lastTimestampRef.current = val.timestamp;

      console.log('[Sync] Получены данные от:', val.userName || val.from);
      setStatus('connected');
      setErrorMessage('');

      // Merge all data
      try {
        if (val.cases) mergeArrayData('cases', val.cases, 'vdgo_cases', dataHandlersRef.current);
        if (val.notes) mergeArrayData('notes', val.notes, 'vdgo_notes', dataHandlersRef.current);
        if (val.kpi) mergeKpi(val.kpi, dataHandlersRef.current);
        if (val.kpiCases) mergeArrayData('kpiCases', val.kpiCases, 'vdgo_kpiCases', dataHandlersRef.current);
        if (val.duties) mergeArrayData('duties', val.duties, 'vdgo_duties', dataHandlersRef.current);
        if (val.cash) mergeArrayData('cash', val.cash, 'vdgo_cash_registers_v1', dataHandlersRef.current);
        if (val.timesheets) mergeArrayData('timesheets', val.timesheets, 'vdgo_timesheets', dataHandlersRef.current);
        if (val.dispatcher) mergeArrayData('dispatcher', val.dispatcher, 'vdgo_dispatcher', dataHandlersRef.current);
        if (val.excelFiles) mergeArrayData('excelFiles', val.excelFiles, 'vdgo_excel_files', dataHandlersRef.current);
        if (val.notHome) mergeArrayData('notHome', val.notHome, 'vdgo_not_home', dataHandlersRef.current);
        if (val.theme) dataHandlersRef.current('theme', val.theme);
      } catch (e) {
        console.error('[Sync] Merge error:', e);
      }
    }, (err) => {
      console.error('[Sync] onValue error:', err);
      setStatus('error');
      setErrorMessage(err.message || 'Ошибка подключения к Firebase');
    });

    // Listen for peer presence
    const unsubscribePresence = onValue(presenceRootRef, (snapshot) => {
      if (destroyedRef.current) return;
      const val = snapshot.val() || {};
      const now = Date.now();
      const names: string[] = [];
      let count = 0;

      for (const [key, entry] of Object.entries(val)) {
        if (key === DEVICE_ID) continue;
        const e = entry as any;
        if (e.lastSeen && now - e.lastSeen < 30000) {
          count++;
          names.push(e.name || 'Коллега');
        }
      }

      setPeerCount(count);
      setPeerNames(names);
    });

    // Presence with auto-cleanup on disconnect
    const now = Date.now();
    set(presenceRef, { lastSeen: now, name: getUserName() }).catch(() => {});
    onDisconnect(presenceRef).remove().catch(() => {});

    // Push on user actions — use ref to always call latest pushData
    const onAction = () => { if (!destroyedRef.current) pushDataRef.current(); };
    document.addEventListener('click', onAction);
    document.addEventListener('input', onAction);
    document.addEventListener('keydown', onAction);

    const onDataChange = () => { if (!destroyedRef.current) setTimeout(() => pushDataRef.current(), 50); };
    window.addEventListener('vdgo_data_changed', onDataChange);

    // Visibility
    const onVisibility = () => {
      if (!document.hidden) {
        setTimeout(() => pushDataRef.current(), 100);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    // Initial push
    setTimeout(() => pushDataRef.current(), 500);

    return () => {
      destroyedRef.current = true;
      unsubscribe();
      unsubscribePresence();
      document.removeEventListener('click', onAction);
      document.removeEventListener('input', onAction);
      document.removeEventListener('keydown', onAction);
      window.removeEventListener('vdgo_data_changed', onDataChange);
      document.removeEventListener('visibilitychange', onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // EMPTY — runs once, all callbacks accessed via refs

  return { status, peerCount, peerNames, pushData, errorMessage, pendingCount: 0 };
}

// ===== MERGE HELPERS =====

function mergeArrayData(type: string, incomingJson: string, localKey: string, handler: (type: string, data: any) => void) {
  try {
    const incoming = JSON.parse(incomingJson);
    if (!Array.isArray(incoming)) { handler(type, incoming); return; }
    const localRaw = localStorage.getItem(localKey);
    const local: any[] = localRaw ? JSON.parse(localRaw) : [];
    if (!Array.isArray(local)) { handler(type, incoming); return; }

    const deletedIdsRaw = localStorage.getItem('vdgo_deleted_ids');
    const deletedIds = deletedIdsRaw ? JSON.parse(deletedIdsRaw) : [];
    const deletedIdSet = new Set(deletedIds.map((d: any) => String(d.id)));
    const oneHourAgo = Date.now() - 3600000;
    const freshDeleted = deletedIds.filter((d: any) => d.deletedAt > oneHourAgo);
    if (freshDeleted.length !== deletedIds.length) localStorage.setItem('vdgo_deleted_ids', JSON.stringify(freshDeleted));

    const filteredIncoming = incoming.filter((item: any) => !deletedIdSet.has(String(item.id)));
    const localMap = new Map(local.map(item => [String(item.id), item]));
    const result: any[] = [];

    for (const incItem of filteredIncoming) {
      const id = String(incItem.id);
      const localItem = localMap.get(id);
      if (!localItem) { result.push(incItem); }
      else {
        const incTs = incItem.updatedAt || incItem.createdAt || 0;
        const locTs = localItem.updatedAt || localItem.createdAt || 0;
        result.push(incTs > locTs ? incItem : localItem);
        localMap.delete(id);
      }
    }
    for (const [, localItem] of localMap) { if (!deletedIdSet.has(String(localItem.id))) result.push(localItem); }

    handler(type, result);
  } catch { handler(type, JSON.parse(incomingJson)); }
}

function mergeKpi(incomingJson: string, handler: (type: string, data: any) => void) {
  try {
    const incoming: Record<string, { value: string; ts: number }> = JSON.parse(incomingJson);
    const localRaw = localStorage.getItem('vdgo_kpiSession');
    const local: Record<string, { value: string; ts: number }> = localRaw ? JSON.parse(localRaw) : {};
    const merged: Record<string, { value: string; ts: number }> = {};
    const allKeys = new Set([...Object.keys(local), ...Object.keys(incoming)]);
    for (const key of allKeys) {
      const loc = local[key]; const inc = incoming[key];
      if (!loc) merged[key] = inc;
      else if (!inc) merged[key] = loc;
      else merged[key] = (inc.ts || 0) > (loc.ts || 0) ? inc : loc;
    }
    handler('kpi', merged);
  } catch { handler('kpi', JSON.parse(incomingJson)); }
}
