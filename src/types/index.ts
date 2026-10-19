export interface ItineraryItem {
  rowIndex: number; // 試算表實體列號 (從標題列後為 2 開始)
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  country: string;
  city: string;
  spot_name: string;
  category: '景點' | '美食' | '交通' | '住宿' | '購物' | string;
  lat: number;
  lng: number;
  ticket_status: string; // 未購 / 已購 / 免門票 / 需預約
  cost_estimate: number;
  notes: string;
  completed?: boolean; // 是否已完成 / 已解鎖
}

export interface ExpenseItem {
  rowIndex?: number;
  id: string;
  timestamp: string; // YYYY-MM-DD HH:mm:ss
  item: string;
  category: '美食' | '交通' | '門票' | '住宿' | '購物' | '其他' | string;
  amount_orig: number;
  currency: 'EUR' | 'CHF' | 'GBP' | 'TWD' | string;
  rate_to_twd: number;
  amount_twd: number;
  payment_type: 'Apple Pay' | '信用卡' | '現金' | string;
  lat: number | null;
  lng: number | null;
  location_name: string;
  notes: string;
  photo_url?: string;
}

export interface WeatherInfo {
  temperature: number;
  weatherCode: number;
  weatherText: string;
  weatherIcon: string;
  sunsetTime: string;
  sunsetMinutesLeft: number;
}

export interface ExchangeRates {
  EUR: number;
  CHF: number;
  GBP: number;
  TWD: number;
  updatedAt: string;
}
