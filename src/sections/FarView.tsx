import { useState, useRef, useMemo, useCallback } from 'react';
import { Upload, Search, Download, FileSpreadsheet, X, MapPin, ClipboardList, Globe, Loader } from 'lucide-react';
import * as XLSX from 'xlsx';

// ===== EQUIPMENT TYPES =====
interface EquipmentType { code: string; name: string; price: number; registryGroup: string; }
const EQUIPMENT_TYPES: EquipmentType[] = [
  { code: 'PG-2', name: 'ПГ-2', price: 493, registryGroup: 'PG' },
  { code: 'PG-3', name: 'ПГ-3', price: 507, registryGroup: 'PG' },
  { code: 'PG-4', name: 'ПГ-4', price: 651, registryGroup: 'PG' },
  { code: 'VP', name: 'Варочная панель', price: 419, registryGroup: 'PG' },
  { code: 'DS', name: 'Духовой шкаф', price: 299, registryGroup: 'PG' },
  { code: 'VK', name: 'Водонагреватель', price: 1063, registryGroup: 'VK' },
  { code: 'OK', name: 'Отоп. котел', price: 2876, registryGroup: 'OK' },
  { code: 'GP', name: 'Газопровод', price: 449, registryGroup: 'OK' },
  { code: 'KL', name: 'Калорифер', price: 415, registryGroup: 'OK' },
];
function getEquipmentByPrice(price: number) { return EQUIPMENT_TYPES.find(e => e.price === price); }

// ===== DISTRICTS =====
const DISTRICT_MAP: Record<string, string> = {
  'тракторозаводский': 'ТЗР',
  'краснооктябрьский': 'КРО',
  'советский': 'СВТ',
  'центральный': 'ЦНТ',
  'дзержинский': 'ДЗР',
  'ворошиловский': 'ВРШ',
  'кировский': 'КРВ',
  'красноармейский': 'КРА',
};
function parseDistrict(suburb: string): { full: string; short: string } | null {
  if (!suburb) return null;
  const lower = suburb.toLowerCase();
  for (const [key, short] of Object.entries(DISTRICT_MAP)) {
    if (lower.includes(key)) return { full: key.charAt(0).toUpperCase() + key.slice(1) + ' район', short };
  }
  return null;
}

// ===== RECORD =====
interface FarRecord {
  id: number;
  ls: string;
  fio: string;
  address: string;
  phone: string;
  phoneExtra: string;
  debt: string;
  price: number;
  equipment: EquipmentType | null;
  registryGroup: string;
  lastToDate: string;
  district: { full: string; short: string } | null;
  raw: Record<string, any>;
}

// ===== COLUMN MAPPING =====
const COL_MAP: Record<string, string[]> = {
  ls: ['лицевой счет для документов', 'лицевой счет', 'лс', 'ls'],
  fio: ['наименование', 'фио', 'абонент', 'name'],
  address: ['адрес', 'address', 'addr'],
  phone: ['телефон', 'phone', 'тел.'],
  phoneExtra: ['телефон дополнительный', 'доп. телефон', 'телефон доп'],
  debt: ['долг', 'debt', 'задолженность'],
  price: ['сумма', 'цена', 'price', 'стоимость'],
};
function findCol(headers: string[], names: string[]): string | null {
  const low = headers.map(h => h.toLowerCase().trim());
  for (const n of names) { const i = low.indexOf(n.toLowerCase()); if (i >= 0) return headers[i]; }
  for (const n of names) { const i = low.findIndex(h => h.includes(n.toLowerCase())); if (i >= 0) return headers[i]; }
  return null;
}

// ===== GEOCODING via Nominatim =====
const districtCache = new Map<string, { full: string; short: string } | null>();
let lastGeocodeTime = 0;

