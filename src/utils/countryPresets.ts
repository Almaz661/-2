import { ContactCategory, UtilityMeterType } from '../types';

export interface CountryPreset {
  id: string;
  name: string;
  flag: string;
  regionCode: string;
  defaultCurrency: string;
  currencySymbol: string;
  description: string;
  emergencyContacts: Array<{
    name: string;
    specialty: string;
    category: ContactCategory;
    phone: string;
  }>;
  defaultShoppingLists?: Array<{ id: string; name: string; icon: string }>;
  defaultMeters?: Array<{
    id: string;
    name: string;
    type: UtilityMeterType;
    unit: string;
    tariffRate: number;
  }>;
}

export const COUNTRY_PRESETS: CountryPreset[] = [
  {
    id: 'CY',
    name: 'Кипр',
    flag: '🇨🇾',
    regionCode: 'CY',
    defaultCurrency: 'EUR',
    currencySymbol: '€',
    description: 'Валюта EUR (€), экстренные службы 112 / 199, супермаркеты Alphamega / Lidl',
    emergencyContacts: [
      { name: 'Европейская служба 112', specialty: 'Экстренная помощь (Cyprus 112)', category: 'emergency', phone: '112' },
      { name: 'Скорая помощь Кипра', specialty: 'Неотложная медицинская помощь', category: 'emergency', phone: '199' },
      { name: 'Полиция Кипра', specialty: 'Полиция (Αστυνομία Κύπρου)', category: 'emergency', phone: '112' },
      { name: 'Дежурные аптеки Кипра', specialty: 'Справка о ночных аптеках', category: 'doctor', phone: '11892' },
    ],
    defaultShoppingLists: [
      { id: 'list-supermarket', name: 'Alphamega / Lidl (Супермаркет)', icon: '🛒' },
      { id: 'list-pharmacy', name: 'Φαρμακείο (Аптека)', icon: '💊' },
    ],
    defaultMeters: [
      { id: 'meter-water', name: 'Вода (Water Board)', type: 'cold_water', unit: 'м³', tariffRate: 1.2 },
      { id: 'meter-electricity', name: 'Электричество (EAC)', type: 'electricity_single', unit: 'кВт⋅ч', tariffRate: 0.32 },
    ],
  },
  {
    id: 'GR',
    name: 'Греция',
    flag: '🇬🇷',
    regionCode: 'GR',
    defaultCurrency: 'EUR',
    currencySymbol: '€',
    description: 'Валюта EUR (€), службы 112 / 166 EKAB / 199, супермаркеты Σκλαβενίτης / AB',
    emergencyContacts: [
      { name: 'Европейская служба 112', specialty: 'Экстренная помощь (Ευρωπαϊκός αριθμός 112)', category: 'emergency', phone: '112' },
      { name: 'ΕΚΑΒ (Скорая помощь Греции)', specialty: 'Медицинская неотложка', category: 'emergency', phone: '166' },
      { name: 'Πυροσβεστική (Пожарная служба)', specialty: 'Пожарная охрана Греции', category: 'emergency', phone: '199' },
      { name: 'Αστυνομία (Полиция)', specialty: 'Полиция Греции', category: 'emergency', phone: '100' },
    ],
    defaultShoppingLists: [
      { id: 'list-supermarket', name: 'Σκλαβενίτης / AB (Супермаркет)', icon: '🛒' },
      { id: 'list-pharmacy', name: 'Φαρμακείο (Аптека)', icon: '💊' },
    ],
    defaultMeters: [
      { id: 'meter-cold-water', name: 'Холодная вода (Νερό)', type: 'cold_water', unit: 'м³', tariffRate: 1.45 },
      { id: 'meter-hot-water', name: 'Горячая вода (Ζεστό νερό)', type: 'hot_water', unit: 'м³', tariffRate: 4.8 },
      { id: 'meter-electricity', name: 'Электричество (ΔΕΗ)', type: 'electricity_single', unit: 'кВт⋅ч', tariffRate: 0.22 },
    ],
  },
  {
    id: 'RU',
    name: 'Россия',
    flag: '🇷🇺',
    regionCode: 'RU',
    defaultCurrency: 'RUB',
    currencySymbol: '₽',
    description: 'Валюта RUB (₽), службы 112 / 103 / 101, супермаркеты Пятёрочка / ВкусВилл',
    emergencyContacts: [
      { name: 'Единая служба спасения 112', specialty: 'Экстренная помощь МЧС', category: 'emergency', phone: '112' },
      { name: 'Скорая медицинская помощь', specialty: 'Неотложная помощь', category: 'emergency', phone: '103' },
      { name: 'Пожарная охрана', specialty: 'МЧС', category: 'emergency', phone: '101' },
      { name: 'Аварийная служба газа', specialty: 'Утечка газа', category: 'emergency', phone: '104' },
    ],
    defaultShoppingLists: [
      { id: 'list-supermarket', name: 'Супермаркет', icon: '🛒' },
      { id: 'list-pharmacy', name: 'Аптека', icon: '💊' },
    ],
    defaultMeters: [
      { id: 'meter-cold-water', name: 'Холодная вода', type: 'cold_water', unit: 'м³', tariffRate: 50.93 },
      { id: 'meter-hot-water', name: 'Горячая вода', type: 'hot_water', unit: 'м³', tariffRate: 243.16 },
      { id: 'meter-electricity', name: 'Электроэнергия T1', type: 'electricity_single', unit: 'кВт⋅ч', tariffRate: 6.43 },
    ],
  },
  {
    id: 'EU',
    name: 'Евросоюз (Германия, Испания, Франция, Италия и др.)',
    flag: '🇪🇺',
    regionCode: 'EU',
    defaultCurrency: 'EUR',
    currencySymbol: '€',
    description: 'Валюта EUR (€), общеевропейский единый номер 112, супермаркеты Lidl / Carrefour / ALDI',
    emergencyContacts: [
      { name: 'European Emergency 112', specialty: 'Единая европейская служба спасения', category: 'emergency', phone: '112' },
      { name: 'Medical Emergency', specialty: 'Скорая медицинская помощь', category: 'emergency', phone: '112' },
      { name: 'Fire Department', specialty: 'Пожарная охрана', category: 'emergency', phone: '112' },
      { name: 'Police', specialty: 'Полиция', category: 'emergency', phone: '112' },
    ],
    defaultShoppingLists: [
      { id: 'list-supermarket', name: 'Supermarket', icon: '🛒' },
      { id: 'list-pharmacy', name: 'Pharmacy / Apotheke', icon: '💊' },
    ],
    defaultMeters: [
      { id: 'meter-water', name: 'Wasser (Вода)', type: 'cold_water', unit: 'м³', tariffRate: 2.1 },
      { id: 'meter-electricity', name: 'Strom (Электричество)', type: 'electricity_single', unit: 'кВт⋅ч', tariffRate: 0.38 },
      { id: 'meter-gas', name: 'Gas (Газ)', type: 'gas', unit: 'м³', tariffRate: 1.15 },
    ],
  },
  {
    id: 'AE',
    name: 'ОАЭ (Дубай / Абу-Даби)',
    flag: '🇦🇪',
    regionCode: 'AE',
    defaultCurrency: 'AED',
    currencySymbol: 'AED',
    description: 'Валюта AED (Дирхам), службы 999 (Полиция) / 998 (Скорая) / 997 (Пожарные), DEWA',
    emergencyContacts: [
      { name: 'Dubai Police (Полиция)', specialty: 'Экстренная служба полиции ОАЭ', category: 'emergency', phone: '999' },
      { name: 'Ambulance (Скорая помощь)', specialty: 'Медицинская неотложка ОАЭ', category: 'emergency', phone: '998' },
      { name: 'Civil Defence (Пожарные)', specialty: 'Пожарная охрана', category: 'emergency', phone: '997' },
      { name: 'DEWA Emergency', specialty: 'Аварийная служба электричества и воды', category: 'other', phone: '991' },
    ],
    defaultShoppingLists: [
      { id: 'list-supermarket', name: 'Carrefour / Spinneys', icon: '🛒' },
      { id: 'list-pharmacy', name: 'Pharmacy (Life / Aster)', icon: '💊' },
    ],
    defaultMeters: [
      { id: 'meter-dewa-water', name: 'DEWA Water (Вода)', type: 'cold_water', unit: 'галлон', tariffRate: 0.04 },
      { id: 'meter-dewa-elec', name: 'DEWA Electricity (Электричество)', type: 'electricity_single', unit: 'кВт⋅ч', tariffRate: 0.28 },
    ],
  },
  {
    id: 'TR',
    name: 'Турция',
    flag: '🇹🇷',
    regionCode: 'TR',
    defaultCurrency: 'TRY',
    currencySymbol: '₺',
    description: 'Валюта TRY (₺), единая служба 112 (Acil Çağrı Merkezi), супермаркеты Migros / Bim / Carrefour',
    emergencyContacts: [
      { name: '112 Acil Çağrı (Единая экстренная служба)', specialty: 'Скорая, полиция, пожарные Турции', category: 'emergency', phone: '112' },
      { name: 'Doğalgaz Acil (Авария газа)', specialty: 'Утечка газа (İGDAŞ / Başkentgaz)', category: 'emergency', phone: '187' },
      { name: 'Elektrik Arıza (Авария электросетей)', specialty: 'Служба электросетей', category: 'other', phone: '186' },
    ],
    defaultShoppingLists: [
      { id: 'list-supermarket', name: 'Migros / BIM (Маркет)', icon: '🛒' },
      { id: 'list-pharmacy', name: 'Eczane (Аптека)', icon: '💊' },
    ],
    defaultMeters: [
      { id: 'meter-water', name: 'Su (Вода)', type: 'cold_water', unit: 'м³', tariffRate: 25.5 },
      { id: 'meter-electricity', name: 'Elektrik (Электричество)', type: 'electricity_single', unit: 'кВт⋅ч', tariffRate: 2.8 },
      { id: 'meter-gas', name: 'Doğalgaz (Газ)', type: 'gas', unit: 'м³', tariffRate: 6.2 },
    ],
  },
  {
    id: 'GE',
    name: 'Грузия',
    flag: '🇬🇪',
    regionCode: 'GE',
    defaultCurrency: 'GEL',
    currencySymbol: '₾',
    description: 'Валюта GEL (₾), единый номер 112 (112 Georgia), супермаркеты Goodwill / Carrefour / Spar',
    emergencyContacts: [
      { name: '112 Сакартвело', specialty: 'Единая служба спасения Грузии (Полиция, Скорая, МЧС)', category: 'emergency', phone: '112' },
      { name: 'Tbilisi Gas / Socar', specialty: 'Аварийная газовая служба', category: 'other', phone: '114' },
      { name: 'GWP (Водоканал Тбилиси)', specialty: 'Аварийная служба водоснабжения', category: 'other', phone: '0322931111' },
    ],
    defaultShoppingLists: [
      { id: 'list-supermarket', name: 'Goodwill / Carrefour', icon: '🛒' },
      { id: 'list-pharmacy', name: 'PSP / Aversi (Аптека)', icon: '💊' },
    ],
    defaultMeters: [
      { id: 'meter-water', name: 'Вода (GWP)', type: 'cold_water', unit: 'м³', tariffRate: 0.55 },
      { id: 'meter-electricity', name: 'Электричество (Telasi)', type: 'electricity_single', unit: 'кВт⋅ч', tariffRate: 0.22 },
      { id: 'meter-gas', name: 'Газ (Tbilisi Energy)', type: 'gas', unit: 'м³', tariffRate: 0.54 },
    ],
  },
  {
    id: 'TH',
    name: 'Таиланд',
    flag: '🇹🇭',
    regionCode: 'TH',
    defaultCurrency: 'THB',
    currencySymbol: '฿',
    description: 'Валюта THB (฿), скорая 1669, туристическая полиция 1155, полиция 191',
    emergencyContacts: [
      { name: 'Туристическая полиция Таиланда', specialty: 'Англоязычная помощь туристам и экспатам', category: 'emergency', phone: '1155' },
      { name: 'Скорая медицинская помощь (EMS)', specialty: 'Неотложка Таиланда', category: 'emergency', phone: '1669' },
      { name: 'Полиция Таиланда', specialty: 'Экстренная полиция', category: 'emergency', phone: '191' },
      { name: 'Пожарная охрана', specialty: 'Служба пожаротушения', category: 'emergency', phone: '199' },
    ],
    defaultShoppingLists: [
      { id: 'list-supermarket', name: 'Lotus’s / Big C / 7-Eleven', icon: '🛒' },
      { id: 'list-pharmacy', name: 'Pharmacy (Аптека)', icon: '💊' },
    ],
    defaultMeters: [
      { id: 'meter-water', name: 'Water (Вода)', type: 'cold_water', unit: 'м³', tariffRate: 15.0 },
      { id: 'meter-electricity', name: 'Electricity (MEA/PEA)', type: 'electricity_single', unit: 'кВт⋅ч', tariffRate: 4.8 },
    ],
  },
  {
    id: 'US',
    name: 'США / Канада',
    flag: '🇺🇸',
    regionCode: 'US',
    defaultCurrency: 'USD',
    currencySymbol: '$',
    description: 'Валюта USD ($), единая экстренная служба 911, супермаркеты Costco / Trader Joe’s / Whole Foods',
    emergencyContacts: [
      { name: 'Emergency 911', specialty: 'Police, Fire, Ambulance (США и Канада)', category: 'emergency', phone: '911' },
      { name: 'Poison Control', specialty: 'Центр токсикологии и отравлений', category: 'doctor', phone: '1-800-222-1222' },
      { name: 'Non-Emergency Police', specialty: 'Справочная служба полиции (несрочно)', category: 'other', phone: '311' },
    ],
    defaultShoppingLists: [
      { id: 'list-supermarket', name: 'Trader Joe’s / Whole Foods', icon: '🛒' },
      { id: 'list-pharmacy', name: 'CVS / Walgreens (Аптека)', icon: '💊' },
    ],
    defaultMeters: [
      { id: 'meter-water', name: 'Water', type: 'cold_water', unit: 'м³', tariffRate: 3.5 },
      { id: 'meter-electricity', name: 'Electricity', type: 'electricity_single', unit: 'кВт⋅ч', tariffRate: 0.16 },
      { id: 'meter-gas', name: 'Natural Gas', type: 'gas', unit: 'ccf', tariffRate: 1.25 },
    ],
  },
  {
    id: 'GB',
    name: 'Великобритания',
    flag: '🇬🇧',
    regionCode: 'GB',
    defaultCurrency: 'GBP',
    currencySymbol: '£',
    description: 'Валюта GBP (£), службы 999 / 112, NHS 111, супермаркеты Sainsbury’s / Tesco / Waitrose',
    emergencyContacts: [
      { name: 'Emergency Services (999)', specialty: 'Police, Ambulance, Fire UK', category: 'emergency', phone: '999' },
      { name: 'NHS 111', specialty: 'Медицинская консультация NHS (несрочно)', category: 'doctor', phone: '111' },
      { name: 'Non-Emergency Police (101)', specialty: 'Полиция (несрочные вопросы)', category: 'other', phone: '101' },
    ],
    defaultShoppingLists: [
      { id: 'list-supermarket', name: 'Tesco / Sainsbury’s', icon: '🛒' },
      { id: 'list-pharmacy', name: 'Boots (Pharmacy)', icon: '💊' },
    ],
    defaultMeters: [
      { id: 'meter-water', name: 'Water supply', type: 'cold_water', unit: 'м³', tariffRate: 2.1 },
      { id: 'meter-electricity', name: 'Electricity', type: 'electricity_single', unit: 'кВт⋅ч', tariffRate: 0.28 },
      { id: 'meter-gas', name: 'Gas', type: 'gas', unit: 'кВт⋅ч', tariffRate: 0.07 },
    ],
  },
  {
    id: 'KZ',
    name: 'Казахстан',
    flag: '🇰🇿',
    regionCode: 'KZ',
    defaultCurrency: 'KZT',
    currencySymbol: '₸',
    description: 'Валюта KZT (₸), службы 112 / 103 / 102, супермаркеты Magnum / Small',
    emergencyContacts: [
      { name: 'Единая дежурно-диспетчерская служба 112', specialty: 'ЧС и спасение', category: 'emergency', phone: '112' },
      { name: 'Скорая медицинская помощь', specialty: 'Неотложка (103)', category: 'emergency', phone: '103' },
      { name: 'Полиция Казахстана', specialty: 'Органы внутренних дел (102)', category: 'emergency', phone: '102' },
      { name: 'Аварийная газовая служба', specialty: 'Утечка газа (104)', category: 'emergency', phone: '104' },
    ],
    defaultShoppingLists: [
      { id: 'list-supermarket', name: 'Magnum / Small (Супермаркет)', icon: '🛒' },
      { id: 'list-pharmacy', name: 'Аптека', icon: '💊' },
    ],
    defaultMeters: [
      { id: 'meter-water', name: 'Холодная вода', type: 'cold_water', unit: 'м³', tariffRate: 98.5 },
      { id: 'meter-electricity', name: 'Электроэнергия', type: 'electricity_single', unit: 'кВт⋅ч', tariffRate: 24.2 },
    ],
  },
  {
    id: 'AM',
    name: 'Армения',
    flag: '🇦🇲',
    regionCode: 'AM',
    defaultCurrency: 'AMD',
    currencySymbol: '֏',
    description: 'Валюта AMD (֏), службы 911 / 103 / 102, супермаркеты SAS / Yerevan City',
    emergencyContacts: [
      { name: 'Служба спасения МЧС 911', specialty: 'Единая служба спасения Армении', category: 'emergency', phone: '911' },
      { name: 'Скорая помощь 103', specialty: 'Неотложная медицинская помощь', category: 'emergency', phone: '103' },
      { name: 'Полиция 102', specialty: 'Полиция Армении', category: 'emergency', phone: '102' },
    ],
    defaultShoppingLists: [
      { id: 'list-supermarket', name: 'SAS / Yerevan City', icon: '🛒' },
      { id: 'list-pharmacy', name: 'Alfa-Pharm (Аптека)', icon: '💊' },
    ],
    defaultMeters: [
      { id: 'meter-water', name: 'Вода (Veolia Djur)', type: 'cold_water', unit: 'м³', tariffRate: 200.0 },
      { id: 'meter-electricity', name: 'Электричество (ENA)', type: 'electricity_single', unit: 'кВт⋅ч', tariffRate: 48.0 },
    ],
  },
  {
    id: 'RS',
    name: 'Сербия',
    flag: '🇷🇸',
    regionCode: 'RS',
    defaultCurrency: 'RSD',
    currencySymbol: 'дин.',
    description: 'Валюта RSD (дин.), службы 192 (Полиция) / 194 (Скорая) / 193 (Пожарные), Maxi / Idea',
    emergencyContacts: [
      { name: 'Хитна помоћ (Скорая помощь)', specialty: 'Скорая медицинская помощь Сербии', category: 'emergency', phone: '194' },
      { name: 'Полиција (Полиция)', specialty: 'Полиция Сербии', category: 'emergency', phone: '192' },
      { name: 'Ватрогасци (Пожарные)', specialty: 'Пожарная охрана Сербии', category: 'emergency', phone: '193' },
    ],
    defaultShoppingLists: [
      { id: 'list-supermarket', name: 'Maxi / Idea / Lidl', icon: '🛒' },
      { id: 'list-pharmacy', name: 'Apoteka (Аптека)', icon: '💊' },
    ],
    defaultMeters: [
      { id: 'meter-water', name: 'Вода (Vodovod)', type: 'cold_water', unit: 'м³', tariffRate: 85.0 },
      { id: 'meter-electricity', name: 'Струја (EPS)', type: 'electricity_single', unit: 'кВт⋅ч', tariffRate: 11.5 },
    ],
  },
  {
    id: 'IL',
    name: 'Израиль',
    flag: '🇮🇱',
    regionCode: 'IL',
    defaultCurrency: 'ILS',
    currencySymbol: '₪',
    description: 'Валюта ILS (₪), службы 101 (Маген Давид Адом) / 100 (Полиция) / 102 (Пожарные)',
    emergencyContacts: [
      { name: 'Маген Давид Адом (מד"א)', specialty: 'Скорая помощь Израиля', category: 'emergency', phone: '101' },
      { name: 'Полиция Израиля (משטרת ישראל)', specialty: 'Полиция', category: 'emergency', phone: '100' },
      { name: 'Пожарная охрана (כבאות והצלה)', specialty: 'Пожарные и спасатели', category: 'emergency', phone: '102' },
    ],
    defaultShoppingLists: [
      { id: 'list-supermarket', name: 'Шуферсаль / Рами Леви', icon: '🛒' },
      { id: 'list-pharmacy', name: 'Супер-Фарм (Аптека)', icon: '💊' },
    ],
    defaultMeters: [
      { id: 'meter-water', name: 'Вода (Таагид Маим)', type: 'cold_water', unit: 'м³', tariffRate: 7.8 },
      { id: 'meter-electricity', name: 'Электричество (Хеврат Хашмаль)', type: 'electricity_single', unit: 'кВт⋅ч', tariffRate: 0.62 },
    ],
  },
  {
    id: 'CH',
    name: 'Швейцария',
    flag: '🇨🇭',
    regionCode: 'CH',
    defaultCurrency: 'CHF',
    currencySymbol: 'CHF',
    description: 'Валюта CHF, службы 144 (Скорая) / 117 (Полиция) / 118 (Пожарные), Migros / Coop',
    emergencyContacts: [
      { name: 'Sanität (Скорая помощь 144)', specialty: 'Скорая медицинская помощь', category: 'emergency', phone: '144' },
      { name: 'Polizei (Полиция 117)', specialty: 'Полиция Швейцарии', category: 'emergency', phone: '117' },
      { name: 'Feuerwehr (Пожарные 118)', specialty: 'Пожарная охрана', category: 'emergency', phone: '118' },
      { name: 'REGA (Воздушная спасательная служба)', specialty: 'Горная и вертолетная помощь', category: 'emergency', phone: '1414' },
    ],
    defaultShoppingLists: [
      { id: 'list-supermarket', name: 'Migros / Coop', icon: '🛒' },
      { id: 'list-pharmacy', name: 'Pharmacie / Apotheke', icon: '💊' },
    ],
    defaultMeters: [
      { id: 'meter-water', name: 'Wasser', type: 'cold_water', unit: 'м³', tariffRate: 2.2 },
      { id: 'meter-electricity', name: 'Strom', type: 'electricity_single', unit: 'кВт⋅ч', tariffRate: 0.31 },
    ],
  },
  {
    id: 'OTHER',
    name: 'Любая другая страна мира',
    flag: '🌐',
    regionCode: 'OTHER',
    defaultCurrency: 'USD',
    currencySymbol: '$',
    description: 'Настройте под любое государство: введите название страны, выберите любую мировую валюту',
    emergencyContacts: [
      { name: 'Единая служба спасения 112 / 911', specialty: 'Экстренная помощь', category: 'emergency', phone: '112' },
      { name: 'Скорая медицинская помощь', specialty: 'Неотложная помощь', category: 'emergency', phone: '' },
      { name: 'Пожарная охрана', specialty: 'МЧС / Fire Department', category: 'emergency', phone: '' },
      { name: 'Полиция', specialty: 'Правопорядок', category: 'emergency', phone: '' },
    ],
    defaultShoppingLists: [
      { id: 'list-supermarket', name: 'Супермаркет', icon: '🛒' },
      { id: 'list-pharmacy', name: 'Аптека', icon: '💊' },
    ],
    defaultMeters: [
      { id: 'meter-water', name: 'Холодная вода', type: 'cold_water', unit: 'м³', tariffRate: 1.0 },
      { id: 'meter-electricity', name: 'Электроэнергия', type: 'electricity_single', unit: 'кВт⋅ч', tariffRate: 0.2 },
    ],
  },
];

export const getCountryPresetById = (id: string | undefined): CountryPreset => {
  if (!id) return COUNTRY_PRESETS.find((c) => c.id === 'OTHER') || COUNTRY_PRESETS[0];
  const found = COUNTRY_PRESETS.find((c) => c.id.toUpperCase() === id.toUpperCase());
  return found || COUNTRY_PRESETS.find((c) => c.id === 'OTHER') || COUNTRY_PRESETS[0];
};
