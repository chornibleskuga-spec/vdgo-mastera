import { useState, useEffect, useCallback, useRef } from 'react';

type Operator = '+' | '\u2212' | '\u00D7' | '\u00F7' | null;

interface HistoryItem {
  expression: string;
  result: string;
}

export const CalculatorView = () => {
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState<string | null>(null);
  const [operator, setOperator] = useState<Operator>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const calcRef = useRef<HTMLDivElement>(null);

  const clearAll = useCallback(() => {
    setDisplay('0');
    setPreviousValue(null);
    setOperator(null);
    setWaitingForOperand(false);
  }, []);

  const inputDigit = useCallback((digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? digit : display + digit);
    }
  }, [display, waitingForOperand]);

  const inputDecimal = useCallback(() => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
      return;
    }
    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  }, [display, waitingForOperand]);

  const performOperation = useCallback((nextOperator: Operator) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(display);
    } else if (operator) {
      const currentPrevious = parseFloat(previousValue);
      let newValue: number;

      switch (operator) {
        case '+': newValue = currentPrevious + inputValue; break;
        case '\u2212': newValue = currentPrevious - inputValue; break;
        case '\u00D7': newValue = currentPrevious * inputValue; break;
        case '\u00F7': newValue = inputValue !== 0 ? currentPrevious / inputValue : 0; break;
        default: newValue = inputValue;
      }

      const newValueStr = String(parseFloat(newValue.toPrecision(12)));
      setPreviousValue(newValueStr);
      setDisplay(newValueStr);

      setHistory(prev => [{
        expression: `${previousValue} ${operator} ${display}`,
        result: newValueStr,
      }, ...prev].slice(0, 20));
    }

    setWaitingForOperand(true);
    setOperator(nextOperator);
  }, [display, previousValue, operator]);

  const performCalculation = useCallback(() => {
    if (!operator || previousValue === null) return;

    const inputValue = parseFloat(display);
    const prevValueNum = parseFloat(previousValue);
    let newValue: number;

    switch (operator) {
      case '+': newValue = prevValueNum + inputValue; break;
      case '\u2212': newValue = prevValueNum - inputValue; break;
      case '\u00D7': newValue = prevValueNum * inputValue; break;
      case '\u00F7': newValue = inputValue !== 0 ? prevValueNum / inputValue : 0; break;
      default: newValue = inputValue;
    }

    const newValueStr = String(parseFloat(newValue.toPrecision(12)));
    setDisplay(newValueStr);
    setPreviousValue(null);
    setOperator(null);
    setWaitingForOperand(true);

    setHistory(prev => [{
      expression: `${previousValue} ${operator} ${display}`,
      result: newValueStr,
    }, ...prev].slice(0, 20));
  }, [display, previousValue, operator]);

  const toggleSign = useCallback(() => {
    const value = parseFloat(display);
    if (value !== 0) {
      setDisplay(String(-value));
    }
  }, [display]);

  const inputPercent = useCallback(() => {
    const value = parseFloat(display);
    setDisplay(String(value / 100));
  }, [display]);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        inputDigit(e.key);
      } else if (e.key === '.') {
        e.preventDefault();
        inputDecimal();
      } else if (e.key === '+' || e.key === '-') {
        e.preventDefault();
        performOperation(e.key === '+' ? '+' : '\u2212');
      } else if (e.key === '*' || e.key === 'x' || e.key === 'X') {
        e.preventDefault();
        performOperation('\u00D7');
      } else if (e.key === '/') {
        e.preventDefault();
        performOperation('\u00F7');
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        performCalculation();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        clearAll();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        setDisplay(prev => {
          if (prev.length === 1) return '0';
          return prev.slice(0, -1);
        });
      } else if (e.key === '%') {
        e.preventDefault();
        inputPercent();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inputDigit, inputDecimal, performOperation, performCalculation, clearAll, inputPercent]);

  const buttons = [
    { label: 'AC', type: 'function' as const, action: clearAll, wide: false },
    { label: '+/\u2212', type: 'function' as const, action: toggleSign, wide: false },
    { label: '%', type: 'function' as const, action: inputPercent, wide: false },
    { label: '\u00F7', type: 'operator' as const, action: () => performOperation('\u00F7'), wide: false },
    { label: '7', type: 'digit' as const, action: () => inputDigit('7'), wide: false },
    { label: '8', type: 'digit' as const, action: () => inputDigit('8'), wide: false },
    { label: '9', type: 'digit' as const, action: () => inputDigit('9'), wide: false },
    { label: '\u00D7', type: 'operator' as const, action: () => performOperation('\u00D7'), wide: false },
    { label: '4', type: 'digit' as const, action: () => inputDigit('4'), wide: false },
    { label: '5', type: 'digit' as const, action: () => inputDigit('5'), wide: false },
    { label: '6', type: 'digit' as const, action: () => inputDigit('6'), wide: false },
    { label: '\u2212', type: 'operator' as const, action: () => performOperation('\u2212'), wide: false },
    { label: '1', type: 'digit' as const, action: () => inputDigit('1'), wide: false },
    { label: '2', type: 'digit' as const, action: () => inputDigit('2'), wide: false },
    { label: '3', type: 'digit' as const, action: () => inputDigit('3'), wide: false },
    { label: '+', type: 'operator' as const, action: () => performOperation('+'), wide: false },
    { label: '0', type: 'digit' as const, action: () => inputDigit('0'), wide: true },
    { label: ',', type: 'digit' as const, action: inputDecimal, wide: false },
    { label: '=', type: 'operator' as const, action: performCalculation, wide: false },
  ];

  return (
    <div className="h-full flex flex-col items-center justify-center p-4 md:p-8" ref={calcRef}>
      {showHistory && history.length > 0 && (
        <div className="absolute top-16 right-4 md:top-20 md:right-8 rounded-xl p-4 shadow-2xl z-10 w-[260px] md:w-[280px] max-h-[250px] md:max-h-[300px] overflow-y-auto"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>История</span>
            <button onClick={() => setHistory([])} className="text-[12px] text-[#FF9F0A] hover:underline">Очистить</button>
          </div>
          {history.map((item, i) => (
            <div key={i} className="py-2 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
              <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{item.expression}</p>
              <p className="text-[16px] font-medium" style={{ color: 'var(--text-primary)' }}>= {item.result}</p>
            </div>
          ))}
        </div>
      )}

      <div className="w-full max-w-[320px] rounded-[12px] overflow-hidden" style={{
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
      }}>
        {/* Display */}
        <div
          className="px-4 md:px-5 pt-3 md:pt-4 pb-2 cursor-pointer"
          style={{ background: 'var(--surface)' }}
          onClick={() => setShowHistory(!showHistory)}
        >
          <div className="h-5 md:h-6 text-right">
            {previousValue && operator && (
              <span className="text-[12px] md:text-[14px]" style={{ color: 'var(--text-secondary)' }}>
                {previousValue} {operator}
              </span>
            )}
          </div>
          <div className="h-[50px] md:h-[60px] flex items-center justify-end">
            <span className="text-[40px] md:text-[48px] font-light tracking-tight truncate" style={{ color: 'var(--text-primary)' }}>
              {display}
            </span>
          </div>
        </div>

        {/* Keyboard */}
        <div className="grid grid-cols-4 gap-[1px]" style={{ background: 'var(--border)' }}>
          {buttons.map(btn => (
            <button
              key={btn.label}
              onClick={btn.action}
              className={`
                ${btn.wide ? 'col-span-2' : ''}
                h-[56px] md:h-[64px] text-[22px] md:text-[24px] font-normal
                transition-all duration-100 active:scale-[0.96]
                flex items-center justify-center
              `}
              style={{
                background: btn.type === 'operator' ? '#FF9F0A' : btn.type === 'function' ? 'rgba(128,128,128,0.15)' : 'var(--input-bg)',
                color: btn.type === 'operator' ? '#fff' : 'var(--text-primary)',
              }}
            >
              {btn.label === ',' ? '.' : btn.label}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-3 md:mt-4 text-[11px] md:text-[12px] text-center" style={{ color: 'var(--text-tertiary)' }}>Поддержка клавиатуры</p>
    </div>
  );
};
