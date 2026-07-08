export type ViewType = 'work' | 'price' | 'reminders' | 'calculator' | 'case-history' | 'kpi' | 'kpi-cases' | 'ref-1c' | 'ref-gas' | 'ref-cash' | 'dispatcher' | 'cash' | 'apps' | 'not-home' | 'map' | 'call-history' | 'far';

export interface Worker {
  id: string;
  name: string;
  initials: string;
}

export interface AssignedAddress {
  id: number;
  assignmentId: number;
  street: string;
  house: string;
  apartment: string;
  orderNum: number;
}

export interface WorkAssignment {
  id: number;
  caseId: number;
  workerId: string;
  addresses: AssignedAddress[];
}

export interface WorkCase {
  id: number;
  date: string;
  status: 'active' | 'saved' | 'closed';
  createdAt: Date;
  updatedAt: Date;
  assignments: WorkAssignment[];
}

export interface KpiEntry {
  id: number;
  kpiCaseId: number;
  workerId: string;
  day: number;
  value: string;
  ts: number; // timestamp for sync — higher wins
}

export interface KpiCase {
  id: number;
  month: number;
  year: number;
  label: string;
  savedAt: Date;
  entries: KpiEntry[];
}

export interface KpiSessionEntry {
  workerId: string;
  day: number;
  value: string;
}

export interface KpiSession {
  id: number;
  month: number;
  year: number;
  status: string;
  entries: KpiSessionEntry[];
}

export type NoteStatus = 'Выполнен' | 'В процессе' | 'Не решен';

export const NOTE_STATUS_COLORS: Record<NoteStatus, { bg: string; text: string; border: string }> = {
  'Выполнен':  { bg: 'rgba(52,199,89,0.12)', text: '#248A3D', border: 'rgba(52,199,89,0.25)' },
  'В процессе':{ bg: 'rgba(10,132,255,0.12)', text: '#0A6EBD', border: 'rgba(10,132,255,0.25)' },
  'Не решен':  { bg: 'rgba(255,69,58,0.12)',  text: '#D70015', border: 'rgba(255,69,58,0.25)' },
};

export interface Note {
  id: number;
  date: string;
  text: string;
  status: NoteStatus;
  createdAt: Date;
}

export interface DispatcherEntry {
  id: number;
  workerName: string;
  totalRaw: string;
  nextDayRaw: string;
  date: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DispatcherRecord {
  id: string; // deterministic: `${date}_${workerName}`
  workerName: string;
  totalRaw: string;
  nextDayRaw: string;
  date: string;
  createdAt: number;
}

export interface TimesheetEntry {
  workerId: string;
  day: number;
  value: string;
}

export interface TimesheetRecord {
  id: number;
  month: number;
  year: number;
  entries: TimesheetEntry[];
  savedAt: Date;
}

export interface StoredExcelFile {
  id: number;
  name: string;
  base64: string;
  uploadedAt: number;
}

export type CashRegisterStatus = 'В работе' | 'Списана' | 'В ремонте';

export interface CashRegister {
  id: number;
  code: string;
  name: string;
  inv: string;
  workerId: string | null;
  status: CashRegisterStatus;
}

export const CASH_REGISTER_STATUS_COLORS: Record<CashRegisterStatus, { bg: string; text: string; border: string; dot: string }> = {
  'В работе': { bg: 'rgba(52,199,89,0.12)', text: '#248A3D', border: 'rgba(52,199,89,0.25)', dot: '#34C759' },
  'Списана':  { bg: 'rgba(255,69,58,0.12)',  text: '#D70015', border: 'rgba(255,69,58,0.25)',  dot: '#FF453A' },
  'В ремонте':{ bg: 'rgba(255,149,0,0.12)',  text: '#C93400', border: 'rgba(255,149,0,0.25)',  dot: '#FF9500' },
};

export interface NotHomeEntry {
  id: number;
  address: string;
  createdAt: number;
  timerEndAt: number;
}


