import { FileCheck } from 'lucide-react';

const steps = [
  'Проведен внешний осмотр газ-да и го.',
  'Проверено наличие заглушек на вводе.',
  'Произведена контрольная опрессовка на 500 мм в/ст. на 5 мин. Падения давления нет.',
  'Снята заглушка на вводе, соединен сгон.',
  'Выполнена продувка газ-да газом до полного вытеснения воздуха.',
  'Окончание продувки определено методом сжигания отборочных проб.',
  'Произведен первичный пуск газа в газ-д и го.',
  'Проведены ПНР.',
  'Работы выполнены на основании инстр. 10В. По завершению работ проведен инструктаж для жильцов.',
];

export const RefGasView = () => (
  <div className="h-full flex flex-col p-4 md:p-6 overflow-y-auto">
    <div className="max-w-2xl mx-auto w-full">
      <div className="text-center mb-6">
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center mx-auto mb-3"
          style={{ background: 'var(--accent)' }}>
          <FileCheck size={20} className="text-white" />
        </div>
        <h2 className="text-[18px] md:text-[22px] font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>Отписка нарядов по пуску газа</h2>
        <p className="text-[12px] md:text-[13px] mt-1" style={{ color: 'var(--text-secondary)' }}>Порядок выполнения работ</p>
      </div>

      <div className="space-y-2">
        {steps.map((step, i) => (
          <div key={i} className="flex items-start gap-3 rounded-lg md:rounded-lg px-4 md:px-5 py-3 md:py-3.5"
            style={{
              background: 'var(--bg-secondary)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.03), 0 0 0 0.5px rgba(0,0,0,0.04)',
            }}>
            <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5" style={{ background: 'var(--input-bg)', color: 'var(--accent)' }}>{i + 1}</span>
            <span className="text-[13px] md:text-[14px] leading-relaxed" style={{ color: 'var(--text-primary)' }}>{step}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);
