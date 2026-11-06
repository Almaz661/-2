import { ShoppingCategory } from '../types';

/**
 * Словарь и правила нормализации названий товаров на русский язык
 * для чеков на нидерландском, немецком, польском, греческом, русском и английском языках.
 */

interface TermMapping {
  regex: RegExp;
  normalized: string;
  category: ShoppingCategory;
  defaultUnit?: string;
}

const DICTIONARY: TermMapping[] = [
  // =================== НИДЕРЛАНДСКИЙ (DUTCH - nld / Jumbo / Albert Heijn) ===================
  { regex: /halfvolle\s*melk/i, normalized: 'Молоко 1.5%', category: 'dairy', defaultUnit: 'л' },
  { regex: /volle\s*melk/i, normalized: 'Молоко цельное', category: 'dairy', defaultUnit: 'л' },
  { regex: /\bkarne?melk\b/i, normalized: 'Пахта (Karnemelk)', category: 'dairy', defaultUnit: 'л' },
  { regex: /\bmelk\b/i, normalized: 'Молоко', category: 'dairy', defaultUnit: 'л' },
  { regex: /\b(room)?boter\b/i, normalized: 'Сливочное масло', category: 'dairy', defaultUnit: 'уп' },
  { regex: /eieren|scharrelei(eren)?|vrije\s*uitloop/i, normalized: 'Яйца куриные', category: 'dairy', defaultUnit: 'уп' },
  { regex: /jong(e)?\s*belegen/i, normalized: 'Сыр полувыдержанный (Jong Belegen)', category: 'dairy', defaultUnit: 'уп' },
  { regex: /jong(e)?\s*kaas/i, normalized: 'Сыр молодой (Jonge Kaas)', category: 'dairy', defaultUnit: 'уп' },
  { regex: /belegen\s*kaas|extra\s*belegen/i, normalized: 'Сыр выдержанный (Belegen Kaas)', category: 'dairy', defaultUnit: 'уп' },
  { regex: /oude\s*kaas/i, normalized: 'Сыр старый (Oude Kaas)', category: 'dairy', defaultUnit: 'уп' },
  { regex: /\bkaas\b|gouda|mozzarella|parmezaan/i, normalized: 'Сыр', category: 'dairy', defaultUnit: 'уп' },
  { regex: /yoghurt|kwark|vla\b/i, normalized: 'Йогурт / Творог / Десерт', category: 'dairy', defaultUnit: 'уп' },
  { regex: /slagroom|kookroom/i, normalized: 'Сливки', category: 'dairy', defaultUnit: 'уп' },
  { regex: /volkoren\s*brood|bruin\s*brood/i, normalized: 'Хлеб цельнозерновой / темный', category: 'bakery', defaultUnit: 'шт' },
  { regex: /wit\s*brood|tijgerbrood/i, normalized: 'Хлеб белый / Тигровый', category: 'bakery', defaultUnit: 'шт' },
  { regex: /\bbrood\b|bollen|croissant|stokbrood|pistolet/i, normalized: 'Хлеб / Выпечка', category: 'bakery', defaultUnit: 'шт' },
  { regex: /beschuit|crackers|ontbijtkoek/i, normalized: 'Сухарики / Тосты', category: 'bakery', defaultUnit: 'уп' },
  { regex: /banan(en)?(\s*cluster)?/i, normalized: 'Бананы', category: 'produce', defaultUnit: 'кг' },
  { regex: /appel(s)?|elstar|jonagold/i, normalized: 'Яблоки', category: 'produce', defaultUnit: 'кг' },
  { regex: /peer|peren/i, normalized: 'Груши', category: 'produce', defaultUnit: 'кг' },
  { regex: /tomaat|tomaten|cherrytomaat/i, normalized: 'Помидоры', category: 'produce', defaultUnit: 'кг' },
  { regex: /komkommer/i, normalized: 'Огурец', category: 'produce', defaultUnit: 'шт' },
  { regex: /aardappel(en)?|krieltjes/i, normalized: 'Картофель', category: 'produce', defaultUnit: 'кг' },
  { regex: /wortel(en)?|peen|waspeen/i, normalized: 'Морковь', category: 'produce', defaultUnit: 'уп' },
  { regex: /paprika/i, normalized: 'Сладкий перец', category: 'produce', defaultUnit: 'уп' },
  { regex: /champignons|paddenstoelen/i, normalized: 'Грибы шампиньоны', category: 'produce', defaultUnit: 'уп' },
  { regex: /roerbakgroente|soepgroente|wokgroente/i, normalized: 'Овощная смесь свежая', category: 'produce', defaultUnit: 'уп' },
  { regex: /sla\b|ijsbergsla|spinazie/i, normalized: 'Салат свежий / Шпинат', category: 'produce', defaultUnit: 'уп' },
  { regex: /kipfilet|kipdij|kip\b/i, normalized: 'Куриное филе / птица', category: 'meat', defaultUnit: 'уп' },
  { regex: /rundergehakt|gehakt\b|h\.?o\.?h\.?\s*gehakt/i, normalized: 'Фарш мясной', category: 'meat', defaultUnit: 'уп' },
  { regex: /biefstuk|varkenshaas|spek\b|ham\b/i, normalized: 'Мясо / Стейк / Ветчина', category: 'meat', defaultUnit: 'уп' },
  { regex: /frikandel|kroket|rookworst|knakworst/i, normalized: 'Колбаски / Полуфабрикаты', category: 'meat', defaultUnit: 'уп' },
  { regex: /zalm|kabeljauw|tonijn|vis\b/i, normalized: 'Рыба / Морепродукты', category: 'meat', defaultUnit: 'уп' },
  { regex: /dubbelfriss/i, normalized: 'Напиток DubbelFriss', category: 'drinks', defaultUnit: 'уп' },
  { regex: /water\s*(plat|bruis|mineraal)?|spa\s*blauw|spa\s*rood/i, normalized: 'Вода питьевая', category: 'drinks', defaultUnit: 'бут' },
  { regex: /sap\b|appelsap|sinaasappelsap|frisdrank|cola\b|fanta\b/i, normalized: 'Сок / Напиток', category: 'drinks', defaultUnit: 'л' },
  { regex: /bier\b|heineken|amstel|hertog\s*jan|pils/i, normalized: 'Пиво', category: 'drinks', defaultUnit: 'бут' },
  { regex: /wijn\b/i, normalized: 'Вино', category: 'drinks', defaultUnit: 'бут' },
  { regex: /andrelon|shampoo|douchegel/i, normalized: 'Шампунь / Гель для душа', category: 'household', defaultUnit: 'шт' },
  { regex: /afwasmiddel|dreft/i, normalized: 'Средство для мытья посуды', category: 'household', defaultUnit: 'шт' },
  { regex: /wasmiddel|wasverzachter|ariel|robijn/i, normalized: 'Средство для стирки', category: 'household', defaultUnit: 'шт' },
  { regex: /toiletpapier|keukenrol|zakdoek/i, normalized: 'Бумажная продукция / салфетки', category: 'household', defaultUnit: 'уп' },
  { regex: /tandpasta|zeep\b/i, normalized: 'Средства гигиены', category: 'household', defaultUnit: 'шт' },
  { regex: /allesreiniger|bleek|schoonmaak/i, normalized: 'Бытовая химия / Чистящее средство', category: 'household', defaultUnit: 'шт' },
  { regex: /koffie|espresso|senseo|douwe\s*egberts/i, normalized: 'Кофе', category: 'pantry', defaultUnit: 'уп' },
  { regex: /\bthee\b|pickwick/i, normalized: 'Чай', category: 'pantry', defaultUnit: 'уп' },
  { regex: /suiker/i, normalized: 'Сахар', category: 'pantry', defaultUnit: 'кг' },
  { regex: /rijst/i, normalized: 'Рис', category: 'pantry', defaultUnit: 'уп' },
  { regex: /pasta|spaghetti|macaroni/i, normalized: 'Паста / Макароны', category: 'pantry', defaultUnit: 'уп' },
  { regex: /olijfolie|zonnebloemolie|olie\b/i, normalized: 'Масло растительное', category: 'pantry', defaultUnit: 'бут' },
  { regex: /chocolade|chocola|koek|stroopwafel|drop\b|chips|noot/i, normalized: 'Сладости / Снеки', category: 'sweets', defaultUnit: 'уп' },
  { regex: /statiegeld/i, normalized: 'Залог за тару (Statiegeld)', category: 'other', defaultUnit: 'шт' },

  // =================== НЕМЕЦКИЙ (GERMAN - deu) ===================
  { regex: /milsani.*(?:milch|h-milch|vollmilch)/i, normalized: 'Молоко Milsani 3.5%', category: 'dairy', defaultUnit: 'л' },
  { regex: /milsani/i, normalized: 'Молочные продукты Milsani', category: 'dairy', defaultUnit: 'уп' },
  { regex: /vollmilch|h-milch/i, normalized: 'Молоко цельное 3.5%', category: 'dairy', defaultUnit: 'л' },
  { regex: /fettarme\s*milch/i, normalized: 'Молоко 1.5%', category: 'dairy', defaultUnit: 'л' },
  { regex: /\bmilch\b/i, normalized: 'Молоко', category: 'dairy', defaultUnit: 'л' },
  { regex: /butter/i, normalized: 'Сливочное масло', category: 'dairy', defaultUnit: 'уп' },
  { regex: /verse\s*eieren|freilandeier|bodenhaltung|eier\b/i, normalized: 'Яйца куриные', category: 'dairy', defaultUnit: 'уп' },
  { regex: /gouda|emmentaler|käse|mozzarella/i, normalized: 'Сыр', category: 'dairy', defaultUnit: 'уп' },
  { regex: /joghurt|quark|speisequark|schmand/i, normalized: 'Йогурт / Творог', category: 'dairy', defaultUnit: 'уп' },
  { regex: /roggenmischbrot|roggenbrot|vollkornbrot|dinkelbrot|landbrot/i, normalized: 'Хлеб ржаной / зерновой', category: 'bakery', defaultUnit: 'шт' },
  { regex: /brot\b|toast|baguette/i, normalized: 'Хлеб', category: 'bakery', defaultUnit: 'шт' },
  { regex: /brötchen|semmel|croissant/i, normalized: 'Булочки / Выпечка', category: 'bakery', defaultUnit: 'шт' },
  { regex: /bio\s*bananen|bananen/i, normalized: 'Бананы Bio', category: 'produce', defaultUnit: 'кг' },
  { regex: /äpfel|apfel/i, normalized: 'Яблоки', category: 'produce', defaultUnit: 'кг' },
  { regex: /tomaten|rispentomaten/i, normalized: 'Томаты', category: 'produce', defaultUnit: 'кг' },
  { regex: /gurke(n)?/i, normalized: 'Огурцы', category: 'produce', defaultUnit: 'шт' },
  { regex: /kartoffeln/i, normalized: 'Картофель', category: 'produce', defaultUnit: 'уп' },
  { regex: /zwiebeln/i, normalized: 'Лук репчатый', category: 'produce', defaultUnit: 'уп' },
  { regex: /paprika/i, normalized: 'Сладкий перец', category: 'produce', defaultUnit: 'уп' },
  { regex: /salat|eisbergsalat/i, normalized: 'Салат свежий', category: 'produce', defaultUnit: 'шт' },
  { regex: /meine\s*metzgerei|metzgerei/i, normalized: 'Мясная продукция', category: 'meat', defaultUnit: 'уп' },
  { regex: /schnitzel/i, normalized: 'Шницель', category: 'meat', defaultUnit: 'уп' },
  { regex: /nackenbraten|nacken/i, normalized: 'Свиная шейка / Жаркое', category: 'meat', defaultUnit: 'уп' },
  { regex: /hack\s*gem|hackfleisch|rinderhack/i, normalized: 'Фарш мясной', category: 'meat', defaultUnit: 'уп' },
  { regex: /hähnchenflügel|hflügel/i, normalized: 'Куриные крылышки', category: 'meat', defaultUnit: 'уп' },
  { regex: /herzen|hä\.?-?\s*herzen/i, normalized: 'Куриные сердечки', category: 'meat', defaultUnit: 'уп' },
  { regex: /hähnchen|hühnchen|hähnchenbrust|filet/i, normalized: 'Куриное филе', category: 'meat', defaultUnit: 'уп' },
  { regex: /schinkenfl|schinken\s*wurst/i, normalized: 'Ветчинная колбаса', category: 'meat', defaultUnit: 'шт' },
  { regex: /wurst|schinken|salami|bratwurst/i, normalized: 'Колбаса / Сосиски', category: 'meat', defaultUnit: 'уп' },
  { regex: /erdb\.?\s*joghurt|erdbeer\s*joghurt/i, normalized: 'Клубничный йогурт', category: 'dairy', defaultUnit: 'шт' },
  { regex: /cookie\s*(und|&)?\s*cream/i, normalized: 'Десерт печенье со сливками', category: 'sweets', defaultUnit: 'шт' },
  { regex: /kirschcr|kirsch\s*tafel|tafel\s*schoko/i, normalized: 'Шоколад с вишневым кремом', category: 'sweets', defaultUnit: 'шт' },
  { regex: /choceur|moser\s*roth|schokolade|tafel|pralinen/i, normalized: 'Шоколад', category: 'sweets', defaultUnit: 'шт' },
  { regex: /keks|waffeln|haribo/i, normalized: 'Сладости / Печенье', category: 'sweets', defaultUnit: 'уп' },
  { regex: /kaffee|espresso/i, normalized: 'Кофе', category: 'pantry', defaultUnit: 'уп' },
  { regex: /tee\b/i, normalized: 'Чай', category: 'pantry', defaultUnit: 'уп' },
  { regex: /zucker/i, normalized: 'Сахар', category: 'pantry', defaultUnit: 'кг' },
  { regex: /mehl/i, normalized: 'Мука пшеничная', category: 'pantry', defaultUnit: 'кг' },
  { regex: /cucina\s*nobile|nudeln|pasta|spaghetti/i, normalized: 'Паста / Макароны', category: 'pantry', defaultUnit: 'уп' },
  { regex: /öl|olivenöl|sonnenblumenöl|rapsöl/i, normalized: 'Растительное масло', category: 'pantry', defaultUnit: 'бут' },
  { regex: /rio\s*d['’]oro|apfelsaft|orangensaft|saft\b/i, normalized: 'Фруктовый сок', category: 'drinks', defaultUnit: 'л' },
  { regex: /quellbrunn|wasser|mineralwasser/i, normalized: 'Минеральная вода', category: 'drinks', defaultUnit: 'бут' },
  { regex: /pfand/i, normalized: 'Залог за бутылку (Pfand)', category: 'other', defaultUnit: 'шт' },
  { regex: /tandil|spülmittel|waschmittel/i, normalized: 'Средство для стирки/мытья Tandil', category: 'household', defaultUnit: 'шт' },
  { regex: /kokett|toilettenpapier|klopapier|küchenrollen/i, normalized: 'Бумажные изделия Kokett', category: 'household', defaultUnit: 'уп' },

  // =================== ПОЛЬСКИЙ (POLISH - pol) ===================
  { regex: /mleko\s*(świeże|uht)?/i, normalized: 'Молоко', category: 'dairy', defaultUnit: 'л' },
  { regex: /masło\s*(ekstra)?/i, normalized: 'Масло сливочное', category: 'dairy', defaultUnit: 'уп' },
  { regex: /jaja|jajka/i, normalized: 'Яйца куриные', category: 'dairy', defaultUnit: 'уп' },
  { regex: /ser\s*(żółty|gouda|twaróg)?/i, normalized: 'Сыр / Творог', category: 'dairy', defaultUnit: 'уп' },
  { regex: /jogurt|kefir/i, normalized: 'Йогурт / Кефир', category: 'dairy', defaultUnit: 'уп' },
  { regex: /chleb/i, normalized: 'Хлеб', category: 'bakery', defaultUnit: 'шт' },
  { regex: /bułki|kajzerka/i, normalized: 'Булочки', category: 'bakery', defaultUnit: 'шт' },
  { regex: /banany/i, normalized: 'Бананы', category: 'produce', defaultUnit: 'кг' },
  { regex: /jabłka/i, normalized: 'Яблоки', category: 'produce', defaultUnit: 'кг' },
  { regex: /pomidory/i, normalized: 'Помидоры', category: 'produce', defaultUnit: 'кг' },
  { regex: /ogórki/i, normalized: 'Огурцы', category: 'produce', defaultUnit: 'кг' },
  { regex: /ziemniaki/i, normalized: 'Картофель', category: 'produce', defaultUnit: 'кг' },
  { regex: /kurczak|filet/i, normalized: 'Курица / Филе', category: 'meat', defaultUnit: 'уп' },
  { regex: /kiełbasa|szynka/i, normalized: 'Колбаса / Ветчина', category: 'meat', defaultUnit: 'уп' },
  { regex: /kawa/i, normalized: 'Кофе', category: 'pantry', defaultUnit: 'уп' },
  { regex: /herbata/i, normalized: 'Чай', category: 'pantry', defaultUnit: 'уп' },
  { regex: /cukier/i, normalized: 'Сахар', category: 'pantry', defaultUnit: 'кг' },
  { regex: /mąka/i, normalized: 'Мука', category: 'pantry', defaultUnit: 'кг' },
  { regex: /woda\s*(niegaz|gaz)?/i, normalized: 'Вода питьевая', category: 'drinks', defaultUnit: 'бут' },
  { regex: /kaucja/i, normalized: 'Залог за бутылку (Kaucja)', category: 'other', defaultUnit: 'шт' },

  // =================== ГРЕЧЕСКИЙ (GREEK - ell) ===================
  { regex: /γαλα|γάλα/i, normalized: 'Молоко', category: 'dairy', defaultUnit: 'л' },
  { regex: /βουτυρο|βούτυρο/i, normalized: 'Сливочное масло', category: 'dairy', defaultUnit: 'уп' },
  { regex: /αυγα|αβγά|αυγά/i, normalized: 'Яйца куриные', category: 'dairy', defaultUnit: 'уп' },
  { regex: /τυρι|τύρι|φέτα|φετα|γραβιερα|γραβιέρα|κασέρι|κασπερι/i, normalized: 'Сыр', category: 'dairy', defaultUnit: 'уп' },
  { regex: /γιαουρτι|γιαούρτι/i, normalized: 'Греческий йогурт', category: 'dairy', defaultUnit: 'уп' },
  { regex: /κρεμα|κρέμα\s*γαλακτος/i, normalized: 'Сливки', category: 'dairy', defaultUnit: 'уп' },
  { regex: /ψωμι|ψωμί|τοστ|φρυγανιες|φρυγανιές/i, normalized: 'Хлеб / Тосты', category: 'bakery', defaultUnit: 'шт' },
  { regex: /κρουασαν|κρουασάν|κουλουρι|κουλούρι/i, normalized: 'Выпечка / Круассаны', category: 'bakery', defaultUnit: 'шт' },
  { regex: /μπανανες|μπανάνες/i, normalized: 'Бананы', category: 'produce', defaultUnit: 'кг' },
  { regex: /μηλα|μήλα/i, normalized: 'Яблоки', category: 'produce', defaultUnit: 'кг' },
  { regex: /πορτοκαλια|πορτοκάλια/i, normalized: 'Апельсины', category: 'produce', defaultUnit: 'кг' },
  { regex: /τοματες|ντομάτες/i, normalized: 'Томаты', category: 'produce', defaultUnit: 'кг' },
  { regex: /αγγουρια|αγγούρια/i, normalized: 'Огурцы', category: 'produce', defaultUnit: 'кг' },
  { regex: /πατατες|πατάτες/i, normalized: 'Картофель', category: 'produce', defaultUnit: 'кг' },
  { regex: /κρεμμυδια|κρεμμύδια/i, normalized: 'Лук репчатый', category: 'produce', defaultUnit: 'кг' },
  { regex: /σαλατα|σαλάτα|μαρουλι|μαρούλι/i, normalized: 'Салат свежий', category: 'produce', defaultUnit: 'шт' },
  { regex: /κοτοπουλο|κοτόπουλο|φιλετο\s*κοτ/i, normalized: 'Курица / Филе', category: 'meat', defaultUnit: 'уп' },
  { regex: /μοσχαρι|μοσχάρι|χοιρινο|χοιρινό|κιμας|κιμάς/i, normalized: 'Мясо / Фарш', category: 'meat', defaultUnit: 'уп' },
  { regex: /ζαμπον|ζαμπόν|γαλοπουλα|γαλοπούλα|σαλαμι|σαλάμι/i, normalized: 'Ветчина / Колбаса', category: 'meat', defaultUnit: 'уп' },
  { regex: /ψαρι|ψάρι|τσιπουρα|τσιπούρα|σολομος|σολομός|τονος|τόνος/i, normalized: 'Рыба / Морепродукты', category: 'meat', defaultUnit: 'уп' },
  { regex: /ελαιολαδο|ελαιόλαδο|λαδι|λάδι/i, normalized: 'Оливковое масло', category: 'pantry', defaultUnit: 'бут' },
  { regex: /μακαρονια|μακαρόνια|σπαγγετι|σπαγγέτι|κριθαρακι/i, normalized: 'Паста / Макароны', category: 'pantry', defaultUnit: 'уп' },
  { regex: /ρυζι|ρύζι/i, normalized: 'Рис', category: 'pantry', defaultUnit: 'уп' },
  { regex: /αλευρι|αλεύρι/i, normalized: 'Мука пшеничная', category: 'pantry', defaultUnit: 'кг' },
  { regex: /καφες|καφές/i, normalized: 'Кофе', category: 'pantry', defaultUnit: 'уп' },
  { regex: /τσαι|τσάι/i, normalized: 'Чай', category: 'pantry', defaultUnit: 'уп' },
  { regex: /νερο|νερό/i, normalized: 'Вода питьевая', category: 'drinks', defaultUnit: 'бут' },
  { regex: /χυμος|χυμός/i, normalized: 'Сок фруктовый', category: 'drinks', defaultUnit: 'л' },
  { regex: /μπυρα|μπύρα/i, normalized: 'Пиво', category: 'drinks', defaultUnit: 'бут' },
  { regex: /κρασι|κρασί/i, normalized: 'Вино', category: 'drinks', defaultUnit: 'бут' },
  { regex: /σοκολατα|σοκολάτα|μπισκοτα|μπισκότα/i, normalized: 'Сладости / Печенье', category: 'sweets', defaultUnit: 'уп' },
  { regex: /ζαχαρη|ζάχαρη/i, normalized: 'Сахар', category: 'pantry', defaultUnit: 'кг' },
  { regex: /απορρυπαντικο|απορρυπαντικό|χλωρινη|χλωρίνη/i, normalized: 'Бытовая химия', category: 'household', defaultUnit: 'шт' },
  { regex: /χαρτι\s*υγει|χαρτί\s*υγείας|κουζινας|κουζίνας/i, normalized: 'Бумажные изделия', category: 'household', defaultUnit: 'уп' },
  { regex: /σαμπουαν|σαμπουάν|αφρολουτρο|αφρόλουτρο|σαπουνι|σαπούνι/i, normalized: 'Средства гигиены', category: 'household', defaultUnit: 'шт' },

  // =================== РУССКИЙ (RUSSIAN - rus) ===================
  { regex: /молоко/i, normalized: 'Молоко', category: 'dairy', defaultUnit: 'л' },
  { regex: /творог/i, normalized: 'Творог', category: 'dairy', defaultUnit: 'уп' },
  { regex: /масло\s*слив/i, normalized: 'Масло сливочное', category: 'dairy', defaultUnit: 'уп' },
  { regex: /сыр\b/i, normalized: 'Сыр', category: 'dairy', defaultUnit: 'уп' },
  { regex: /яйц[оа]/i, normalized: 'Яйца куриные', category: 'dairy', defaultUnit: 'дес' },
  { regex: /сметана/i, normalized: 'Сметана', category: 'dairy', defaultUnit: 'уп' },
  { regex: /кефир/i, normalized: 'Кефир', category: 'dairy', defaultUnit: 'бут' },
  { regex: /йогурт/i, normalized: 'Йогурт', category: 'dairy', defaultUnit: 'шт' },
  { regex: /хлеб|батон/i, normalized: 'Хлеб', category: 'bakery', defaultUnit: 'шт' },
  { regex: /банан[ыа]?/i, normalized: 'Бананы', category: 'produce', defaultUnit: 'кг' },
  { regex: /яблок[ои]/i, normalized: 'Яблоки', category: 'produce', defaultUnit: 'кг' },
  { regex: /томат[ы]?|помидор[ы]?/i, normalized: 'Помидоры', category: 'produce', defaultUnit: 'кг' },
  { regex: /огурц[ы]?/i, normalized: 'Огурцы', category: 'produce', defaultUnit: 'кг' },
  { regex: /картофел[ья]/i, normalized: 'Картофель', category: 'produce', defaultUnit: 'кг' },
  { regex: /филе\s*(кур|индей)/i, normalized: 'Филе птицы', category: 'meat', defaultUnit: 'кг' },
  { regex: /куриц[аы]/i, normalized: 'Курица', category: 'meat', defaultUnit: 'кг' },
  { regex: /фарш/i, normalized: 'Фарш', category: 'meat', defaultUnit: 'уп' },
  { regex: /кофе/i, normalized: 'Кофе', category: 'pantry', defaultUnit: 'уп' },
  { regex: /чай\b/i, normalized: 'Чай', category: 'pantry', defaultUnit: 'уп' },
  { regex: /сахар/i, normalized: 'Сахар', category: 'pantry', defaultUnit: 'кг' },
  { regex: /макарон|паста/i, normalized: 'Макароны', category: 'pantry', defaultUnit: 'уп' },
  { regex: /крупа|гречк|рис\b/i, normalized: 'Крупа', category: 'pantry', defaultUnit: 'уп' },
  { regex: /вода\s*(газ|негаз|минер)?/i, normalized: 'Вода питьевая', category: 'drinks', defaultUnit: 'бут' },
  { regex: /мыло|порошок|салфетк/i, normalized: 'Товары для дома', category: 'household', defaultUnit: 'шт' },
];

/**
 * Нормализует оригинальную строку с чека:
 * 1. Очищает от служебных кодов, звездочек, артикулов
 * 2. Ищет совпадение в словаре
 * 3. Если совпадения нет — приводит к аккуратному виду (Title Case на русском или транслит/очистка)
 */
export function normalizeProductTitle(
  originalText: string,
  _langHint?: string
): { normalizedTitle: string; category: ShoppingCategory; defaultUnit?: string } {
  // 1. Очистка от лидирующих цифр артикулов, номеров позиций ("1. ", "02. ", "4) ")
  let cleaned = originalText
    .replace(/^\s*\d{1,4}[.)]\s+/, '')
    .replace(/^[\d\s\-#*]+(?=[A-Za-zА-Яа-яΆ-ώ])/, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Удаляем хвостовые коды налогов и знаки препинания (например " _А", " [A]", " B")
  cleaned = cleaned.replace(/\s+[_\(\[\*]*[A-Za-zА-Яа-я0-9][_\)\]\*]*$/, '').trim();

  // Удаляем префиксы торговых марок (JUMBO, AH) и количества (1x, 2 ) для лучшего распознавания
  const strippedTitle = cleaned
    .replace(/^(?:\d+\s*[xX*хХ]?\s+)?(?:jumbo|ah|albert\s*heijn|rewe|edeka|penny|aldi|lidl)\s+/i, '')
    .trim();

  // 2. Поиск по прямому словарю товаров (сперва по очищенному названию, затем по исходному)
  for (const item of DICTIONARY) {
    if (item.regex.test(strippedTitle) || item.regex.test(cleaned)) {
      return {
        normalizedTitle: item.normalized,
        category: item.category,
        defaultUnit: item.defaultUnit,
      };
    }
  }

  // 3. Автоматическое семантическое определение категории по корням слов на 5 языках
  let category: ShoppingCategory = 'other';
  const lower = (strippedTitle || cleaned).toLowerCase();

  // Бытовая химия и личная гигиена (проверяем перед мясом, чтобы shampoo не совпадал с ham!)
  if (
    /papier|toilett|seife|shampoo|sp[uü]l|wasch|reiniger|туал|мыл|шампун|порошок|салфет|моющее|уборк|domestos|fairy|persil|ariel|dreft|robijn|andrelon|afwas|vaatwas|tandpasta|colgate|oral-b|gillette|nivea|dove|soap|detergent|cleaner|wipe|bleek|household/i.test(
      lower
    )
  ) {
    category = 'household';
  } else if (
    /dubbelfriss|wasser|saft|cola|limo|bier|wein|вода|сок\b|морс|квас|пиво|вино|напиток|газировк|лимонад|woda|sok\b|piwo|water|juice|beer|wine|soda|drink|frisdrank|chocomel/i.test(
      lower
    )
  ) {
    category = 'drinks';
  } else if (
    /fleisch|rind|schwein|pute|h[aä]hnchen|huhn|wurst|salami|\bspeck\b|lachs|fisch|мясо|говядин|свинин|птиц|куриц|индейк|колбас|сосиск|сардельк|ветчин|рыб|лосос|форел|котлет|шницел|фарш|szynka|kie[lł]basa|kurczak|wo[lł]owina|wieprzowina|ryba|bacon|\bham\b|chicken|beef|pork|sausage|meat|poultry|turkey|kipfilet|gehakt|biefstuk|frikandel|kroket/i.test(
      lower
    )
  ) {
    category = 'meat';
  } else if (
    /milch|k[aä]se|butter|quark|joghurt|sahne|eier|молок|сыр|масл.*слив|творог|йогурт|сметан|сливк|яйц|ряженк|кефир|mleko|ser\b|mas[lł]o|twar[oó]g|[sś]mietana|jaja|cheese|milk|butter|yogurt|cream|dairy|eggs|kaas\b|vla\b|kwark/i.test(
      lower
    )
  ) {
    category = 'dairy';
  } else if (
    /schoko|keks|cookie|bonbon|praline|waffel|eis\b|torte|шоколад|печень|конфет|вафл|морожен|десерт|сладост|пирожн|батончик|пастил|зефир|мармелад|czekolada|ciastk|cukierk|lody|candy|chocolate|cookie|sweet|dessert|snack|ice\s*cream|stroopwafel|drop\b/i.test(
      lower
    )
  ) {
    category = 'sweets';
  } else if (
    /brot|br[oö]tchen|toast|baguette|kuchen|croissant|хлеб|батон|булочк|багет|лаваш|выпечк|торт|пирог|булк|chleb|bu[lł]k|bread|bun|bagel|pastry|bakery|brood\b|pistolet/i.test(
      lower
    )
  ) {
    category = 'bakery';
  } else if (
    /salat|tomate|gurke|apfel|[aä]pfel|banan|kartoffel|zwiebel|karotte|m[oö]hre|paprika|beere|яблок|банан|томат|помидор|огур|картофел|лук\b|морков|капуст|зелен|апельсин|ягод|фрукт|овощ|груш|чеснок|перец\b|свекл|яблоч|jab[lł]k|pomidor|og[oó]rk|ziemniak|apple|banana|tomato|potato|onion|carrot|fruit|vegetable|produce|berry|greens|komkommer|aardappel|champignon|groente/i.test(
      lower
    )
  ) {
    category = 'produce';
  } else if (
    /kaffee|tee\b|zucker|mehl|nudel|pasta|spaghetti|reis|oel|[oö]l|essig|salz|pfeffer|sauce|кофе|чай\b|сахар|мук|макарон|паст|рис\b|масло\s*растит|подсолнечн|оливков|круп|гречк|овсянк|соус|специ|приправ|kawa|herbata|cukier|m[aą]ka|makaron|ry[zż]|coffee|tea|sugar|flour|rice|pasta|oil|spice|salt|pantry|koffie|thee\b|suiker|olijfolie/i.test(
      lower
    )
  ) {
    category = 'pantry';
  } else if (
    /apotheke|tablette|vitamin|pflaster|aspirin|аптек|таблет|витамин|пластыр|аспирин|лекарств|pharmacy|pill|tablet|vitamin/i.test(
      lower
    )
  ) {
    category = 'pharmacy';
  }

  // 4. Формируем опрятный заголовок (Title Case)
  const formatted =
    cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();

  return {
    normalizedTitle: formatted || originalText,
    category,
    defaultUnit: 'шт',
  };
}

/**
 * Извлекает единицу измерения из текста строки
 */
export function extractUnitOfMeasure(text: string): string | undefined {
  const match = text.match(
    /\b(кг|г|гр|л|мл|шт|уп|пач|бан|бут|st|stk|kg|g|gr|l|ml|pck|op|szt|τεμ)\b/i
  );
  if (!match) return undefined;

  const unit = match[1].toLowerCase();
  switch (unit) {
    case 'kg':
    case 'кг':
      return 'кг';
    case 'g':
    case 'gr':
    case 'г':
    case 'гр':
      return 'г';
    case 'l':
    case 'л':
      return 'л';
    case 'ml':
    case 'мл':
      return 'мл';
    case 'st':
    case 'stk':
    case 'szt':
    case 'τεμ':
    case 'шт':
      return 'шт';
    case 'pck':
    case 'op':
    case 'пач':
    case 'уп':
      return 'уп';
    case 'бан':
      return 'бан';
    case 'бут':
      return 'бут';
    default:
      return unit;
  }
}
