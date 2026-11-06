import React, { useState, useEffect } from 'react';
import { X, Phone, User, MapPin, Star } from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { ContactCategory, HouseholdContact } from '../../types';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactToEdit?: HouseholdContact | null;
}

const CATEGORIES: Array<{ id: ContactCategory; label: string }> = [
  { id: 'plumber', label: 'Сантехник' },
  { id: 'electrician', label: 'Электрик' },
  { id: 'doctor', label: 'Врач / Педиатр' },
  { id: 'vet', label: 'Ветеринар' },
  { id: 'cleaning', label: 'Клининг / Уборка' },
  { id: 'auto', label: 'Автосервис / Механик' },
  { id: 'emergency', label: 'Аварийная служба / ЖКХ' },
  { id: 'other', label: 'Другой специалист' },
];

export const ContactModal: React.FC<ContactModalProps> = ({
  isOpen,
  onClose,
  contactToEdit,
}) => {
  const { addContact, updateContact } = useHousehold();

  const [name, setName] = useState(contactToEdit?.name || '');
  const [specialty, setSpecialty] = useState(contactToEdit?.specialty || '');
  const [category, setCategory] = useState<ContactCategory>(
    contactToEdit?.category || 'plumber'
  );
  const [phone, setPhone] = useState(contactToEdit?.phone || '');
  const [email, setEmail] = useState(contactToEdit?.email || '');
  const [address, setAddress] = useState(contactToEdit?.address || '');
  const [notes, setNotes] = useState(contactToEdit?.notes || '');
  const [rating, setRating] = useState(contactToEdit?.rating || 5);

  useEffect(() => {
    setName(contactToEdit?.name || '');
    setSpecialty(contactToEdit?.specialty || '');
    setCategory(contactToEdit?.category || 'plumber');
    setPhone(contactToEdit?.phone || '');
    setEmail(contactToEdit?.email || '');
    setAddress(contactToEdit?.address || '');
    setNotes(contactToEdit?.notes || '');
    setRating(contactToEdit?.rating || 5);
  }, [contactToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    const data: Omit<HouseholdContact, 'id'> = {
      name: name.trim(),
      specialty: specialty.trim() || 'Специалист',
      category,
      phone: phone.trim(),
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      notes: notes.trim() || undefined,
      rating,
    };

    if (contactToEdit) {
      updateContact(contactToEdit.id, data);
    } else {
      addContact(data);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-[#FCFBF8] rounded-3xl border border-[#EBE7DF] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-[#EBE7DF] flex items-center justify-between bg-white">
          <h3 className="text-base font-bold text-[#1F1D1A]">
            {contactToEdit ? 'Редактировать контакт' : 'Новый контакт дома'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-black/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          <div>
            <label className="block text-xs font-bold text-[#1F1D1A] mb-1">
              Имя мастера / Название службы *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: Андрей Николаевич, Диспетчерская ЖКХ..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E3DFD5] text-sm text-[#1F1D1A] focus:outline-none focus:ring-2 focus:ring-[#E15A42]/30 focus:border-[#E15A42]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#1F1D1A] mb-1">
                Категория
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ContactCategory)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E3DFD5] text-xs text-[#1F1D1A]"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1F1D1A] mb-1">
                Специализация
              </label>
              <input
                type="text"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                placeholder="Сантехника, тёплые полы..."
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E3DFD5] text-xs text-[#1F1D1A]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1F1D1A] mb-1">
              Номер телефона *
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+7 (999) 000-00-00"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E3DFD5] text-xs text-[#1F1D1A]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1F1D1A] mb-1">
              Адрес или зона выезда
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Наш район, ЖК или адрес офиса..."
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#E3DFD5] text-xs text-[#1F1D1A]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1F1D1A] mb-1">
              Заметки (цены, качество, график)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Проверен временем, звонить до 21:00..."
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#E3DFD5] text-xs text-[#1F1D1A] resize-none"
            />
          </div>

          <div className="pt-4 flex items-center justify-end space-x-3 border-t border-[#EBE7DF]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-black/5"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#E15A42] hover:bg-[#D04931] text-white text-xs font-bold shadow-md shadow-orange-600/20 active:scale-[0.98] transition-all cursor-pointer"
            >
              {contactToEdit ? 'Сохранить' : 'Сохранить контакт'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
