import React from 'react';
import { X, Sparkles, Car, Plane, Check, ArrowRight } from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { TaskPack } from '../../types';

interface TaskPacksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TaskPacksModal: React.FC<TaskPacksModalProps> = ({ isOpen, onClose }) => {
  const { taskPacks, applyTaskPack } = useHousehold();

  if (!isOpen) return null;

  const getPackIcon = (icon: string) => {
    if (icon === 'Car') return <Car className="w-5 h-5" />;
    if (icon === 'Plane') return <Plane className="w-5 h-5" />;
    return <Sparkles className="w-5 h-5" />;
  };

  const handleApply = (packId: string) => {
    applyTaskPack(packId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-[#FCFBF8] rounded-3xl border border-[#EBE7DF] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-6 py-5 border-b border-[#EBE7DF] flex items-center justify-between bg-white">
          <div>
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-[#E15A42]" />
              <h3 className="text-lg font-bold text-[#1F1D1A]">
                Пакеты задач OneHaus (Task Packs)
              </h3>
            </div>
            <p className="text-xs text-[#8A8477] mt-0.5">
              Готовые наборы домашних обязанностей для сезонных и регулярных бытовых сценариев
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-black/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {taskPacks.map((pack) => (
            <div
              key={pack.id}
              className="p-5 rounded-2xl bg-white border border-[#E5DFD1] hover:border-[#E15A42]/50 hover:shadow-xs transition-all space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#F7F4EC] text-[#8C522C] flex items-center justify-center">
                    {getPackIcon(pack.icon)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-sm text-[#1F1D1A]">{pack.title}</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        {pack.badge}
                      </span>
                    </div>
                    <p className="text-xs text-[#8A8477] mt-0.5">{pack.description}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleApply(pack.id)}
                  className="px-4 py-2 rounded-xl bg-[#E15A42] hover:bg-[#D04931] text-white text-xs font-bold shadow-xs active:scale-[0.98] transition-all cursor-pointer flex items-center space-x-1.5 shrink-0"
                >
                  <span>Применить</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Список задач внутри пакета */}
              <div className="pt-2 border-t border-stone-100 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {pack.tasks.map((t, idx) => (
                  <div
                    key={idx}
                    className="flex items-center space-x-2 text-xs text-[#5C564B] bg-[#FAF8F3] px-2.5 py-1.5 rounded-lg"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E15A42]" />
                    <span className="truncate">{t.title}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
