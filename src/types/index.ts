export type HouseholdZone =
  | 'Весь дом'
  | 'Кухня'
  | 'Гостиная'
  | 'Ванная'
  | 'Спальня'
  | 'Детская'
  | 'Прихожая'
  | 'Авто'
  | 'Участок/Дача';

export interface FamilyMember {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  color: {
    bg: string;
    text: string;
    border: string;
    hex: string;
    badgeBg: string;
  };
  email?: string;
  phone?: string;
}

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly';
export type PriorityLevel = 'low' | 'medium' | 'high';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  zone: HouseholdZone;
  assigneeId: string | null;
  isRotation: boolean;
  rotationOrder?: string[];
  currentRotationIndex?: number;
  recurrence: RecurrenceType;
  dueDate: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  priority: PriorityLevel;
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
  subtasks?: Subtask[];
  packName?: string;
  points?: number; // Очки за выполнение (мотивация для детей)
}

export interface TaskPack {
  id: string;
  title: string;
  description: string;
  category: 'cleaning' | 'maintenance' | 'seasonal' | 'family';
  icon: string;
  badge: string;
  tasks: Array<{
    title: string;
    description?: string;
    zone: HouseholdZone;
    priority: PriorityLevel;
    subtasks?: string[];
  }>;
}

export type EventCategory = 'family' | 'kids' | 'health' | 'home' | 'work' | 'holiday';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  allDay: boolean;
  category: EventCategory;
  memberIds: string[];
  location?: string;
  reminderMinutes?: number;
  recurrence?: 'none' | 'yearly' | 'monthly' | 'weekly' | 'daily';
  isBirthday?: boolean;
}

export type ShoppingCategory =
  | 'produce'
  | 'dairy'
  | 'meat'
  | 'bakery'
  | 'pantry'
  | 'household'
  | 'pharmacy'
  | 'drinks'
  | 'sweets'
  | 'other';

export interface ShoppingList {
  id: string;
  name: string;
  icon: string;
  isDefault?: boolean;
}

export interface ShoppingItem {
  id: string;
  listId: string;
  title: string;
  category: ShoppingCategory;
  quantity?: string;
  completed: boolean;
  addedBy?: string;
  recipeSource?: string;
  createdAt: string;
}

export interface RecipeIngredient {
  name: string;
  amount: string;
  category: ShoppingCategory;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  category: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  servings: number;
  calories?: number;
  image: string;
  tags: string[];
  ingredients: RecipeIngredient[];
  steps: string[];
}

export interface MealPlanDay {
  date: string; // YYYY-MM-DD
  breakfast?: { recipeId?: string; customTitle?: string; note?: string };
  lunch?: { recipeId?: string; customTitle?: string; note?: string };
  dinner?: { recipeId?: string; customTitle?: string; note?: string };
  snack?: { recipeId?: string; customTitle?: string; note?: string };
}

export type InventoryCategory =
  | 'appliances'
  | 'electronics'
  | 'vehicles'
  | 'pets'
  | 'subscriptions'
  | 'home';

export interface InventoryItem {
  id: string;
  name: string;
  category: InventoryCategory;
  locationZone: HouseholdZone;
  model?: string;
  serialNumber?: string;
  purchaseDate?: string;
  warrantyExpiry?: string;
  price?: number;
  notes?: string;
  serviceIntervalDays?: number;
  lastServiceDate?: string;
  nextServiceDate?: string;
  petDetails?: {
    breed?: string;
    chipNumber?: string;
    birthDate?: string;
    nextVaccinationDate?: string;
  };
  subscriptionDetails?: {
    cost: number;
    billingCycle: 'monthly' | 'yearly';
    nextPaymentDate: string;
  };
  vehicleDetails?: {
    licensePlate?: string;
    mileage?: number;
    nextMaintenanceDate?: string;
    insuranceExpiry?: string;
  };
}

export type DocumentCategory =
  | 'insurance'
  | 'property'
  | 'auto'
  | 'medical'
  | 'warranties'
  | 'personal';

