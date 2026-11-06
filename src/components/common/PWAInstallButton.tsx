import React, { useState } from 'react';
import { Download, Share2, Check, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'primary' | 'outline' | 'compact' | 'sidebar';
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
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-[#E8E2D4] hover:border-[#E15A42] text-[#4A443B] hover:text-[#E15A42] hover:bg-orange-50/50 transition-all cursor-pointer shadow-2xs ${className}`}
          title="Установить приложение на устройство для быстрой оффлайн-работы"
        >
          <div className="flex items-center space-x-2">
            <Download className="w-3.5 h-3.5 text-[#E15A42]" />
            <span>Установить приложение</span>
          </div>
          <span className="text-[10px] bg-orange-100 text-[#E15A42] px-1.5 py-0.5 rounded-md font-bold">
            PWA
          </span>
        </button>
      );
    }

    if (variant === 'compact') {
      return (
        <button
          type="button"
          onClick={handleClick}
          className={`p-2 rounded-xl text-[#7A746B] hover:text-[#E15A42] hover:bg-white border border-transparent hover:border-[#E5DFD3] transition-colors cursor-pointer ${className}`}
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
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#E15A42] to-[#EA7038] text-white text-xs font-bold shadow-xs hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer ${className}`}
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
        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E3DFD5] hover:border-[#E15A42] text-[#1F1D1A] hover:text-[#E15A42] text-xs font-medium transition-all shadow-2xs cursor-pointer ${className}`}
      >
        <Download className="w-3.5 h-3.5 text-[#E15A42]" />
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
          <div className="bg-[#FAF7F2] rounded-3xl max-w-sm w-full border border-[#E5DFD3] shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Smartphone className="w-5 h-5 text-[#E15A42]" />
                <h3 className="font-bold text-sm text-[#1F1E1C]">
                  {isIOS ? 'Установка на iPhone / iPad' : 'Установка приложения'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[#7A746B] hover:text-[#1F1E1C] hover:bg-[#EDE8DC] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#5C564B]">
              {isIOS ? (
                <>
                  <p>Чтобы приложение работало автономно без интернета на вашем устройстве Apple:</p>
                  <ol className="space-y-2 list-decimal list-inside bg-white p-3.5 rounded-2xl border border-[#E8E2D4]">
                    <li>
                      Нажмите кнопку <strong className="text-[#1F1E1C]">«Поделиться»</strong>{' '}
                      <Share2 className="w-3.5 h-3.5 inline text-[#E15A42]" /> в нижней панели Safari.
                    </li>
                    <li>
                      Прокрутите вниз и выберите{' '}
                      <strong className="text-[#1F1E1C]">«На экран "Домой"»</strong>.
                    </li>
                    <li>
                      Нажмите <strong className="text-[#1F1E1C]">«Добавить»</strong> в правом верхнем углу.
                    </li>
                  </ol>
                </>
              ) : (
                <>
                  <p>
                    Приложение «Дом без хаоса» поддерживает работу без интернета через Service Worker и IndexedDB.
                  </p>
                  <p className="bg-white p-3 rounded-2xl border border-[#E8E2D4]">
                    В строке адреса браузера (или в меню «...») нажмите значок{' '}
                    <strong className="text-[#1F1E1C]">«Установить приложение»</strong>, чтобы открывать органайзер прямо с рабочего стола даже в оффлайн-режиме.
                  </p>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#E15A42] text-white text-xs font-bold hover:brightness-105 cursor-pointer"
            >
              Понятно
            </button>
          </div>
        </div>
      )}
    </>
  );
};
