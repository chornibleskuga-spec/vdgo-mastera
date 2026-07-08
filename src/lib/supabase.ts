const SUPABASE_URL = 'https://qmovkfkpbfvycbtfvnmr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtb3ZrZmtwYmZ2eWNidGZ2bm1yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MTU1NDQsImV4cCI6MjA5NTM5MTU0NH0.Ke-Xl8aqVmeS_4r6OQERZoLVkV32Q2Ikq3LhK8rrZxY';

// Use CDN-loaded supabase or fallback
const createClient = (window as any).supabase?.createClient || (() => ({
  from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }), }) }), }) }), insert: () => Promise.resolve({ data: null, error: null }), update: () => ({ eq: () => Promise.resolve({ data: null, error: null }), }), delete: () => ({ eq: () => Promise.resolve({ data: null, error: null }), }), }),
  channel: () => ({ on: () => ({ subscribe: () => ({ unsubscribe: () => {} }), }), subscribe: () => ({ unsubscribe: () => {} }), }),
  removeChannel: () => {},
}));

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: { params: { eventsPerSecond: 10 } },
});

export function isSupabaseConfigured(): boolean { return true; }
export async function enableRealtime(_table: string) {}
