import { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, X, Check, CheckCheck } from 'lucide-react';

interface ChatMessage {
  id: number;
  text: string;
  from: string;
  timestamp: number;
  status?: 'sent' | 'delivered' | 'read';
}

interface ChatPanelProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function ChatPanel({ messages, onSend, isOpen, onToggle }: ChatPanelProps) {
  const [text, setText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  // Count unread messages
  const unreadCount = messages.filter(m => m.status !== 'read' && !isMe(m.from)).length;

  function isMe(from: string) {
    return from === 'Муленков' || from === 'Липчанский' || from === 'Я';
  }

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="relative flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-medium transition-all active:scale-95"
        style={{
          background: isOpen ? 'rgba(10,132,255,0.15)' : 'transparent',
          color: isOpen ? '#5AC8FA' : 'rgba(255,255,255,0.5)',
        }}
        title="Чат с коллегой"
      >
        <MessageCircle size={16} />
        <span>Чат</span>
        {unreadCount > 0 && !isOpen && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full text-[9px] font-bold flex items-center justify-center px-1"
            style={{ background: '#FF453A', color: '#fff' }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Chat drawer */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[9998]" style={{ background: 'transparent' }} onClick={onToggle} />
          <div
            className="fixed right-0 top-0 bottom-0 z-[9999] flex flex-col"
            style={{
              width: '360px',
              background: 'var(--bg-primary)',
              borderLeft: '1px solid var(--border)',
              boxShadow: '-20px 0 60px rgba(0,0,0,0.2)',
              animation: 'slideInChat 0.2s ease-out',
            }}
          >
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-3"
              style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2">
                <MessageCircle size={18} style={{ color: '#5AC8FA' }} />
                <span className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Чат с коллегой
                </span>
              </div>
              <button
                onClick={onToggle}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
              style={{ background: 'var(--bg-secondary)' }}
            >
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle size={32} style={{ color: 'var(--text-tertiary)' }} className="mx-auto mb-2 opacity-30" />
                  <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                    Нет сообщений
                  </p>
                  <p className="text-[11px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
                    Напишите первое сообщение
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const me = isMe(msg.from);
                  return (
                    <div key={msg.id} className={`flex flex-col ${me ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="text-[10px] font-medium" style={{ color: me ? '#5AC8FA' : '#FF9500' }}>
                          {msg.from}
                        </span>
                        <span className="text-[9px]" style={{ color: 'var(--text-tertiary)' }}>
                          {formatTime(msg.timestamp)}
                        </span>
                      </div>
                      <div
                        className="max-w-[85%] px-3 py-2 rounded-2xl text-[13px] leading-relaxed"
                        style={{
                          background: me ? 'rgba(10,132,255,0.15)' : 'var(--card-bg)',
                          color: 'var(--text-primary)',
                          border: `1px solid ${me ? 'rgba(10,132,255,0.2)' : 'var(--border)'}`,
                          borderBottomRightRadius: me ? '4px' : '16px',
                          borderBottomLeftRadius: me ? '16px' : '4px',
                        }}
                      >
                        {msg.text}
                      </div>
                      {/* Status checkmarks for my messages */}
                      {me && (
                        <div className="flex items-center gap-0.5 mt-0.5 px-1">
                          {msg.status === 'read' ? (
                            <CheckCheck size={12} style={{ color: '#5AC8FA' }} />
                          ) : msg.status === 'delivered' ? (
                            <CheckCheck size={12} style={{ color: 'var(--text-tertiary)' }} />
                          ) : (
                            <Check size={12} style={{ color: 'var(--text-tertiary)' }} />
                          )}
                          <span className="text-[9px]" style={{ color: msg.status === 'read' ? '#5AC8FA' : 'var(--text-tertiary)' }}>
                            {msg.status === 'read' ? 'Прочитано' : msg.status === 'delivered' ? 'Доставлено' : 'Отправлено'}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Input */}
            <form
              onSubmit={handleSubmit}
              className="flex-shrink-0 flex items-center gap-2 px-3 py-3"
              style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-primary)' }}
            >
              <input
                ref={inputRef}
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Написать сообщение..."
                className="flex-1 rounded-xl px-3 py-2 text-[13px] outline-none"
                style={{
                  background: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                }}
              />
              <button
                type="submit"
                disabled={!text.trim()}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 disabled:opacity-30"
                style={{
                  background: text.trim() ? 'var(--accent-gradient)' : 'var(--input-bg)',
                }}
              >
                <Send size={15} className="text-white" />
              </button>
            </form>
          </div>

          <style>{`
            @keyframes slideInChat {
              from { transform: translateX(100%); }
              to { transform: translateX(0); }
            }
          `}</style>
        </>
      )}
    </>
  );
}
