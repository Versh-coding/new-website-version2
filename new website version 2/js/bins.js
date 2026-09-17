/**
 * 垃圾分類資料庫與三色桶檢索系統
 * 規範重點：
 * 1. 小藍色桶子 = 廚餘 (Food Waste)
 * 2. 橘色桶子 = 一般垃圾 (General Trash)
 * 3. 藍色桶子 = 資源回收 (Recyclables)
 */

const BIN_TYPES = {
  KITCHEN: {
    id: 'kitchen-bin',
    name: '小藍色桶子',
    role: '廚餘回收',
    subTitle: '有機易腐廚餘 · 堆肥養豬',
    themeColor: '#0284C7',
    badgeClass: 'badge-kitchen',
    icon: '🥣',
    description: '專門收集家庭與餐廳產生的有機食材剩餘物，請務必「瀝乾水分」，嚴禁混入塑膠袋、竹筷等雜質。',
    rules: [
      '請務必先瀝乾湯汁與水份，減輕焚化負擔與臭味。',
      '請勿將包裝塑膠袋、保鮮膜、免洗筷連同廚餘丟入！',
      '注意：堅硬的大豬大骨、蛤蜊貝殼易破壞機器，請改丟橘色桶。'
    ],
    accepted: ['剩菜剩飯', '果皮果肉', '生熟蔬菜菜葉', '茶葉渣與咖啡渣', '麵包餅乾點心', '蛋殼(細碎)', '魚刺小骨', '落葉枯枝(小量)'],
    rejected: ['大豬骨/牛大骨 (丟橘色桶)', '蛤蜊殼/生蠔殼 (丟橘色桶)', '塑膠袋/保鮮膜 (丟橘色桶)', '竹筷/牙籤/餐巾紙 (丟橘色桶)']
  },
  TRASH: {
    id: 'trash-bin',
    name: '橘色桶子',
    role: '一般垃圾',
    subTitle: '不可回收 · 焚化掩埋',
    themeColor: '#EA580C',
    badgeClass: 'badge-trash',
    icon: '🗑️',
    description: '收集無法進行物理或化學再利用的髒污廢棄物與複合材質製品，將送往焚化廠或衛生掩埋場處理。',
    rules: [
      '無法清洗乾淨、沾附大量油脂污漬的包裝請丟此桶。',
      '丟棄前請先將垃圾袋綁緊，防止異味與蚊蟲孳生。',
      '危險物品（如高壓瓦斯罐、鋰電池）切勿投入，需單獨回收。'
    ],
    accepted: ['沾油污難清洗的紙餐盒', '髒衛生紙與濕紙巾', '一般塑膠袋與保鮮膜', '大骨頭 (豬大骨/牛骨)', '貝殼 (蛤蜊/牡蠣/螃蟹殼)', '免洗竹筷與木叉匙', '橡皮擦/原子筆/吸管', '尿布與寵物排泄物墊'],
    rejected: ['乾淨紙類與紙箱 (丟藍色桶)', '乾淨寶特瓶與塑膠瓶 (丟藍色桶)', '可腐爛果皮菜渣 (丟小藍桶)', '乾電池與高壓噴霧罐 (另行單獨回收)']
  },
  RECYCLE: {
    id: 'recycle-bin',
    name: '藍色桶子',
    role: '資源回收',
    subTitle: '可再生循環 · 環保再生',
    themeColor: '#2563EB',
    badgeClass: 'badge-recycle',
    icon: '♻️',
    description: '收集乾淨、可經由工廠破碎重製再生的資源物資，請遵循「清、洗、扁、分」四大原則。',
    rules: [
      '容器丟棄前請務必先用清水沖洗乾淨、去除殘留殘渣。',
      '寶特瓶、鐵鋁罐請踩扁或壓扁，節省存放空間。',
      '紙類與紙容器需分開，紙容器內層有防水淋膜需專門處理。'
    ],
    accepted: ['乾淨洗淨的寶特瓶/牛奶瓶', '洗淨壓扁的紙餐盒/飲料紙杯', '鋁罐/鐵罐/易開罐', '乾淨紙箱/舊報紙/書籍', '乾淨利樂包/鋁箔包', '乾淨玻璃瓶/玻璃罐', '硬質塑膠容器 (PP/PE等)', '金屬鍋具/衣架'],
    rejected: ['油膩沾滿醬汁且無法洗淨的紙盒 (丟橘色桶)', '擦過口鼻的衛生紙 (丟橘色桶)', '生熟食材廚餘 (丟小藍桶)', '破損陶瓷碗盤 (包好丟橘色桶)']
  }
};

