import { useState, useEffect, useCallback } from 'react';
import { Download, X, Monitor, Chrome, Info } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface Window {
    __deferredInstallPrompt?: BeforeInstallPromptEvent;
  }
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    const checkInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
        setIsInstalled(true);
        return true;
      }
      return false;
    };

    if (checkInstalled()) return;

    // Check if prompt was captured before React mounted
    if (window.__deferredInstallPrompt) {
      setDeferredPrompt(window.__deferredInstallPrompt);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Also listen for appinstalled
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowDialog(false);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
      setShowDialog(false);
    }
  }, [deferredPrompt]);

  const handleShowInstructions = useCallback(() => {
    // Check for globally captured prompt when opening dialog
    if (window.__deferredInstallPrompt && !deferredPrompt) {
      setDeferredPrompt(window.__deferredInstallPrompt);
    }
    setShowDialog(true);
  }, [deferredPrompt]);

  // Don't show if already installed
  if (isInstalled) return null;

  return (
    <>
      {/* Button in sidebar style */}
      <button
        onClick={handleShowInstructions}
        title="Установить приложение"
        className="w-full flex items-center rounded-[10px] text-[13px] font-medium transition-all duration-200 active:scale-[0.97] mb-1"
        style={{
          padding: '9px 12px',
          gap: '10px',
          color: 'rgba(255,255,255,0.5)',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(10,132,255,0.15)';
          e.currentTarget.style.color = '#5AC8FA';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
        }}
      >
        <Download size={16} strokeWidth={1.5} className="flex-shrink-0" />
        <span className="flex-1 text-left">Установить приложение</span>
      </button>

      {/* Install Dialog */}
      {showDialog && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}
          onClick={() => setShowDialog(false)}
        >
          <div
            className="w-full max-w-[420px] rounded-2xl p-6 relative"
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border)',
              boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setShowDialog(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg transition-all"
              style={{ color: 'var(--text-secondary)' }}
            >
              <X size={18} />
            </button>

            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: 'var(--accent-gradient)', boxShadow: '0 4px 16px rgba(10,132,255,0.3)' }}
              >
                <Monitor size={28} className="text-white" />
              </div>
            </div>

            {/* Title */}
            <h3 className="text-center text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
              Установить ВДГО Мастер
            </h3>
            <p className="text-center text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              Быстрый доступ с рабочего стола, без адресной строки
            </p>

            {/* Install button if available */}
            {deferredPrompt ? (
              <button
                onClick={handleInstall}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.97] mb-4"
                style={{
                  background: 'var(--accent-gradient)',
                  boxShadow: '0 4px 12px rgba(10,132,255,0.3)',
                }}
              >
                <span className="flex items-center justify-center gap-2">
                  <Download size={16} />
                  Установить как приложение
                </span>
              </button>
            ) : (
              <>
                {/* Browser instructions */}
                <div
                  className="rounded-xl p-4 mb-4 text-sm"
                  style={{ background: 'var(--input-bg)', border: '1px solid var(--border)' }}
                >
                  <div className="flex items-start gap-3">
                    <Info size={18} className="flex-shrink-0 mt-0.5" style={{ color: '#5AC8FA' }} />
                    <div style={{ color: 'var(--text-secondary)' }}>
                      <p className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                        Как установить вручную:
                      </p>

                      <div className="space-y-3">
                        {/* Chrome */}
                        <div className="flex items-start gap-2">
                          <Chrome size={14} className="flex-shrink-0 mt-1" />
                          <div>
                            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Chrome / Edge:</span>
                            <p className="text-xs mt-0.5">Нажмите ⋮ (три точки) → Установить ВДГО Мастер</p>
                          </div>
                        </div>

                        {/* Safari iOS */}
                        <div className="flex items-start gap-2">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-1">
                            <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/>
                            <circle cx="12" cy="10" r="3"/>
                          </svg>
                          <div>
                            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Safari (iPhone/iPad):</span>
                            <p className="text-xs mt-0.5">Поделиться → На экран «Домой»</p>
                          </div>
                        </div>

                        {/* Windows */}
                        <div className="flex items-start gap-2">
                          <Monitor size="14" className="flex-shrink-0 mt-1" />
                          <div>
                            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Windows:</span>
                            <p className="text-xs mt-0.5">F12 → ⋮ → Другие инструменты → Создать ярлык</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Open in browser button */}
                <button
                  onClick={() => setShowDialog(false)}
                  className="w-full py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.97]"
                  style={{
                    background: 'var(--input-bg)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border)',
                  }}
                >
                  Продолжить в браузере
                </button>
              </>
            )}

            {/* Footer note */}
            <p className="text-center text-[11px] mt-4" style={{ color: 'var(--text-tertiary)' }}>
              Установленное приложение работает без интернета
            </p>
          </div>
        </div>
      )}
    </>
  );
}
