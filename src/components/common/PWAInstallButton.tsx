import React, { useState } from 'react';
import { Download, Share2, Check, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'primary' | 'outline' | 'compact' | 'sidebar' | 'menu';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'outline',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);

  // Если приложение уже открыто как PWA на экране, скрываем обычную кнопку установки
  if (isInstalled && !justInstalled) {
    if (variant === 'sidebar') return null;
    return (
      <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
        <Check className="w-3.5 h-3.5 text-emerald-600" />
        <span>Установлено как приложение</span>
      </div>
    );
  }

  const handleClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (success) {
        setJustInstalled(true);
      }
    } else if (isIOS) {
      setShowIOSModal(true);
    } else {
      // Показать подсказку для браузеров без автоматического prompt
      setShowIOSModal(true);
    }
  };

  const renderButton = () => {
    if (variant === 'sidebar') {
      return (
        <button
          type="button"
          onClick={handleClick}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold bg-[var(--surface)] border border-[var(--line)] hover:border-[var(--accent)] text-[var(--text-2)] hover:text-[var(--accent)] hover:bg-orange-50/50 transition-all cursor-pointer shadow-none ${className}`}
          title="Установить приложение на устройство для быстрой оффлайн-работы"
        >
          <div className="flex items-center space-x-2">
            <Download className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Установить приложение</span>
          </div>
          <span className="text-[12px] bg-orange-100 text-[var(--accent)] px-1.5 py-0.5 rounded-md font-semibold">
            PWA
          </span>
        </button>
      );
    }

    if (variant === 'menu') {
      return (
        <button
          type="button"
          onClick={handleClick}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left text-[var(--text)] hover:bg-[var(--surface-3)] transition-colors ${className}`}
        >
          <Download className="w-4 h-4 text-[var(--muted)]" />
          Установить на экран устройства
        </button>
      );
    }

    if (variant === 'compact') {
      return (
        <button
          type="button"
          onClick={handleClick}
          className={`p-2 rounded-xl text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--surface)] border border-transparent hover:border-[var(--line)] transition-colors cursor-pointer ${className}`}
          title="Установить Дом без хаоса на рабочий стол"
        >
          <Download className="w-4 h-4" />
        </button>
      );
    }

    if (variant === 'primary') {
      return (
        <button
          type="button"
          onClick={handleClick}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-full bg-[var(--accent)] text-white text-xs font-semibold shadow-[var(--shadow)] hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer ${className}`}
        >
          <Download className="w-4 h-4" />
          <span>Установить на устройство</span>
        </button>
      );
    }

    // Default outline
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[var(--surface)] border border-[var(--line)] hover:border-[var(--accent)] text-[var(--text)] hover:text-[var(--accent)] text-xs font-medium transition-all shadow-none cursor-pointer ${className}`}
      >
        <Download className="w-3.5 h-3.5 text-[var(--accent)]" />
        <span>Установить PWA</span>
      </button>
    );
  };

  return (
    <>
      {renderButton()}

      {/* Информационная подсказка по установке (особенно для iOS Safari / Desktop) */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--surface-3)] rounded-2xl max-w-sm w-full border border-[var(--line)] shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Smartphone className="w-5 h-5 text-[var(--accent)]" />
                <h3 className="font-semibold text-sm text-[var(--text)]">
                  {isIOS ? 'Установка на iPhone / iPad' : 'Установка приложения'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--line)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[var(--text-2)]">
              {isIOS ? (
                <>
                  <p>Чтобы приложение работало автономно без интернета на вашем устройстве Apple:</p>
                  <ol className="space-y-2 list-decimal list-inside bg-[var(--surface)] p-3.5 rounded-2xl border border-[var(--line)]">
                    <li>
                      Нажмите кнопку <strong className="text-[var(--text)]">«Поделиться»</strong>{' '}
                      <Share2 className="w-3.5 h-3.5 inline text-[var(--accent)]" /> в нижней панели Safari.
                    </li>
                    <li>
                      Прокрутите вниз и выберите{' '}
                      <strong className="text-[var(--text)]">«На экран "Домой"»</strong>.
                    </li>
                    <li>
                      Нажмите <strong className="text-[var(--text)]">«Добавить»</strong> в правом верхнем углу.
                    </li>
                  </ol>
                </>
              ) : (
                <>
                  <p>
                    Приложение «Дом без хаоса» поддерживает работу без интернета через Service Worker и IndexedDB.
                  </p>
                  <p className="bg-[var(--surface)] p-3 rounded-2xl border border-[var(--line)]">
                    В строке адреса браузера (или в меню «...») нажмите значок{' '}
                    <strong className="text-[var(--text)]">«Установить приложение»</strong>, чтобы открывать органайзер прямо с рабочего стола даже в оффлайн-режиме.
                  </p>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 rounded-full bg-[var(--accent)] text-white text-xs font-semibold hover:brightness-105 cursor-pointer"
            >
              Понятно
            </button>
          </div>
        </div>
      )}
    </>
  );
};