// 常見物品速查清單（涵蓋 60+ 日常生活用品）
const WASTE_ITEMS_DB = [
  // 廚餘 (小藍桶)
  { name: '蘋果皮 / 香蕉皮', bin: 'KITCHEN', hint: '果皮為有機廚餘，請直接瀝水後丟入小藍桶。' },
  { name: '吃剩的白飯 / 麵條', bin: 'KITCHEN', hint: '主食剩飯菜請盡量瀝乾湯汁再丟入小藍桶。' },
  { name: '泡茶後的茶葉渣 / 咖啡渣', bin: 'KITCHEN', hint: '天然有機廢渣，非常適合做堆肥，丟小藍桶。' },
  { name: '削掉的菜葉 / 菜根', bin: 'KITCHEN', hint: '廚房生鮮食材廢料，去除綁繩後投入小藍桶。' },
  { name: '過期發霉的麵包 / 餅乾', bin: 'KITCHEN', hint: '請先將塑膠包裝拆除，食品本體丟入小藍桶。' },
  { name: '吃剩的魚刺 / 小雞骨頭', bin: 'KITCHEN', hint: '細小軟骨小刺可由廚餘機絞碎，瀝乾丟小藍桶。' },
  { name: '雞蛋殼 (碎蛋殼)', bin: 'KITCHEN', hint: '碎蛋殼富含鈣質，可混入小藍桶有機廚餘堆肥。' },
  { name: '西瓜皮 / 哈密瓜皮', bin: 'KITCHEN', hint: '請先切成小塊以利發酵，瀝乾後放小藍桶。' },

  // 一般垃圾 (橘色桶)
  { name: '沾滿油污且洗不乾淨的便當盒', bin: 'TRASH', hint: '嚴重沾油且無法清洗的紙餐盒已無回收價值，請丟橘色桶。' },
  { name: '擦過嘴/鼻涕的衛生紙', bin: 'TRASH', hint: '衛生紙含水溶性或受分泌物污染，不可回收，請丟橘色桶。' },
  { name: '濕紙巾 (水針不織布)', bin: 'TRASH', hint: '濕紙巾含人造纖維非純紙漿，無法溶解與回收，丟橘色桶。' },
  { name: '免洗竹筷 / 免洗木湯匙', bin: 'TRASH', hint: '竹木類為一般垃圾，易吸油且非紙漿，請丟橘色桶。' },
  { name: '一般塑膠吸管', bin: 'TRASH', hint: '體積過小且難以分類再生，屬於一般垃圾，丟橘色桶。' },
  { name: '薄膜塑膠袋 / 髒塑膠袋 / 糖果包裝紙', bin: 'TRASH', hint: '複合塑膠膜或沾油塑膠袋無回收管道，丟橘色桶。' },
  { name: '大豬大骨 / 牛大骨', bin: 'TRASH', hint: '【注意】大硬骨會損壞廚餘破碎機刀片，必須丟橘色桶！' },
  { name: '蛤蜊殼 / 蚵仔殼 / 螃蟹硬殼', bin: 'TRASH', hint: '【注意】堅硬貝殼無法分解且傷刀片，請丟橘色桶！' },
  { name: '破掉的陶瓷馬克杯 / 陶瓷碗', bin: 'TRASH', hint: '陶瓷非玻璃無法回爐重熔，請妥善包好丟橘色桶。' },
  { name: '橡皮擦 / 修正帶 / 奇異筆', bin: 'TRASH', hint: '複合塑膠文具，無法分類再生，請丟橘色桶。' },
  { name: '髒保鮮膜 / 鋁箔紙 (沾滿油烤肉用)', bin: 'TRASH', hint: '沾有大量焦黑油脂之鋁箔紙與保鮮膜請丟橘色桶。' },
  { name: '貼紙 / 膠帶 / 雙面膠', bin: 'TRASH', hint: '含有大量背膠與塗層，不可回收，丟橘色桶。' },
  { name: '尿布 / 寵物吸水便墊', bin: 'TRASH', hint: '吸水高分子聚合物及排泄物，請包好丟入橘色桶。' },

  // 資源回收 (藍色桶)
  { name: '喝完清水沖洗乾淨的寶特瓶', bin: 'RECYCLE', hint: '請先倒空清洗、踩扁，瓶蓋與瓶身均可投入藍色桶。' },
  { name: '清洗乾淨的紙便當盒 / 紙餐盒', bin: 'RECYCLE', hint: '【關鍵】若有沖洗去除油垢與菜渣，可投入藍色桶（紙容器類）。' },
  { name: '手搖飲料乾淨塑膠杯 (PP杯)', bin: 'RECYCLE', hint: '撕除封口膜、倒乾冰塊茶水並沖洗後，丟入藍色桶。' },
  { name: '可樂易開罐 / 鋁罐', bin: 'RECYCLE', hint: '喝完清水稍作沖洗，壓扁後投入藍色桶。' },
  { name: '八寶粥罐 / 鐵罐 / 罐頭金屬罐', bin: 'RECYCLE', hint: '倒除醬汁洗淨後，瓶蓋小心收攏，投入藍色桶。' },
  { name: '利樂包 (牛奶盒 / 鋁箔包)', bin: 'RECYCLE', hint: '拔除吸管，洗淨壓扁後投入藍色桶。' },
  { name: '網購乾淨紙箱 / 瓦楞紙盒', bin: 'RECYCLE', hint: '請撕除膠帶與託運單，壓平整疊後投入藍色桶。' },
  { name: '廢棄舊報紙 / 書本 / 雜誌', bin: 'RECYCLE', hint: '乾淨無油污紙類，整齊捆紮或裝箱放入藍色桶。' },
  { name: '乾淨玻璃瓶 (啤酒瓶/醬油瓶洗淨)', bin: 'RECYCLE', hint: '洗淨倒乾，小心輕放於藍色桶（玻璃專區）。' },
  { name: '鮮奶家庭號大塑膠瓶 (HDPE 2號)', bin: 'RECYCLE', hint: '用清水充分搖晃洗淨，去除異味後投入藍色桶。' },
  { name: '洗髮精瓶 / 沐浴乳空瓶', bin: 'RECYCLE', hint: '將剩餘皂液沖淨，壓頭若含彈簧可分拆後投入藍色桶。' },
  { name: '蛋盒 (透明乾淨PET塑膠蛋盒)', bin: 'RECYCLE', hint: '乾淨無沾黏蛋液的透明塑膠蛋盒，壓疊投入藍色桶。' }
];

// 初始化全域物件供 app.js 調用
window.EcoBins = {
  data: BIN_TYPES,
  items: WASTE_ITEMS_DB,

  // 搜尋物品並比對屬於哪一個桶子
  searchItem: function(keyword) {
    if (!keyword || !keyword.trim()) return [];
    const cleanKey = keyword.trim().toLowerCase();
    return WASTE_ITEMS_DB.filter(item => 
      item.name.toLowerCase().includes(cleanKey) || 
      item.hint.toLowerCase().includes(cleanKey)
    );
  },

  getBinDetails: function(binKey) {
    return BIN_TYPES[binKey] || null;
  }
};
