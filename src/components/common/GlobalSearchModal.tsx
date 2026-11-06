import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  Package,
  Pill,
  FileText,
  Phone,
  CheckSquare,
  ArrowRight,
  MapPin,
} from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { NavTab } from '../layout/Sidebar';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: NavTab) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const {
    inventory,
    medicines,
    docs,
    contacts,
    tasks,
    properties,
  } = useHousehold();

  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = searchQuery.toLowerCase().trim();

  // 1. Поиск по вещам и инвентарю
  const matchedInventory = q
    ? inventory.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.locationZone.toLowerCase().includes(q) ||
          (i.notes && i.notes.toLowerCase().includes(q))
      )
    : [];

  // 2. Поиск по аптечке
  const matchedMeds = q
    ? medicines.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          (m.activeSubstance && m.activeSubstance.toLowerCase().includes(q)) ||
          (m.instructions && m.instructions.toLowerCase().includes(q)) ||
          (m.location && m.location.toLowerCase().includes(q))
      )
    : [];

  // 3. Поиск по документам
  const matchedDocs = q
    ? docs.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          (d.notes && d.notes.toLowerCase().includes(q)) ||
          (d.documentNumber && d.documentNumber.toLowerCase().includes(q))
      )
    : [];

  // 4. Поиск по мастерам и контактам
  const matchedContacts = q
    ? contacts.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.specialty.toLowerCase().includes(q) ||
          (c.address && c.address.toLowerCase().includes(q)) ||
          c.phone.includes(q)
      )
    : [];

  // 5. Поиск по задачам
  const matchedTasks = q
    ? tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          t.zone.toLowerCase().includes(q)
      )
    : [];

  const totalResults =
    matchedInventory.length +
    matchedMeds.length +
    matchedDocs.length +
    matchedContacts.length +
    matchedTasks.length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-start justify-center p-4 sm:p-6 pt-16 sm:pt-20">
      <div
        className="fixed inset-0"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl bg-[#FCFBF8] rounded-3xl border border-[#E0DBD1] shadow-2xl overflow-hidden flex flex-col">
        {/* Поле поиска «Где лежит?» */}
        <div className="p-4 sm:p-5 border-b border-[#EBE7DF] bg-white flex items-center space-x-3">
          <Search className="w-5 h-5 text-[#E15A42] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Где лежит? Поиск по вещам, лекарствам, мастерам, документам..."
            className="w-full bg-transparent text-sm sm:text-base font-medium text-[#1F1D1A] outline-none placeholder:text-stone-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-2 py-1 rounded-lg bg-stone-100 text-stone-500 text-xs hover:bg-stone-200"
          >
            Esc
          </button>
        </div>

        {/* Быстрые подсказки если пусто */}
        {!q && (
          <div className="p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#E15A42] flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#1F1D1A]">Быстрый поиск по дому «Где лежит?»</h4>
              <p className="text-xs text-[#8A8477] mt-1 max-w-sm mx-auto">
                Введите название инструмента, лекарства, документа или мастера для мгновенного нахождения
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              {['Шуруповерт', 'Ибупрофен', 'Паспорт', 'Сантехник', 'Запасные ключи', 'Счетчики'].map(
                (chip) => (
                  <button
                    key={chip}
                    onClick={() => setSearchQuery(chip)}
                    className="px-3 py-1.5 rounded-xl bg-white border border-stone-200 text-xs text-stone-700 hover:border-[#E15A42] hover:text-[#E15A42] transition-colors cursor-pointer shadow-2xs"
                  >
                    {chip}
                  </button>
                )
              )}
            </div>
          </div>
        )}

        {/* Результаты поиска */}
        {q && (
          <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
            {totalResults === 0 ? (
              <div className="text-center py-10 text-stone-500 space-y-1">
                <p className="text-sm font-semibold">По запросу «{searchQuery}» ничего не найдено</p>
                <p className="text-xs text-stone-400">Попробуйте ввести синоним или часть названия</p>
              </div>
            ) : (
              <>
                {/* 1. Вещи и Инвентарь */}
                {matchedInventory.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider px-2">
                      Вещи и имущество ({matchedInventory.length})
                    </div>
                    {matchedInventory.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          onClose();
                          onNavigate('inventory');
                        }}
                        className="p-3 rounded-2xl bg-white border border-[#EBE7DF] hover:border-[#E15A42]/50 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                            <Package className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-[#1F1D1A]">{item.name}</div>
                            <div className="text-[11px] text-[#8A8477] flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-stone-400" />
                              <span>Зона: <strong>{item.locationZone}</strong></span>
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-stone-300" />
                      </div>
                    ))}
                  </div>
                )}

                {/* 2. Аптечка */}
                {matchedMeds.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider px-2">
                      Домашняя аптечка ({matchedMeds.length})
                    </div>
                    {matchedMeds.map((med) => (
                      <div
                        key={med.id}
                        onClick={() => {
                          onClose();
                          onNavigate('firstaid');
                        }}
                        className="p-3 rounded-2xl bg-white border border-[#EBE7DF] hover:border-emerald-500/50 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                            <Pill className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-[#1F1D1A]">{med.name}</div>
                            <div className="text-[11px] text-[#8A8477]">
                              {med.activeSubstance || med.instructions || 'Препарат'} {med.location ? `• Где: ${med.location}` : ''}
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-stone-300" />
                      </div>
                    ))}
                  </div>
                )}

                {/* 3. Мастера и контакты */}
                {matchedContacts.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold text-sky-700 uppercase tracking-wider px-2">
                      Мастера и службы ({matchedContacts.length})
                    </div>
                    {matchedContacts.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          onClose();
                          onNavigate('contacts');
                        }}
                        className="p-3 rounded-2xl bg-white border border-[#EBE7DF] hover:border-sky-500/50 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
                            <Phone className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-[#1F1D1A]">{c.name}</div>
                            <div className="text-[11px] text-[#8A8477]">
                              {c.specialty} • {c.phone} {c.address ? `• ${c.address}` : ''}
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-stone-300" />
                      </div>
                    ))}
                  </div>
                )}

                {/* 4. Документы */}
                {matchedDocs.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold text-rose-700 uppercase tracking-wider px-2">
                      Документы дома ({matchedDocs.length})
                    </div>
                    {matchedDocs.map((doc) => (
                      <div
                        key={doc.id}
                        onClick={() => {
                          onClose();
                          onNavigate('docs');
                        }}
                        className="p-3 rounded-2xl bg-white border border-[#EBE7DF] hover:border-rose-500/50 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-[#1F1D1A]">{doc.title}</div>
                            <div className="text-[11px] text-[#8A8477]">
                              Категория: {doc.category} {doc.expiryDate ? `• До: ${doc.expiryDate}` : ''}
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-stone-300" />
                      </div>
                    ))}
                  </div>
                )}

                {/* 5. Задачи */}
                {matchedTasks.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold text-stone-600 uppercase tracking-wider px-2">
                      Задачи ({matchedTasks.length})
                    </div>
                    {matchedTasks.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => {
                          onClose();
                          onNavigate('tasks');
                        }}
                        className="p-3 rounded-2xl bg-white border border-[#EBE7DF] hover:border-stone-400 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-xl bg-stone-100 text-stone-600 flex items-center justify-center shrink-0">
                            <CheckSquare className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-[#1F1D1A]">{t.title}</div>
                            <div className="text-[11px] text-[#8A8477]">
                              Зона: {t.zone} • Срок: {t.dueDate}
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-stone-300" />
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
