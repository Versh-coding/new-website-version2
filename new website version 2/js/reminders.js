/**
 * AI 環保提醒事項與每日綠色行動打卡系統
 * 支援 LocalStorage 保存狀態、動態種樹進度條、自訂提醒事項
 */

const DEFAULT_REMINDERS = [
  { id: 'rem-1', text: '外出隨身攜帶環保杯與餐具，減少一次性塑膠杯與吸管消耗', tag: '減塑減廢', co2Saved: 150 },
  { id: 'rem-2', text: '隨手關閉無人房間照明與電器，關閉不使用的延長線開關', tag: '節省電力', co2Saved: 200 },
  { id: 'rem-3', text: '外出購物自備環保折疊袋，堅決拒絕購買一次性塑膠提袋', tag: '綠色消費', co2Saved: 80 },
  { id: 'rem-4', text: '冷氣溫度設定在 26℃ ~ 28℃，並搭配循環扇以提升制冷效能', tag: '節能減碳', co2Saved: 350 },
  { id: 'rem-5', text: '落實剩菜剩飯瀝乾水分投入「小藍桶（廚餘）」，廚房不飄臭味', tag: '惜食廚餘', co2Saved: 220 },
  { id: 'rem-6', text: '喝完飲料杯、便當盒清水沖淨壓扁後，正確放入「藍色桶（回收）」', tag: '落實分類', co2Saved: 180 },
  { id: 'rem-7', text: '洗澡時間控制在 10 分鐘內，洗菜水留存澆花二次循環利用', tag: '水資源珍惜', co2Saved: 120 },
  { id: 'rem-8', text: '短程外出（2公里內）選擇步行或騎公共單車，健康又低碳', tag: '綠色出行', co2Saved: 280 }
];

window.EcoReminders = {
  storageKey: 'ecolife_reminders_v2',
  stateKey: `ecolife_checked_${new Date().toISOString().slice(0, 10)}`,

  // 取得提醒事項清單
  getItems: function() {
    const saved = localStorage.getItem(this.storageKey);
    if (!saved) {
      localStorage.setItem(this.storageKey, JSON.stringify(DEFAULT_REMINDERS));
      return DEFAULT_REMINDERS;
    }
    try {
      return JSON.parse(saved);
    } catch(e) {
      return DEFAULT_REMINDERS;
    }
  },

  // 取得今日已勾選的 ID 集合
  getCheckedIds: function() {
    const saved = localStorage.getItem(this.stateKey);
    if (!saved) return [];
    try {
      return JSON.parse(saved);
    } catch(e) {
      return [];
    }
  },

  // 切換勾選狀態
  toggleCheck: function(id) {
    let checked = this.getCheckedIds();
    if (checked.includes(id)) {
      checked = checked.filter(item => item !== id);
    } else {
      checked.push(id);
    }
    localStorage.setItem(this.stateKey, JSON.stringify(checked));
    return checked;
  },

  // 新增自訂提醒事項
  addCustomReminder: function(text) {
    if (!text || !text.trim()) return null;
    const items = this.getItems();
    const newItem = {
      id: 'custom-' + Date.now(),
      text: text.trim(),
      tag: '自訂習慣',
      co2Saved: 150
    };
    items.push(newItem);
    localStorage.setItem(this.storageKey, JSON.stringify(items));
    return newItem;
  },

  // 刪除提醒事項
  deleteReminder: function(id) {
    let items = this.getItems();
    items = items.filter(item => item.id !== id);
    localStorage.setItem(this.storageKey, JSON.stringify(items));

    // 同步清理已勾選狀態
    let checked = this.getCheckedIds().filter(itemId => itemId !== id);
    localStorage.setItem(this.stateKey, JSON.stringify(checked));
    return items;
  },

  // 重置回預設項目
  resetToDefault: function() {
    localStorage.setItem(this.storageKey, JSON.stringify(DEFAULT_REMINDERS));
    localStorage.removeItem(this.stateKey);
    return DEFAULT_REMINDERS;
  },

  // 計算統計數據
  calculateStats: function() {
    const items = this.getItems();
    const checked = this.getCheckedIds();
    const total = items.length;
    const completed = checked.length;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

    // 計算累計減碳量
    let totalCo2 = 0;
    items.forEach(item => {
      if (checked.includes(item.id)) {
        totalCo2 += (item.co2Saved || 150);
      }
    });

    // 依完成度評定樹木成長階段
    let stage = {
      name: '綠色萌芽生',
      emoji: '🌱',
      msg: '踏出第一步！勾選今日的環保行動吧！'
    };
    if (percentage >= 100) {
      stage = { name: '綠蔭守護神', emoji: '🌳', msg: '太棒了！今日環保行動全數達成，地球因你而美麗！' };
    } else if (percentage >= 60) {
      stage = { name: '綠意生長樹', emoji: '🪴', msg: '進展神速！你的好習慣正為環境帶來巨大改變！' };
    } else if (percentage >= 25) {
      stage = { name: '嫩綠小初芽', emoji: '🌿', msg: '維持動力！每一次小小選擇都能累積大綠能！' };
    }

    return {
      total,
      completed,
      percentage,
      totalCo2,
      stage
    };
  }
};
