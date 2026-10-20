/**
 * 應用程式全域設定 (Application Global Configuration)
 * 集中管理系統各模組的預設常數與互動參數，利於日後調整與維護擴充。
 */
export const appConfig = {
  /**
   * UI 介面與互動微體驗設定
   */
  ui: {
    /**
     * 卡片長按觸發編輯視窗的時間（毫秒）
     * 預設 500ms (0.5 秒)
     */
    cardLongPressDurationMs: 500,

    /**
     * 長按判定時，手指或滑鼠移動超過此距離（px）視為捲動頁面而取消長按
     */
    longPressMoveCancelThresholdPx: 10,
  },

  /**
   * 地圖與導航相關預設設定（保留未來擴充）
   */
  map: {
    defaultCenter: {
      lat: 47.8095,
      lng: 13.055, // 薩爾斯堡中心
    },
    defaultZoom: 13,
  },

  /**
   * 行程資料相關設定（保留未來擴充）
   */
  itinerary: {
    defaultCategory: '景點',
  },
} as const;

export type AppConfig = typeof appConfig;
