'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Database, Settings, Calendar, ChevronDown } from 'lucide-react';
import { WeatherInfo } from '@/types';

interface HeaderProps {
  weather: WeatherInfo | null;
  userCity: string;
  isLocating?: boolean;
  isGoogleConnected: boolean;
  currentTrip: string;
  availableTrips: string[];
  onSelectTrip: (trip: string) => void;
  onOpenSettings: () => void;
  onRefreshLocation?: () => void;
  onOpenExpensesList?: () => void;
  expenseCount?: number;
}

export default function Header({
  weather,
  userCity,
  isLocating = false,
  isGoogleConnected,
  currentTrip,
  availableTrips,
  onSelectTrip,
  onOpenSettings,
  onRefreshLocation,
}: HeaderProps) {
  const [taipeiTime, setTaipeiTime] = useState<string>('');
  const [currentDateStr, setCurrentDateStr] = useState<string>('');

  useEffect(() => {
    const updateClocks = () => {
      const now = new Date();

      // 台北時間：24小時制 (HH:mm)，仿手機狀態列
      const tpeStr = new Intl.DateTimeFormat('zh-TW', {
        timeZone: 'Asia/Taipei',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(now);
      setTaipeiTime(tpeStr);

      // 當前日期顯示 (例如：10月22日 週四)
      const dateFormatted = new Intl.DateTimeFormat('zh-TW', {
        month: 'numeric',
        day: 'numeric',
        weekday: 'short',
      }).format(now);
      setCurrentDateStr(dateFormatted);
    };

    updateClocks();
    const timer = setInterval(updateClocks, 1000);
    return () => clearInterval(timer);
  }, []);

  const tripList = availableTrips.length > 0 ? availableTrips : [currentTrip || '歐洲行_2026'];

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-100 px-4 py-2.5 shadow-xs">
      <div className="max-w-6xl mx-auto flex flex-col gap-2">
        {/* 第一排：左側品牌 Logo + 旅行分頁切換器 + 右上角台北時間與連線設定 */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center text-base sm:text-lg shadow-xs text-sky-600 shrink-0">
              ✈️
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 font-sans shrink-0">
              EuroTrip
            </h1>

            {/* 旅行（Google Sheet 分頁）切換選單 */}
            <div className="relative flex items-center min-w-0">
              <select
                value={currentTrip}
                onChange={e => {
                  if (e.target.value === '__MANAGE_TRIPS__') {
                    onOpenSettings();
                  } else {
                    onSelectTrip(e.target.value);
                  }
                }}
                aria-label="切換旅行分頁"
                title="切換不同的 Google Sheet 旅行分頁"
                className="appearance-none pl-2.5 pr-6 py-1 rounded-xl bg-sky-50/80 hover:bg-sky-100/80 border border-sky-200 text-sky-900 font-bold text-xs cursor-pointer transition-colors truncate max-w-[140px] sm:max-w-[200px] focus:outline-none focus:ring-2 focus:ring-sky-300"
              >
                {tripList.map(trip => (
                  <option key={trip} value={trip}>
                    🗂️ {trip}
                  </option>
                ))}
                <option value="__MANAGE_TRIPS__">➕ 新增 / 管理旅行分頁...</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-sky-600 pointer-events-none absolute right-2" />
            </div>
          </div>

          {/* 右上角：手機狀態列風格 24h 台北時間 + Google Sheets 設定 */}
          <div className="flex items-center gap-2 shrink-0">
            {taipeiTime && (
              <div
                className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100/90 border border-slate-200/70 text-slate-700 text-[11px] leading-tight select-none"
                title="台北標準時間 (UTC+8, 24小時制)"
              >
                <span className="text-[10px] text-slate-500 font-medium">台北</span>
                <span className="font-mono font-semibold text-slate-900 tracking-tight">
                  {taipeiTime}
                </span>
              </div>
            )}

            <button
              onClick={onOpenSettings}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                isGoogleConnected
                  ? 'bg-sky-50/80 border-sky-200 text-sky-800 hover:bg-sky-100'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
              title="Google Sheet 同步與旅行分頁設定"
            >
              <Database className="w-3.5 h-3.5 text-sky-600" />
              <span className="hidden md:inline">
                {isGoogleConnected ? 'Google Sheets' : '示範模式'}
              </span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isGoogleConnected ? 'bg-sky-500 animate-pulse' : 'bg-slate-400'
                }`}
              />
              <Settings className="w-3 h-3 text-slate-400" />
            </button>
          </div>
        </div>

        {/* 第二排：即時 GPS 地理位置 + 日期與日落時間資訊列 */}
        <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2 text-xs">
          {/* 目前 GPS 城市 / 定位資訊 */}
          <button
            type="button"
            onClick={onRefreshLocation}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50/90 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors cursor-pointer active:scale-95"
            title="點擊重新抓取當前 GPS 位置"
          >
            <MapPin
              className={`w-3.5 h-3.5 text-sky-500 shrink-0 ${
                isLocating ? 'animate-bounce' : ''
              }`}
            />
            <span className="font-medium max-w-[180px] sm:max-w-[240px] truncate">
              {isLocating ? '正在抓取 GPS 位置...' : userCity || '定位中...'}
            </span>
          </button>

          {/* 日期、天氣與日落時間卡 */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-sky-50/60 border border-sky-200 text-slate-800">
            {currentDateStr && (
              <>
                <span className="flex items-center gap-1 text-slate-700 font-medium">
                  <Calendar className="w-3 h-3 text-sky-600" />
                  {currentDateStr}
                </span>
                <span className="text-slate-300">|</span>
              </>
            )}

            {weather ? (
              <>
                <span className="text-sm leading-none">{weather.weatherIcon}</span>
                <span className="font-semibold text-sky-900">{weather.temperature}°C</span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-600 font-medium">日落 {weather.sunsetTime}</span>
                {weather.sunsetMinutesLeft > 0 && (
                  <span className="hidden xs:inline-block px-1.5 py-0.5 rounded bg-sky-100 text-[10px] text-sky-700 font-medium">
                    餘 {Math.floor(weather.sunsetMinutesLeft / 60)}h{weather.sunsetMinutesLeft % 60}m
                  </span>
                )}
              </>
            ) : (
              <span className="text-slate-500">載入日落與天氣...</span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
