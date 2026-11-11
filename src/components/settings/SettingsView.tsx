import React, { useState, useRef } from 'react';
import { resetOnboarding } from '../../utils/onboarding';
import { ThemeSegmented } from '../common/ThemeSwitcher';
import { Card, Segmented } from '../ui/mercury';
import { HomeProfileForm } from '../home/HomeProfileForm';
import { AssistantSettingsCard } from '../assistant/AssistantSettingsCard';
import {
  Users,
  Home,
  Download,
  Upload,
  RotateCcw,
  ShieldCheck,
  Plus,
  Trash2,
  Edit2,
  Camera,
  X,
  Check,
  Database,
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  Smartphone,
  HardDrive,
  Gauge,
  Droplets,
  AlertTriangle,
  ShoppingBag,
  CheckSquare,
  FileText,
  Cloud,
  CloudOff,
  Copy,
  SlidersHorizontal,
  UtensilsCrossed,
  Calendar,
  Pill,
  Package,
  Phone,
  Receipt,
  Globe,
} from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { MemberAvatar } from '../common/MemberAvatar';
import { processAndResizeImage, getMemberInitials } from '../../utils/imageUtils';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { clearAllCacheAndReload } from '../../utils/cacheUtils';
import { AppModuleId } from '../../types';
import { COUNTRY_PRESETS, getCountryPresetById } from '../../utils/countryPresets';
import { SUPPORTED_CURRENCIES, getCurrencySymbol } from '../../utils/currencyConstants';
import { CleanStartModal } from '../common/CleanStartModal';

