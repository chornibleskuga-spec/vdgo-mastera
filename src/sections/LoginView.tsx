import { useState, useEffect } from 'react';
import { Lock, User, Eye, EyeOff, KeyRound } from 'lucide-react';

interface LoginViewProps {
  onLogin: (username: string, password: string) => boolean;
  onChangePassword: (username: string, oldPassword: string, newPassword: string) => boolean;
  error: string;
}

export const LoginView = ({ onLogin, onChangePassword, error }: LoginViewProps) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotUsername, setForgotUsername] = useState('');
  const [forgotOld, setForgotOld] = useState('');
  const [forgotNew, setForgotNew] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  useEffect(() => {
    const remembered = localStorage.getItem('vdgo_remember');
    if (remembered) {
      try {
        const { u } = JSON.parse(remembered);
        if (u) setUsername(u);
      } catch { /* ignore */ }
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = onLogin(username.trim(), password);
    if (ok && remember) {
      localStorage.setItem('vdgo_remember', JSON.stringify({ u: username.trim() }));
    } else if (ok && !remember) {
      localStorage.removeItem('vdgo_remember');
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');
    const ok = onChangePassword(forgotUsername.trim(), forgotOld, forgotNew);
    if (ok) {
      setForgotSuccess('Пароль успешно изменен!');
      setForgotOld('');
      setForgotNew('');
      setTimeout(() => setShowForgot(false), 1500);
    } else {
      setForgotError('Неверный логин или старый пароль');
    }
  };

  return (
    <div className="h-full w-full flex items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
      <div className="w-full max-w-[360px]">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="w-10 h-10 rounded-[4px] flex items-center justify-center mx-auto mb-3" style={{ background: 'var(--accent)' }}>
            <KeyRound size={20} className="text-white" />
          </div>
          <h1 className="text-[20px] font-semibold" style={{ color: 'var(--text-primary)' }}>ВДГО Мастер</h1>
          <p className="text-[12px] mt-1" style={{ color: 'var(--text-secondary)' }}>Вход в систему</p>
        </div>

        {!showForgot ? (
          <form onSubmit={handleSubmit} className="rounded-[6px] p-5 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-card)' }}>
            {error && (
              <div className="mb-3 px-3 py-2 rounded-[4px] text-[12px] font-medium border" style={{ background: 'var(--badge-red)', color: 'var(--danger)', borderColor: 'rgba(209,52,56,0.2)' }}>
                {error}
              </div>
            )}

            <div className="space-y-3">
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Логин"
                  autoComplete="username"
                  className="w-full rounded-[4px] pl-10 pr-4 py-2.5 text-[14px] outline-none transition-all focus:ring-1"
                  style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--input-border)', '--tw-ring-color': 'var(--accent)' } as React.CSSProperties}
                />
              </div>

              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Пароль"
                  autoComplete="current-password"
                  className="w-full rounded-[4px] pl-10 pr-10 py-2.5 text-[14px] outline-none transition-all focus:ring-1"
                  style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--input-border)', '--tw-ring-color': 'var(--accent)' } as React.CSSProperties}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div
                  onClick={() => setRemember(!remember)}
                  className="w-[16px] h-[16px] rounded-[3px] border-2 flex items-center justify-center transition-all cursor-pointer"
                  style={remember ? { background: 'var(--accent)', borderColor: 'var(--accent)' } : { borderColor: 'var(--text-tertiary)' }}
                >
                  {remember && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>Запомнить логин</span>
              </label>

              <button
                type="submit"
                disabled={!username.trim() || !password}
                className="w-full py-2.5 text-white text-[14px] font-medium rounded-[4px] transition-all active:scale-[0.99] disabled:opacity-40 mt-1"
                style={{ background: 'var(--accent)' }}
              >
                Войти
              </button>
            </div>

            <div className="mt-3 text-center">
              <button type="button" onClick={() => { setShowForgot(true); setForgotError(''); setForgotSuccess(''); }}
                className="text-[12px] transition-colors" style={{ color: 'var(--accent)' }}>
                Сменить пароль
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleChangePassword} className="rounded-[6px] p-5 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-card)' }}>
            <div className="flex items-center gap-2 mb-4">
              <button type="button" onClick={() => setShowForgot(false)} className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>← Назад</button>
            </div>

            {forgotError && (
              <div className="mb-3 px-3 py-2 rounded-[4px] text-[12px] font-medium border" style={{ background: 'var(--badge-red)', color: 'var(--danger)', borderColor: 'rgba(209,52,56,0.2)' }}>{forgotError}</div>
            )}
            {forgotSuccess && (
              <div className="mb-3 px-3 py-2 rounded-[4px] text-[12px] font-medium border" style={{ background: 'var(--badge-green)', color: 'var(--success)', borderColor: 'rgba(16,124,16,0.2)' }}>{forgotSuccess}</div>
            )}

            <div className="space-y-3">
              <input type="text" value={forgotUsername} onChange={e => setForgotUsername(e.target.value)} placeholder="Логин"
                className="w-full rounded-[4px] px-4 py-2.5 text-[14px] outline-none" style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--input-border)' }} />
              <input type="password" value={forgotOld} onChange={e => setForgotOld(e.target.value)} placeholder="Старый пароль"
                className="w-full rounded-[4px] px-4 py-2.5 text-[14px] outline-none" style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--input-border)' }} />
              <input type="password" value={forgotNew} onChange={e => setForgotNew(e.target.value)} placeholder="Новый пароль"
                className="w-full rounded-[4px] px-4 py-2.5 text-[14px] outline-none" style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--input-border)' }} />
              <button type="submit" className="w-full py-2.5 text-white text-[14px] font-medium rounded-[4px]" style={{ background: 'var(--accent)' }}>
                Сменить пароль
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