export interface DocumentItem {
  id: string;
  title: string;
  category: DocumentCategory;
  documentNumber?: string;
  issuer?: string;
  issuedDate?: string;
  expiryDate?: string;
  notes?: string;
  memberId?: string;
  fileData?: string; // base64 preview
  fileName?: string;
}

export type ContactCategory =
  | 'plumber'
  | 'electrician'
  | 'cleaning'
  | 'doctor'
  | 'vet'
  | 'auto'
  | 'emergency'
  | 'other';

export interface HouseholdContact {
  id: string;
  name: string;
  specialty: string;
  category: ContactCategory;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  rating?: number;
}

export interface ParsedEntityAction {
  type: 'task' | 'calendar' | 'shopping' | 'doc' | 'contact';
  title: string;
  details: string;
  data: any;
}

export interface ParsedAIResponse {
  summary: string;
  actions: ParsedEntityAction[];
}

// ==================== СКАНЕР ЧЕКОВ И РАСПОЗНАВАНИЕ ====================
export type ReceiptLanguage = 'rus' | 'deu' | 'nld' | 'pol' | 'ell' | 'eng';

export type LineVerificationStatus = 'verified' | 'needs_review' | 'edited';

export interface ReceiptItemLine {
  id: string;
  originalText: string;             // оригинальный текст с чека
  normalizedTitle: string;          // нормализованное название товара на русском языке
  quantity: number;                 // количество
  unit?: string;                    // единица измерения, если указана (шт, кг, г, л, уп...)
  unitPrice?: number;               // цена за единицу, если указана
  totalPrice: number;               // итоговая стоимость строки
  discount?: number;                // скидка и её значение, если присутствуют
  currency: string;                 // валюта исходного чека
  confidence: number;               // оценка уверенности распознавания (0-100)
  status: LineVerificationStatus;   // статус проверки пользователем
  category?: ShoppingCategory;      // категория товара
  isDoubtful?: boolean;             // сомнительная строка (низкая уверенность или отсутствие цены)
}

export interface ImageQualityReport {
  score: number;                    // 0 - 100
  isBlurry: boolean;
  blurScore: number;                // higher is sharper
  isDark: boolean;
  isOverexposed: boolean;
  avgBrightness: number;            // 0 - 255
  isLowResolution: boolean;
  width: number;
  height: number;
  isCroppedWarning: boolean;
  issues: string[];
  recommendations: string[];
}

export interface ScannedReceipt {
  id: string;
  storeName?: string;
  rawStoreName?: string;
  date?: string;                    // YYYY-MM-DD
  time?: string;                    // HH:mm
  totalAmount: number;
  taxAmount?: number;
  discountTotal?: number;
  currency: string;
  rawText: string;
  language: ReceiptLanguage;
  qualityReport?: ImageQualityReport;
  images: string[];                 // base64/data URLs (one or multi-segment)
  items: ReceiptItemLine[];
  scannedAt: string;
  verifiedAt?: string;
  memberId?: string;
  notes?: string;
  matchedSumDiff?: number;          // разница между суммой строк и итогом чека
}

// ==================== ДОМАШНЯЯ АПТЕЧКА И ЛЕКАРСТВА ====================
export type MedicineCategory =
  | 'painkiller'    // Обезболивающие
  | 'fever'         // Жаропонижающие
  | 'cold'          // От простуды и гриппа
  | 'allergy'       // От аллергии
  | 'digestive'     // ЖКТ и пищеварение
  | 'antiseptic'    // Антисептики и перевязка
  | 'vitamins'      // Витамины и БАДы
  | 'chronic'       // Постоянный прием
  | 'other';        // Другое

export type MedicineForm =
  | 'pills'         // Таблетки / капсулы
  | 'syrup'         // Сироп / суспензия
  | 'drops'         // Капли (глазные, ушные, назальные)
  | 'spray'         // Спрей
  | 'ointment'      // Мазь / крем
  | 'powder'        // Порошок / саше
  | 'bandage'       // Бинты, пластыри
  | 'other';

