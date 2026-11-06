import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Car,
  Check,
  Copy,
  Droplets,
  ExternalLink,
  Flame,
  HeartPulse,
  Home,
  Info,
  Key,
  MapPin,
  PawPrint,
  Pencil,
  Phone,
  PhoneCall,
  Pill,
  Plus,
  RefreshCw,
  ShieldAlert,
  Trash2,
  Trees,
  User,
  Wifi,
  X,
  Zap,
} from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import { handlePhoneAction } from '../../utils/phoneUtils';
import { clearAllCacheAndReload } from '../../utils/cacheUtils';
import {
  PropertyId,
  HouseholdProperty,
  MedicalMemberInfo,
  FamilyMember,
  AccidentGuidance,
  PetEmergencyInfo,
} from '../../types';
import { INITIAL_MEDICAL_EMERGENCY } from '../../data/initialData';

interface SOSViewProps {
  onClose: () => void;
  onNavigateToFirstAid?: () => void;
}

export const SOSView: React.FC<SOSViewProps> = ({ onClose, onNavigateToFirstAid }) => {
  const {
    properties,
    activePropertyId,
    setActivePropertyId,
    addProperty,
    updateProperty,
    deleteProperty,
    members,
    addMember,
    updateMember,
    deleteMember,
    petEmergency,
    updatePetEmergency,
    accidentGuidance,
    updateAccidentGuidance,
    medicalEmergency,
    addMedicalEmergency,
    updateMedicalEmergency,
    deleteMedicalEmergency,
    showToast,
  } = useHousehold();

  // Локальный выбор вкладки объекта внутри SOS
  const [selectedPropId, setSelectedPropId] = useState<PropertyId>(activePropertyId || 'apartment');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Состояния для модальных окон
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [propertyFormData, setPropertyFormData] = useState<Partial<HouseholdProperty> | null>(null);
  const [propertyEditSection, setPropertyEditSection] = useState<'all' | 'water' | 'electric' | 'services' | 'address'>('all');

  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [contactFormData, setContactFormData] = useState<Partial<FamilyMember> | null>(null);

  const [isAccidentModalOpen, setIsAccidentModalOpen] = useState(false);
  const [accidentFormData, setAccidentFormData] = useState<AccidentGuidance | null>(null);

  const [isPetModalOpen, setIsPetModalOpen] = useState(false);
  const [petFormData, setPetFormData] = useState<PetEmergencyInfo | null>(null);
  const [petRestrictionsText, setPetRestrictionsText] = useState('');

  const [isMedicalModalOpen, setIsMedicalModalOpen] = useState(false);
  const [medicalFormData, setMedicalFormData] = useState<Partial<MedicalMemberInfo> | null>(null);
  const [medAllergiesText, setMedAllergiesText] = useState('');
  const [medConditionsText, setMedConditionsText] = useState('');
  const [medMedicationsText, setMedMedicationsText] = useState('');

  // Модалка подтверждения удаления
  const [confirmDelete, setConfirmDelete] = useState<{
    type: 'property' | 'contact' | 'medical';
    id: string;
    title: string;
  } | null>(null);

  // Регион экстренных служб (РФ или Греция / ЕС)
  const [emergencyRegion, setEmergencyRegion] = useState<'ru' | 'gr'>('ru');

  // Нажатие клавиши Escape для быстрого выхода
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (
          isPropertyModalOpen ||
          isContactModalOpen ||
          isAccidentModalOpen ||
          isPetModalOpen ||
          isMedicalModalOpen ||
          confirmDelete
        ) {
          setIsPropertyModalOpen(false);
          setIsContactModalOpen(false);
          setIsAccidentModalOpen(false);
          setIsPetModalOpen(false);
          setIsMedicalModalOpen(false);
          setConfirmDelete(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    onClose,
    isPropertyModalOpen,
    isContactModalOpen,
    isAccidentModalOpen,
    isPetModalOpen,
    isMedicalModalOpen,
    confirmDelete,
  ]);

  const copyToClipboard = (text: string, label: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast(`${label} скопировано в буфер обмена`, 'success');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Фильтрация отображаемых объектов
  const displayedProperties =
    selectedPropId === 'all'
      ? properties
      : properties.filter((p) => p.id === selectedPropId);

  // Обработчики сохранения объекта (Добавить / Изменить)
  const handleOpenAddProperty = () => {
    setPropertyFormData({
      name: '',
      shortName: '',
      address: '',
      intercomCode: '',
      wifiInfo: { ssid: '', password: '' },
      managementCompany: {
        name: 'Управляющая компания / ТСЖ',
        phone: '',
        dispatchPhone: '',
        plumberPhone: '',
        electricianPhone: '',
      },
      waterShutoff: {
        location: '',
        instructions: '',
        hasAquaStop: false,
      },
      electricPanel: {
        location: '',
        mainBreaker: '',
        notes: '',
      },
      gasShutoff: {
        hasGas: false,
        location: '',
        instructions: '',
      },
      firstAidLocation: '',
      backupKeysLocation: '',
    });
    setPropertyEditSection('all');
    setIsPropertyModalOpen(true);
  };

  const handleOpenEditProperty = (
    prop: HouseholdProperty,
    section: 'all' | 'water' | 'electric' | 'services' | 'address' = 'all'
  ) => {
    setPropertyFormData({ ...prop });
    setPropertyEditSection(section);
    setIsPropertyModalOpen(true);
  };

  const handleSaveProperty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyFormData || !propertyFormData.name?.trim()) {
      showToast('Укажите название объекта', 'warning');
      return;
    }

    const payload: Omit<HouseholdProperty, 'id'> = {
      name: propertyFormData.name.trim(),
      shortName: propertyFormData.shortName?.trim() || propertyFormData.name.trim(),
      address: propertyFormData.address?.trim() || 'Адрес не указан',
      intercomCode: propertyFormData.intercomCode?.trim() || '',
      wifiInfo: {
        ssid: propertyFormData.wifiInfo?.ssid || '',
        password: propertyFormData.wifiInfo?.password || '',
      },
      managementCompany: {
        name: propertyFormData.managementCompany?.name || 'Управляющая организация',
        phone: propertyFormData.managementCompany?.phone || '',
        dispatchPhone: propertyFormData.managementCompany?.dispatchPhone || '',
        plumberPhone: propertyFormData.managementCompany?.plumberPhone || '',
        electricianPhone: propertyFormData.managementCompany?.electricianPhone || '',
      },
      waterShutoff: {
        location: propertyFormData.waterShutoff?.location || 'Санузел / стояк',
        instructions: propertyFormData.waterShutoff?.instructions || 'Перекрыть вводные краны по часовой стрелке',
        hasAquaStop: !!propertyFormData.waterShutoff?.hasAquaStop,
      },
      electricPanel: {
        location: propertyFormData.electricPanel?.location || 'Прихожая / коридор',
        mainBreaker: propertyFormData.electricPanel?.mainBreaker || 'Главный автомат (Ввод)',
        notes: propertyFormData.electricPanel?.notes || '',
      },
      gasShutoff: propertyFormData.gasShutoff || { hasGas: false },
      firstAidLocation: propertyFormData.firstAidLocation || 'В шкафу на полке',
      backupKeysLocation: propertyFormData.backupKeysLocation || 'У консьержа / соседей',
      notes: propertyFormData.notes || '',
    };

    if (propertyFormData.id) {
      updateProperty(propertyFormData.id, payload);
    } else {
      addProperty(payload);
    }
    setIsPropertyModalOpen(false);
    setPropertyFormData(null);
  };

  // Удаление объекта
  const handleDeleteConfirm = () => {
    if (!confirmDelete) return;
    if (confirmDelete.type === 'property') {
      deleteProperty(confirmDelete.id);
      if (selectedPropId === confirmDelete.id) {
        setSelectedPropId('all');
      }
    } else if (confirmDelete.type === 'contact') {
      deleteMember(confirmDelete.id);
    } else if (confirmDelete.type === 'medical') {
      deleteMedicalEmergency(confirmDelete.id);
    }
    setConfirmDelete(null);
  };

  // Обработчик контактов семьи (Добавить / Изменить)
  const handleOpenAddContact = () => {
    setContactFormData({
      name: '',
      role: 'Родственник • Экстренная связь',
      phone: '',
      color: {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        hex: '#059669',
        badgeBg: 'bg-emerald-100 text-emerald-800',
      },
    });
    setIsContactModalOpen(true);
  };

  const handleOpenEditContact = (member: FamilyMember) => {
    setContactFormData({ ...member });
    setIsContactModalOpen(true);
  };

  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactFormData || !contactFormData.name?.trim()) {
      showToast('Укажите имя контакта', 'warning');
      return;
    }

    if (contactFormData.id) {
      updateMember(contactFormData.id, contactFormData);
    } else {
      addMember({
        name: contactFormData.name.trim(),
        role: contactFormData.role || 'Экстренная связь',
        phone: contactFormData.phone?.trim() || '',
        color: contactFormData.color || {
          bg: 'bg-blue-50',
          text: 'text-blue-700',
          border: 'border-blue-200',
          hex: '#2563EB',
          badgeBg: 'bg-blue-100 text-blue-800',
        },
      });
    }
    setIsContactModalOpen(false);
    setContactFormData(null);
  };

  // Обработчик ДТП
  const handleOpenEditAccident = () => {
    setAccidentFormData({ ...accidentGuidance });
    setIsAccidentModalOpen(true);
  };

  const handleSaveAccident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accidentFormData) return;
    updateAccidentGuidance(accidentFormData);
    setIsAccidentModalOpen(false);
  };

  // Обработчик Питомца
  const handleOpenEditPet = () => {
    setPetFormData({ ...petEmergency });
    setPetRestrictionsText(petEmergency.restrictions ? petEmergency.restrictions.join('\n') : '');
    setIsPetModalOpen(true);
  };

  const handleSavePet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!petFormData || !petFormData.name?.trim()) {
      showToast('Укажите кличку питомца', 'warning');
      return;
    }
    const restrictions = petRestrictionsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    updatePetEmergency({
      ...petFormData,
      name: petFormData.name.trim(),
      restrictions,
    });
    setIsPetModalOpen(false);
  };

  // Обработчик Медицинских данных (Добавить / Изменить)
  const handleOpenAddMedical = () => {
    setMedicalFormData({
      memberId: `med_${Date.now()}`,
      name: '',
      role: 'Член семьи',
      bloodType: 'I (0) Rh+ (первая положительная)',
      allergies: [],
      chronicConditions: [],
      currentMedications: [],
      emergencyContactPhone: '',
    });
    setMedAllergiesText('');
    setMedConditionsText('');
    setMedMedicationsText('');
    setIsMedicalModalOpen(true);
  };

  const handleOpenEditMedical = (med: MedicalMemberInfo) => {
    setMedicalFormData({ ...med });
    setMedAllergiesText((med.allergies || []).join(', '));
    setMedConditionsText((med.chronicConditions || []).join(', '));
    setMedMedicationsText((med.currentMedications || []).join(', '));
    setIsMedicalModalOpen(true);
  };

  const handleSaveMedical = (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicalFormData || !medicalFormData.name?.trim()) {
      showToast('Укажите имя члена семьи', 'warning');
      return;
    }

    const payload: MedicalMemberInfo = {
      memberId: medicalFormData.memberId || `med_${Date.now()}`,
      name: medicalFormData.name.trim(),
      role: medicalFormData.role?.trim() || 'Член семьи',
      bloodType: medicalFormData.bloodType || 'Не указана',
      allergies: medAllergiesText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      chronicConditions: medConditionsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      currentMedications: medMedicationsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      emergencyContactPhone: medicalFormData.emergencyContactPhone?.trim() || '',
    };

    const exists = medicalEmergency.some((m) => m.memberId === payload.memberId);
    if (exists) {
      updateMedicalEmergency(payload.memberId, payload);
    } else {
      addMedicalEmergency(payload);
    }
    setIsMedicalModalOpen(false);
    setMedicalFormData(null);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/95 backdrop-blur-md text-stone-100 flex flex-col">
      {/* ==================== ВЕРХНЯЯ ЭКСТРЕННАЯ ПАНЕЛЬ ==================== */}
      <header className="sticky top-0 z-30 bg-gradient-to-r from-red-700 via-rose-700 to-red-800 text-white shadow-xl px-4 sm:px-8 py-3.5 border-b border-red-500/30">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center animate-pulse border border-white/25">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight uppercase">
                  Экстренный режим SOS
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-white text-red-700 uppercase">
                  Без пароля
                </span>
              </div>
              <p className="text-xs text-red-100/90 font-medium">
                Первая помощь • Инженерия объектов • Телефоны аварийных служб • ДТП
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Кнопка Очистить кэш */}
            <button
              onClick={() => {
                clearAllCacheAndReload();
              }}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-black/25 hover:bg-black/40 text-red-100 text-xs font-semibold border border-white/20 active:scale-95 transition-all cursor-pointer shadow-sm"
              title="Сбросить локальный кэш и обновить приложение"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden sm:inline">Очистить кэш</span>
            </button>

            {/* Большая кнопка выхода */}
            <button
              onClick={onClose}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-black/35 hover:bg-black/50 text-white text-xs sm:text-sm font-semibold border border-white/25 active:scale-95 transition-all cursor-pointer shadow-sm"
              title="Закрыть SOS (Esc)"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Назад в дом</span>
              <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[10px] bg-white/20 rounded font-mono">
                Esc
              </kbd>
            </button>
          </div>
        </div>

        {/* Переключатель объектов: Все объекты, Квартира, У Сергея, Дача + Кнопка ДОБАВИТЬ ОБЪЕКТ */}
        <div className="max-w-6xl mx-auto mt-3 pt-2.5 border-t border-red-500/30 flex items-center justify-between gap-2 overflow-x-auto scrollbar-none">
          <div className="flex items-center space-x-1.5 bg-black/25 p-1 rounded-xl border border-white/10 shrink-0">
            <button
              onClick={() => {
                setSelectedPropId('all');
                setActivePropertyId('all');
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedPropId === 'all'
                  ? 'bg-white text-red-700 shadow-sm'
                  : 'text-red-100 hover:bg-white/10'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Все объекты ({properties.length})</span>
            </button>

            {properties.map((prop) => (
              <button
                key={prop.id}
                onClick={() => {
                  setSelectedPropId(prop.id);
                  setActivePropertyId(prop.id);
                }}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedPropId === prop.id
                    ? 'bg-white text-red-700 shadow-sm'
                    : 'text-red-100 hover:bg-white/10'
                }`}
              >
                {prop.id.includes('dacha') ? (
                  <Trees className="w-3.5 h-3.5" />
                ) : (
                  <Home className="w-3.5 h-3.5" />
                )}
                <span>{prop.shortName}</span>
              </button>
            ))}

            {/* Кнопка добавления нового объекта в шапку переключателя */}
            <button
              onClick={handleOpenAddProperty}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-amber-300 hover:bg-white/15 transition-all cursor-pointer ml-1 border border-amber-400/40"
              title="Добавить новый объект"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Добавить объект</span>
            </button>
          </div>

          <div className="text-xs text-red-100/90 font-medium hidden lg:flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" />
            <span>Нажмите на любой телефон для прямого звонка</span>
          </div>
        </div>
      </header>

      {/* ==================== ОСНОВНОЙ КОНТЕНТ ==================== */}
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-8 py-6 space-y-6 flex-1">
        {/* ЮРИДИЧЕСКИЙ И МЕДИЦИНСКИЙ ДИСКЛЕЙМЕР */}
        <div className="bg-amber-950/60 border border-amber-500/40 rounded-xl p-3.5 flex items-start gap-3 text-amber-200 text-xs leading-relaxed shadow-sm">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-amber-300 block mb-0.5">Важное предупреждение о безопасности и медицинской ответственности:</span>
            Информация в этом разделе носит исключительно справочный характер для семьи. При непосредственной угрозе жизни, здоровью, признаках инфаркта, инсульта, тяжелых травмах или пожаре немедленно звоните в государственные службы спасения (112 / Скорая помощь). Всегда сверяйте и актуализируйте аллергии, группы крови и дозировки медикаментов у вашего лечащего врача.
          </div>
        </div>

        {/* ==================== 1. ГОСУДАРСТВЕННЫЕ ЭКСТРЕННЫЕ СЛУЖБЫ ==================== */}
        <section className="bg-stone-800/90 rounded-2xl p-4 sm:p-5 border border-red-500/40 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <PhoneCall className="w-5 h-5 text-red-400" />
                Экстренные службы быстрого реагирования
              </h2>
            </div>
            {/* Переключатель региона: РФ vs Греция/ЕС */}
            <div className="flex items-center space-x-1 bg-stone-900/80 p-1 rounded-xl border border-stone-700">
              <button
                type="button"
                onClick={() => setEmergencyRegion('ru')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  emergencyRegion === 'ru'
                    ? 'bg-red-600 text-white shadow-2xs'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                🇷🇺 РФ / СНГ
              </button>
              <button
                type="button"
                onClick={() => setEmergencyRegion('gr')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  emergencyRegion === 'gr'
                    ? 'bg-red-600 text-white shadow-2xs'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                🇬🇷 Греция / ЕС
              </button>
            </div>
          </div>

          {emergencyRegion === 'ru' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
              {/* 112 Главный */}
              <a
                href="tel:112"
                onClick={(e) => handlePhoneAction(e, '112', 'Единая служба спасения 112', showToast)}
                className="col-span-2 sm:col-span-1 p-3.5 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 text-white hover:brightness-110 active:scale-98 transition-all flex flex-col items-center justify-center text-center shadow-md border border-red-400/50 group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                  <ShieldAlert className="w-5 h-5 text-white" />
                </div>
                <span className="text-2xl font-black tracking-tight leading-none">112</span>
                <span className="text-xs font-semibold mt-1">Единая служба спасения</span>
                <span className="text-[10px] text-red-100/80">МЧС • Скорая • Полиция</span>
              </a>

              {/* 103 Скорая */}
              <a
                href="tel:103"
                onClick={(e) => handlePhoneAction(e, '103', 'Скорая медицинская помощь 103', showToast)}
                className="p-3.5 rounded-xl bg-stone-700/80 hover:bg-stone-700 text-white active:scale-98 transition-all flex flex-col items-center justify-center text-center border border-stone-600 group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                  <HeartPulse className="w-5 h-5" />
                </div>
                <span className="text-2xl font-black tracking-tight leading-none text-rose-400">103</span>
                <span className="text-xs font-semibold mt-1">Скорая помощь</span>
                <span className="text-[10px] text-stone-400">Неотложная помощь</span>
              </a>

              {/* 101 Пожарная */}
              <a
                href="tel:101"
                onClick={(e) => handlePhoneAction(e, '101', 'Пожарная охрана и МЧС 101', showToast)}
                className="p-3.5 rounded-xl bg-stone-700/80 hover:bg-stone-700 text-white active:scale-98 transition-all flex flex-col items-center justify-center text-center border border-stone-600 group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                  <Flame className="w-5 h-5" />
                </div>
                <span className="text-2xl font-black tracking-tight leading-none text-amber-400">101</span>
                <span className="text-xs font-semibold mt-1">Пожарные / МЧС</span>
                <span className="text-[10px] text-stone-400">Огонь, дым, завалы</span>
              </a>

              {/* 104 Газ */}
              <a
                href="tel:104"
                onClick={(e) => handlePhoneAction(e, '104', 'Аварийная газовая служба 104', showToast)}
                className="p-3.5 rounded-xl bg-stone-700/80 hover:bg-stone-700 text-white active:scale-98 transition-all flex flex-col items-center justify-center text-center border border-stone-600 group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                  <Zap className="w-5 h-5" />
                </div>
                <span className="text-2xl font-black tracking-tight leading-none text-blue-400">104</span>
                <span className="text-xs font-semibold mt-1">Аварийная газа</span>
                <span className="text-[10px] text-stone-400">Запах газа, утечка</span>
              </a>

              {/* 102 Полиция */}
              <a
                href="tel:102"
                onClick={(e) => handlePhoneAction(e, '102', 'Полиция 102', showToast)}
                className="p-3.5 rounded-xl bg-stone-700/80 hover:bg-stone-700 text-white active:scale-98 transition-all flex flex-col items-center justify-center text-center border border-stone-600 group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                  <User className="w-5 h-5" />
                </div>
                <span className="text-2xl font-black tracking-tight leading-none text-indigo-400">102</span>
                <span className="text-xs font-semibold mt-1">Полиция</span>
                <span className="text-[10px] text-stone-400">Правопорядок</span>
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
              {/* 112 Главный Евросоюз */}
              <a
                href="tel:112"
                onClick={(e) => handlePhoneAction(e, '112', 'Единый номер спасения ЕС 112', showToast)}
                className="col-span-2 sm:col-span-1 p-3.5 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 text-white hover:brightness-110 active:scale-98 transition-all flex flex-col items-center justify-center text-center shadow-md border border-red-400/50 group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                  <ShieldAlert className="w-5 h-5 text-white" />
                </div>
                <span className="text-2xl font-black tracking-tight leading-none">112</span>
                <span className="text-xs font-semibold mt-1">Спасение ЕС / Греция</span>
                <span className="text-[10px] text-red-100/80">Ευρωπαϊκός Αριθμός</span>
              </a>

              {/* 166 EKAV Скорая Греция */}
              <a
                href="tel:166"
                onClick={(e) => handlePhoneAction(e, '166', 'Скорая помощь Греции EKAV 166', showToast)}
                className="p-3.5 rounded-xl bg-stone-700/80 hover:bg-stone-700 text-white active:scale-98 transition-all flex flex-col items-center justify-center text-center border border-stone-600 group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                  <HeartPulse className="w-5 h-5" />
                </div>
                <span className="text-2xl font-black tracking-tight leading-none text-rose-400">166</span>
                <span className="text-xs font-semibold mt-1">Скорая (ΕΚΑΒ)</span>
                <span className="text-[10px] text-stone-400">Неотложная помощь</span>
              </a>

              {/* 199 Пожарные Греция */}
              <a
                href="tel:199"
                onClick={(e) => handlePhoneAction(e, '199', 'Пожарная охрана Греции 199', showToast)}
                className="p-3.5 rounded-xl bg-stone-700/80 hover:bg-stone-700 text-white active:scale-98 transition-all flex flex-col items-center justify-center text-center border border-stone-600 group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                  <Flame className="w-5 h-5" />
                </div>
                <span className="text-2xl font-black tracking-tight leading-none text-amber-400">199</span>
                <span className="text-xs font-semibold mt-1">Пожарные (Πυροσβεστική)</span>
                <span className="text-[10px] text-stone-400">Огонь и спасение</span>
              </a>

              {/* 100 Полиция Греция */}
              <a
                href="tel:100"
                onClick={(e) => handlePhoneAction(e, '100', 'Полиция Греции 100', showToast)}
                className="p-3.5 rounded-xl bg-stone-700/80 hover:bg-stone-700 text-white active:scale-98 transition-all flex flex-col items-center justify-center text-center border border-stone-600 group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                  <User className="w-5 h-5" />
                </div>
                <span className="text-2xl font-black tracking-tight leading-none text-indigo-400">100</span>
                <span className="text-xs font-semibold mt-1">Полиция (Αστυνομία)</span>
                <span className="text-[10px] text-stone-400">Правопорядок</span>
              </a>

              {/* Токсикология / Отравления */}
              <a
                href="tel:+302107793777"
                onClick={(e) => handlePhoneAction(e, '+302107793777', 'Токсикологический центр Греции', showToast)}
                className="p-3.5 rounded-xl bg-stone-700/80 hover:bg-stone-700 text-white active:scale-98 transition-all flex flex-col items-center justify-center text-center border border-stone-600 group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <span className="text-sm font-black tracking-tight leading-none text-emerald-400 mt-1">210 7793777</span>
                <span className="text-xs font-semibold mt-1">Отравления</span>
                <span className="text-[10px] text-stone-400">Δηλητηριάσεων</span>
              </a>
            </div>
          )}
        </section>

        {/* ==================== 2. СВЯЗЬ С СЕМЬЕЙ (ДОБАВИТЬ / ИЗМЕНИТЬ / УДАЛИТЬ) ==================== */}
        <section className="bg-stone-800/90 rounded-2xl p-4 sm:p-5 border border-stone-700 shadow-md">
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <User className="w-5 h-5 text-amber-400" />
              Быстрый вызов членов семьи и экстренных контактов
            </h2>
            <button
              onClick={handleOpenAddContact}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Добавить контакт</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="p-3.5 rounded-xl bg-stone-700/60 border border-stone-600 flex items-center justify-between gap-3 group relative"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white text-sm truncate">{member.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-800 text-stone-300 shrink-0">
                      {member.role.split('•')[0].trim()}
                    </span>
                  </div>
                  <p className="text-xs text-stone-300 font-mono mt-0.5 truncate">
                    {member.phone || 'Телефон не указан'}
                  </p>
                </div>

                <div className="flex items-center space-x-1.5 shrink-0">
                  {/* Кнопка Позвонить */}
                  {member.phone && (
                    <a
                      href={`tel:${member.phone.replace(/[^+\d]/g, '')}`}
                      onClick={(e) => handlePhoneAction(e, member.phone || '', member.name, showToast)}
                      className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95 transition-all shadow-sm flex items-center justify-center cursor-pointer"
                      title={`Позвонить ${member.name}`}
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                  )}

                  {/* Кнопка Изменить */}
                  <button
                    onClick={() => handleOpenEditContact(member)}
                    className="p-2 rounded-xl bg-stone-600 hover:bg-stone-500 text-stone-200 hover:text-white transition-all cursor-pointer"
                    title="Изменить контакт"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>

                  {/* Кнопка Удалить */}
                  <button
                    onClick={() =>
                      setConfirmDelete({
                        type: 'contact',
                        id: member.id,
                        title: `контакт «${member.name}»`,
                      })
                    }
                    className="p-2 rounded-xl bg-stone-600 hover:bg-red-600/80 text-stone-200 hover:text-white transition-all cursor-pointer"
                    title="Удалить контакт"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ==================== 3. КАРТОЧКИ ОБЪЕКТОВ (ДОБАВИТЬ / ИЗМЕНИТЬ / УДАЛИТЬ) ==================== */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Building2 className="w-5 h-5 text-sky-400" />
              Инженерные паспорта и аварийные узлы {selectedPropId === 'all' ? '(Все объекты)' : ''}
            </h2>

            {/* КНОПКА ДОБАВИТЬ ОБЪЕКТ */}
            <button
              onClick={handleOpenAddProperty}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Добавить объект</span>
            </button>
          </div>

          <div className="space-y-5">
            {displayedProperties.map((prop) => (
              <div
                key={prop.id}
                className="bg-stone-800 rounded-2xl border border-stone-700/80 overflow-hidden shadow-lg"
              >
                {/* Шапка объекта с кнопками ИЗМЕНИТЬ и УДАЛИТЬ */}
                <div className="px-5 py-3.5 bg-gradient-to-r from-stone-800 to-stone-750 border-b border-stone-700 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
                      {prop.id.includes('dacha') ? (
                        <Trees className="w-4 h-4" />
                      ) : (
                        <Home className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base leading-tight">
                        {prop.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5">
                        <p className="text-xs text-stone-300 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span>{prop.address || 'Адрес не указан'}</span>
                        </p>
                        <button
                          onClick={() => handleOpenEditProperty(prop, 'address')}
                          className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 hover:underline cursor-pointer"
                          title="Изменить адрес и параметры доступа"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Изменить адрес</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 text-xs">
                    {prop.intercomCode && (
                      <span className="px-2.5 py-1 rounded-lg bg-stone-700 border border-stone-600 text-stone-200">
                        Домофон: <strong className="text-white">{prop.intercomCode}</strong>
                      </span>
                    )}

                    {/* КНОПКА ИЗМЕНИТЬ ОБЪЕКТ */}
                    <button
                      onClick={() => handleOpenEditProperty(prop, 'all')}
                      className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-stone-700 hover:bg-stone-600 text-white font-semibold transition-all cursor-pointer border border-stone-600"
                      title="Изменить все данные объекта"
                    >
                      <Pencil className="w-3.5 h-3.5 text-sky-400" />
                      <span>Изменить</span>
                    </button>

                    {/* КНОПКА УДАЛИТЬ ОБЪЕКТ */}
                    <button
                      onClick={() =>
                        setConfirmDelete({
                          type: 'property',
                          id: prop.id,
                          title: `объект «${prop.name}»`,
                        })
                      }
                      className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-stone-700 hover:bg-red-600/80 text-stone-300 hover:text-white font-semibold transition-all cursor-pointer border border-stone-600"
                      title="Удалить объект"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Удалить</span>
                    </button>
                  </div>
                </div>

                {/* Сетка инженерии: Вода, Щиток, Аптечка, Ключи */}
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* КАК ПЕРЕКРЫТЬ ВОДУ */}
                  <div className="p-4 rounded-xl bg-stone-900/60 border border-sky-500/30 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2 text-sky-400 font-bold text-sm">
                          <Droplets className="w-4 h-4" />
                          <span>Как перекрыть воду</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          {prop.waterShutoff.hasAquaStop && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                              Аквасторож
                            </span>
                          )}
                          <button
                            onClick={() => handleOpenEditProperty(prop, 'water')}
                            className="px-2 py-0.5 rounded bg-stone-800 hover:bg-sky-950 text-sky-300 hover:text-white border border-stone-700 hover:border-sky-500/50 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
                            title="Изменить данные о перекрытии воды и сантехнике"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Изменить</span>
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-stone-300 font-semibold mb-1">
                        📍 Где находится: {prop.waterShutoff.location}
                      </p>
                      <p className="text-xs text-stone-400 leading-relaxed bg-stone-800/80 p-2.5 rounded-lg border border-stone-700">
                        {prop.waterShutoff.instructions}
                      </p>
                    </div>

                    {/* Телефон дежурного сантехника */}
                    <div className="mt-3 pt-2.5 border-t border-stone-800 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-stone-400">Сантехник / мастер по воде:</span>
                      {prop.managementCompany?.plumberPhone ? (
                        <div className="flex items-center space-x-1.5">
                          <a
                            href={`tel:${prop.managementCompany.plumberPhone.replace(/[^+\d]/g, '')}`}
                            onClick={(e) =>
                              handlePhoneAction(
                                e,
                                prop.managementCompany.plumberPhone || '',
                                'Дежурный сантехник',
                                showToast
                              )
                            }
                            className="flex items-center space-x-1 text-xs text-sky-400 hover:text-sky-300 font-semibold px-2 py-0.5 rounded bg-sky-950/60 border border-sky-500/30 cursor-pointer"
                            title="Позвонить мастеру"
                          >
                            <Phone className="w-3 h-3" />
                            <span>{prop.managementCompany.plumberPhone}</span>
                          </a>
                          <button
                            onClick={() => handleOpenEditProperty(prop, 'water')}
                            className="p-1 rounded hover:bg-stone-800 text-stone-400 hover:text-sky-400 transition-colors cursor-pointer"
                            title="Изменить номер сантехника"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleOpenEditProperty(prop, 'water')}
                          className="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 cursor-pointer hover:underline"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Добавить телефон</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ГДЕ ЩИТОК И КАК ОБЕСТОЧИТЬ */}
                  <div className="p-4 rounded-xl bg-stone-900/60 border border-amber-500/30 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
                          <Zap className="w-4 h-4" />
                          <span>Где щиток и как обесточить</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[10px] text-stone-400">220/380V</span>
                          <button
                            onClick={() => handleOpenEditProperty(prop, 'electric')}
                            className="px-2 py-0.5 rounded bg-stone-800 hover:bg-amber-950 text-amber-300 hover:text-white border border-stone-700 hover:border-amber-500/50 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
                            title="Изменить данные о щитке и электрике"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Изменить</span>
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-stone-300 font-semibold mb-1">
                        📍 Расположение: {prop.electricPanel.location}
                      </p>
                      <div className="space-y-1 bg-stone-800/80 p-2.5 rounded-lg border border-stone-700 text-xs">
                        <p className="text-amber-200 font-semibold">
                          Вводной автомат: {prop.electricPanel.mainBreaker}
                        </p>
                        <p className="text-stone-400 text-[11px] leading-relaxed">
                          {prop.electricPanel.notes}
                        </p>
                      </div>
                    </div>

                    {/* Телефон дежурного электрика */}
                    <div className="mt-3 pt-2.5 border-t border-stone-800 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-stone-400">Дежурный электрик:</span>
                      {prop.managementCompany?.electricianPhone ? (
                        <div className="flex items-center space-x-1.5">
                          <a
                            href={`tel:${prop.managementCompany.electricianPhone.replace(/[^+\d]/g, '')}`}
                            onClick={(e) =>
                              handlePhoneAction(
                                e,
                                prop.managementCompany.electricianPhone || '',
                                'Дежурный электрик',
                                showToast
                              )
                            }
                            className="flex items-center space-x-1 text-xs text-amber-400 hover:text-amber-300 font-semibold px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/30 cursor-pointer"
                            title="Позвонить электрику"
                          >
                            <Phone className="w-3 h-3" />
                            <span>{prop.managementCompany.electricianPhone}</span>
                          </a>
                          <button
                            onClick={() => handleOpenEditProperty(prop, 'electric')}
                            className="p-1 rounded hover:bg-stone-800 text-stone-400 hover:text-amber-400 transition-colors cursor-pointer"
                            title="Изменить номер электрика"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleOpenEditProperty(prop, 'electric')}
                          className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer hover:underline"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Добавить телефон</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ГДЕ АПТЕЧКА И ПЕРВАЯ ПОМОЩЬ */}
                  <div className="p-4 rounded-xl bg-stone-900/60 border border-rose-500/30 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2 text-rose-400 font-bold text-sm">
                          <Pill className="w-4 h-4" />
                          <span>Где аптечка в объекте</span>
                        </div>
                        {onNavigateToFirstAid && (
                          <button
                            onClick={() => {
                              onClose();
                              onNavigateToFirstAid();
                            }}
                            className="text-xs text-rose-300 hover:text-white flex items-center gap-1 font-semibold cursor-pointer"
                          >
                            <span>Открыть каталог</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-stone-300 leading-relaxed bg-stone-800/80 p-2.5 rounded-lg border border-stone-700">
                        {prop.firstAidLocation}
                      </p>
                    </div>
                  </div>

                  {/* КЛЮЧИ, ДОСТУП И УПРАВЛЯЮЩАЯ КОМПАНИЯ */}
                  <div className="p-4 rounded-xl bg-stone-900/60 border border-stone-700 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2 text-stone-300 font-bold text-sm">
                          <Key className="w-4 h-4 text-emerald-400" />
                          <span>Ключи, доступ и службы дома</span>
                        </div>
                        <button
                          onClick={() => handleOpenEditProperty(prop, 'services')}
                          className="px-2 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-emerald-300 hover:text-white border border-stone-700 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
                          title="Изменить ключи, газ и службу дома"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Изменить</span>
                        </button>
                      </div>
                      <p className="text-xs text-stone-400 mb-1.5">
                        <strong className="text-stone-200">Запасные ключи:</strong> {prop.backupKeysLocation}
                      </p>
                      {prop.gasShutoff && prop.gasShutoff.hasGas && (
                        <p className="text-xs text-amber-300 bg-amber-950/40 border border-amber-800/50 p-2 rounded-lg mb-2">
                          <strong>Газ на объекте:</strong> {prop.gasShutoff.location}. {prop.gasShutoff.instructions}
                        </p>
                      )}
                    </div>

                    <div className="mt-2 pt-2 border-t border-stone-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="text-stone-400">
                        {prop.managementCompany.name || 'Служба дома / УК'}:
                      </span>
                      {prop.managementCompany.dispatchPhone ? (
                        <div className="flex items-center space-x-1.5">
                          <a
                            href={`tel:${prop.managementCompany.dispatchPhone.replace(/[^+\d]/g, '')}`}
                            onClick={(e) =>
                              handlePhoneAction(
                                e,
                                prop.managementCompany.dispatchPhone,
                                'Диспетчерская ЖКХ',
                                showToast
                              )
                            }
                            className="px-2.5 py-1 rounded bg-stone-700 hover:bg-stone-600 text-white font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                            title="Позвонить в диспетчерскую"
                          >
                            <Phone className="w-3 h-3 text-emerald-400" />
                            <span>Аварийная: {prop.managementCompany.dispatchPhone}</span>
                          </a>
                          <button
                            onClick={() => handleOpenEditProperty(prop, 'services')}
                            className="p-1 rounded hover:bg-stone-800 text-stone-400 hover:text-emerald-400 transition-colors cursor-pointer"
                            title="Изменить телефон диспетчерской"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleOpenEditProperty(prop, 'services')}
                          className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer hover:underline"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Добавить диспетчерскую</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ==================== 4. ДЕЙСТВИЯ ПРИ ДТП (ИЗМЕНИТЬ) ==================== */}
        <section className="bg-stone-800/90 rounded-2xl p-4 sm:p-5 border border-stone-700 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center">
                <Car className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Памятка при дорожно-транспортном происшествии (ДТП)
                </h2>
                <p className="text-xs text-stone-400">
                  Автомобиль семьи: {accidentGuidance.carModel} • Госномер:{' '}
                  <strong>{accidentGuidance.plateNumber}</strong>
                </p>
              </div>
            </div>

            {/* Кнопка ИЗМЕНИТЬ ДАННЫЕ ДТП / СТРАХОВКИ */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleOpenEditAccident}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-stone-700 hover:bg-stone-600 text-white text-xs font-semibold border border-stone-600 transition-all cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5 text-orange-400" />
                <span>Изменить авто / полис</span>
              </button>

              <a
                href={`tel:${accidentGuidance.osagoPhone.replace(/[^+\d]/g, '')}`}
                onClick={(e) =>
                  handlePhoneAction(
                    e,
                    accidentGuidance.osagoPhone,
                    `Страховая компания ${accidentGuidance.osagoCompany}`,
                    showToast
                  )
                }
                className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Страховая: {accidentGuidance.osagoPhone}</span>
              </a>
            </div>
          </div>

          {/* Плашка данных страховки */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-stone-900/60 border border-stone-700 text-xs mb-4">
            <div>
              <span className="text-stone-400">Полис ОСАГО:</span>
              <p className="font-bold text-white mt-0.5 flex items-center gap-1.5">
                <span>{accidentGuidance.osagoNumber}</span>
                <button
                  onClick={() => copyToClipboard(accidentGuidance.osagoNumber, 'Номер ОСАГО', 'osago')}
                  className="text-stone-400 hover:text-white"
                  title="Скопировать"
                >
                  {copiedKey === 'osago' ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </p>
              <span className="text-[11px] text-stone-400">{accidentGuidance.osagoCompany}</span>
            </div>

            <div>
              <span className="text-stone-400">Полис КАСКО:</span>
              <p className="font-bold text-white mt-0.5">{accidentGuidance.kaskoNumber || 'Не оформлен'}</p>
              <span className="text-[11px] text-stone-400">Аварийный комиссар круглосуточно</span>
            </div>

            <div>
              <span className="text-stone-400">VIN номер автомобиля:</span>
              <p className="font-mono text-stone-200 mt-0.5 flex items-center gap-1.5">
                <span>{accidentGuidance.vin || '—'}</span>
                {accidentGuidance.vin && (
                  <button
                    onClick={() => copyToClipboard(accidentGuidance.vin!, 'VIN', 'vin')}
                    className="text-stone-400 hover:text-white"
                    title="Скопировать"
                  >
                    {copiedKey === 'vin' ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                )}
              </p>
            </div>
          </div>

          {/* Шаги памятки */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {accidentGuidance.steps.map((st) => (
              <div
                key={st.step}
                className={`p-3.5 rounded-xl border text-xs flex flex-col justify-between ${
                  st.important
                    ? 'bg-red-950/20 border-red-800/60 text-stone-200'
                    : 'bg-stone-750/50 border-stone-700 text-stone-300'
                }`}
              >
                <div>
                  <div className="flex items-center space-x-2 font-bold mb-1.5">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${
                        st.important ? 'bg-red-500 text-white' : 'bg-stone-700 text-stone-300'
                      }`}
                    >
                      {st.step}
                    </span>
                    <span className={st.important ? 'text-red-300' : 'text-white'}>
                      {st.title}
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-stone-300 pl-7">
                    {st.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ==================== 5. ПИТОМЕЦ И ВЕТКЛИНИКА 24/7 (ИЗМЕНИТЬ) ==================== */}
        <section className="bg-stone-800/90 rounded-2xl p-4 sm:p-5 border border-stone-700 shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <PawPrint className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Питомец и круглосуточная ветеринария (24/7)
                </h2>
                <p className="text-xs text-stone-400">
                  {petEmergency.species} {petEmergency.name} • {petEmergency.breed} • Вес: {petEmergency.weight}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Кнопка ИЗМЕНИТЬ ДАННЫЕ ПИТОМЦА */}
              <button
                onClick={handleOpenEditPet}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-stone-700 hover:bg-stone-600 text-white text-xs font-semibold border border-stone-600 transition-all cursor-pointer shadow-sm active:scale-95"
                title="Изменить кличку, породу, чип, запреты и клинику"
              >
                <Pencil className="w-3.5 h-3.5 text-emerald-400" />
                <span>Изменить питомца</span>
              </button>

              {/* Всегда доступный вызов ветклиники 24/7 */}
              <div className="flex items-center space-x-1">
                <button
                  onClick={(e) =>
                    handlePhoneAction(
                      e,
                      petEmergency.vetClinicPhone || '+7 (800) 200-88-22',
                      `ветклиника «${petEmergency.vetClinicName || 'Дежурная ветклиника 24/7'}»`,
                      showToast
                    )
                  }
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                  title="Позвонить в ветклинику"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Ветклиника: {petEmergency.vetClinicPhone || '+7 (800) 200-88-22'}</span>
                </button>
                <button
                  onClick={() =>
                    copyToClipboard(
                      petEmergency.vetClinicPhone || '+7 (800) 200-88-22',
                      'Телефон ветклиники',
                      'vet_phone'
                    )
                  }
                  className="p-1.5 rounded-xl bg-stone-700 hover:bg-stone-600 text-stone-300 hover:text-white cursor-pointer"
                  title="Скопировать телефон ветклиники"
                >
                  {copiedKey === 'vet_phone' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Круглосуточная клиника и чип */}
            <div className="p-4 rounded-xl bg-stone-900/60 border border-stone-700 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-200">🏥 {petEmergency.vetClinicName}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Круглосуточно 24/7
                </span>
              </div>
              <p className="text-stone-300">
                📍 <strong>Адрес:</strong> {petEmergency.vetClinicAddress}
              </p>
              {petEmergency.chipNumber && (
                <div className="pt-2 border-t border-stone-800 flex items-center justify-between">
                  <span className="text-stone-400">Номер микрочипа:</span>
                  <div className="flex items-center space-x-1.5">
                    <span className="font-mono text-stone-200 font-semibold">{petEmergency.chipNumber}</span>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          petEmergency.chipNumber!,
                          'Номер микрочипа питомца',
                          'pet_chip'
                        )
                      }
                      className="p-1 rounded text-stone-400 hover:text-white cursor-pointer"
                      title="Скопировать номер микрочипа"
                    >
                      {copiedKey === 'pet_chip' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Строгие запреты и аллергии */}
            <div className="p-4 rounded-xl bg-stone-900/60 border border-amber-600/30 text-xs space-y-2">
              <span className="font-bold text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                Строгие запреты и безопасность питомца
              </span>
              <ul className="space-y-1.5 text-stone-300 text-[11px] leading-relaxed">
                {petEmergency.restrictions && petEmergency.restrictions.length > 0 ? (
                  petEmergency.restrictions.map((res, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-red-400 font-bold shrink-0">•</span>
                      <span>{res}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-stone-400 italic">Специальных ограничений не указано</li>
                )}
              </ul>
            </div>
          </div>
        </section>

        {/* ==================== 6. МЕДИЦИНСКИЕ ДАННЫЕ СЕМЬИ (ДОБАВИТЬ / ИЗМЕНИТЬ / УДАЛИТЬ) ==================== */}
        <section className="bg-stone-800/90 rounded-2xl p-4 sm:p-5 border border-stone-700 shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3.5">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <HeartPulse className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Медицинские данные членов семьи для врачей скорой
                </h2>
                <p className="text-xs text-stone-400">
                  Группы крови, опасные аллергии, диагнозы и телефон экстренной связи
                </p>
              </div>
            </div>

            {/* Кнопка ДОБАВИТЬ МЕДИЦИНСКИЕ ДАННЫЕ */}
            <button
              onClick={handleOpenAddMedical}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
              title="Добавить медицинские данные члена семьи"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Добавить данные</span>
            </button>
          </div>

          {medicalEmergency.length === 0 ? (
            <div className="p-8 rounded-2xl bg-stone-900/60 border border-stone-700 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
                <HeartPulse className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-white">
                Медицинские данные членов семьи пока не внесены
              </p>
              <p className="text-xs text-stone-400 max-w-md mx-auto">
                Заполните группы крови, опасные аллергии и контакты для врачей скорой помощи
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => {
                    INITIAL_MEDICAL_EMERGENCY.forEach((im) => addMedicalEmergency(im));
                    showToast('Медицинские данные членов семьи по умолчанию восстановлены', 'success');
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold transition-all cursor-pointer shadow-md active:scale-95"
                >
                  Заполнить данные семьи (Ольга, Сергей, Артём, София)
                </button>
                <button
                  onClick={handleOpenAddMedical}
                  className="px-4 py-2 rounded-xl bg-stone-700 hover:bg-stone-600 text-white text-xs font-semibold cursor-pointer active:scale-95 transition-all"
                >
                  + Ввести вручную
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {medicalEmergency.map((med) => (
                <div
                  key={med.memberId}
                  className="p-4 rounded-xl bg-stone-900/60 border border-stone-700/80 text-xs space-y-2.5 relative group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white text-sm">{med.name}</span>
                      <span className="text-[11px] text-stone-400">({med.role})</span>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        {med.bloodType}
                      </span>

                      {/* КНОПКА ИЗМЕНИТЬ МЕДДАННЫЕ */}
                      <button
                        onClick={() => handleOpenEditMedical(med)}
                        className="px-2.5 py-1 rounded-lg bg-stone-700 hover:bg-stone-600 text-white text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer border border-stone-600"
                        title="Изменить медицинские данные"
                      >
                        <Pencil className="w-3 h-3 text-rose-400" />
                        <span>Изменить</span>
                      </button>

                      {/* КНОПКА УДАЛИТЬ МЕДДАННЫЕ */}
                      <button
                        onClick={() =>
                          setConfirmDelete({
                            type: 'medical',
                            id: med.memberId,
                            title: `медицинскую запись «${med.name}»`,
                          })
                        }
                        className="px-2 py-1 rounded-lg bg-stone-700 hover:bg-red-600/80 text-stone-200 hover:text-white text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer border border-stone-600"
                        title="Удалить медицинские данные"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span className="hidden sm:inline">Удалить</span>
                      </button>
                    </div>
                  </div>

                  {/* Телефон экстренной связи родственника */}
                  {med.emergencyContactPhone && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-stone-800/90 border border-stone-700 text-[11px]">
                      <span className="text-stone-400">Экстренная связь:</span>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-mono text-emerald-400 font-bold">{med.emergencyContactPhone}</span>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              med.emergencyContactPhone,
                              `Телефон контакта для ${med.name}`,
                              `med_phone_${med.memberId}`
                            )
                          }
                          className="p-1 rounded text-stone-400 hover:text-white cursor-pointer"
                          title="Скопировать номер"
                        >
                          {copiedKey === `med_phone_${med.memberId}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={(e) =>
                            handlePhoneAction(
                              e,
                              med.emergencyContactPhone,
                              `Экстренный контакт ${med.name}`,
                              showToast
                            )
                          }
                          className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                          title="Позвонить родственнику"
                        >
                          <Phone className="w-3 h-3" />
                          <span>Вызов</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Аллергии */}
                  <div className="bg-stone-800/70 p-2.5 rounded-lg border border-stone-700">
                    <span className="text-stone-400 font-semibold block mb-1">
                      ⚠️ Аллергии:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {med.allergies && med.allergies.length > 0 ? (
                        med.allergies.map((alg, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded text-[11px] bg-red-950/60 text-red-300 border border-red-800/50"
                          >
                            {alg}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-stone-400">Не выявлены</span>
                      )}
                    </div>
                  </div>

                  {/* Хронические диагнозы */}
                  {med.chronicConditions && med.chronicConditions.length > 0 && (
                    <div className="text-[11px] text-stone-300 bg-stone-800/50 p-2 rounded-lg border border-stone-750">
                      <span className="text-amber-400 font-semibold">Диагнозы: </span>
                      <span>{med.chronicConditions.join(', ')}</span>
                    </div>
                  )}

                  {/* Постоянные препараты */}
                  {med.currentMedications && med.currentMedications.length > 0 && (
                    <div className="text-[11px] text-stone-300 pt-0.5">
                      <span className="text-stone-400 font-medium">Препараты: </span>
                      <span>{med.currentMedications.join(', ')}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* ==================== МОДАЛЬНОЕ ОКНО: ОБЪЕКТ (ДОБАВИТЬ / ИЗМЕНИТЬ) ==================== */}
      {isPropertyModalOpen && propertyFormData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-stone-800 border border-stone-700 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 text-stone-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-700">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    {propertyFormData.id
                      ? `Изменить: ${propertyFormData.name || 'Объект дома'}`
                      : 'Добавить новый объект дома'}
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    Любой город, телефоны экстренных мастеров и инженерия
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPropertyModalOpen(false)}
                className="text-stone-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Вкладки быстрого перехода: Все данные, Вода и сантехник, Щиток и электрик, Службы и ключи, Адрес */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 border-b border-stone-700/80 text-xs scrollbar-none">
              {[
                { id: 'all', label: 'Все данные' },
                { id: 'water', label: '💧 Вода и сантехник' },
                { id: 'electric', label: '⚡ Щиток и электрик' },
                { id: 'services', label: '🔑 Службы и ключи' },
                { id: 'address', label: '📍 Адрес и доступ' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPropertyEditSection(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-all cursor-pointer ${
                    propertyEditSection === tab.id
                      ? 'bg-sky-600 text-white font-bold shadow'
                      : 'bg-stone-900/80 text-stone-300 hover:bg-stone-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSaveProperty} className="space-y-4 text-xs">
              {/* РАЗДЕЛ: АДРЕС И ДОСТУП */}
              {(propertyEditSection === 'all' || propertyEditSection === 'address') && (
                <div className="p-3.5 rounded-2xl bg-stone-900/80 border border-stone-700 space-y-3">
                  <span className="font-bold text-stone-200 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-sky-400" />
                    Название объекта, адрес и доступ
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-stone-300 font-semibold mb-1">
                        Название объекта *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Например: Квартира, Дом у озера"
                        value={propertyFormData.name || ''}
                        onChange={(e) =>
                          setPropertyFormData({ ...propertyFormData, name: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-white focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <div>
                      <label className="block text-stone-300 font-semibold mb-1">
                        Краткое имя (для вкладок)
                      </label>
                      <input
                        type="text"
                        placeholder="Квартира, Дача, Студия"
                        value={propertyFormData.shortName || ''}
                        onChange={(e) =>
                          setPropertyFormData({ ...propertyFormData, shortName: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-white focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-stone-300 font-semibold mb-1">
                      Полный адрес (любой город и регион)
                    </label>
                    <input
                      type="text"
                      placeholder="Город, улица, дом, кв. / участок"
                      value={propertyFormData.address || ''}
                      onChange={(e) =>
                        setPropertyFormData({ ...propertyFormData, address: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-stone-300 font-semibold mb-1">
                        Код домофона / калитки
                      </label>
                      <input
                        type="text"
                        placeholder="142К4580 или 1234#"
                        value={propertyFormData.intercomCode || ''}
                        onChange={(e) =>
                          setPropertyFormData({ ...propertyFormData, intercomCode: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-white focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <div>
                      <label className="block text-stone-300 font-semibold mb-1">
                        Wi-Fi сеть (SSID)
                      </label>
                      <input
                        type="text"
                        placeholder="Home_5G"
                        value={propertyFormData.wifiInfo?.ssid || ''}
                        onChange={(e) =>
                          setPropertyFormData({
                            ...propertyFormData,
                            wifiInfo: {
                              ssid: e.target.value,
                              password: propertyFormData.wifiInfo?.password || '',
                            },
                          })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-white focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* РАЗДЕЛ: ВОДА И САНТЕХНИК */}
              {(propertyEditSection === 'all' || propertyEditSection === 'water') && (
                <div className="p-3.5 rounded-2xl bg-stone-900/80 border border-sky-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sky-400 flex items-center gap-1.5">
                      <Droplets className="w-4 h-4" />
                      Перекрытие воды и мастер-сантехник
                    </span>
                    <label className="flex items-center space-x-2 text-stone-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!propertyFormData.waterShutoff?.hasAquaStop}
                        onChange={(e) =>
                          setPropertyFormData({
                            ...propertyFormData,
                            waterShutoff: {
                              location: propertyFormData.waterShutoff?.location || '',
                              instructions: propertyFormData.waterShutoff?.instructions || '',
                              hasAquaStop: e.target.checked,
                            },
                          })
                        }
                        className="rounded accent-sky-500"
                      />
                      <span>Есть система Аквасторож / Нептун</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-stone-400 mb-0.5">Где находятся краны:</label>
                    <input
                      type="text"
                      placeholder="Санузел, ревизионный люк за унитазом..."
                      value={propertyFormData.waterShutoff?.location || ''}
                      onChange={(e) =>
                        setPropertyFormData({
                          ...propertyFormData,
                          waterShutoff: {
                            hasAquaStop: !!propertyFormData.waterShutoff?.hasAquaStop,
                            instructions: propertyFormData.waterShutoff?.instructions || '',
                            location: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-400 mb-0.5">Инструкция по перекрытию:</label>
                    <textarea
                      rows={2}
                      placeholder="Повернуть оба вентиля на 90 градусов по часовой стрелке..."
                      value={propertyFormData.waterShutoff?.instructions || ''}
                      onChange={(e) =>
                        setPropertyFormData({
                          ...propertyFormData,
                          waterShutoff: {
                            hasAquaStop: !!propertyFormData.waterShutoff?.hasAquaStop,
                            location: propertyFormData.waterShutoff?.location || '',
                            instructions: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-white"
                    />
                  </div>

                  {/* Телефон дежурного сантехника */}
                  <div className="pt-1">
                    <label className="block text-sky-300 font-semibold mb-0.5">
                      Дежурный сантехник / мастер по воде (телефон):
                    </label>
                    <input
                      type="text"
                      placeholder="+7 (___) ___-__-__"
                      value={propertyFormData.managementCompany?.plumberPhone || ''}
                      onChange={(e) =>
                        setPropertyFormData({
                          ...propertyFormData,
                          managementCompany: {
                            ...propertyFormData.managementCompany,
                            name: propertyFormData.managementCompany?.name || '',
                            phone: propertyFormData.managementCompany?.phone || '',
                            dispatchPhone: propertyFormData.managementCompany?.dispatchPhone || '',
                            electricianPhone: propertyFormData.managementCompany?.electricianPhone || '',
                            plumberPhone: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-stone-800 border border-sky-500/40 text-white focus:outline-none focus:border-sky-400"
                    />
                  </div>
                </div>
              )}

              {/* РАЗДЕЛ: ЭЛЕКТРИЧЕСТВО И ЭЛЕКТРИК */}
              {(propertyEditSection === 'all' || propertyEditSection === 'electric') && (
                <div className="p-3.5 rounded-2xl bg-stone-900/80 border border-amber-500/30 space-y-3">
                  <span className="font-bold text-amber-400 flex items-center gap-1.5">
                    <Zap className="w-4 h-4" />
                    Электрощиток и дежурный электрик
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-stone-400 mb-0.5">Где щиток:</label>
                      <input
                        type="text"
                        placeholder="Прихожая слева от двери..."
                        value={propertyFormData.electricPanel?.location || ''}
                        onChange={(e) =>
                          setPropertyFormData({
                            ...propertyFormData,
                            electricPanel: {
                              mainBreaker: propertyFormData.electricPanel?.mainBreaker || '',
                              notes: propertyFormData.electricPanel?.notes || '',
                              location: e.target.value,
                            },
                          })
                        }
                        className="w-full px-3 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-stone-400 mb-0.5">Вводной автомат:</label>
                      <input
                        type="text"
                        placeholder="Левый верхний тумблер (опустить вниз)"
                        value={propertyFormData.electricPanel?.mainBreaker || ''}
                        onChange={(e) =>
                          setPropertyFormData({
                            ...propertyFormData,
                            electricPanel: {
                              location: propertyFormData.electricPanel?.location || '',
                              notes: propertyFormData.electricPanel?.notes || '',
                              mainBreaker: e.target.value,
                            },
                          })
                        }
                        className="w-full px-3 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-stone-400 mb-0.5">Примечания к автоматам:</label>
                    <input
                      type="text"
                      placeholder="Стиралка на №5, бойлер на №6..."
                      value={propertyFormData.electricPanel?.notes || ''}
                      onChange={(e) =>
                        setPropertyFormData({
                          ...propertyFormData,
                          electricPanel: {
                            location: propertyFormData.electricPanel?.location || '',
                            mainBreaker: propertyFormData.electricPanel?.mainBreaker || '',
                            notes: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-white"
                    />
                  </div>

                  {/* Телефон дежурного электрика */}
                  <div className="pt-1">
                    <label className="block text-amber-300 font-semibold mb-0.5">
                      Дежурный электрик / мастер по электрике (телефон):
                    </label>
                    <input
                      type="text"
                      placeholder="+7 (___) ___-__-__"
                      value={propertyFormData.managementCompany?.electricianPhone || ''}
                      onChange={(e) =>
                        setPropertyFormData({
                          ...propertyFormData,
                          managementCompany: {
                            ...propertyFormData.managementCompany,
                            name: propertyFormData.managementCompany?.name || '',
                            phone: propertyFormData.managementCompany?.phone || '',
                            dispatchPhone: propertyFormData.managementCompany?.dispatchPhone || '',
                            plumberPhone: propertyFormData.managementCompany?.plumberPhone || '',
                            electricianPhone: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-stone-800 border border-amber-500/40 text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              )}

              {/* РАЗДЕЛ: СЛУЖБЫ ДОМА, ДИСПЕТЧЕРСКАЯ И КЛЮЧИ */}
              {(propertyEditSection === 'all' || propertyEditSection === 'services') && (
                <div className="p-3.5 rounded-2xl bg-stone-900/80 border border-stone-700 space-y-3">
                  <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <Key className="w-4 h-4" />
                    Службы дома, диспетчерская, аптечка и ключи
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-stone-400 mb-0.5">Название УК / ТСЖ / службы:</label>
                      <input
                        type="text"
                        placeholder="Например: УК Комфорт или ТСЖ"
                        value={propertyFormData.managementCompany?.name || ''}
                        onChange={(e) =>
                          setPropertyFormData({
                            ...propertyFormData,
                            managementCompany: {
                              ...propertyFormData.managementCompany,
                              phone: propertyFormData.managementCompany?.phone || '',
                              dispatchPhone: propertyFormData.managementCompany?.dispatchPhone || '',
                              plumberPhone: propertyFormData.managementCompany?.plumberPhone || '',
                              electricianPhone: propertyFormData.managementCompany?.electricianPhone || '',
                              name: e.target.value,
                            },
                          })
                        }
                        className="w-full px-3 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-stone-400 mb-0.5">Аварийная диспетчерская (телефон):</label>
                      <input
                        type="text"
                        placeholder="+7 (___) ___-__-__"
                        value={propertyFormData.managementCompany?.dispatchPhone || ''}
                        onChange={(e) =>
                          setPropertyFormData({
                            ...propertyFormData,
                            managementCompany: {
                              ...propertyFormData.managementCompany,
                              name: propertyFormData.managementCompany?.name || '',
                              phone: propertyFormData.managementCompany?.phone || '',
                              plumberPhone: propertyFormData.managementCompany?.plumberPhone || '',
                              electricianPhone: propertyFormData.managementCompany?.electricianPhone || '',
                              dispatchPhone: e.target.value,
                            },
                          })
                        }
                        className="w-full px-3 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-stone-300 font-semibold mb-1">
                        Где лежит аптечка в объекте:
                      </label>
                      <input
                        type="text"
                        placeholder="Шкаф в коридоре, верхняя полка..."
                        value={propertyFormData.firstAidLocation || ''}
                        onChange={(e) =>
                          setPropertyFormData({ ...propertyFormData, firstAidLocation: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-stone-300 font-semibold mb-1">
                        Где запасные ключи:
                      </label>
                      <input
                        type="text"
                        placeholder="У консьержа / в ключнице..."
                        value={propertyFormData.backupKeysLocation || ''}
                        onChange={(e) =>
                          setPropertyFormData({ ...propertyFormData, backupKeysLocation: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-stone-700">
                {propertyEditSection !== 'all' ? (
                  <button
                    type="button"
                    onClick={() => setPropertyEditSection('all')}
                    className="text-xs text-sky-400 hover:text-sky-300 font-medium underline underline-offset-2 cursor-pointer"
                  >
                    Показать все разделы объекта
                  </button>
                ) : <span />}

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsPropertyModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-stone-700 hover:bg-stone-600 text-stone-200 cursor-pointer"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold cursor-pointer active:scale-95 transition-all shadow-md"
                  >
                    {propertyFormData.id ? 'Сохранить изменения' : 'Добавить объект'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== МОДАЛЬНОЕ ОКНО: КОНТАКТ (ДОБАВИТЬ / ИЗМЕНИТЬ) ==================== */}
      {isContactModalOpen && contactFormData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-stone-800 border border-stone-700 rounded-3xl w-full max-w-md shadow-2xl p-6 text-stone-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-700">
              <h3 className="text-lg font-bold text-white">
                {contactFormData.id ? 'Изменить контакт семьи' : 'Добавить контакт семьи'}
              </h3>
              <button
                onClick={() => setIsContactModalOpen(false)}
                className="text-stone-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveContact} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-stone-300 font-semibold mb-1">Имя *</label>
                <input
                  type="text"
                  required
                  placeholder="Имя члена семьи или контактного лица"
                  value={contactFormData.name || ''}
                  onChange={(e) => setContactFormData({ ...contactFormData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-stone-300 font-semibold mb-1">Роль / статус</label>
                <input
                  type="text"
                  placeholder="Мама • Владелец, Папа, Бабушка, Доверенное лицо"
                  value={contactFormData.role || ''}
                  onChange={(e) => setContactFormData({ ...contactFormData, role: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-stone-300 font-semibold mb-1">Номер телефона</label>
                <input
                  type="tel"
                  placeholder="+7 (999) 000-00-00"
                  value={contactFormData.phone || ''}
                  onChange={(e) => setContactFormData({ ...contactFormData, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-stone-700">
                <button
                  type="button"
                  onClick={() => setIsContactModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-700 hover:bg-stone-600 text-stone-200"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold cursor-pointer active:scale-95 transition-all"
                >
                  {contactFormData.id ? 'Сохранить' : 'Добавить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== МОДАЛЬНОЕ ОКНО: ДТП (ИЗМЕНИТЬ) ==================== */}
      {isAccidentModalOpen && accidentFormData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-stone-800 border border-stone-700 rounded-3xl w-full max-w-lg shadow-2xl p-6 text-stone-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-700">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Car className="w-5 h-5 text-orange-400" />
                Изменить данные автомобиля и страховки
              </h3>
              <button
                onClick={() => setIsAccidentModalOpen(false)}
                className="text-stone-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAccident} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-stone-400 mb-1">Марка и модель авто:</label>
                  <input
                    type="text"
                    value={accidentFormData.carModel}
                    onChange={(e) =>
                      setAccidentFormData({ ...accidentFormData, carModel: e.target.value })
                    }
                    className="w-full px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-stone-400 mb-1">Госномер:</label>
                  <input
                    type="text"
                    value={accidentFormData.plateNumber}
                    onChange={(e) =>
                      setAccidentFormData({ ...accidentFormData, plateNumber: e.target.value })
                    }
                    className="w-full px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-700 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-400 mb-1">VIN автомобиля:</label>
                <input
                  type="text"
                  value={accidentFormData.vin || ''}
                  onChange={(e) =>
                    setAccidentFormData({ ...accidentFormData, vin: e.target.value })
                  }
                  className="w-full px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-700 text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-stone-400 mb-1">Страховая компания:</label>
                  <input
                    type="text"
                    value={accidentFormData.osagoCompany}
                    onChange={(e) =>
                      setAccidentFormData({ ...accidentFormData, osagoCompany: e.target.value })
                    }
                    className="w-full px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-stone-400 mb-1">Номер полиса ОСАГО:</label>
                  <input
                    type="text"
                    value={accidentFormData.osagoNumber}
                    onChange={(e) =>
                      setAccidentFormData({ ...accidentFormData, osagoNumber: e.target.value })
                    }
                    className="w-full px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-700 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-stone-400 mb-1">Горячая линия страховой:</label>
                  <input
                    type="text"
                    value={accidentFormData.osagoPhone}
                    onChange={(e) =>
                      setAccidentFormData({ ...accidentFormData, osagoPhone: e.target.value })
                    }
                    className="w-full px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-stone-400 mb-1">Номер полиса КАСКО:</label>
                  <input
                    type="text"
                    value={accidentFormData.kaskoNumber || ''}
                    onChange={(e) =>
                      setAccidentFormData({ ...accidentFormData, kaskoNumber: e.target.value })
                    }
                    className="w-full px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-700 text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-stone-700">
                <button
                  type="button"
                  onClick={() => setIsAccidentModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-700 hover:bg-stone-600 text-stone-200"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold cursor-pointer active:scale-95 transition-all"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== МОДАЛЬНОЕ ОКНО: ПИТОМЕЦ (ИЗМЕНИТЬ) ==================== */}
      {isPetModalOpen && petFormData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-stone-800 border border-stone-700 rounded-3xl w-full max-w-lg shadow-2xl p-6 text-stone-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-700">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <PawPrint className="w-5 h-5 text-emerald-400" />
                Изменить данные питомца и ветклиники
              </h3>
              <button
                onClick={() => setIsPetModalOpen(false)}
                className="text-stone-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePet} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-stone-400 mb-1">Кличка:</label>
                  <input
                    type="text"
                    value={petFormData.name}
                    onChange={(e) => setPetFormData({ ...petFormData, name: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-stone-400 mb-1">Вид и порода:</label>
                  <input
                    type="text"
                    value={petFormData.breed}
                    onChange={(e) => setPetFormData({ ...petFormData, breed: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-700 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-stone-400 mb-1">Вес:</label>
                  <input
                    type="text"
                    value={petFormData.weight}
                    onChange={(e) => setPetFormData({ ...petFormData, weight: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-stone-400 mb-1">Номер микрочипа:</label>
                  <input
                    type="text"
                    value={petFormData.chipNumber || ''}
                    onChange={(e) => setPetFormData({ ...petFormData, chipNumber: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-700 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-400 mb-1">Ветклиника (название):</label>
                <input
                  type="text"
                  value={petFormData.vetClinicName}
                  onChange={(e) =>
                    setPetFormData({ ...petFormData, vetClinicName: e.target.value })
                  }
                  className="w-full px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-700 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-stone-400 mb-1">Телефон ветклиники 24/7:</label>
                  <input
                    type="text"
                    value={petFormData.vetClinicPhone}
                    onChange={(e) =>
                      setPetFormData({ ...petFormData, vetClinicPhone: e.target.value })
                    }
                    className="w-full px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-stone-400 mb-1">Адрес ветклиники:</label>
                  <input
                    type="text"
                    value={petFormData.vetClinicAddress}
                    onChange={(e) =>
                      setPetFormData({ ...petFormData, vetClinicAddress: e.target.value })
                    }
                    className="w-full px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-700 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-400 mb-1">
                  Строгие запреты и токсичные продукты (каждый с новой строки):
                </label>
                <textarea
                  rows={3}
                  value={petRestrictionsText}
                  onChange={(e) => setPetRestrictionsText(e.target.value)}
                  placeholder="Шоколад, виноград, авокадо смертельно опасны&#10;Не кормить со стола&#10;Аллергия на куриный белок"
                  className="w-full px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-700 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-stone-700">
                <button
                  type="button"
                  onClick={() => setIsPetModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-700 hover:bg-stone-600 text-stone-200"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer active:scale-95 transition-all"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== МОДАЛЬНОЕ ОКНО: МЕДИЦИНСКИЕ ДАННЫЕ (ДОБАВИТЬ / ИЗМЕНИТЬ) ==================== */}
      {isMedicalModalOpen && medicalFormData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-stone-800 border border-stone-700 rounded-3xl w-full max-w-lg shadow-2xl p-6 text-stone-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-700">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-rose-400" />
                {medicalFormData.name ? 'Изменить медицинские данные' : 'Добавить медицинские данные'}
              </h3>
              <button
                onClick={() => setIsMedicalModalOpen(false)}
                className="text-stone-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMedical} className="space-y-3.5 text-xs">
              {/* Быстрый выбор члена семьи или ручной ввод */}
              <div>
                <label className="block text-stone-400 mb-1 font-medium">Член семьи *</label>
                {members.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {members.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          const existing = medicalEmergency.find(
                            (med) =>
                              med.name.toLowerCase() === m.name.toLowerCase() ||
                              med.memberId === m.id
                          );
                          if (existing) {
                            setMedicalFormData({ ...existing });
                            setMedAllergiesText((existing.allergies || []).join(', '));
                            setMedConditionsText((existing.chronicConditions || []).join(', '));
                            setMedMedicationsText((existing.currentMedications || []).join(', '));
                          } else {
                            setMedicalFormData({
                              ...medicalFormData,
                              memberId: m.id,
                              name: m.name,
                              role: m.role ? m.role.split('•')[0].trim() : 'Член семьи',
                              emergencyContactPhone:
                                m.phone || medicalFormData.emergencyContactPhone || '',
                            });
                          }
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
                          medicalFormData.name === m.name
                            ? 'bg-rose-900/60 text-white border-rose-500/80 shadow-xs'
                            : 'bg-stone-900 text-stone-300 border-stone-700 hover:border-stone-500'
                        }`}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <input
                      type="text"
                      required
                      placeholder="Имя (Ольга, Сергей...)"
                      value={medicalFormData.name || ''}
                      onChange={(e) => setMedicalFormData({ ...medicalFormData, name: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-700 text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Роль (Мама, Отец, Ребёнок...)"
                      value={medicalFormData.role || ''}
                      onChange={(e) => setMedicalFormData({ ...medicalFormData, role: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-700 text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>
              </div>

              {/* Группа крови и резус */}
              <div>
                <label className="block text-stone-400 mb-1 font-medium">Группа крови и резус-фактор:</label>
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {['I (0) Rh+', 'I (0) Rh-', 'II (A) Rh+', 'II (A) Rh-', 'III (B) Rh+', 'III (B) Rh-', 'IV (AB) Rh+', 'IV (AB) Rh-'].map((bg) => (
                    <button
                      key={bg}
                      type="button"
                      onClick={() => setMedicalFormData({ ...medicalFormData, bloodType: bg })}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all border cursor-pointer ${
                        medicalFormData.bloodType === bg
                          ? 'bg-rose-600 text-white border-rose-400'
                          : 'bg-stone-900 text-stone-300 border-stone-700 hover:border-stone-500'
                      }`}
                    >
                      {bg}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Или введите вручную: II (A) Rh+"
                  value={medicalFormData.bloodType || ''}
                  onChange={(e) => setMedicalFormData({ ...medicalFormData, bloodType: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-700 text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Телефон экстренной связи */}
              <div>
                <label className="block text-stone-400 mb-1 font-medium">
                  Телефон экстренной связи родственника:
                </label>
                <input
                  type="tel"
                  placeholder="+7 (999) 000-00-00"
                  value={medicalFormData.emergencyContactPhone || ''}
                  onChange={(e) =>
                    setMedicalFormData({ ...medicalFormData, emergencyContactPhone: e.target.value })
                  }
                  className="w-full px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-700 text-white focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>

              {/* Опасные аллергии */}
              <div>
                <label className="block text-stone-400 mb-1 font-medium">
                  Опасные аллергии (через запятую):
                </label>
                <input
                  type="text"
                  placeholder="Пенициллин, лидокаин, орехи, цветение берёзы..."
                  value={medAllergiesText}
                  onChange={(e) => setMedAllergiesText(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-700 text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Хронические диагнозы */}
              <div>
                <label className="block text-stone-400 mb-1 font-medium">
                  Хронические диагнозы и особенности (через запятую):
                </label>
                <input
                  type="text"
                  placeholder="Бронхиальная астма, гипертония, сахарный диабет 1 типа..."
                  value={medConditionsText}
                  onChange={(e) => setMedConditionsText(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-700 text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Постоянные препараты */}
              <div>
                <label className="block text-stone-400 mb-1 font-medium">
                  Постоянные препараты и дозировки (через запятую):
                </label>
                <input
                  type="text"
                  placeholder="L-тироксин 50 мкг, ингалятор Сальбутамол..."
                  value={medMedicationsText}
                  onChange={(e) => setMedMedicationsText(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-700 text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-stone-700">
                <button
                  type="button"
                  onClick={() => setIsMedicalModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-700 hover:bg-stone-600 text-stone-200"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-bold cursor-pointer active:scale-95 transition-all"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== ДИАЛОГ ПОДТВЕРЖДЕНИЯ УДАЛЕНИЯ ==================== */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-stone-800 border border-red-500/50 rounded-3xl w-full max-w-sm p-6 text-stone-100 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-red-400">
              <div className="w-10 h-10 rounded-2xl bg-red-500/20 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="font-bold text-white text-base">Подтверждение удаления</h3>
            </div>

            <p className="text-xs text-stone-300 leading-relaxed">
              Вы уверены, что хотите удалить {confirmDelete.title}? Это действие нельзя отменить.
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-xl bg-stone-700 hover:bg-stone-600 text-stone-200 text-xs font-semibold cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer active:scale-95 transition-all shadow-md"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Футер быстрого выхода */}
      <footer className="sticky bottom-0 z-20 bg-stone-950 border-t border-stone-800 py-3 px-4 text-center">
        <button
          onClick={onClose}
          className="px-6 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-white font-semibold text-sm active:scale-95 transition-all shadow-md inline-flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Закрыть экран экстренной помощи</span>
        </button>
      </footer>
    </div>
  );
};