async function geocodeDistrict(address: string): Promise<{ full: string; short: string } | null> {
  const street = address.split(',')[0].trim();
  if (!street) return null;
  if (districtCache.has(street)) return districtCache.get(street)!;

  // Rate limit: 1.1s between requests
  const now = Date.now();
  const wait = 1100 - (now - lastGeocodeTime);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastGeocodeTime = Date.now();

  try {
    const q = encodeURIComponent(`Волгоград, ${street}`);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&addressdetails=1&limit=1`, {
      headers: { 'User-Agent': 'VDGOMaster/1.0' },
    });
    const data = await res.json();
    if (data && data.length > 0) {
      const suburb = data[0].address?.suburb || data[0].address?.city_district || '';
      const result = parseDistrict(suburb);
      districtCache.set(street, result);
      return result;
    }
    districtCache.set(street, null);
    return null;
  } catch {
    return null;
  }
}

// ===== PARSE EXCEL =====
function parseExcelFile(file: File): Promise<FarRecord[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        console.log('[FAR] File loaded, size:', file.size);
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array', codepage: 65001 });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { header: 1, defval: '' });
        console.log('[FAR] Total rows:', json.length);

        if (json.length < 2) { reject(new Error('Файл пустой (меньше 2 строк)')); return; }

        // Find header row
        let hIdx = 0;
        for (let i = 0; i < Math.min(10, json.length); i++) {
          const row = json[i] as any[];
          const textCount = row.filter(c => String(c).trim().length > 0).length;
          if (textCount >= 2) { hIdx = i; break; }
        }
        console.log('[FAR] Header row index:', hIdx);

        const rawH = (json[hIdx] as any[]).map(h => String(h).trim());
        console.log('[FAR] Headers found:', rawH);

        const cm: Record<string, string | null> = {};
        for (const [f, n] of Object.entries(COL_MAP)) cm[f] = findCol(rawH, n);
        console.log('[FAR] Column map:', cm);

        // Fallback: if no columns mapped, try using raw headers directly by index
        const hasAnyCol = Object.values(cm).some(v => v !== null);
        if (!hasAnyCol) {
          console.log('[FAR] No columns mapped! Trying fallback...');
          // Try to use first few columns as ls, fio, address, phone, etc.
          if (rawH.length >= 1) cm.ls = rawH[0];
          if (rawH.length >= 2) cm.fio = rawH[1];
          if (rawH.length >= 3) cm.address = rawH[2];
          if (rawH.length >= 4) cm.phone = rawH[3];
          if (rawH.length >= 5) cm.phoneExtra = rawH[4];
          if (rawH.length >= 6) cm.debt = rawH[5];
          if (rawH.length >= 7) cm.price = rawH[6];
        }

        // Helper to get value from a specific row
        const getRowVal = (rowIdx: number, field: string): string => {
          const k = cm[field];
          if (!k) return '';
          const colIdx = rawH.indexOf(k);
          if (colIdx < 0) return '';
          const row = json[rowIdx] as any[];
          return row && colIdx < row.length ? String(row[colIdx] || '').trim() : '';
        };

        // Detect group from equipment name
        const detectGroup = (row: any[]): string => {
          for (const cell of row) {
            const v = String(cell).toLowerCase();
            if (v.includes('плит') || v.includes('варочн') || v.includes('духов') || v.includes('пг-')) return 'PG';
            if (v.includes('котел') || v.includes('котёл') || v.includes('газопровод') || v.includes('калорифер')) return 'OK';
            if (v.includes('водонагрев') || v.includes('колонк')) return 'VK';
          }
          return '';
        };

        const recs: FarRecord[] = [];
        let dataRows = 0;
        for (let i = hIdx + 1; i < json.length; i++) {
          const row = json[i] as any[];
          if (row.every(c => !c || String(c).trim() === '')) continue;
          dataRows++;

          const price = parseFloat(getRowVal(i, 'price').replace(/\s/g, '').replace(',', '.')) || 0;
          const eq = getEquipmentByPrice(price);
          let group = eq?.registryGroup || detectGroup(row);
          const address = getRowVal(i, 'address');

          recs.push({
            id: i,
            ls: getRowVal(i, 'ls'),
            fio: getRowVal(i, 'fio'),
            address,
            phone: getRowVal(i, 'phone'),
            phoneExtra: getRowVal(i, 'phoneExtra'),
            debt: getRowVal(i, 'debt'),
            price,
            equipment: eq,
            registryGroup: group,
            lastToDate: '',
            district: null,
            raw: Object.fromEntries(rawH.map((h, idx) => [h, row[idx] || ''])),
          });
        }
        console.log('[FAR] Data rows found:', dataRows, 'Records parsed:', recs.length);

        if (recs.length === 0) {
          reject(new Error('Не найдено данных. Заголовки: ' + rawH.join(', ')));
          return;
        }

        resolve(recs);
      } catch (err) {
        console.error('[FAR] Parse error:', err);
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Ошибка чтения файла'));
    reader.readAsArrayBuffer(file);
  });
}

// ===== EXPORT =====
function exportRegistry(records: FarRecord[], label: string) {
  const rows = records.map((r, i) => ({
    '№': i + 1, 'ЛС': r.ls, 'ФИО': r.fio, 'Адрес': r.address,
    'Район': r.district?.short || '', 'Тип оборуд.': r.equipment?.name || '',
    'Цена ТО': r.price, 'Долг': r.debt, 'Дата ТО': r.lastToDate,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Реестр');
  XLSX.writeFile(wb, `Реестр_${label}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// ===== COMPONENT =====
export const FarView = () => {
  const [records, setRecords] = useState<FarRecord[]>([]);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [eqFilter, setEqFilter] = useState('');
  const [distFilter, setDistFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [editDate, setEditDate] = useState<number | null>(null);
  const [dateInp, setDateInp] = useState('');
  const [geoProgress, setGeoProgress] = useState('');
  const [geoRunning, setGeoRunning] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    console.log('[FAR] File selected:', f?.name, 'size:', f?.size);
    if (!f) { alert('Файл не выбран'); return; }
    try {
      const p = await parseExcelFile(f);
      console.log('[FAR] Parsed', p.length, 'records');
      if (p.length === 0) { alert('Файл загружен, но данные не найдены. Проверьте структуру файла.'); return; }
      setRecords(p);
      setSelected(new Set(p.map(r => r.id)));
    } catch (err) {
      console.error('[FAR] Upload error:', err);
      alert('Ошибка загрузки: ' + (err as Error).message);
    }
    if (fileRef.current) fileRef.current.value = '';
  }, []);

  // Auto-detect districts
  const detectDistricts = useCallback(async () => {
    setGeoRunning(true);
    const without = records.filter(r => !r.district);
    const total = without.length;
    if (total === 0) { setGeoRunning(false); return; }

    let done = 0;
    for (const rec of without) {
      const d = await geocodeDistrict(rec.address);
      setRecords(prev => prev.map(r => r.id === rec.id ? { ...r, district: d } : r));
      done++;
      setGeoProgress(`${done}/${total}`);
    }
    setGeoProgress('');
    setGeoRunning(false);
  }, [records]);

  const street = (a: string) => a.split(',')[0].trim();

  const filtered = useMemo(() => records.filter(r => {
    if (search) { const q = search.toLowerCase(); if (!street(r.address).toLowerCase().includes(q) && !r.fio.toLowerCase().includes(q) && !r.ls.includes(q)) return false; }
    if (groupFilter && r.registryGroup !== groupFilter) return false;
    if (eqFilter && r.equipment?.code !== eqFilter) return false;
    if (distFilter && r.district?.short !== distFilter) return false;
    if (dateFilter && !r.lastToDate.includes(dateFilter)) return false;
    return true;
  }), [records, search, groupFilter, eqFilter, distFilter, dateFilter]);

  const toggleRow = (id: number) => setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => { const all = filtered.every(r => selected.has(r.id)); setSelected(p => { const n = new Set(p); filtered.forEach(r => all ? n.delete(r.id) : n.add(r.id)); return n; }); };
  const updateDate = (id: number, d: string) => { setRecords(p => p.map(r => r.id === id ? { ...r, lastToDate: d } : r)); setEditDate(null); };
  const sel = records.filter(r => selected.has(r.id));

  const grouped = useMemo(() => {
    const m: Record<string, FarRecord[]> = {};
    for (const r of sel) { const g = r.registryGroup || 'Без группы'; (m[g] ||= []).push(r); }
    return m;
  }, [sel]);

  const districts = useMemo(() => [...new Set(records.filter(r => r.district).map(r => r.district!.short))].sort(), [records]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b px-3 md:px-5 py-2 flex-shrink-0 flex items-center justify-between" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <ClipboardList size={18} style={{ color: 'var(--accent)' }} />
          <span className="text-[14px] md:text-[16px] font-semibold" style={{ color: 'var(--text-primary)' }}>ФАР</span>
        </div>
        <div className="flex items-center gap-2">
          <input type="file" ref={fileRef} onChange={handleUpload} accept=".xlsx,.xls,.csv" className="hidden" />
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1 px-3 py-1.5 text-white text-[12px] font-medium rounded-lg" style={{ background: 'var(--accent)' }}><Upload size={14} /> Загрузить</button>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <FileSpreadsheet size={48} style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-[13px] mt-3" style={{ color: 'var(--text-secondary)' }}>Загрузите Excel файл реестра</p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="border-b px-3 py-2 flex-shrink-0" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-3 mb-2 flex-wrap text-[11px]">
              <span style={{ color: 'var(--text-secondary)' }}>Всего: <strong style={{ color: 'var(--text-primary)' }}>{records.length}</strong></span>
              <span style={{ color: 'var(--text-secondary)' }}>Выбрано: <strong style={{ color: 'var(--accent)' }}>{selected.size}</strong></span>
              <span style={{ color: 'var(--text-secondary)' }}>ПГ: <strong>{sel.filter(r => r.registryGroup === 'PG').length}</strong></span>
              <span style={{ color: 'var(--text-secondary)' }}>ОК: <strong>{sel.filter(r => r.registryGroup === 'OK').length}</strong></span>
              <span style={{ color: 'var(--text-secondary)' }}>ВК: <strong>{sel.filter(r => r.registryGroup === 'VK').length}</strong></span>
              <span style={{ color: 'var(--text-secondary)' }}>С районом: <strong>{records.filter(r => r.district).length}</strong></span>
              {!geoRunning && records.filter(r => !r.district).length > 0 && (
                <button onClick={detectDistricts} className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded" style={{ background: 'var(--success)', color: '#fff' }}>
                  <Globe size={10} /> Определить районы ({records.filter(r => !r.district).length})
                </button>
              )}
              {geoRunning && (
                <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--warning)' }}>
                  <Loader size={10} className="animate-spin" /> {geoProgress}
                </span>
              )}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 flex-1 min-w-[140px]">
                <Search size={12} style={{ color: 'var(--text-tertiary)' }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Улица, ФИО, ЛС..." className="flex-1 rounded-lg px-2 py-1 text-[12px] outline-none" style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '0.5px solid rgba(0,0,0,0.08)' }} />
              </div>
              <select value={groupFilter} onChange={e => setGroupFilter(e.target.value)} className="rounded-lg px-2 py-1 text-[12px] outline-none" style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '0.5px solid rgba(0,0,0,0.08)' }}>
                <option value="">Все группы</option>
                <option value="PG">ПГ — Плиты</option>
                <option value="OK">ОК — Котлы</option>
                <option value="VK">ВК — Водонагрев.</option>
              </select>
              <select value={eqFilter} onChange={e => setEqFilter(e.target.value)} className="rounded-lg px-2 py-1 text-[12px] outline-none" style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '0.5px solid rgba(0,0,0,0.08)' }}>
                <option value="">Все типы</option>
                {EQUIPMENT_TYPES.map(e => <option key={e.code} value={e.code}>{e.name} ({e.price}₽)</option>)}
              </select>
              <select value={distFilter} onChange={e => setDistFilter(e.target.value)} className="rounded-lg px-2 py-1 text-[12px] outline-none" style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '0.5px solid rgba(0,0,0,0.08)' }}>
                <option value="">Все районы</option>
                {districts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <input value={dateFilter} onChange={e => setDateFilter(e.target.value)} placeholder="ММ.ГГГГ" className="w-[70px] rounded-lg px-2 py-1 text-[12px] outline-none" style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '0.5px solid rgba(0,0,0,0.08)' }} />
              {(search || groupFilter || eqFilter || distFilter || dateFilter) && (
                <button onClick={() => { setSearch(''); setGroupFilter(''); setEqFilter(''); setDistFilter(''); setDateFilter(''); }} className="p-1 rounded" style={{ color: 'var(--text-tertiary)' }}><X size={14} /></button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-[11px]" style={{ borderCollapse: 'collapse' }}>
              <thead className="sticky top-0 z-10" style={{ background: 'var(--input-bg)' }}>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th className="px-2 py-1 w-6"><input type="checkbox" checked={filtered.length > 0 && filtered.every(r => selected.has(r.id))} onChange={toggleAll} /></th>
                  <th className="px-1 py-1 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>ЛС</th>
                  <th className="px-1 py-1 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>ФИО</th>
                  <th className="px-1 py-1 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>Адрес</th>
                  <th className="px-1 py-1 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>Район</th>
                  <th className="px-1 py-1 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>Тип</th>
                  <th className="px-1 py-1 text-right font-semibold" style={{ color: 'var(--text-secondary)' }}>Цена</th>
                  <th className="px-1 py-1 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>Долг</th>
                  <th className="px-1 py-1 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>ТО</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-b" style={{ borderColor: 'var(--border-subtle)', background: selected.has(r.id) ? 'var(--surface)' : 'transparent' }}>
                    <td className="px-2 py-1"><input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleRow(r.id)} /></td>
                    <td className="px-1 py-1" style={{ color: 'var(--text-primary)' }}>{r.ls}</td>
                    <td className="px-1 py-1" style={{ color: 'var(--text-primary)' }}>{r.fio}</td>
                    <td className="px-1 py-1" style={{ color: 'var(--text-primary)' }}>{r.address}</td>
                    <td className="px-1 py-1">
                      {r.district ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--input-bg)', color: 'var(--accent)' }}>{r.district.short}</span>
                      ) : (
                        <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>—</span>
                      )}
                    </td>
                    <td className="px-1 py-1">
                      {r.equipment ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: r.equipment.registryGroup === 'PG' ? 'rgba(0,122,255,0.12)' : r.equipment.registryGroup === 'OK' ? 'rgba(255,149,0,0.12)' : 'rgba(48,209,88,0.12)', color: r.equipment.registryGroup === 'PG' ? '#007AFF' : r.equipment.registryGroup === 'OK' ? '#FF9500' : '#30D858' }}>{r.equipment.name}</span>
                      ) : <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>—</span>}
                    </td>
                    <td className="px-1 py-1 text-right font-medium" style={{ color: 'var(--text-primary)' }}>{r.price > 0 ? r.price.toLocaleString('ru-RU') : ''}</td>
                    <td className="px-1 py-1" style={{ color: r.debt ? 'var(--danger)' : 'var(--text-tertiary)' }}>{r.debt}</td>
                    <td className="px-1 py-1">
                      {editDate === r.id ? (
                        <div className="flex items-center gap-1">
                          <input value={dateInp} onChange={e => setDateInp(e.target.value)} placeholder="ММ.ГГГГ" className="w-[55px] rounded px-1 py-0.5 text-[10px] outline-none" style={{ background: 'var(--input-bg)', border: '0.5px solid var(--border)' }} autoFocus onKeyDown={e => { if (e.key === 'Enter') updateDate(r.id, dateInp); if (e.key === 'Escape') setEditDate(null); }} />
                          <button onClick={() => updateDate(r.id, dateInp)} className="text-[9px] px-1 rounded" style={{ background: 'var(--accent)', color: '#fff' }}>OK</button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditDate(r.id); setDateInp(r.lastToDate); }} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: r.lastToDate ? 'var(--input-bg)' : 'transparent', color: r.lastToDate ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>{r.lastToDate || '—'}</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Export panel */}
          {sel.length > 0 && (
            <div className="border-t px-3 py-2 flex-shrink-0" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
              <p className="text-[11px] font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Сформировать реестр ({sel.length}):</p>
              <div className="flex items-center gap-2 flex-wrap">
                {Object.entries(grouped).map(([group, recs]) => (
                  <button key={group} onClick={() => exportRegistry(recs, group)} className="flex items-center gap-1 px-3 py-1.5 text-white text-[11px] font-medium rounded-lg" style={{ background: group === 'PG' ? '#007AFF' : group === 'OK' ? '#FF9500' : group === 'VK' ? '#30D858' : 'var(--accent)' }}><Download size={12} />{group} ({recs.length})</button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
