import React, { useState, useEffect, useRef } from 'react';
import { X, FileText, Upload, Calendar, Paperclip, Trash2 } from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { DocumentCategory, DocumentItem } from '../../types';

interface DocModalProps {
  isOpen: boolean;
  onClose: () => void;
  docToEdit?: DocumentItem | null;
}

const CATEGORIES: Array<{ id: DocumentCategory; label: string }> = [
  { id: 'insurance', label: 'Страхование (ОСАГО/КАСКО/ДМС)' },
  { id: 'property', label: 'Недвижимость и жильё' },
  { id: 'auto', label: 'Автомобиль (ПТС/СТС)' },
  { id: 'medical', label: 'Медицина и здоровье' },
  { id: 'warranties', label: 'Чеки и гарантийные талоны' },
  { id: 'personal', label: 'Личные документы' },
];

export const DocModal: React.FC<DocModalProps> = ({ isOpen, onClose, docToEdit }) => {
  const { members, addDoc, updateDoc } = useHousehold();

  const [title, setTitle] = useState(docToEdit?.title || '');
  const [category, setCategory] = useState<DocumentCategory>(
    docToEdit?.category || 'insurance'
  );
  const [documentNumber, setDocumentNumber] = useState(docToEdit?.documentNumber || '');
  const [issuer, setIssuer] = useState(docToEdit?.issuer || '');
  const [issuedDate, setIssuedDate] = useState(docToEdit?.issuedDate || '');
  const [expiryDate, setExpiryDate] = useState(docToEdit?.expiryDate || '');
  const [memberId, setMemberId] = useState<string | undefined>(docToEdit?.memberId);
  const [notes, setNotes] = useState(docToEdit?.notes || '');
  const [fileData, setFileData] = useState<string | undefined>(docToEdit?.fileData);
  const [fileName, setFileName] = useState<string | undefined>(docToEdit?.fileName);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Синхронизация состояния полей при открытии или смене документа
  useEffect(() => {
    if (isOpen) {
      if (docToEdit) {
        setTitle(docToEdit.title || '');
        setCategory(docToEdit.category || 'insurance');
        setDocumentNumber(docToEdit.documentNumber || '');
        setIssuer(docToEdit.issuer || '');
        setIssuedDate(docToEdit.issuedDate || '');
        setExpiryDate(docToEdit.expiryDate || '');
        setMemberId(docToEdit.memberId);
        setNotes(docToEdit.notes || '');
        setFileData(docToEdit.fileData);
        setFileName(docToEdit.fileName);
      } else {
        setTitle('');
        setCategory('insurance');
        setDocumentNumber('');
        setIssuer('');
        setIssuedDate('');
        setExpiryDate('');
        setMemberId(undefined);
        setNotes('');
        setFileData(undefined);
        setFileName(undefined);
      }
    }
  }, [isOpen, docToEdit]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFileData(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const data: Omit<DocumentItem, 'id'> = {
      title: title.trim(),
      category,
      documentNumber: documentNumber.trim() || undefined,
      issuer: issuer.trim() || undefined,
      issuedDate: issuedDate || undefined,
      expiryDate: expiryDate || undefined,
      memberId: memberId || undefined,
      notes: notes.trim() || undefined,
      fileData,
      fileName,
    };

    if (docToEdit) {
      updateDoc(docToEdit.id, data);
    } else {
      addDoc(data);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-[#FCFBF8] rounded-3xl border border-[#EBE7DF] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-[#EBE7DF] flex items-center justify-between bg-white">
          <h3 className="text-base font-bold text-[#1F1D1A]">
            {docToEdit ? 'Редактировать документ' : 'Сохранить документ в дом'}
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
              Название документа *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Полис ОСАГО, Договор купли-продажи..."
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
                onChange={(e) => setCategory(e.target.value as DocumentCategory)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E3DFD5] text-xs text-[#1F1D1A]"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1F1D1A] mb-1">
                К кому относится?
              </label>
              <select
                value={memberId || ''}
                onChange={(e) => setMemberId(e.target.value || undefined)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E3DFD5] text-xs text-[#1F1D1A]"
              >
                <option value="">На всю семью</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#1F1D1A] mb-1">
                Номер документа / полиса
              </label>
              <input
                type="text"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                placeholder="ХХХ 123456789"
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E3DFD5] text-xs text-[#1F1D1A]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1F1D1A] mb-1">
                Кем выдан / Организация
              </label>
              <input
                type="text"
                value={issuer}
                onChange={(e) => setIssuer(e.target.value)}
                placeholder="Ингосстрах, Росреестр..."
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E3DFD5] text-xs text-[#1F1D1A]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#1F1D1A] mb-1">
                Дата выдачи
              </label>
              <input
                type="date"
                value={issuedDate}
                onChange={(e) => setIssuedDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E3DFD5] text-xs text-[#1F1D1A]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1F1D1A] mb-1">
                Срок действия (до)
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E3DFD5] text-xs text-[#1F1D1A]"
              />
            </div>
          </div>

          {/* Загрузка скана / фото */}
          <div>
            <label className="block text-xs font-bold text-[#1F1D1A] mb-1">
              Скан или фото документа
            </label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*,.pdf"
              className="hidden"
            />

            {fileData ? (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-white border border-stone-200 text-xs">
                <div className="flex items-center space-x-2 truncate">
                  <Paperclip className="w-4 h-4 text-[#E15A42] shrink-0" />
                  <span className="font-medium text-[#1F1D1A] truncate">{fileName || 'Скан документа'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFileData(undefined);
                    setFileName(undefined);
                  }}
                  className="text-stone-400 hover:text-rose-600 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 rounded-2xl border border-dashed border-stone-300 hover:border-stone-400 bg-white text-stone-600 text-xs font-semibold flex items-center justify-center space-x-2 transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4 text-[#E15A42]" />
                <span>Загрузить фото или скан (сохраняется в браузер)</span>
              </button>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1F1D1A] mb-1">
              Заметки
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Где лежит оригинал, условия продления..."
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
              {docToEdit ? 'Сохранить' : 'Сохранить документ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
