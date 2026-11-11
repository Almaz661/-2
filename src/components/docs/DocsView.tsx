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
import { Btn, Card, EmptyState, IconBtn, PageWrap, Segmented, Slide, Tag } from '../ui/mercury';

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

  const daysLeft = (expiryDate?: string) =>
    expiryDate ? Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 3600 * 24)) : null;

  const expiryView = (expiryDate?: string) => {
    const d = daysLeft(expiryDate);
    if (d === null) return { text: 'Бессрочно', tone: 'muted' as const };
    const date = new Date(expiryDate!).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
    if (d < 0) return { text: 'Истёк', sub: date, tone: 'danger' as const };
    if (d <= 30) return { text: `${d} дн.`, sub: date, tone: 'warn' as const };
    return { text: date, tone: 'default' as const };
  };

  const handleCopyNumber = (num: string) => {
    navigator.clipboard.writeText(num);
    showToast(`Номер ${num} скопирован`, 'info');
  };

  const categories: { id: DocumentCategory | 'all'; label: string }[] = [
    { id: 'all', label: 'Все' },
    { id: 'insurance' as DocumentCategory, label: 'Страхование' },
    { id: 'property' as DocumentCategory, label: 'Недвижимость' },
    { id: 'auto' as DocumentCategory, label: 'Автомобиль' },
    { id: 'medical' as DocumentCategory, label: 'Медицина' },
    { id: 'warranties' as DocumentCategory, label: 'Гарантии и чеки' },
    { id: 'personal' as DocumentCategory, label: 'Личные' },
  ];

  const sortedDocs = filteredDocs
    .slice()
    .sort((a, b) => (daysLeft(a.expiryDate) ?? 1e9) - (daysLeft(b.expiryDate) ?? 1e9));
  const expiringSoon = docs.filter((d) => {
    const x = daysLeft(d.expiryDate);
    return x !== null && x <= 30;
  }).length;

  const openNew = () => {
    setDocToEdit(null);
    setIsModalOpen(true);
  };

  return (
    <PageWrap>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="relative w-full lg:max-w-sm">
          <Search className="w-4 h-4 text-[var(--muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Название, номер или организация"
            className="w-full pl-10 pr-4 py-2.5 rounded-full bg-[var(--surface)] border border-[var(--line)] text-sm text-[var(--text)] focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
        </div>
        <Btn variant="primary" icon={<Plus className="w-4 h-4" />} onClick={openNew} className="self-start lg:self-auto">
          Добавить документ
        </Btn>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Segmented value={activeCategory} onChange={setActiveCategory} options={categories} />
        {expiringSoon > 0 && (
          <Tag tone="warn" icon={<ShieldAlert className="w-3.5 h-3.5" />}>
            Истекают в течение месяца: {expiringSoon}
          </Tag>
        )}
      </div>

      <Card className="p-2 sm:p-3">
        {sortedDocs.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-5 h-5" />}
            title={searchQuery ? 'Ничего не найдено' : 'Документов пока нет'}
            text={
              searchQuery
                ? 'Проверьте написание или поищите по номеру документа.'
                : 'Добавьте страховку, договор или гарантию — напомним до окончания срока.'
            }
            action={
              <Btn variant="primary" icon={<Plus className="w-4 h-4" />} onClick={openNew}>
                Добавить документ
              </Btn>
            }
          />
        ) : (
          <>
            <div className="hidden md:grid grid-cols-[44px_1fr_180px_140px_120px_80px] gap-x-3 px-3 pt-2 pb-2 text-xs text-[var(--muted)] border-b border-[var(--line)]">
              <span />
              <span>Документ</span>
              <span>Номер</span>
              <span>Владелец</span>
              <span>Действует до</span>
              <span />
            </div>
            <Slide k={activeCategory} index={categories.findIndex((c) => c.id === activeCategory)}>
            {sortedDocs.map((doc) => {
              const member = members.find((m) => m.id === doc.memberId);
              const exp = expiryView(doc.expiryDate);
              return (
                <div
                  key={doc.id}
                  className="group grid grid-cols-[44px_1fr_auto_auto] md:grid-cols-[44px_1fr_180px_140px_120px_80px] items-center gap-x-3 px-2 sm:px-3 py-3 rounded-xl border-t border-[var(--line)] first:border-t-0 hover:bg-[var(--surface-3)] transition-colors"
                >
                  <span
                    className={`w-10 h-10 rounded-full grid place-items-center border ${
                      exp.tone === 'danger'
                        ? 'border-red-300 text-red-600'
                        : exp.tone === 'warn'
                        ? 'border-amber-300 text-amber-600'
                        : 'border-[var(--line-strong)] text-[var(--muted)]'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                  </span>

                  <div className="min-w-0">
                    <div className="text-[16px] font-medium text-[var(--text)] line-clamp-2 md:line-clamp-1 break-words">{doc.title}</div>
                    <div className="flex items-center gap-2 text-[14px] text-[var(--muted)] mt-0.5 min-w-0">
                      {doc.issuer && <span className="truncate">{doc.issuer}</span>}
                      {doc.fileData && (
                        <button
                          type="button"
                          onClick={() => setPreviewFile({ title: doc.title, url: doc.fileData! })}
                          className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline underline-offset-4 shrink-0"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                          Скан
                        </button>
                      )}
                      <span className="md:hidden truncate">{member?.name}</span>
                    </div>
                  </div>

                  <div className="hidden md:flex items-center gap-1 min-w-0">
                    {doc.documentNumber ? (
                      <>
                        <span className="text-sm tabular-nums text-[var(--text-2)] truncate">{doc.documentNumber}</span>
                        <IconBtn
                          title="Скопировать номер"
                          aria-label="Скопировать номер"
                          onClick={() => handleCopyNumber(doc.documentNumber!)}
                          className="hover-actions opacity-0 group-hover:opacity-100 focus:opacity-100"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </IconBtn>
                      </>
                    ) : (
                      <span className="text-sm text-[var(--muted)]">—</span>
                    )}
                  </div>

                  <span className="hidden md:flex items-center gap-2 min-w-0">
                    {member ? (
                      <>
                        <MemberAvatar member={member} size="xs" />
                        <span className="text-sm text-[var(--text-2)] truncate">{member.name}</span>
                      </>
                    ) : (
                      <span className="text-sm text-[var(--muted)]">Вся семья</span>
                    )}
                  </span>

                  <span
                    className={`text-sm tabular-nums text-right md:text-left ${
                      exp.tone === 'danger'
                        ? 'text-red-600 font-medium'
                        : exp.tone === 'warn'
                        ? 'text-amber-600 font-medium'
                        : exp.tone === 'muted'
                        ? 'text-[var(--muted)]'
                        : 'text-[var(--text-2)]'
                    }`}
                  >
                    {exp.text}
                    {'sub' in exp && exp.sub && (
                      <span className="block text-[14px] font-normal text-[var(--muted)]">{exp.sub}</span>
                    )}
                  </span>

                  <div className="flex items-center justify-end gap-0.5 hover-actions opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <IconBtn
                      title="Редактировать"
                      aria-label="Редактировать"
                      onClick={() => {
                        setDocToEdit(doc);
                        setIsModalOpen(true);
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </IconBtn>
                    <IconBtn danger title="Удалить" aria-label="Удалить" onClick={() => deleteDoc(doc.id)}>
                      <Trash2 className="w-4 h-4" />
                    </IconBtn>
                  </div>
                </div>
              );
            })}
            </Slide>
          </>
        )}
      </Card>

      {/* Просмотр скана */}
      {previewFile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setPreviewFile(null)}
        >
          <Card className="p-4 max-w-2xl max-h-[85vh] overflow-hidden flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-2 border-b border-[var(--line)]">
              <h4 className="font-semibold text-[16px] text-[var(--text)]">{previewFile.title}</h4>
              <IconBtn aria-label="Закрыть" onClick={() => setPreviewFile(null)}>
                <X className="w-5 h-5" />
              </IconBtn>
            </div>
            <img src={previewFile.url} alt={previewFile.title} className="max-h-[70vh] object-contain rounded-xl" />
          </Card>
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
    </PageWrap>
  );
};