export interface MedicineItem {
  id: string;
  name: string;
  activeSubstance?: string;
  category: MedicineCategory;
  form: MedicineForm;
  dosage?: string;
  instructions?: string;
  forWhom?: string; // 'Дети', 'Взрослые', 'Вся семья'
  expiryDate: string; // YYYY-MM-DD
  openedDate?: string; // YYYY-MM-DD
  quantity: string; // '1 фл. (~70%)', '8 таб.'
  location?: string; // 'Шкаф в коридоре', 'Холодильник'
  isLow?: boolean; // заканчивается
  notes?: string;
}

// ==================== ПОКАЗАНИЯ СЧЁТЧИКОВ ЖКХ ====================
export type UtilityMeterType =
  | 'cold_water'
  | 'hot_water'
  | 'electricity_day'
  | 'electricity_night'
  | 'electricity_single'
  | 'gas'
  | 'heating';

export interface UtilityReading {
  id: string;
  meterId: string;
  date: string; // YYYY-MM-DD
  month: string; // '2026-10'
  value: number; // текущие показания
  previousValue?: number; // предыдущие базовые показания
  difference: number; // расход за месяц
  cost?: number; // стоимость по тарифу
  submitted: boolean; // передано в УК
  notes?: string;
}

export interface UtilityMeter {
  id: string;
  name: string;
  type: UtilityMeterType;
  serialNumber?: string;
  location?: string; // 'Санузел', 'Кухня', 'Щиток на этаже'
  unit: string; // 'м³', 'кВт⋅ч', 'Гкал'
  tariffRate: number; // тариф за 1 единицу
  verificationDate?: string; // дата очередной поверки YYYY-MM-DD
  initialValue: number; // начальные показания при установке
  readings: UtilityReading[];
}

// ==================== ОБЪЕКТЫ И ПРОСТРАНСТВА ДОМА ====================
export type PropertyId = 'all' | string;

export interface HouseholdProperty {
  id: string;
  name: string;
  shortName: string;
  address: string;
  intercomCode?: string;
  wifiInfo?: {
    ssid: string;
    password?: string;
  };
  managementCompany: {
    name: string;
    phone: string;
    dispatchPhone: string;
    conciergePhone?: string;
    plumberPhone?: string;
    electricianPhone?: string;
  };
  waterShutoff: {
    location: string;
    instructions: string;
    hasAquaStop: boolean;
  };
  electricPanel: {
    location: string;
    mainBreaker: string;
    notes: string;
  };
  gasShutoff?: {
    hasGas: boolean;
    location?: string;
    instructions?: string;
  };
  firstAidLocation: string;
  backupKeysLocation: string;
  notes?: string;
}

// ==================== SOS, ЭКСТРЕННЫЕ СЛУЖБЫ И ПАМЯТКИ ====================
export interface PetEmergencyInfo {
  name: string;
  species: string;
  breed: string;
  weight: string;
  chipNumber?: string;
  allergies: string[];
  restrictions: string[];
  vetClinicName: string;
  vetClinicPhone: string;
  vetClinicAddress: string;
  is24Hours: boolean;
}

export interface AccidentStep {
  step: number;
  title: string;
  description: string;
  important?: boolean;
}

export interface AccidentGuidance {
  carModel: string;
  plateNumber: string;
  vin?: string;
  osagoCompany: string;
  osagoNumber: string;
  osagoPhone: string;
  kaskoNumber?: string;
  kaskoPhone?: string;
  emergencyPhone: string; // 112
  steps: AccidentStep[];
}

export interface MedicalMemberInfo {
  memberId: string;
  name: string;
  role: string;
  bloodType: string;
  allergies: string[];
  chronicConditions: string[];
  currentMedications: string[];
  emergencyContactPhone: string;
}

export type CloudSyncStatus = 'synced' | 'syncing' | 'offline' | 'local_only' | 'error';

export interface FamilyCloudState {
  familyCode: string;
  updatedAt: string;
  householdName: string;
}

export type AppModuleId =
  | 'dashboard'
  | 'tasks'
  | 'calendar'
  | 'shopping'
  | 'meals'
  | 'utilities'
  | 'receipts'
  | 'firstaid'
  | 'inventory'
  | 'docs'
  | 'contacts'
  | 'settings';



