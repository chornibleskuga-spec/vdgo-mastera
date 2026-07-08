import { useEffect, useRef, useCallback, useState } from 'react';

declare global {
  interface Window {
    Peer: any;
  }
}

interface DataConnection {
  on(event: string, cb: (...args: any[]) => void): void;
  send(data: any): void;
  close(): void;
  open: boolean;
  peer: string;
}

type SyncMsg = {
  type: 'cases' | 'notes' | 'kpi' | 'kpiCases' | 'duties' | 'cash' | 'timesheets' | 'full-sync' | 'ping' | 'pong';
  data: any;
  timestamp: number;
  from: string;
};

function getRoomId(): string {
  const hash = window.location.hash;
  const match = hash.match(/room=([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  const newRoom = Math.random().toString(36).substring(2, 8);
  window.location.hash = `room=${newRoom}`;
  return newRoom;
}

function waitForPeer(maxMs = 15000): Promise<any> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if (window.Peer) { resolve(window.Peer); return; }
      if (Date.now() - start > maxMs) { reject(new Error('PeerJS load timeout')); return; }
      setTimeout(check, 200);
    };
    check();
  });
}

// Fallback PeerJS hosts to try (in order)
const PEERJS_HOSTS = [
  { host: '0.peerjs.com', port: 443, secure: true },
  { host: 'peerjs.metered.ca', port: 443, secure: true },
  { host: 'peer.millipsoid.com', port: 443, secure: true },
];

// ICE servers including TURN relay for bypassing restrictive networks
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun.ekiga.net:3478' },
  { urls: 'stun:stun.ideasip.com:3478' },
  // Open Relay TURN servers (free, no signup)
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

