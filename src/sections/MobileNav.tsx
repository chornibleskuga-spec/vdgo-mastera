import { useState } from 'react';
import { Briefcase, FileText, Calendar, Calculator, FolderOpen, TrendingUp, Sun, Moon, LogOut, User, Hash, FileCheck, CreditCard, Headset, ClipboardList, Menu, X, BookOpen, ChevronDown, ChevronUp, History, FileSpreadsheet } from 'lucide-react';
import type { ViewType } from '@/types';

interface MobileNavProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
  notesCount: number;
  activeCasesCount: number;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  currentUser: string | null;
  userName: string;
  onLogout: () => void;
}

const mainItems: { id: ViewType; label: string; icon: React.ElementType; badge?: boolean }[] = [
  { id: 'work', label: 'Работа', icon: Briefcase, badge: true },
  { id: 'kpi', label: 'KPI планшет', icon: ClipboardList },
  { id: 'price', label: 'Прейскурант', icon: FileText },
  { id: 'reminders', label: 'Напоминания', icon: Calendar, badge: true },
  { id: 'calculator', label: 'Калькулятор', icon: Calculator },
  { id: 'dispatcher', label: 'Диспетчер', icon: Headset },
  { id: 'cash', label: 'Кассы', icon: CreditCard },
];

const historyItems: { id: ViewType; label: string; icon: React.ElementType }[] = [
  { id: 'case-history', label: 'История кейсов', icon: FolderOpen },
  { id: 'kpi-cases', label: 'История KPI', icon: TrendingUp },
];

const refItems: { id: ViewType; label: string; icon: React.ElementType }[] = [
  { id: 'ref-1c', label: '1С коды', icon: Hash },
  { id: 'ref-gas', label: 'Отписка наряда', icon: FileCheck },
];

