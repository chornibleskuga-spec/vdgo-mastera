import { Hash } from 'lucide-react';

const codes = [
  { label: 'Среднее', value: '348 код' },
  { label: 'Деньги', value: '327 код' },
  { label: '(ТО Отсчет) Отчеты', value: 'реестр то' },
  { label: 'Долги', value: '201 код + файл' },
  { label: 'Журнал регистрации заявок', value: '512 код' },
];

export const Ref1cView = () => (
  <div className="h-full flex flex-col p-4 md:p-6 overflow-y-auto">
    <div className="max-w-lg mx-auto w-full">
      <div className="text-center mb-6">
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center mx-auto mb-3"
          style={{ background: 'var(--accent)' }}>
          <Hash size={20} className="text-white" />
        </div>
        <h2 className="text-[18px] md:text-[22px] font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>1С коды</h2>
        <p className="text-[12px] md:text-[13px] mt-1" style={{ color: 'var(--text-secondary)' }}>Справочник кодов 1С</p>
      </div>

      <div className="space-y-2">
        {codes.map((c, i) => (
          <div key={i} className="flex items-center justify-between rounded-lg md:rounded-lg px-4 md:px-5 py-3 md:py-3.5"
            style={{
              background: 'var(--bg-secondary)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.03), 0 0 0 0.5px rgba(0,0,0,0.04)',
            }}>
            <span className="text-[13px] md:text-[14px] font-medium" style={{ color: 'var(--text-primary)' }}>{c.label}</span>
            <span className="text-[13px] md:text-[14px] font-semibold px-3 py-1 rounded-full" style={{ background: 'var(--input-bg)', color: 'var(--accent)' }}>{c.value}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);