export function useP2PSync(onData: (type: string, data: any) => void) {
  const [status, setStatus] = useState<'offline' | 'connecting' | 'connected' | 'blocked'>('offline');
  const [peersCount, setPeersCount] = useState(0);
  const [roomId, setRoomId] = useState('');
  const connsRef = useRef<Map<string, DataConnection>>(new Map());
  const myIdRef = useRef('');
  const hostIdRef = useRef('');
  const peerRef = useRef<any>(null);
  const dataHandlersRef = useRef(onData);
  const heartbeatRef = useRef<any>(null);
  const bcRef = useRef<BroadcastChannel | null>(null);
  const hostIndexRef = useRef(0);
  dataHandlersRef.current = onData;

  const send = useCallback((type: SyncMsg['type'], data: any) => {
    const msg: SyncMsg = { type, data, timestamp: Date.now(), from: myIdRef.current };
    // 1. Send via P2P WebRTC
    let sentP2P = 0;
    connsRef.current.forEach((conn) => {
      if (conn.open) {
        try { conn.send(msg); sentP2P++; } catch { /* */ }
      }
    });
    // 2. Send via BroadcastChannel (same-browser tabs)
    try {
      if (bcRef.current) {
        bcRef.current.postMessage({ type, data, timestamp: Date.now() });
      }
    } catch { /* */ }
  }, []);

  const setupConn = useCallback((conn: DataConnection) => {
    conn.on('open', () => {
      if (connsRef.current.has(conn.peer)) return;
      connsRef.current.set(conn.peer, conn);
      setPeersCount(connsRef.current.size);
      setStatus('connected');
      console.log('[P2P] Peer connected:', conn.peer, 'Total:', connsRef.current.size);

      const fullData = {
        cases: localStorage.getItem('vdgo_cases') || '[]',
        notes: localStorage.getItem('vdgo_notes') || '[]',
        kpi: localStorage.getItem('vdgo_kpiSession') || '{}',
        kpiCases: localStorage.getItem('vdgo_kpiCases') || '[]',
        duties: localStorage.getItem('vdgo_duties') || '[]',
        cash: localStorage.getItem('vdgo_cash_registers_v1') || '[]',
        timesheets: localStorage.getItem('vdgo_timesheets') || '[]',
      };
      try { conn.send({ type: 'full-sync', data: fullData, timestamp: Date.now(), from: myIdRef.current }); } catch { /* */ }
    });

    conn.on('data', (raw: any) => {
      try {
        const msg = raw as SyncMsg;
        if (!msg || !msg.type) return;
        if (msg.type === 'ping') { try { conn.send({ type: 'pong', timestamp: Date.now(), from: myIdRef.current }); } catch { /* */ } return; }
        if (msg.type === 'pong') return;
        if (msg.type === 'full-sync') {
          try {
            const d = msg.data;
            if (d.cases) dataHandlersRef.current('cases', JSON.parse(d.cases));
            if (d.notes) dataHandlersRef.current('notes', JSON.parse(d.notes));
            if (d.kpi) dataHandlersRef.current('kpi', JSON.parse(d.kpi));
            if (d.kpiCases) dataHandlersRef.current('kpiCases', JSON.parse(d.kpiCases));
            if (d.duties) dataHandlersRef.current('duties', JSON.parse(d.duties));
            if (d.cash) dataHandlersRef.current('cash', JSON.parse(d.cash));
            if (d.timesheets) dataHandlersRef.current('timesheets', JSON.parse(d.timesheets));
          } catch (e) { console.error('[P2P] Full sync parse error:', e); }
          return;
        }
        console.log('[P2P] received', msg.type, 'from', msg.from);
        dataHandlersRef.current(msg.type, msg.data);
      } catch (err) { console.error('[P2P] data handler error:', err); }
    });

    conn.on('close', () => {
      connsRef.current.delete(conn.peer);
      setPeersCount(connsRef.current.size);
      if (connsRef.current.size === 0) setStatus('connecting');
      console.log('[P2P] Peer disconnected:', conn.peer);
    });

    conn.on('error', () => {
      connsRef.current.delete(conn.peer);
      setPeersCount(connsRef.current.size);
      if (connsRef.current.size === 0) setStatus('connecting');
    });
  }, []);

  useEffect(() => {
    let destroyed = false;
    const room = getRoomId();
    setRoomId(room);
    const roomPeerId = `vdgo_room_${room}`;
    hostIdRef.current = roomPeerId;

    // === LEVEL 2: BroadcastChannel (same browser, multiple tabs) ===
    try {
      const bc = new BroadcastChannel('vdgo_sync_' + room);
      bcRef.current = bc;
      bc.onmessage = (ev) => {
        try {
          const msg = ev.data;
          if (!msg || !msg.type) return;
          console.log('[BC] received', msg.type);
          if (msg.type === 'full-sync') {
            const d = msg.data;
            if (d.cases) dataHandlersRef.current('cases', JSON.parse(d.cases));
            if (d.notes) dataHandlersRef.current('notes', JSON.parse(d.notes));
            if (d.kpi) dataHandlersRef.current('kpi', JSON.parse(d.kpi));
            if (d.duties) dataHandlersRef.current('duties', JSON.parse(d.duties));
            if (d.cash) dataHandlersRef.current('cash', JSON.parse(d.cash));
            return;
          }
          dataHandlersRef.current(msg.type, msg.data);
        } catch (err) { console.error('[BC] error:', err); }
      };
      console.log('[BC] BroadcastChannel active for room:', room);
    } catch {
      console.log('[BC] BroadcastChannel not supported');
    }

    // === LEVEL 1: P2P WebRTC with fallback hosts ===
    waitForPeer().then((Peer) => {
      if (destroyed) return;
      console.log('[P2P] PeerJS loaded, starting...');
      setStatus('connecting');
      startP2P(Peer, 0);
    }).catch((err) => {
      console.error('[P2P] Failed to load PeerJS:', err.message);
      setStatus('blocked');
    });

    function startP2P(Peer: any, hostIndex: number) {
      if (hostIndex >= PEERJS_HOSTS.length) {
        console.error('[P2P] All hosts failed');
        setStatus('blocked');
        return;
      }

      const hostConfig = PEERJS_HOSTS[hostIndex];
      console.log('[P2P] Trying host', hostIndex, ':', hostConfig.host);

      const tryAsHost = () => {
        if (destroyed) return;
        const peer = new Peer(roomPeerId, {
          ...hostConfig,
          debug: 0,
          config: { iceServers: ICE_SERVERS },
        });
        peerRef.current = peer;

        peer.on('open', () => {
          if (destroyed) return;
          console.log('[P2P] Host for room:', room, 'via', hostConfig.host);
          myIdRef.current = roomPeerId;
          setStatus('connected');
          startHeartbeat();
        });

        peer.on('connection', (conn: DataConnection) => setupConn(conn));

        peer.on('error', (err: any) => {
          if (destroyed) return;
          console.log('[P2P] Host error on', hostConfig.host, ':', err.type);
          peer.destroy();
          if (err.type === 'network' || err.type === 'disconnected' || err.type === 'socket-error' || err.type === 'server-error') {
            // Try next host
            setTimeout(() => startP2P(Peer, hostIndex + 1), 1000);
          } else if (err.type === 'unavailable-id') {
            connectAsClient(Peer, hostIndex);
          } else if (err.type === 'browser-incompatible' || err.type === 'invalid-id') {
            setStatus('blocked');
          }
        });

        peer.on('disconnected', () => {
          if (destroyed) return;
          setStatus('connecting');
          setTimeout(() => { if (!destroyed && peer) peer.reconnect(); }, 2000);
        });
      };

      const connectAsClient = (Peer: any, hi: number) => {
        if (destroyed) return;
        const myId = `vdgo_${room}_${Math.random().toString(36).substring(2, 6)}`;
        myIdRef.current = myId;

        const hc = PEERJS_HOSTS[hi] || hostConfig;
        const peer = new Peer(myId, {
          ...hc,
          debug: 0,
          config: { iceServers: ICE_SERVERS },
        });
        peerRef.current = peer;

        peer.on('open', () => {
          if (destroyed) return;
          const conn = peer.connect(roomPeerId, { reliable: true });
          if (conn) setupConn(conn);
          setStatus('connected');
          startHeartbeat();
        });

        peer.on('connection', (conn: DataConnection) => setupConn(conn));

        peer.on('error', (err: any) => {
          if (destroyed) return;
          console.log('[P2P] Client error on', hc.host, ':', err.type);
          peer.destroy();
          if (err.type === 'peer-unavailable') {
            setTimeout(() => tryAsHost(), 2000 + Math.random() * 2000);
          } else if (err.type === 'network' || err.type === 'disconnected' || err.type === 'socket-error' || err.type === 'server-error') {
            // Try next host
            setTimeout(() => startP2P(Peer, hi + 1), 1000);
          } else if (err.type === 'browser-incompatible' || err.type === 'invalid-id') {
            setStatus('blocked');
          }
        });

        peer.on('disconnected', () => {
          if (destroyed) return;
          setStatus('connecting');
          setTimeout(() => { if (!destroyed && peer) peer.reconnect(); }, 3000);
        });
      };

      const startHeartbeat = () => {
        if (heartbeatRef.current) clearInterval(heartbeatRef.current);
        heartbeatRef.current = setInterval(() => {
          if (destroyed) return;
          connsRef.current.forEach((conn) => {
            if (conn.open) {
              try { conn.send({ type: 'ping', timestamp: Date.now(), from: myIdRef.current }); } catch { /* */ }
            }
          });
        }, 10000);
      };

      tryAsHost();
    }

    return () => {
      destroyed = true;
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      connsRef.current.forEach(c => c.close());
      if (peerRef.current) peerRef.current.destroy();
      if (bcRef.current) bcRef.current.close();
    };
  }, [setupConn]);

  return { status, peersCount, roomId, send };
}
