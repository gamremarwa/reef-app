/* Seed data for the Reef Technology demo. Everything here is sample data;
   real farms, prices and readings would come from the platform's backend. */
const SEED = {
  farms: [
    { id: 'f1', name: 'مزرعة ريف الذكية', region: 'المنطقة الشرقية', farmer: 'أبو خالد', type: 'تمور وخضار' },
    { id: 'f2', name: 'مزرعة الروضة الرقمية', region: 'القطاع 4', farmer: 'حمد المنصوري', type: 'قمح ومواشي' },
    { id: 'f3', name: 'الدفيئة الزراعية', region: 'وادي الريف', farmer: 'أم سليم', type: 'خضار عضوية' },
    { id: 'f4', name: 'حظيرة الأبقار', region: 'سهل الريف', farmer: 'محمود العلي', type: 'ألبان' }
  ],

  cameras: [
    { id: 'c1', name: 'حقل القمح – القطاع 4', farm: 'f2', img: 'images/cam-field.jpg', kind: 'crop' },
    { id: 'c2', name: 'الدفيئة الزراعية', farm: 'f3', img: 'images/cam-crops.jpg', kind: 'crop' },
    { id: 'c3', name: 'حظيرة الأبقار', farm: 'f4', img: 'images/cam-barn.jpg', kind: 'animal' }
  ],

  categories: ['الكل', 'تمور', 'خضار', 'فواكه', 'ألبان وأجبان', 'لحوم', 'عسل', 'مدخلات إنتاج'],

  products: [
    { id: 'p1', code: 'REEF-TR-2024-00125', name: 'تمور سكري فاخرة', cat: 'تمور', emoji: '🌴', price: 45, unit: 'كغ', stock: 120, farm: 'f1',
      planted: '2023-03-01', harvest: '2024-04-20', method: 'زراعة عضوية ذكية', fertilizer: 'سماد عضوي (كمبوست)', water: 'ري بالتنقيط محسوب', pesticide: 'بدون مبيدات كيميائية', inspection: 'ناجح – فحص الجودة 2024-04-22', camera: 'c1' },
    { id: 'p2', code: 'REEF-TR-2024-00131', name: 'طماطم عضوية', cat: 'خضار', emoji: '🍅', price: 8, unit: 'كغ', stock: 300, farm: 'f3',
      planted: '2024-02-10', harvest: '2024-05-02', method: 'زراعة عضوية داخل دفيئة', fertilizer: 'سماد عضوي + سماد أخضر', water: 'ري بالتنقيط', pesticide: 'مكافحة حيوية', inspection: 'ناجح – 2024-05-03', camera: 'c2' },
    { id: 'p3', code: 'REEF-TR-2024-00132', name: 'خيار بلدي', cat: 'خضار', emoji: '🥒', price: 6, unit: 'كغ', stock: 220, farm: 'f3',
      planted: '2024-02-15', harvest: '2024-04-28', method: 'زراعة عضوية داخل دفيئة', fertilizer: 'كمبوست', water: 'ري بالتنقيط', pesticide: 'بدون مبيدات كيميائية', inspection: 'ناجح – 2024-04-29', camera: 'c2' },
    { id: 'p4', code: 'REEF-TR-2024-00140', name: 'حليب طازج كامل الدسم', cat: 'ألبان وأجبان', emoji: '🥛', price: 7, unit: 'لتر', stock: 150, farm: 'f4',
      planted: '', harvest: '2024-05-05', method: 'تربية حرة بإشراف بيطري', fertilizer: 'أعلاف طبيعية', water: '—', pesticide: 'بدون هرمونات', inspection: 'ناجح – فحص بيطري 2024-05-05', camera: 'c3' },
    { id: 'p5', code: 'REEF-TR-2024-00141', name: 'جبنة بلدية', cat: 'ألبان وأجبان', emoji: '🧀', price: 32, unit: 'كغ', stock: 60, farm: 'f4',
      planted: '', harvest: '2024-05-03', method: 'تصنيع يدوي من حليب المزرعة', fertilizer: 'أعلاف طبيعية', water: '—', pesticide: 'بدون مواد حافظة', inspection: 'ناجح – 2024-05-04', camera: 'c3' },
    { id: 'p6', code: 'REEF-TR-2024-00150', name: 'قمح بلدي', cat: 'مدخلات إنتاج', emoji: '🌾', price: 4, unit: 'كغ', stock: 900, farm: 'f2',
      planted: '2023-11-15', harvest: '2024-05-10', method: 'زراعة ذكية بمراقبة الرطوبة', fertilizer: 'سماد عضوي', water: 'ري محسوب بالحساسات', pesticide: 'مبيدات آمنة بجرعات محسوبة', inspection: 'ناجح – 2024-05-12', camera: 'c1' },
    { id: 'p7', code: 'REEF-TR-2024-00155', name: 'عسل سدر طبيعي', cat: 'عسل', emoji: '🍯', price: 90, unit: 'كغ', stock: 40, farm: 'f1',
      planted: '', harvest: '2024-03-30', method: 'مناحل طبيعية', fertilizer: '—', water: '—', pesticide: 'بدون إضافات', inspection: 'ناجح – تحليل مخبري 2024-04-02', camera: 'c1' },
    { id: 'p8', code: 'REEF-TR-2024-00160', name: 'لحم غنم بلدي', cat: 'لحوم', emoji: '🥩', price: 60, unit: 'كغ', stock: 35, farm: 'f2',
      planted: '', harvest: '2024-05-06', method: 'تربية حرة بإشراف بيطري', fertilizer: 'أعلاف طبيعية', water: '—', pesticide: 'خالٍ من الهرمونات', inspection: 'ناجح – فحص بيطري 2024-05-06', camera: 'c1' },
    { id: 'p9', code: 'REEF-TR-2024-00170', name: 'فراولة', cat: 'فواكه', emoji: '🍓', price: 15, unit: 'كغ', stock: 80, farm: 'f3',
      planted: '2023-12-01', harvest: '2024-04-15', method: 'زراعة مائية ذكية', fertilizer: 'محلول مغذٍّ عضوي', water: 'نظام مائي مغلق', pesticide: 'مكافحة حيوية', inspection: 'ناجح – 2024-04-16', camera: 'c2' },
    { id: 'p10', code: 'REEF-TR-2024-00180', name: 'سماد عضوي (كمبوست)', cat: 'مدخلات إنتاج', emoji: '🪴', price: 12, unit: 'كيس 25 كغ', stock: 200, farm: 'f1',
      planted: '', harvest: '2024-04-01', method: 'تخمير بقايا عضوية', fertilizer: '—', water: '—', pesticide: '—', inspection: 'ناجح', camera: 'c1' },
    { id: 'p11', code: 'REEF-TR-2024-00181', name: 'علف مواشي طبيعي', cat: 'مدخلات إنتاج', emoji: '🌿', price: 18, unit: 'كيس 40 كغ', stock: 150, farm: 'f2',
      planted: '', harvest: '2024-04-20', method: 'خلطة شعير وبرسيم', fertilizer: '—', water: '—', pesticide: '—', inspection: 'ناجح', camera: 'c1' }
  ],

  offers: [
    { id: 'o1', type: 'land', title: 'حصة قمح 1 دونم', farm: 'f2', emoji: '🌾', price: 350, season: 180, yield: 'تقريباً 350–450 كغ قمح', camera: 'c1', left: 12 },
    { id: 'o2', type: 'land', title: 'خط طماطم في الدفيئة', farm: 'f3', emoji: '🍅', price: 220, season: 90, yield: 'تقريباً 600 كغ طماطم', camera: 'c2', left: 8 },
    { id: 'o3', type: 'land', title: 'نخلة سكري', farm: 'f1', emoji: '🌴', price: 400, season: 365, yield: 'تقريباً 80–120 كغ تمر', camera: 'c1', left: 20 },
    { id: 'o4', type: 'livestock', title: 'رأس غنم عواسي', farm: 'f2', emoji: '🐑', price: 300, season: 150, yield: 'بيع الرأس أو اللحم بنهاية الدورة', camera: 'c1', left: 30 },
    { id: 'o5', type: 'livestock', title: 'حصة بقرة حلوب', farm: 'f4', emoji: '🐄', price: 500, season: 365, yield: 'حصة شهرية من الحليب والأجبان', camera: 'c3', left: 6 }
  ],

  plans: [
    { id: 'b1', name: 'صندوق الخضار الأسبوعي', emoji: '🥬', price: 25, every: 'أسبوعي', items: 'طماطم، خيار، خس، أعشاب طازجة – حوالي 5 كغ' },
    { id: 'b2', name: 'صندوق العائلة', emoji: '🧺', price: 60, every: 'أسبوعي', items: 'خضار وفواكه + حليب + بيض + جبنة' },
    { id: 'b3', name: 'صندوق التمور والعسل', emoji: '🍯', price: 110, every: 'شهري', items: '3 كغ تمور سكري + 1 كغ عسل سدر' }
  ]
};