export const SettingsView: React.FC = () => {
  const {
    householdName,
    setHouseholdName,
    members,
    addMember,
    updateMember,
    deleteMember,
    updateMemberPhoto,
    exportBackupJson,
    importBackupJson,
    resetToDefaultData,
    startCleanHousehold,
    householdRegion,
    setHouseholdRegion,
    householdCurrency,
    setHouseholdCurrency,
    clearMeterReadings,
    resetMetersToZero,
    resetMetersToInitial,
    clearShoppingItems,
    clearTasks,
    clearAllReceipts,
    clearAllLocalStorageData,
    meters,
    tasks,
    shoppingItems,
    receipts,
    isOffline,
    offlineStats,
    syncOfflineData,
    familyCode,
    cloudSyncStatus,
    lastCloudSync,
    connectFamilyCode,
    generateNewFamilyCode,
    disconnectFamilyCode,
    syncWithCloud,
    visibleModules,
    toggleModuleVisibility,
    showToast,
  } = useHousehold();

  const [inputFamilyCode, setInputFamilyCode] = useState('');
  const [isConnectingCode, setIsConnectingCode] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const [isSyncingIDB, setIsSyncingIDB] = useState(false);

  const [nameInput, setNameInput] = useState(householdName);
  const [isEditingHouseholdName, setIsEditingHouseholdName] = useState(false);

  // Добавление нового участника
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('');
  const [newMemberHex, setNewMemberHex] = useState('#EC4899');
  const [newMemberPhoto, setNewMemberPhoto] = useState<string | undefined>(undefined);

  // Редактирование существующего участника
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editMemberName, setEditMemberName] = useState('');
  const [editMemberRole, setEditMemberRole] = useState('');
  const [editMemberHex, setEditMemberHex] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const newMemberPhotoInputRef = useRef<HTMLInputElement>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showCacheConfirm, setShowCacheConfirm] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    isDanger?: boolean;
    onConfirm: () => void;
  } | null>(null);

  const startEditMember = (member: any) => {
    setEditingMemberId(member.id);
    setEditMemberName(member.name);
    setEditMemberRole(member.role);
    setEditMemberHex(member.color.hex);
  };

  const handleSaveMemberEdit = (id: string) => {
    if (!editMemberName.trim()) return;
    updateMember(id, {
      name: editMemberName.trim(),
      role: editMemberRole.trim() || 'Член семьи',
      color: {
        bg: 'bg-stone-50',
        text: 'text-stone-700',
        border: 'border-stone-200',
        hex: editMemberHex,
        badgeBg: 'bg-stone-100 text-stone-800',
      },
    });
    setEditingMemberId(null);
    showToast('Профиль участника обновлён', 'success');
  };

  const triggerMemberPhotoUpload = (memberId: string) => {
    const el = document.getElementById(`photo_upload_${memberId}`) as HTMLInputElement | null;
    el?.click();
  };

  const handleSaveHouseholdName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    setHouseholdName(nameInput.trim());
    setIsEditingHouseholdName(false);
    showToast('Название дома обновлено', 'success');
  };

  const handleNewMemberPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await processAndResizeImage(file, 320);
        setNewMemberPhoto(base64);
        showToast('Фотография выбрана', 'info');
      } catch (err) {
        showToast('Не удалось загрузить изображение', 'error');
      }
    }
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;

    addMember({
      name: newMemberName.trim(),
      role: newMemberRole.trim() || 'Член семьи',
      avatar: newMemberPhoto,
      color: {
        bg: 'bg-pink-50',
        text: 'text-pink-700',
        border: 'border-pink-200',
        hex: newMemberHex,
        badgeBg: 'bg-pink-100 text-pink-800',
      },
    });

    setNewMemberName('');
    setNewMemberRole('');
    setNewMemberPhoto(undefined);
    setIsAddingMember(false);
  };

  const handleUploadPhotoForMember = async (memberId: string, file: File) => {
    try {
      const base64 = await processAndResizeImage(file, 320);
      updateMemberPhoto(memberId, base64);
    } catch (err) {
      showToast('Ошибка при загрузке фотографии', 'error');
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          importBackupJson(content);
        }
      };
      reader.readAsText(file);
    }
  };

  const [section, setSection] = useState<'home' | 'assistant' | 'look' | 'data'>('home');

  return (
    <div className="px-4 py-6 sm:px-8 sm:py-8 space-y-6 max-w-4xl mx-auto">
      {/* Разделы настроек — как оглавление: одно на экране, остальное не мешает */}
      <Segmented
        value={section}
        onChange={setSection}
        options={[
          { id: 'home', label: 'Дом и семья' },
          { id: 'assistant', label: 'Ассистент' },
          { id: 'look', label: 'Вид и меню' },
          { id: 'data', label: 'Данные' },
        ]}
      />

      {section === 'home' && (
        <Card className="p-6">
          <h3 className="font-semibold text-[16px] text-[var(--text)]">Профиль дома</h3>
          <p className="text-xs text-[var(--muted)] mb-5">Квартира или дом, какая техника — в списках и планах только то, что у вас есть</p>
          <HomeProfileForm compact />
        </Card>
      )}

      {section === 'home' && (
        <>
      {/* 1. Название домохозяйства */}
      <div className="bg-[var(--surface)] rounded-2xl p-6 border border-[var(--line)] shadow-[var(--shadow)] space-y-4">
        <div className="flex items-center space-x-3 pb-3 border-b border-[var(--line)]">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center">
            <Home className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-[var(--text)]">Профиль дома</h3>
            <p className="text-xs text-[var(--muted)]">
              Название и настройки общего пространства семьи
            </p>
          </div>
        </div>

        {isEditingHouseholdName ? (
          <form onSubmit={handleSaveHouseholdName} className="flex items-center space-x-3">
            <input
              type="text"
              required
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="flex-1 px-4 py-2 rounded-xl border border-stone-300 text-sm font-semibold"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-full bg-[var(--accent)] text-white text-xs font-semibold"
            >
              Сохранить
            </button>
            <button
              type="button"
              onClick={() => setIsEditingHouseholdName(false)}
              className="px-3 py-2 rounded-xl text-stone-500 hover:bg-stone-100 text-xs"
            >
              Отмена
            </button>
          </form>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-[var(--muted)]">Название:</span>
              <h4 className="text-lg font-semibold text-[var(--text)]">{householdName}</h4>
            </div>
            <button
              onClick={() => {
                setNameInput(householdName);
                setIsEditingHouseholdName(true);
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-50"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Изменить</span>
            </button>
          </div>
        )}
      </div>
        </>
      )}

      {section === 'home' && (
        <>
      {/* Страна, валюта и автономность дома (по всему миру) */}
      <div className="bg-[var(--surface)] rounded-2xl p-6 border border-[var(--line)] shadow-[var(--shadow)] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--line)]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-[var(--text)]">Страна и валюта вашего дома</h3>
              <p className="text-xs text-[var(--muted)]">
                Вы можете находиться в любой стране мира. Данные изолированы и не объединяются между семьями.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsWizardOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-orange-100 hover:bg-orange-200/80 text-[var(--accent)] font-semibold text-xs flex items-center space-x-1.5 self-start sm:self-auto cursor-pointer transition-colors"
          >
            <span>Мастер настройки</span>
          </button>
        </div>

        {/* Текущий выбор и селекторы */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Селектор страны */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-2)]">
              Страна расположения дома:
            </label>
            <select
              value={householdRegion}
              onChange={(e) => {
                const newRegion = e.target.value;
                const preset = getCountryPresetById(newRegion);
                setHouseholdRegion(newRegion);
                setHouseholdCurrency(preset.defaultCurrency);
                showToast(`Страна дома изменена: ${preset.flag} ${preset.name} (${preset.defaultCurrency})`, 'success');
              }}
              className="w-full px-3.5 py-2.5 bg-[var(--surface-2)] border border-[var(--line-strong)] rounded-2xl text-xs font-semibold text-[var(--text)] focus:outline-none focus:border-[var(--accent)] cursor-pointer"
            >
              {COUNTRY_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.flag} {p.name} ({p.defaultCurrency})
                </option>
              ))}
            </select>
            <p className="text-[12px] text-[var(--muted)]">
              {getCountryPresetById(householdRegion).description}
            </p>
          </div>

          {/* Селектор валюты */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-2)]">
              Основная валюта (чеки, расходы, ЖКХ):
            </label>
            <select
              value={householdCurrency}
              onChange={(e) => {
                const newCurr = e.target.value;
                setHouseholdCurrency(newCurr);
                showToast(`Основная валюта изменена на ${newCurr} (${getCurrencySymbol(newCurr)})`, 'success');
              }}
              className="w-full px-3.5 py-2.5 bg-[var(--surface-2)] border border-[var(--line-strong)] rounded-2xl text-xs font-semibold text-[var(--text)] focus:outline-none focus:border-[var(--accent)] cursor-pointer"
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
            <p className="text-[12px] text-[var(--muted)]">
              Текущий знак валюты в отчётах и графиках: <strong className="text-[var(--accent)]">{getCurrencySymbol(householdCurrency)}</strong>
            </p>
          </div>
        </div>

        {/* Быстрые кнопки популярных стран */}
        <div className="space-y-1.5 pt-1">
          <label className="text-[12px] font-semibold text-[var(--muted)] block">
            Быстрое переключение:
          </label>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'CY', flag: '🇨🇾', name: 'Кипр', curr: 'EUR' },
              { id: 'GR', flag: '🇬🇷', name: 'Греция', curr: 'EUR' },
              { id: 'RU', flag: '🇷🇺', name: 'Россия', curr: 'RUB' },
              { id: 'EU', flag: '🇪🇺', name: 'Евросоюз', curr: 'EUR' },
              { id: 'AE', flag: '🇦🇪', name: 'ОАЭ', curr: 'AED' },
              { id: 'TR', flag: '🇹🇷', name: 'Турция', curr: 'TRY' },
              { id: 'GE', flag: '🇬🇪', name: 'Грузия', curr: 'GEL' },
              { id: 'TH', flag: '🇹🇭', name: 'Таиланд', curr: 'THB' },
              { id: 'US', flag: '🇺🇸', name: 'США', curr: 'USD' },
              { id: 'GB', flag: '🇬🇧', name: 'Великобритания', curr: 'GBP' },
              { id: 'KZ', flag: '🇰🇿', name: 'Казахстан', curr: 'KZT' },
              { id: 'OTHER', flag: '🌐', name: 'Другая страна', curr: 'USD' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setHouseholdRegion(item.id);
                  setHouseholdCurrency(item.curr);
                  showToast(`Выбрано: ${item.flag} ${item.name} (${item.curr})`, 'info');
                }}
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition-all ${ householdRegion === item.id ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] ring-1 ring-[var(--accent)]' : 'border-stone-200 bg-stone-50/70 hover:bg-stone-100 text-stone-700' }`}
              >
                <span>{item.flag}</span>
                <span>{item.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
        </>
      )}

      {section === 'home' && (
        <>
      {/* Быстрый старт: Очистить все демонстрационные данные */}
      <div className="bg-[var(--surface-2)] border border-orange-200/80 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[var(--shadow)]">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h4 className="font-semibold text-sm text-[var(--text)]">
              Чистый старт для вашей семьи
            </h4>
          </div>
          <p className="text-xs text-[var(--text-2)] leading-relaxed max-w-xl">
            Удалит демонстрационные имена («Анна, Михаил»), чужие тестовые счётчики (186 м³), чеки и задачи. Оставит абсолютно чистое пространство для вашей реальной семьи.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setConfirmModal({
                title: 'Начать с чистого листа?',
                description: 'Все демонстрационные имена, чужие показания счётчиков, тестовые чеки и задачи будут удалены. Вы сможете внести данные вашей семьи с нуля.',
                confirmLabel: 'Очистить всё и начать с нуля',
                isDanger: true,
                onConfirm: () => {
                  startCleanHousehold();
                  setConfirmModal(null);
                },
              });
            }}
            className="px-4 py-2.5 rounded-full bg-[var(--accent)] hover:brightness-110 text-white text-xs font-semibold shadow-[var(--shadow)] cursor-pointer transition-all active:scale-95 whitespace-nowrap"
          >
            Очистить все демо-данные
          </button>
        </div>
      </div>
        </>
      )}

      {section === 'data' && (
        <>
      {/* 2. СЕМЕЙНОЕ ОБЛАКО: Синхронизация между устройствами (iPad, смартфоны) */}
      <div className="bg-[var(--surface)] rounded-2xl p-6 border border-[var(--line)] shadow-[var(--shadow)] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--line)]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--accent)] text-white flex items-center justify-center shadow-[var(--shadow)] shadow-sky-500/20">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base text-[var(--text)]">
                Семейное облако и синхронизация
              </h3>
              <p className="text-xs text-[var(--muted)]">
                Единая база данных для iPad на стене и смартфонов домочадцев в магазине
              </p>
            </div>
          </div>

          <div>
            {familyCode ? (
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className={`w-2 h-2 rounded-full ${cloudSyncStatus === 'syncing' ? 'bg-amber-400 animate-ping' : 'bg-emerald-500'}`} />
                <span>{cloudSyncStatus === 'syncing' ? 'Синхронизация...' : 'Облако активно'}</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-600 border border-stone-200">
                <CloudOff className="w-3.5 h-3.5" />
                <span>Локальный режим</span>
              </span>
            )}
          </div>
        </div>

        {familyCode ? (
          <div className="space-y-4">
            <div className="p-4 sm:p-5 rounded-2xl bg-[var(--surface-2)] border border-[var(--line)] flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-xs text-[var(--muted)] font-semibold block mb-1">
                  Код вашей семьи для подключения устройств:
                </span>
                <div className="flex items-center space-x-3">
                  <span className="font-mono text-2xl font-semibold text-[var(--text)] bg-[var(--surface)] px-4 py-1.5 rounded-xl border border-stone-200 shadow-none">
                    {familyCode}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(familyCode);
                      setCopiedCode(true);
                      showToast('Семейный код скопирован!', 'success');
                      setTimeout(() => setCopiedCode(false), 2500);
                    }}
                    className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-[var(--surface)] hover:bg-stone-50 border border-stone-200 text-xs font-semibold text-[var(--text)] shadow-none cursor-pointer transition-all active:scale-95"
                  >
                    {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-stone-600" />}
                    <span>{copiedCode ? 'Скопировано!' : 'Копировать'}</span>
                  </button>
                </div>
                {lastCloudSync && (
                  <p className="text-[12px] text-[var(--muted)] mt-2">
                    Посл. синхронизация: {new Date(lastCloudSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={async () => {
                    await syncWithCloud();
                  }}
                  disabled={cloudSyncStatus === 'syncing'}
                  className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-2)] border border-stone-300 text-xs font-semibold text-[var(--text)] shadow-none cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-[var(--accent)] ${cloudSyncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                  <span>Обновить сейчас</span>
                </button>
                <button
                  onClick={() => {
                    setConfirmModal({
                      title: 'Отключить синхронизацию?',
                      description: 'Данные останутся на этом устройстве, но перестанут обновляться между членами семьи.',
                      confirmLabel: 'Отключить',
                      isDanger: false,
                      onConfirm: () => {
                        disconnectFamilyCode();
                        setConfirmModal(null);
                      },
                    });
                  }}
                  className="px-3 py-2 text-xs text-stone-500 hover:text-rose-600 font-semibold cursor-pointer"
                >
                  Отключить
                </button>
              </div>
            </div>

            <p className="text-xs text-[var(--muted)] bg-[var(--accent-soft)]/70 border border-[var(--line)] p-3 rounded-xl text-[var(--accent)] leading-relaxed">
              💡 <strong>Как подключить iPad или телефон супруга:</strong> Откройте сайт на другом устройстве, перейдите в «Настройки» → введите код <strong>{familyCode}</strong> и нажмите «Подключиться». Списки покупок, рецепты и показания счётчиков будут синхронизироваться моментально.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Генерация нового кода */}
              <div className="p-5 rounded-2xl bg-[var(--surface-2)] border border-[var(--line)] flex flex-col justify-between">
                <div>
                  <h4 className="font-semibold text-sm text-[var(--text)] mb-1">
                    Создать новую семью в облаке
                  </h4>
                  <p className="text-xs text-[var(--muted)] mb-4">
                    Создаст персональный семейный код (например HAUS-7K2X) и загрузит текущие списки и данные в безопасное облако.
                  </p>
                </div>
                <button
                  onClick={async () => {
                    setIsGeneratingCode(true);
                    try {
                      await generateNewFamilyCode();
                    } finally {
                      setIsGeneratingCode(false);
                    }
                  }}
                  disabled={isGeneratingCode}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-full bg-[var(--accent)] text-white font-semibold text-xs hover:brightness-105 active:scale-98 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isGeneratingCode ? 'Создание...' : 'Создать код для семьи'}</span>
                </button>
              </div>

              {/* Ввод существующего кода */}
              <div className="p-5 rounded-2xl bg-[var(--surface-2)] border border-[var(--line)] flex flex-col justify-between">
                <div>
                  <h4 className="font-semibold text-sm text-[var(--text)] mb-1">
                    Подключиться по коду семьи
                  </h4>
                  <p className="text-xs text-[var(--muted)] mb-3">
                    Если код уже создан на другом устройстве (на iPad или телефоне домочадца).
                  </p>
                </div>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!inputFamilyCode.trim()) return;
                    setIsConnectingCode(true);
                    try {
                      const ok = await connectFamilyCode(inputFamilyCode.trim());
                      if (ok) setInputFamilyCode('');
                    } finally {
                      setIsConnectingCode(false);
                    }
                  }}
                  className="flex space-x-2"
                >
                  <input
                    type="text"
                    value={inputFamilyCode}
                    onChange={(e) => setInputFamilyCode(e.target.value.toUpperCase())}
                    placeholder="HAUS-XXXX"
                    className="flex-1 px-3 py-2 rounded-xl bg-[var(--surface)] border border-stone-300 text-xs font-mono font-semibold text-center"
                  />
                  <button
                    type="submit"
                    disabled={isConnectingCode || !inputFamilyCode.trim()}
                    className="px-4 py-2 rounded-xl bg-[var(--inverse)] text-white font-semibold text-xs hover:bg-[var(--text)] disabled:opacity-50 cursor-pointer transition-all"
                  >
                    {isConnectingCode ? 'Вход...' : 'Войти'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
        </>
      )}

      {section === 'look' && (
        <>
      {/* 3. НАСТРОЙКА РАЗДЕЛОВ И МЕНЮ (КАСТОМИЗАЦИЯ ИНТЕРФЕЙСА) */}
      <div className="bg-[var(--surface)] rounded-2xl p-6 border border-[var(--line)] shadow-[var(--shadow)] space-y-4">
        <div className="flex items-center space-x-3 pb-3 border-b border-[var(--line)]">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm sm:text-base text-[var(--text)]">
              Настройка меню и видимости модулей
            </h3>
            <p className="text-xs text-[var(--muted)]">
              Оставьте включёнными только нужные разделы для чистого экрана на планшете
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { id: 'tasks' as AppModuleId, title: 'Задачи и рутины', desc: 'Уборка, зоны, бытовые дела', icon: CheckSquare },
            { id: 'calendar' as AppModuleId, title: 'Календарь семьи', desc: 'События, кружки, праздники', icon: Calendar },
            { id: 'shopping' as AppModuleId, title: 'Список покупок', desc: 'Продукты, чеки, супермаркет', icon: ShoppingBag },
            { id: 'meals' as AppModuleId, title: 'Питание и рецепты', desc: 'Умный импорт, меню на неделю', icon: UtensilsCrossed },
            { id: 'utilities' as AppModuleId, title: 'Счётчики ЖКХ', desc: 'Вода, свет, авторасчёт дельт', icon: Gauge },
            { id: 'receipts' as AppModuleId, title: 'Сканер чеков', desc: 'AI-распознавание позиций и цен', icon: Receipt },
            { id: 'firstaid' as AppModuleId, title: 'Домашняя аптечка', desc: 'Сроки годности лекарств, дозировки', icon: Pill },
            { id: 'inventory' as AppModuleId, title: 'Инвентарь и кладовая', desc: 'Бытовая химия, запасы, вещи', icon: Package },
            { id: 'docs' as AppModuleId, title: 'Документы и полисы', desc: 'Паспорта, договоры, напоминания', icon: FileText },
            { id: 'contacts' as AppModuleId, title: 'Контакты мастеров', desc: 'Сантехники, электрики, УК', icon: Phone },
          ].map((mod) => {
            const isVisible = visibleModules[mod.id] !== false;
            const Icon = mod.icon;
            return (
              <div
                key={mod.id}
                onClick={() => toggleModuleVisibility(mod.id)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between select-none ${ isVisible ? 'bg-[var(--surface)] border-[var(--line)] hover:border-[var(--accent)]/50 shadow-none' : 'bg-[var(--surface-2)]/60 border-stone-200 opacity-60 hover:opacity-80' }`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${ isVisible ? 'bg-[var(--surface-3)] text-[var(--accent)]' : 'bg-stone-200 text-stone-500' }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-semibold text-xs text-[var(--text)]">{mod.title}</h5>
                    <p className="text-[12px] text-[var(--muted)]">{mod.desc}</p>
                  </div>
                </div>

                <div
                  className={`w-11 h-6 flex items-center rounded-full p-1 duration-300 ease-in-out cursor-pointer ${ isVisible ? 'bg-[var(--accent)]' : 'bg-stone-300' }`}
                >
                  <div
                    className={`bg-[var(--surface)] w-4 h-4 rounded-full shadow-[var(--shadow)] transform duration-300 ease-in-out ${ isVisible ? 'translate-x-5' : 'translate-x-0' }`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
        </>
      )}

      {section === 'home' && (
        <>
      {/* 4. Члены семьи / Профили */}
      <div className="bg-[var(--surface)] rounded-2xl p-6 border border-[var(--line)] shadow-[var(--shadow)] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-[var(--text)]">Члены семьи</h3>
              <p className="text-xs text-[var(--muted)]">
                Вы можете загрузить собственную фотографию из галереи устройства или использовать нейтральный аватар с инициалами
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsAddingMember(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[var(--surface-2)] border border-[var(--line)] text-[var(--text)] text-xs font-semibold hover:bg-[var(--surface-3)]"
          >
            <Plus className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Добавить</span>
          </button>
        </div>

        {/* Форма добавления участника */}
        {isAddingMember && (
          <form
            onSubmit={handleAddMember}
            className="p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--line)] space-y-3 animate-in fade-in"
          >
            <div className="flex items-center space-x-3">
              {/* Превью аватара нового участника */}
              <div className="relative">
                <MemberAvatar
                  name={newMemberName || 'Новый'}
                  avatarUrl={newMemberPhoto}
                  colorHex={newMemberHex}
                  size="xl"
                />
                <button
                  type="button"
                  onClick={() => newMemberPhotoInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-1.5 rounded-full bg-[var(--accent)] text-white shadow-[var(--shadow)] hover:brightness-110"
                  title="Загрузить фото"
                >
                  <Camera className="w-3 h-3" />
                </button>
                <input
                  ref={newMemberPhotoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleNewMemberPhotoChange}
                  className="hidden"
                />
              </div>

              <div className="flex-1 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Имя (напр: Бабушка Оля)"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-[var(--surface)] border border-stone-200 text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Роль (напр: Бабушка)"
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-[var(--surface)] border border-stone-200 text-xs"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-[12px] text-stone-500 font-medium">Цвет метки:</span>
                  <input
                    type="color"
                    value={newMemberHex}
                    onChange={(e) => setNewMemberHex(e.target.value)}
                    className="w-7 h-7 rounded-lg cursor-pointer border border-stone-200"
                  />

                  {newMemberPhoto && (
                    <button
                      type="button"
                      onClick={() => setNewMemberPhoto(undefined)}
                      className="text-[12px] text-stone-500 hover:text-rose-600 underline ml-2"
                    >
                      Удалить фото
                    </button>
                  )}

                  <div className="flex-1" />

                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingMember(false);
                      setNewMemberPhoto(undefined);
                    }}
                    className="px-3 py-1.5 text-xs text-stone-500"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-full bg-[var(--accent)] text-white text-xs font-semibold shadow-[var(--shadow)]"
                  >
                    Создать
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* Список участников с управлением фото */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {members.map((member) => {
            const hasPhoto = Boolean(
              member.avatar &&
              member.avatar.trim() !== '' &&
              !member.avatar.startsWith('http://') &&
              !member.avatar.startsWith('https://') &&
              !member.avatar.includes('unsplash.com')
            );
            const inputId = `photo_upload_${member.id}`;
            const isEditing = editingMemberId === member.id;

            if (isEditing) {
              return (
                <div
                  key={member.id}
                  className="p-4 rounded-2xl bg-[var(--surface-2)] border-2 border-[var(--accent)]/40 shadow-[var(--shadow)] space-y-3 animate-in fade-in"
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <MemberAvatar
                        member={{
                          ...member,
                          name: editMemberName || member.name,
                          color: { ...member.color, hex: editMemberHex },
                        }}
                        size="xl"
                      />
                      <button
                        type="button"
                        onClick={() => triggerMemberPhotoUpload(member.id)}
                        className="absolute bottom-0 right-0 p-1.5 rounded-full bg-[var(--accent)] text-white shadow-[var(--shadow)] hover:brightness-110"
                        title={hasPhoto ? 'Заменить фото' : 'Загрузить фото'}
                      >
                        <Camera className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        required
                        value={editMemberName}
                        onChange={(e) => setEditMemberName(e.target.value)}
                        placeholder="Имя"
                        className="w-full px-3 py-1.5 rounded-xl bg-[var(--surface)] border border-stone-300 text-xs font-semibold"
                      />
                      <input
                        type="text"
                        value={editMemberRole}
                        onChange={(e) => setEditMemberRole(e.target.value)}
                        placeholder="Роль (напр: Мама)"
                        className="w-full px-3 py-1.5 rounded-xl bg-[var(--surface)] border border-stone-300 text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-stone-200">
                    <div className="flex items-center space-x-2">
                      <span className="text-[12px] text-stone-500 font-medium">Цвет:</span>
                      <input
                        type="color"
                        value={editMemberHex}
                        onChange={(e) => setEditMemberHex(e.target.value)}
                        className="w-6 h-6 rounded-lg cursor-pointer border border-stone-200"
                      />
                      {hasPhoto && (
                        <button
                          type="button"
                          onClick={() => updateMemberPhoto(member.id, undefined)}
                          className="text-[12px] text-rose-600 hover:underline ml-2"
                        >
                          Удалить фото
                        </button>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setEditingMemberId(null)}
                        className="px-3 py-1 text-xs text-stone-500 hover:bg-stone-100 rounded-lg"
                      >
                        Отмена
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveMemberEdit(member.id)}
                        className="px-3 py-1 bg-[var(--accent)] text-white text-xs font-semibold rounded-full shadow-[var(--shadow)]"
                      >
                        Сохранить
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={member.id}
                className="p-4 rounded-2xl bg-[var(--surface-2)] border border-stone-200 flex flex-col justify-between space-y-3 shadow-none hover:border-[var(--accent)]/30 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3.5">
                    {/* Аватар участника с индикатором статуса и кнопкой загрузки */}
                    <div className="relative group">
                      <MemberAvatar member={member} size="xl" className="ring-2 ring-[var(--surface)] shadow-[var(--shadow)]" />
                      <button
                        type="button"
                        onClick={() => triggerMemberPhotoUpload(member.id)}
                        className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                        title={hasPhoto ? 'Заменить фотографию' : 'Загрузить фотографию из галереи'}
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-semibold text-sm text-[var(--text)]">{member.name}</h4>
                        <span
                          className="w-2.5 h-2.5 rounded-full ring-1 ring-[var(--surface)]"
                          style={{ backgroundColor: member.color.hex }}
                        />
                      </div>
                      <p className="text-xs text-[var(--muted)] mt-0.5">{member.role}</p>
                      
                      <div className="mt-1">
                        {hasPhoto ? (
                          <span className="inline-flex items-center space-x-1 text-[12px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <Check className="w-2.5 h-2.5" />
                            <span>Фото из галереи</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-[12px] font-medium text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
                            <span>Инициалы: {getMemberInitials(member.name)}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => startEditMember(member)}
                      className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
                      title="Редактировать данные участника"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {members.length > 1 && (
                      <button
                        type="button"
                        onClick={() => deleteMember(member.id)}
                        className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Удалить участника"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Блок управления фотографией участника */}
                <div className="pt-2 border-t border-stone-200/70 flex items-center justify-between text-xs">
                  {/* Скрытый input для выбора файла из галереи устройства (iPad/iPhone/ПК) */}
                  <input
                    id={inputId}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleUploadPhotoForMember(member.id, file);
                        e.target.value = ''; // Сброс для возможности повторной загрузки
                      }
                    }}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => triggerMemberPhotoUpload(member.id)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[var(--surface)] border border-stone-300 hover:bg-[var(--surface-2)] text-stone-700 text-xs font-semibold cursor-pointer transition-colors shadow-none"
                  >
                    <Camera className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <span>{hasPhoto ? 'Заменить фото' : 'Загрузить фото'}</span>
                  </button>

                  {hasPhoto && (
                    <button
                      type="button"
                      onClick={() => updateMemberPhoto(member.id, undefined)}
                      className="text-stone-400 hover:text-rose-600 text-xs font-medium hover:underline flex items-center space-x-1 transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                      <span>Удалить фото</span>
                    </button>
                  )}
                  {!hasPhoto && (
                    <span className="text-[12px] text-stone-400 italic">
                      Нейтральный аватар
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
        </>
      )}

      {section === 'data' && (
        <>
      {/* 3. Автономная оффлайн-работа (PWA и IndexedDB) */}
      <div className="bg-[var(--surface)] rounded-2xl p-6 border border-[var(--line)] shadow-[var(--shadow)] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--line)]">
          <div>
            <div className="flex items-center space-x-2">
              <Database className="w-5 h-5 text-[var(--accent)]" />
              <h3 className="font-semibold text-sm text-[var(--text)]">
                Автономная работа: Service Worker и IndexedDB
              </h3>
            </div>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              Центр управления домом работает даже при полном отсутствии интернета. Задачи и календарь сохраняются локально.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold ${ !isOffline ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200' }`}
            >
              {!isOffline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span>{!isOffline ? 'Подключено к сети' : 'Оффлайн-режим'}</span>
            </span>
          </div>
        </div>

        {/* Сводка хранилищ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Блок IndexedDB */}
          <div className="p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--line)] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <HardDrive className="w-4 h-4 text-[var(--accent)]" />
                <span className="text-xs font-semibold text-[var(--text)]">База данных IndexedDB</span>
              </div>
              <span className="text-[12px] px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-semibold">
                Активна
              </span>
            </div>
            <div className="space-y-1.5 text-xs text-[var(--text-2)]">
              <div className="flex justify-between py-0.5 border-b border-[var(--line)]">
                <span>Задач сохранено в IndexedDB:</span>
                <strong className="text-[var(--text)]">{offlineStats ? offlineStats.taskCount : '...'}</strong>
              </div>
              <div className="flex justify-between py-0.5 border-b border-[var(--line)]">
                <span>Событий календаря в базе:</span>
                <strong className="text-[var(--text)]">{offlineStats ? offlineStats.eventCount : '...'}</strong>
              </div>
              <div className="flex justify-between py-0.5">
                <span>Последняя синхронизация:</span>
                <span className="text-[12px] text-[var(--muted)]">
                  {offlineStats?.lastTasksSaved
                    ? new Date(offlineStats.lastTasksSaved).toLocaleTimeString('ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })
                    : 'Только что'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={async () => {
                setIsSyncingIDB(true);
                try {
                  await syncOfflineData();
                } finally {
                  setIsSyncingIDB(false);
                }
              }}
              disabled={isSyncingIDB}
              className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-[var(--surface)] border border-[var(--line)] hover:border-[var(--accent)] text-xs font-semibold text-[var(--text)] hover:text-[var(--accent)] transition-all cursor-pointer shadow-none disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingIDB ? 'animate-spin text-[var(--accent)]' : ''}`} />
              <span>{isSyncingIDB ? 'Синхронизация...' : 'Синхронизировать задачи и календарь'}</span>
            </button>
          </div>

          {/* Блок Service Worker & PWA */}
          <div className="p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--line)] space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Smartphone className="w-4 h-4 text-[var(--accent)]" />
                  <span className="text-xs font-semibold text-[var(--text)]">Кеш ресурсов (Service Worker)</span>
                </div>
                <span className="text-[12px] px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-semibold">
                  Установлен
                </span>
              </div>
              <p className="text-xs text-[var(--text-2)] mt-2 leading-relaxed">
                Все скрипты, шрифты, стили интерфейса и компоненты закешированы через Workbox. Приложение мгновенно открывается даже без сотовой связи и Wi-Fi.
              </p>
            </div>

            <div className="pt-2">
              <PWAInstallButton variant="primary" className="w-full justify-center" />
            </div>
          </div>
        </div>
      </div>
        </>
      )}

      {section === 'assistant' && (
        <>
      {/* Главный ассистент */}
      <AssistantSettingsCard />
        </>
      )}

      {section === 'look' && (
        <>
      {/* Оформление */}
      <div className="bg-[var(--surface)] rounded-2xl p-6 border border-[var(--line)] shadow-[var(--shadow)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-sm text-[var(--text)]">Оформление</h3>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Светлая, тёмная или автоматически по настройке устройства.
          </p>
        </div>
        <ThemeSegmented />
      </div>
        </>
      )}

      {section === 'look' && (
        <>
      {/* Знакомство с приложением */}
      <div className="bg-[var(--surface)] rounded-2xl p-6 border border-[var(--line)] shadow-[var(--shadow)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-sm text-[var(--text)]">Знакомство с приложением</h3>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Показать приветственный экран и обучающий тур ещё раз. Данные не меняются.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetOnboarding();
            window.location.reload();
          }}
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--line)] text-[var(--text)] text-xs font-semibold hover:bg-[var(--surface-3)] active:scale-[0.98] transition"
        >
          <RotateCcw className="w-3.5 h-3.5 text-[var(--accent)]" />
          Показать снова
        </button>
      </div>
        </>
      )}

      {section === 'data' && (
        <>
      {/* 4. Резервное копирование и экспорт */}
      <div className="bg-[var(--surface)] rounded-2xl p-6 border border-[var(--line)] shadow-[var(--shadow)] space-y-4">
        <div className="pb-3 border-b border-[var(--line)]">
          <h3 className="font-semibold text-sm text-[var(--text)]">
            Резервное копирование данных
          </h3>
          <p className="text-xs text-[var(--muted)]">
            Выгрузите резервную копию со всеми задачами, рецептами, документами и списками в JSON-файл или загрузите её на другое устройство.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Экспорт */}
          <button
            onClick={exportBackupJson}
            className="flex items-center justify-center space-x-2 p-3 rounded-2xl bg-[var(--surface-2)] border border-[var(--line)] hover:bg-[var(--surface-3)] text-xs font-semibold text-[var(--text)] transition-all cursor-pointer shadow-none"
          >
            <Download className="w-4 h-4 text-[var(--accent)]" />
            <span>Экспорт в JSON</span>
          </button>

          {/* Импорт */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileImport}
            accept=".json"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center space-x-2 p-3 rounded-2xl bg-[var(--surface-2)] border border-[var(--line)] hover:bg-[var(--surface-3)] text-xs font-semibold text-[var(--text)] transition-all cursor-pointer shadow-none"
          >
            <Upload className="w-4 h-4 text-emerald-600" />
            <span>Импорт из JSON</span>
          </button>

          {/* Очистить кэш */}
          <button
            onClick={() => setShowCacheConfirm(true)}
            className="flex items-center justify-center space-x-2 p-3 rounded-2xl bg-amber-50/70 border border-amber-300 hover:bg-amber-100/70 text-xs font-semibold text-amber-900 transition-all cursor-pointer shadow-none"
          >
            <RefreshCw className="w-4 h-4 text-amber-600" />
            <span>Очистить кэш браузера</span>
          </button>
        </div>
      </div>
        </>
      )}

      {section === 'data' && (
        <>
      {/* 5. Управление хранилищем и сброс данных */}
      <div className="bg-[var(--surface)] rounded-2xl p-6 border border-[var(--line)] shadow-[var(--shadow)] space-y-6">
        <div className="pb-3 border-b border-[var(--line)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center space-x-2">
              <Trash2 className="w-5 h-5 text-rose-600" />
              <h3 className="font-semibold text-sm text-[var(--text)]">
                Управление хранилищем и сброс данных
              </h3>
            </div>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              Модульная очистка устаревших замеров, обнуление счётчиков или выборочный сброс разделов без потери остальных данных
            </p>
          </div>
        </div>

        {/* Блок 5.1: Счётчики ЖКХ и история замеров */}
        <div className="p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--line)] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[var(--line)]">
            <div className="flex items-center space-x-2">
              <Gauge className="w-4 h-4 text-[var(--accent)]" />
              <h4 className="font-semibold text-xs text-[var(--text)]">Счётчики ЖКХ и история показаний</h4>
            </div>
            <div className="flex items-center space-x-2 text-[12px] text-[var(--text-2)]">
              <span className="bg-[var(--surface)] px-2 py-0.5 rounded-md border border-[var(--line-strong)]">
                Счётчиков: <strong>{meters.length}</strong>
              </span>
              <span className="bg-[var(--surface)] px-2 py-0.5 rounded-md border border-[var(--line-strong)]">
                Замеров в базе: <strong>{meters.reduce((acc, m) => acc + m.readings.length, 0)}</strong>
              </span>
            </div>
          </div>

          <p className="text-xs text-[var(--text-2)] leading-relaxed">
            Если старые показания больше не актуальны или нужно начать новый расчётный цикл:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            {/* Очистить только историю замеров */}
            <button
              type="button"
              onClick={() =>
                setConfirmModal({
                  title: 'Очистить историю показаний счётчиков?',
                  description:
                    'Все сохранённые замеры за прошлые месяцы будут удалены. Сами приборы учёта (названия, серийные номера и тарифы) останутся на месте, а базой станет их начальное значение.',
                  confirmLabel: 'Очистить историю',
                  isDanger: true,
                  onConfirm: () => clearMeterReadings(),
                })
              }
              className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--line-strong)] hover:border-rose-300 hover:bg-rose-50/40 text-left transition-all cursor-pointer shadow-none group"
            >
              <div className="flex items-center space-x-2 text-xs font-semibold text-[var(--text)] group-hover:text-rose-700">
                <Trash2 className="w-3.5 h-3.5 text-stone-400 group-hover:text-rose-600 shrink-0" />
                <span>Очистить историю</span>
              </div>
              <p className="text-[12px] text-[var(--muted)] mt-1 leading-normal">
                Удалить ежемесячные замеры, сохранив приборы и тарифы
              </p>
            </button>

            {/* Обнулить счётчики (сброс базы в 0) */}
            <button
              type="button"
              onClick={() =>
                setConfirmModal({
                  title: 'Обнулить все счётчики ЖКХ в 0?',
                  description:
                    'История замеров будет очищена, а начальные базовые показания всех счётчиков будут выставлены в 0. Это удобно при переезде в новую квартиру или установке новых приборов учёта.',
                  confirmLabel: 'Обнулить до 0',
                  isDanger: true,
                  onConfirm: () => resetMetersToZero(),
                })
              }
              className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--line-strong)] hover:border-amber-300 hover:bg-amber-50/40 text-left transition-all cursor-pointer shadow-none group"
            >
              <div className="flex items-center space-x-2 text-xs font-semibold text-[var(--text)] group-hover:text-amber-800">
                <RotateCcw className="w-3.5 h-3.5 text-stone-400 group-hover:text-amber-600 shrink-0" />
                <span>Обнулить счётчики (в 0)</span>
              </div>
              <p className="text-[12px] text-[var(--muted)] mt-1 leading-normal">
                Сбросить базу всех приборов в 0 и очистить цепочку
              </p>
            </button>

            {/* Восстановить демо-счётчики */}
            <button
              type="button"
              onClick={() =>
                setConfirmModal({
                  title: 'Восстановить демонстрационные счётчики?',
                  description:
                    'Будет загружен стандартный демонстрационный комплект счётчиков (холодная/горячая вода, свет Т1/Т2, газ, отопление) с образцовыми показаниями и тарифами.',
                  confirmLabel: 'Восстановить демо',
                  isDanger: false,
                  onConfirm: () => resetMetersToInitial(),
                })
              }
              className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--line-strong)] hover:border-[var(--line)] hover:bg-[var(--accent-soft)]/40 text-left transition-all cursor-pointer shadow-none group"
            >
              <div className="flex items-center space-x-2 text-xs font-semibold text-[var(--text)] group-hover:text-[var(--accent)]">
                <RefreshCw className="w-3.5 h-3.5 text-stone-400 group-hover:text-[var(--accent)] shrink-0" />
                <span>Восстановить демо</span>
              </div>
              <p className="text-[12px] text-[var(--muted)] mt-1 leading-normal">
                Вернуть исходные образцовые показания и счётчики
              </p>
            </button>
          </div>
        </div>

        {/* Блок 5.2: Список покупок, задачи и чеки */}
        <div className="p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--line)] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[var(--line)]">
            <div className="flex items-center space-x-2">
              <ShoppingBag className="w-4 h-4 text-emerald-600" />
              <h4 className="font-semibold text-xs text-[var(--text)]">Покупки, задачи и архив чеков</h4>
            </div>
            <div className="flex items-center space-x-2 text-[12px] text-[var(--text-2)]">
              <span className="bg-[var(--surface)] px-2 py-0.5 rounded-md border border-[var(--line-strong)]">
                Покупок: <strong>{shoppingItems.length}</strong> ({shoppingItems.filter((i) => i.completed).length} куплено)
              </span>
              <span className="bg-[var(--surface)] px-2 py-0.5 rounded-md border border-[var(--line-strong)]">
                Задач: <strong>{tasks.length}</strong>
              </span>
              <span className="bg-[var(--surface)] px-2 py-0.5 rounded-md border border-[var(--line-strong)]">
                Чеков: <strong>{receipts.length}</strong>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* Очистить купленные товары */}
            <button
              type="button"
              disabled={shoppingItems.filter((i) => i.completed).length === 0}
              onClick={() =>
                setConfirmModal({
                  title: 'Удалить купленные товары?',
                  description:
                    'Все вычеркнутые (купленные) позиции будут удалены из всех списков. Некупленные товары останутся на месте.',
                  confirmLabel: 'Удалить купленные',
                  isDanger: false,
                  onConfirm: () => clearShoppingItems(true),
                })
              }
              className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--line-strong)] hover:bg-stone-50 disabled:opacity-50 text-left transition-all cursor-pointer shadow-none"
            >
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-[var(--text)]">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Удалить купленные</span>
              </div>
              <p className="text-[12px] text-[var(--muted)] mt-1">
                Очистить зачёркнутые позиции ({shoppingItems.filter((i) => i.completed).length})
              </p>
            </button>

            {/* Очистить весь список покупок */}
            <button
              type="button"
              disabled={shoppingItems.length === 0}
              onClick={() =>
                setConfirmModal({
                  title: 'Очистить весь список покупок?',
                  description: 'Все товары во всех списках будут безвозвратно удалены.',
                  confirmLabel: 'Очистить весь список',
                  isDanger: true,
                  onConfirm: () => clearShoppingItems(false),
                })
              }
              className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--line-strong)] hover:bg-rose-50/40 hover:border-rose-200 disabled:opacity-50 text-left transition-all cursor-pointer shadow-none group"
            >
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-[var(--text)] group-hover:text-rose-700">
                <Trash2 className="w-3.5 h-3.5 text-stone-400 group-hover:text-rose-600 shrink-0" />
                <span>Очистить покупки</span>
              </div>
              <p className="text-[12px] text-[var(--muted)] mt-1">
                Удалить все {shoppingItems.length} товаров из списков
              </p>
            </button>

            {/* Очистить выполненные задачи */}
            <button
              type="button"
              disabled={tasks.filter((t) => t.completed).length === 0}
              onClick={() =>
                setConfirmModal({
                  title: 'Очистить выполненные задачи?',
                  description:
                    'Все завершённые задачи будут удалены из списка и базы данных. Текущие активные задачи сохранятся.',
                  confirmLabel: 'Очистить архив',
                  isDanger: false,
                  onConfirm: () => clearTasks(true),
                })
              }
              className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--line-strong)] hover:bg-stone-50 disabled:opacity-50 text-left transition-all cursor-pointer shadow-none"
            >
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-[var(--text)]">
                <CheckSquare className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                <span>Удалить сделанные задачи</span>
              </div>
              <p className="text-[12px] text-[var(--muted)] mt-1">
                Архив завершённых дел ({tasks.filter((t) => t.completed).length})
              </p>
            </button>

            {/* Очистить архив чеков */}
            <button
              type="button"
              disabled={receipts.length === 0}
              onClick={() =>
                setConfirmModal({
                  title: 'Удалить все отсканированные чеки?',
                  description:
                    'Все чеки и их фотоснимки будут удалены из памяти браузера и хранилища IndexedDB.',
                  confirmLabel: 'Удалить все чеки',
                  isDanger: true,
                  onConfirm: () => clearAllReceipts(),
                })
              }
              className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--line-strong)] hover:bg-rose-50/40 hover:border-rose-200 disabled:opacity-50 text-left transition-all cursor-pointer shadow-none group"
            >
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-[var(--text)] group-hover:text-rose-700">
                <FileText className="w-3.5 h-3.5 text-stone-400 group-hover:text-rose-600 shrink-0" />
                <span>Очистить чеки</span>
              </div>
              <p className="text-[12px] text-[var(--muted)] mt-1">
                Удалить сохранённые чеки ({receipts.length})
              </p>
            </button>
          </div>
        </div>

        {/* Блок 5.3: Полный сброс приложения */}
        <div className="p-4 rounded-2xl bg-rose-50/30 border border-rose-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="flex items-center space-x-1.5 text-rose-800 font-semibold text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Полный сброс данных приложения</span>
            </div>
            <p className="text-[12px] text-rose-900/80 leading-relaxed max-w-xl">
              Если вы хотите вернуть систему в первоначальное состояние, вы можете сбросить все разделы к демонстрационным данным или полностью стереть локальное хранилище.
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={() =>
                setConfirmModal({
                  title: 'Сбросить все разделы к демо-данным?',
                  description:
                    'Все задачи, списки покупок, чеки, рецепты, лекарства и счётчики вернутся к исходному демонстрационному состоянию.',
                  confirmLabel: 'Сбросить к демо',
                  isDanger: true,
                  onConfirm: () => resetToDefaultData(),
                })
              }
              className="px-3.5 py-2 rounded-xl bg-[var(--surface)] border border-rose-200 hover:bg-rose-50 text-rose-800 font-semibold text-xs transition-colors cursor-pointer shadow-none"
            >
              Сброс к демо
            </button>
            <button
              type="button"
              onClick={() =>
                setConfirmModal({
                  title: 'Полностью стереть хранилище (Hard Reset)?',
                  description:
                    'Все локальные данные во всех модулях будут стёрты безвозвратно. Рекомендуется сначала сделать экспорт в JSON.',
                  confirmLabel: 'Стереть всё',
                  isDanger: true,
                  onConfirm: () => clearAllLocalStorageData(),
                })
              }
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors cursor-pointer shadow-none"
            >
              Стереть всё
            </button>
          </div>
        </div>

        {/* Конфиденциальность OneHaus */}
        <div className="p-4 rounded-2xl bg-[var(--surface-2)] border border-[var(--line)] flex items-center space-x-3 text-xs text-[var(--text-2)]">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>
            <strong>Конфиденциальность:</strong> Все данные хранятся локально в вашем браузере. Вы всегда полностью контролируете хранилище, можете скачивать копии и стирать любые записи в 1 клик.
          </span>
        </div>
      </div>
        </>
      )}

      {/* Универсальное модальное окно подтверждения сброса / очистки */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[var(--surface)] rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-stone-200 text-center space-y-4 animate-in zoom-in-95 duration-150">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${ confirmModal.isDanger ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-700' }`}
            >
              {confirmModal.isDanger ? (
                <Trash2 className="w-6 h-6" />
              ) : (
                <AlertTriangle className="w-6 h-6" />
              )}
            </div>
            <div>
              <h3 className="text-base font-semibold text-[var(--text)]">{confirmModal.title}</h3>
              <p className="text-xs text-[var(--muted)] mt-1.5 leading-relaxed">
                {confirmModal.description}
              </p>
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-2 px-3 rounded-xl border border-[var(--line-strong)] text-xs font-semibold text-[var(--text-2)] hover:bg-[var(--surface-3)] transition-colors cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
                className={`flex-1 py-2 px-3 rounded-full text-white text-xs font-semibold transition-colors cursor-pointer ${ confirmModal.isDanger ? 'bg-rose-600 hover:bg-rose-500' : 'bg-[var(--accent)] hover:brightness-110' }`}
              >
                {confirmModal.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно подтверждения очистки кэша */}
      {showCacheConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[var(--surface)] rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-amber-200 text-center space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[var(--text)]">Очистить кэш приложения?</h3>
              <p className="text-xs text-[var(--muted)] mt-1 leading-relaxed">
                Сервисные воркеры и временный кэш браузера будут сброшены. Приложение перезагрузит самые свежие скрипты. Все ваши сохранённые данные останутся на месте.
              </p>
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCacheConfirm(false)}
                className="flex-1 py-2 px-3 rounded-xl border border-[var(--line-strong)] text-xs font-semibold text-[var(--text-2)] hover:bg-[var(--surface-3)] transition-colors cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCacheConfirm(false);
                  clearAllCacheAndReload();
                }}
                className="flex-1 py-2 px-3 rounded-full bg-[var(--accent)] hover:brightness-110 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Да, очистить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно мастера настройки для любой страны мира */}
      <CleanStartModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
      />
    </div>
  );
};