export const MobileNav = (props: MobileNavProps) => {
  const { activeView, onViewChange, theme, onToggleTheme, currentUser, userName, onLogout } = props;
  const [open, setOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [refOpen, setRefOpen] = useState(false);
  const isHistoryActive = historyItems.some(r => r.id === activeView);
  const isRefActive = refItems.some(r => r.id === activeView);

  const handleNav = (view: ViewType) => {
    onViewChange(view);
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-3 right-3 z-[60] md:hidden w-10 h-10 rounded-[6px] flex items-center justify-center shadow-md"
        style={{ background: 'var(--accent)' }}
      >
        {open ? <X size={20} className="text-white" strokeWidth={1.5} /> : <Menu size={20} className="text-white" strokeWidth={1.5} />}
      </button>

      {open && (
        <div className="fixed inset-0 z-[55] md:hidden" style={{ background: 'var(--overlay)' }} onClick={() => setOpen(false)} />
      )}

      <aside
        className="fixed top-0 left-0 bottom-0 z-[56] md:hidden flex flex-col transition-transform duration-300 ease-out"
        style={{ width: '260px', background: 'var(--sidebar-bg)', transform: open ? 'translateX(0)' : 'translateX(-100%)' }}
      >
        <div className="flex items-center h-[52px] px-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2.5 flex-1">
            <div className="w-[30px] h-[30px] rounded-[6px] flex items-center justify-center" style={{ background: 'var(--accent)' }}>
              <Briefcase size={14} className="text-white" strokeWidth={1.5} />
            </div>
            <span className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>ВДГО Мастер</span>
          </div>
        </div>

        <nav className="flex-1 px-3 pt-3 pb-2 space-y-[2px] overflow-y-auto">
          {mainItems.map(item => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            const count = item.id === 'reminders' ? props.notesCount : item.id === 'work' ? props.activeCasesCount : 0;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className="w-full flex items-center rounded-[4px] text-[13px] font-normal transition-all duration-150 px-3 py-2"
                style={{
                  gap: '10px',
                  background: isActive ? 'var(--sidebar-active-bg)' : 'transparent',
                  color: isActive ? 'var(--sidebar-text-active)' : 'var(--sidebar-text)',
                  border: isActive ? '1px solid rgba(0,120,212,0.12)' : '1px solid transparent',
                }}
              >
                <Icon size={16} strokeWidth={1.5} style={{ color: isActive ? 'var(--accent)' : 'var(--text-tertiary)' }} className="flex-shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && count > 0 && (
                  <span className="min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-semibold text-white px-1" style={{ background: 'var(--accent)' }}>{count}</span>
                )}
              </button>
            );
          })}

          <div className="h-px my-2" style={{ background: 'var(--border)' }} />

          {/* История */}
          <div>
            <button
              onClick={() => setHistoryOpen(v => !v)}
              className="w-full flex items-center rounded-[4px] text-[13px] font-normal transition-all duration-150 px-3 py-2"
              style={{
                background: isHistoryActive ? 'var(--sidebar-active-bg)' : 'transparent',
                color: isHistoryActive ? 'var(--sidebar-text-active)' : 'var(--sidebar-text)',
                border: isHistoryActive ? '1px solid rgba(0,120,212,0.12)' : '1px solid transparent',
              }}
            >
              <History size={16} strokeWidth={1.5} style={{ color: isHistoryActive ? 'var(--accent)' : 'var(--text-tertiary)' }} className="flex-shrink-0" />
              <span className="flex-1 text-left ml-2.5">История</span>
              {historyOpen ? <ChevronUp size={14} strokeWidth={1.5} style={{ opacity: 0.5 }} /> : <ChevronDown size={14} strokeWidth={1.5} style={{ opacity: 0.5 }} />}
            </button>
            {historyOpen && (
              <div className="ml-6 mt-[2px] space-y-[2px]">
                {historyItems.map(item => {
                  const Icon = item.icon;
                  const isActive = activeView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNav(item.id)}
                      className="w-full flex items-center rounded-[4px] text-[12px] font-normal transition-all duration-150 px-3 py-2"
                      style={{ gap: '8px', background: isActive ? 'var(--sidebar-active-bg)' : 'transparent', color: isActive ? 'var(--sidebar-text-active)' : 'var(--sidebar-text)', border: isActive ? '1px solid rgba(0,120,212,0.12)' : '1px solid transparent' }}
                    >
                      <Icon size={14} strokeWidth={1.5} style={{ color: isActive ? 'var(--accent)' : 'var(--text-tertiary)' }} className="flex-shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Справочник */}
          <div>
            <button
              onClick={() => setRefOpen(v => !v)}
              className="w-full flex items-center rounded-[4px] text-[13px] font-normal transition-all duration-150 px-3 py-2"
              style={{
                background: isRefActive ? 'var(--sidebar-active-bg)' : 'transparent',
                color: isRefActive ? 'var(--sidebar-text-active)' : 'var(--sidebar-text)',
                border: isRefActive ? '1px solid rgba(0,120,212,0.12)' : '1px solid transparent',
              }}
            >
              <BookOpen size={16} strokeWidth={1.5} style={{ color: isRefActive ? 'var(--accent)' : 'var(--text-tertiary)' }} className="flex-shrink-0" />
              <span className="flex-1 text-left ml-2.5">Справочник</span>
              {refOpen ? <ChevronUp size={14} strokeWidth={1.5} style={{ opacity: 0.5 }} /> : <ChevronDown size={14} strokeWidth={1.5} style={{ opacity: 0.5 }} />}
            </button>
            {refOpen && (
              <div className="ml-6 mt-[2px] space-y-[2px]">
                {refItems.map(item => {
                  const Icon = item.icon;
                  const isActive = activeView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNav(item.id)}
                      className="w-full flex items-center rounded-[4px] text-[12px] font-normal transition-all duration-150 px-3 py-2"
                      style={{ gap: '8px', background: isActive ? 'var(--sidebar-active-bg)' : 'transparent', color: isActive ? 'var(--sidebar-text-active)' : 'var(--sidebar-text)', border: isActive ? '1px solid rgba(0,120,212,0.12)' : '1px solid transparent' }}
                    >
                      <Icon size={14} strokeWidth={1.5} style={{ color: isActive ? 'var(--accent)' : 'var(--text-tertiary)' }} className="flex-shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        <div className="px-3 pb-4 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
          {currentUser && (
            <div className="flex items-center gap-2 mb-2 px-2 py-1.5 rounded-[4px]" style={{ background: 'var(--bg-secondary)' }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent)' }}>
                <User size={14} className="text-white" strokeWidth={1.5} />
              </div>
              <span className="text-[12px] font-medium truncate flex-1" style={{ color: 'var(--text-secondary)' }}>{userName}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button onClick={onToggleTheme} className="flex-1 flex items-center gap-2 px-3 py-2 rounded-[4px] text-[12px] font-normal transition-all" style={{ color: 'var(--text-secondary)', background: 'var(--bg-secondary)' }}>
              {theme === 'light' ? <Moon size={16} strokeWidth={1.5} /> : <Sun size={16} strokeWidth={1.5} />}
              {theme === 'light' ? 'Тёмная' : 'Светлая'}
            </button>
            {currentUser && (
              <button onClick={onLogout} className="px-3 py-2 rounded-[4px] transition-all" style={{ color: 'var(--danger)', background: 'var(--bg-secondary)' }} title="Выйти">
                <LogOut size={16} strokeWidth={1.5} />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
