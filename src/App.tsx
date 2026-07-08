import { useState, Component, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import type { ViewType } from '@/types';
import { useStore } from '@/hooks/useStore';
import { useTheme } from '@/hooks/useTheme';
import { Sidebar } from '@/sections/Sidebar';
import { MobileNav } from '@/sections/MobileNav';
import { LoginView } from '@/sections/LoginView';
import { WorkView } from '@/sections/WorkView';
import { PriceView } from '@/sections/PriceView';
import { RemindersView } from '@/sections/RemindersView';
import { CalculatorView } from '@/sections/CalculatorView';
import { CaseHistoryView } from '@/sections/CaseHistoryView';
import { KpiDashboardView } from '@/sections/KpiDashboardView';
import { KpiCasesView } from '@/sections/KpiCasesView';
import { Ref1cView } from '@/sections/Ref1cView';
import { RefGasView } from '@/sections/RefGasView';
import { RefCashView } from '@/sections/RefCashView';
import { DispatcherView } from '@/sections/DispatcherView';
import { AppsView } from '@/sections/AppsView';
import { NotHomeView } from '@/sections/NotHomeView';
import { CallHistoryView } from '@/sections/CallHistoryView';
import { FarView } from '@/sections/FarView';
import './App.css';

// Error Boundary — prevents black screen on errors
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: string }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: '' };
  }
  static getDerivedStateFromError(err: Error) {
    return { hasError: true, error: err.message };
  }
  componentDidCatch(err: Error, info: any) {
    console.error('[ErrorBoundary]', err, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen flex flex-col items-center justify-center p-6" style={{ background: 'var(--bg-primary)' }}>
          <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(209,52,56,0.1)' }}>
            <AlertTriangle size={26} style={{ color: 'var(--danger)' }} />
          </div>
          <h2 className="text-[16px] font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Что-то пошло не так</h2>
          <p className="text-[12px] mb-4 max-w-[300px] text-center" style={{ color: 'var(--text-secondary)' }}>
            Возможно, данные из старой версии конфликтуют. Нажмите &quot;Сбросить&quot; чтобы очистить кэш и перезагрузить.
          </p>
          {this.state.error && (
            <p className="text-[10px] mb-4 px-3 py-2 rounded-md font-mono max-w-[300px] break-all" style={{ background: 'var(--surface)', color: 'var(--text-secondary)' }}>{this.state.error}</p>
          )}
          <button
            onClick={() => { localStorage.clear(); window.location.reload(); }}
            className="flex items-center gap-2 px-5 py-2.5 text-white text-[13px] font-medium rounded-lg transition-all active:scale-[0.97]"
            style={{ background: 'var(--danger)' }}
          >
            <RotateCcw size={14} /> Сбросить и перезагрузить
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const [activeView, setActiveView] = useState<ViewType>('work');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loginError, setLoginError] = useState('');
  const store = useStore();
  const { theme, toggleTheme } = useTheme();

  // All unresolved notes (any date)
  const allNotes = store.notes || [];
  const unresolvedNotes = allNotes.filter(n => n.status === 'Не решен' || n.status === 'В процессе');
  const notifCount = unresolvedNotes.length;

  const handleLogin = (username: string, password: string): boolean => {
    const ok = store.login(username, password);
    if (!ok) setLoginError('Неверный логин или пароль');
    else setLoginError('');
    return ok;
  };

  const handleChangePassword = (username: string, oldPassword: string, newPassword: string): boolean => {
    const users = JSON.parse(localStorage.getItem('vdgo_users_v1') || '[]');
    const user = users.find((u: any) => u.username === username && u.password === oldPassword);
    if (!user) return false;
    store.changePassword(username, newPassword);
    return true;
  };

  if (store.isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4" style={{ background: 'var(--accent)' }}>
          <span className="text-white text-xl font-bold">В</span>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Загрузка...</p>
      </div>
    );
  }

  if (!store.currentUser) {
    return <LoginView onLogin={handleLogin} onChangePassword={handleChangePassword} error={loginError} />;
  }

  const renderView = () => {
    switch (activeView) {
      case 'work': {
        const workCases = store.getWorkCases() || [];
        const activeCase = workCases.find(c => c.status === 'active') || null;
        return (
          <WorkView
            activeCase={activeCase}
            workCases={workCases}
            workers={store.workers}
            onCreateCase={store.createCase}
            onSaveCase={store.saveCase}
            onCloseCase={store.closeCase}
            onDeleteCase={store.deleteCase}
            onAddAddress={store.addAddress}
            onRemoveAddress={store.removeAddress}
            onEditAddress={store.editAddress}
            onSwapAddress={store.swapAddress}
            onExportCase={store.exportCaseToExcel}
            getWorkerAddresses={store.getWorkerAddresses}
            searchAllAddresses={store.searchAllAddresses}
            formatDateDMY={store.formatDateDMY}
          />
        );
      }
      case 'price':
        return <PriceView />;
      case 'reminders':
        return (
          <AppsView onNavigate={setActiveView} />
        );
      case 'calculator':
        return <AppsView onNavigate={setActiveView} />;
      case 'case-history':
        return (
          <CaseHistoryView
            cases={store.cases}
            onDeleteCase={store.deleteCase}
            workers={store.workers}
            formatDateDMY={store.formatDateDMY}
          />
        );
      case 'kpi':
        return (
          <KpiDashboardView
            workers={store.workers}
            activeSession={store.activeKpiSession}
            onUpsertEntry={store.upsertKpiEntry}
            onDeleteEntry={store.deleteKpiEntry}
            onSaveSession={store.saveKpiSession}
            toggleDuty={store.toggleDuty}
            clearDuties={store.clearDuties}
            duties={store.duties}
          />
        );
      case 'kpi-cases':
        return (
          <KpiCasesView
            kpiCases={store.kpiCases}
            workers={store.workers}
            onDelete={store.deleteKpiCase}
            onExport={store.exportKpiToExcel}
          />
        );
      case 'ref-1c':
        return <Ref1cView />;
      case 'ref-gas':
        return <RefGasView />;
      case 'ref-cash':
        return <RefCashView cashRegisters={store.cashRegisters} workers={store.workers} onUpdateCash={store.updateCashRegister} />;
      case 'dispatcher':
        return (
          <DispatcherView
            dispatcherData={store.dispatcherData}
            onSaveDispatcher={store.saveDispatcher}
            onDeleteDispatcher={store.deleteDispatcher}
          />
        );
      case 'cash':
        return <RefCashView cashRegisters={store.cashRegisters} workers={store.workers} onUpdateCash={store.updateCashRegister} />;
      case 'apps':
        return <AppsView onNavigate={setActiveView} />;
      case 'not-home':
        return <NotHomeView addNote={store.addNote} />;
      case 'call-history':
        return <CallHistoryView />;
      case 'far':
        return <FarView />;
      default:
        return null;
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        notesCount={store.data.notes.length}
        activeCasesCount={store.data.cases.filter(c => c.status === 'active').length}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(v => !v)}
        theme={theme}
        onToggleTheme={toggleTheme}
        currentUser={store.currentUser}
        userName={store.getUserName()}
        onLogout={store.logout}
        p2pStatus={store.p2pStatus}
        p2pPeers={store.p2pPeers}
        peerNames={store.peerNames}
        syncError={store.syncError}
        notifCount={notifCount}
        unresolvedNotes={unresolvedNotes}
      />

      <MobileNav
        activeView={activeView}
        onViewChange={setActiveView}
        notesCount={store.data.notes.length}
        activeCasesCount={store.data.cases.filter(c => c.status === 'active').length}
        theme={theme}
        onToggleTheme={toggleTheme}
        currentUser={store.currentUser}
        userName={store.getUserName()}
        onLogout={store.logout}
      />

      <main
        className={`app-main flex-1 overflow-hidden ${sidebarCollapsed ? 'app-main-collapsed' : ''}`}
      >
        {renderView()}
      </main>
    </div>
  );
}
