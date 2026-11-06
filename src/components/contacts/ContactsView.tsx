import React, { useState } from 'react';
import {
  Phone,
  Plus,
  Wrench,
  Zap,
  HeartPulse,
  Dog,
  Sparkles,
  Car,
  AlertTriangle,
  Pencil,
  Trash2,
  Star,
  Copy,
  MapPin,
  X,
  AlertCircle,
} from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { ContactCategory, HouseholdContact } from '../../types';
import { ContactModal } from './ContactModal';
import { handlePhoneAction } from '../../utils/phoneUtils';

export const ContactsView: React.FC = () => {
  const { contacts, deleteContact, showToast } = useHousehold();

  const [activeCategory, setActiveCategory] = useState<ContactCategory | 'all'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [contactToEdit, setContactToEdit] = useState<HouseholdContact | null>(null);
  const [contactToDelete, setContactToDelete] = useState<HouseholdContact | null>(null);

  const filteredContacts = contacts.filter((c) => {
    if (activeCategory === 'all') return true;
    return c.category === activeCategory;
  });

  const getCategoryIcon = (cat: ContactCategory) => {
    switch (cat) {
      case 'plumber':
        return <Wrench className="w-5 h-5 text-blue-600" />;
      case 'electrician':
        return <Zap className="w-5 h-5 text-amber-500" />;
      case 'doctor':
        return <HeartPulse className="w-5 h-5 text-rose-500" />;
      case 'vet':
        return <Dog className="w-5 h-5 text-orange-600" />;
      case 'cleaning':
        return <Sparkles className="w-5 h-5 text-teal-600" />;
      case 'auto':
        return <Car className="w-5 h-5 text-indigo-600" />;
      case 'emergency':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default:
        return <Phone className="w-5 h-5 text-stone-600" />;
    }
  };

  const handleCopyPhone = (ph: string) => {
    navigator.clipboard.writeText(ph);
    showToast(`Телефон ${ph} скопирован в буфер обмена`, 'success');
  };

  const handleConfirmDelete = () => {
    if (contactToDelete) {
      deleteContact(contactToDelete.id);
      showToast(`Карточка мастера «${contactToDelete.name}» удалена`, 'info');
      setContactToDelete(null);
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Верхняя строка */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Табы категорий специалистов */}
        <div className="flex items-center space-x-1 p-1 rounded-2xl bg-[#EFECE4] border border-[#E3DFD5] overflow-x-auto scrollbar-none">
          {[
            { id: 'all', label: 'Все контакты' },
            { id: 'plumber', label: 'Сантехники' },
            { id: 'electrician', label: 'Электрики' },
            { id: 'doctor', label: 'Врачи' },
            { id: 'vet', label: 'Ветеринары' },
            { id: 'cleaning', label: 'Клининг' },
            { id: 'auto', label: 'Авто/СТО' },
            { id: 'emergency', label: 'Аварийные' },
            { id: 'other', label: 'Другие' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeCategory === tab.id
                  ? 'bg-white text-[#1F1D1A] shadow-xs'
                  : 'text-[#6B6456] hover:text-[#1F1D1A]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            setContactToEdit(null);
            setIsModalOpen(true);
          }}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-[#E15A42] hover:bg-[#D04931] text-white text-xs font-bold shadow-md shadow-orange-600/20 active:scale-[0.98] transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Добавить мастера</span>
        </button>
      </div>

      {/* Сетка контактов */}
      {filteredContacts.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-[#EBE7DF] space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 mx-auto flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-stone-700">В этой категории пока нет контактов</p>
          <p className="text-xs text-stone-500">Добавьте проверенного мастера или службу для быстрого вызова</p>
          <button
            onClick={() => {
              setContactToEdit(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-stone-800 text-white text-xs font-bold hover:bg-stone-700 cursor-pointer"
          >
            + Добавить мастера
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContacts.map((contact) => (
            <div
              key={contact.id}
              className="bg-white rounded-3xl p-5 border border-[#EBE7DF] shadow-xs hover:border-[#E15A42]/50 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                {/* Шапка карточки мастера с иконками редактирования и удаления */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-11 h-11 rounded-2xl bg-[#FAF8F3] border border-[#EBE7DF] flex items-center justify-center shrink-0">
                      {getCategoryIcon(contact.category)}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[#1F1D1A] leading-snug">
                        {contact.name}
                      </h3>
                      <p className="text-[11px] font-semibold text-[#8C522C]">
                        {contact.specialty}
                      </p>
                    </div>
                  </div>

                  {/* Кнопки: Редактировать (карандаш) и Удалить (корзина) */}
                  <div className="flex items-center space-x-1.5 shrink-0">
                    <button
                      onClick={() => {
                        setContactToEdit(contact);
                        setIsModalOpen(true);
                      }}
                      className="p-2 rounded-xl bg-stone-50 hover:bg-sky-50 text-stone-500 hover:text-sky-600 border border-stone-200 transition-all cursor-pointer shadow-2xs"
                      title="Редактировать номер, адрес и данные мастера"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setContactToDelete(contact)}
                      className="p-2 rounded-xl bg-stone-50 hover:bg-rose-50 text-stone-500 hover:text-rose-600 border border-stone-200 transition-all cursor-pointer shadow-2xs"
                      title="Удалить карточку мастера"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Телефонный номер */}
                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#FAF9F5] border border-stone-200 text-xs">
                  <span className="font-bold text-[#1F1D1A]">{contact.phone}</span>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleCopyPhone(contact.phone)}
                      className="p-1 text-stone-400 hover:text-stone-700 cursor-pointer"
                      title="Скопировать номер"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handlePhoneAction(e, contact.phone, contact.name, showToast)}
                      className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] shadow-xs active:scale-95 transition-all cursor-pointer"
                      title={`Позвонить ${contact.name} или скопировать номер`}
                    >
                      <Phone className="w-3 h-3" />
                      <span>Вызов</span>
                    </button>
                  </div>
                </div>

                {/* Адрес с возможностью быстрого изменения */}
                <div className="flex items-start justify-between gap-2 text-xs">
                  {contact.address ? (
                    <p className="text-[#8A8477] flex items-center gap-1.5 leading-relaxed">
                      <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span>{contact.address}</span>
                    </p>
                  ) : (
                    <p className="text-stone-400 italic flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-stone-300 shrink-0" />
                      <span>Адрес не указан</span>
                    </p>
                  )}
                  <button
                    onClick={() => {
                      setContactToEdit(contact);
                      setIsModalOpen(true);
                    }}
                    className="text-[11px] text-sky-600 hover:text-sky-700 font-medium shrink-0 hover:underline cursor-pointer"
                  >
                    Изменить
                  </button>
                </div>

                {contact.notes && (
                  <p className="text-xs text-[#5C564B] bg-[#FAF8F3] p-2.5 rounded-xl border border-stone-100 leading-relaxed">
                    {contact.notes}
                  </p>
                )}
              </div>

              {/* Подвал карточки с рейтингом и явными кнопками действий */}
              <div className="pt-2.5 border-t border-[#F0ECE1] flex items-center justify-between text-xs">
                {contact.rating ? (
                  <div className="flex items-center space-x-1 text-amber-500 font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{contact.rating} из 5.0</span>
                  </div>
                ) : (
                  <span className="text-stone-400 text-[11px]">Без оценки</span>
                )}

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setContactToEdit(contact);
                      setIsModalOpen(true);
                    }}
                    className="flex items-center space-x-1 text-xs text-stone-600 hover:text-sky-600 font-semibold cursor-pointer transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5 text-sky-500" />
                    <span>Редактировать</span>
                  </button>
                  <button
                    onClick={() => setContactToDelete(contact)}
                    className="p-1 rounded-lg text-stone-400 hover:text-rose-600 cursor-pointer transition-colors"
                    title="Удалить"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Модальное окно редактирования / создания мастера */}
      <ContactModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setContactToEdit(null);
        }}
        contactToEdit={contactToEdit}
      />

      {/* Модальное окно подтверждения удаления контакта */}
      {contactToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-stone-200 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-stone-900">Удалить мастера?</h3>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Вы уверены, что хотите удалить карточку{' '}
              <strong className="text-stone-900">«{contactToDelete.name}»</strong> (
              {contactToDelete.specialty})?
            </p>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setContactToDelete(null)}
                className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
