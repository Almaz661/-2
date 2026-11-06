import React, { useState } from 'react';
import {
  FileText,
  Plus,
  ShieldAlert,
  Calendar,
  Copy,
  Paperclip,
  Edit2,
  Trash2,
  Search,
  ExternalLink,
  X,
} from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { DocumentCategory, DocumentItem } from '../../types';
import { DocModal } from './DocModal';
import { MemberAvatar } from '../common/MemberAvatar';

export const DocsView: React.FC = () => {
  const { docs, deleteDoc, members, showToast } = useHousehold();

  const [activeCategory, setActiveCategory] = useState<DocumentCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [docToEdit, setDocToEdit] = useState<DocumentItem | null>(null);
  const [previewFile, setPreviewFile] = useState<{ title: string; url: string } | null>(null);

  const filteredDocs = docs.filter((doc) => {
    if (activeCategory !== 'all' && doc.category !== activeCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = doc.title.toLowerCase().includes(q);
      const matchNum = doc.documentNumber?.toLowerCase().includes(q);
      const matchIssuer = doc.issuer?.toLowerCase().includes(q);
      if (!matchTitle && !matchNum && !matchIssuer) return false;
    }
    return true;
  });

  const getExpiryBadge = (expiryDate?: string) => {
    if (!expiryDate) return null;
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 3600 * 24));

    if (diffDays < 0) {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
          Срок действия истёк
        </span>
      );
    }
    if (diffDays <= 30) {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center space-x-1">
          <ShieldAlert className="w-3 h-3 text-amber-600" />
          <span>Истекает через {diffDays} дн.</span>
        </span>
      );
    }
    return (
      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
        Действует до {expiry.toLocaleDateString('ru-RU')}
      </span>
    );
  };

  const handleCopyNumber = (num: string) => {
    navigator.clipboard.writeText(num);
    showToast(`Номер ${num} скопирован в буфер обмена`, 'info');
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Верхний бар управления */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Поиск */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по названию, номеру или организации..."
            className="w-full pl-10 pr-4 py-2 rounded-2xl bg-white border border-[#E3DFD5] text-xs text-[#1F1D1A] placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#E15A42]/30"
          />
        </div>

        <button
          onClick={() => {
            setDocToEdit(null);
            setIsModalOpen(true);
          }}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-[#E15A42] hover:bg-[#D04931] text-white text-xs font-bold shadow-md shadow-orange-600/20 active:scale-[0.98] transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Добавить документ</span>
        </button>
      </div>

      {/* Табы категорий */}
      <div className="flex items-center space-x-1 p-1 rounded-2xl bg-[#EFECE4] border border-[#E3DFD5] overflow-x-auto">
        {[
          { id: 'all', label: 'Все документы' },
          { id: 'insurance', label: 'Страхование' },
          { id: 'property', label: 'Недвижимость' },
          { id: 'auto', label: 'Автомобиль' },
          { id: 'medical', label: 'Медицина' },
          { id: 'warranties', label: 'Гарантии и чеки' },
          { id: 'personal', label: 'Личные' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveCategory(tab.id as any)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeCategory === tab.id
                ? 'bg-white text-[#1F1D1A] shadow-xs'
                : 'text-[#6B6456] hover:text-[#1F1D1A]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Сетка карточек документов */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDocs.map((doc) => {
          const member = members.find((m) => m.id === doc.memberId);

          return (
            <div
              key={doc.id}
              className="bg-white rounded-3xl p-5 border border-[#EBE7DF] shadow-xs hover:border-[#E15A42]/50 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[#1F1D1A] leading-snug">
                        {doc.title}
                      </h3>
                      {doc.issuer && (
                        <p className="text-[11px] text-[#8A8477]">{doc.issuer}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => {
                        setDocToEdit(doc);
                        setIsModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteDoc(doc.id)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Номер документа с кнопкой копирования */}
                {doc.documentNumber && (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-[#FAF8F5] border border-stone-200 text-xs">
                    <span className="font-mono text-stone-700">{doc.documentNumber}</span>
                    <button
                      onClick={() => handleCopyNumber(doc.documentNumber!)}
                      className="text-stone-400 hover:text-stone-800 p-0.5"
                      title="Скопировать номер"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {doc.notes && (
                  <p className="text-xs text-[#8A8477] line-clamp-2">{doc.notes}</p>
                )}

                {/* Вложенный файл / скан */}
                {doc.fileData && (
                  <button
                    onClick={() => setPreviewFile({ title: doc.title, url: doc.fileData! })}
                    className="flex items-center space-x-2 text-xs font-semibold text-blue-600 hover:underline"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    <span className="truncate">Смотреть скан ({doc.fileName || 'Файл'})</span>
                  </button>
                )}
              </div>

              {/* Нижняя плашка срока */}
              <div className="pt-2 border-t border-[#F0ECE1] flex items-center justify-between">
                <div>{getExpiryBadge(doc.expiryDate)}</div>
                {member && (
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center space-x-1"
                    style={{
                      backgroundColor: member.color.hex + '20',
                      color: member.color.hex,
                    }}
                  >
                    <MemberAvatar member={member} size="2xs" />
                    <span>{member.name}</span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Модалка просмотра вложения */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-4 max-w-2xl max-h-[85vh] overflow-hidden flex flex-col space-y-3">
            <div className="flex items-center justify-between pb-2 border-b">
              <h4 className="font-bold text-sm text-[#1F1D1A]">{previewFile.title}</h4>
              <button
                onClick={() => setPreviewFile(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={previewFile.url}
              alt={previewFile.title}
              className="max-h-[70vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}

      <DocModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setDocToEdit(null);
        }}
        docToEdit={docToEdit}
      />
    </div>
  );
};
