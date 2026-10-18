'use client';

import React from 'react';
import { MapPin, Database, Settings } from 'lucide-react';
import { WeatherInfo } from '@/types';

interface HeaderProps {
  weather: WeatherInfo | null;
  userCity: string;
  isGoogleConnected: boolean;
  onOpenSettings: () => void;
  onOpenExpensesList?: () => void;
  expenseCount?: number;
}

export default function Header({
  weather,
  userCity,
  isGoogleConnected,
  onOpenSettings,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-100 px-4 py-3 shadow-xs">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* 左側：品牌 Logo 與標題 */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center text-lg shadow-xs text-sky-600">
            ✈️
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 font-sans">
              EuroTrip
            </h1>
          </div>
        </div>

        {/* 右側：即時位置與天氣卡片 + 功能鈕 */}
        <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
          {/* 目前城市 / 定位資訊 */}
          {userCity && userCity !== '歐洲旅遊足跡點' && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50/80 border border-slate-200 text-slate-700">
              <MapPin className="w-3.5 h-3.5 text-sky-500" />
              <span className="font-medium max-w-[140px] truncate">{userCity}</span>
            </div>
          )}

          {/* 天氣與日落倒數卡 */}
          {weather && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-sky-50/60 border border-sky-200 text-slate-800">
              <span className="text-base">{weather.weatherIcon}</span>
              <span className="font-semibold text-sky-900">{weather.temperature}°C</span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-600 font-medium">日落 {weather.sunsetTime}</span>
              {weather.sunsetMinutesLeft > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-sky-100 text-[10px] text-sky-700 font-medium">
                  餘 {Math.floor(weather.sunsetMinutesLeft / 60)}h{weather.sunsetMinutesLeft % 60}m
                </span>
              )}
            </div>
          )}

          {/* Google Sheets 連線狀態與設定鈕 */}
          <button
            onClick={onOpenSettings}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border font-medium transition-all cursor-pointer ${
              isGoogleConnected
                ? 'bg-sky-50/80 border-sky-200 text-sky-800 hover:bg-sky-100'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
            title="Google Sheet 同步設定"
          >
            <Database className="w-3.5 h-3.5 text-sky-600" />
            <span className="hidden md:inline">
              {isGoogleConnected ? 'Google Sheets' : '示範模式'}
            </span>
            <span
              className={`w-2 h-2 rounded-full ${
                isGoogleConnected ? 'bg-sky-500 animate-pulse' : 'bg-slate-400'
              }`}
            />
            <Settings className="w-3 h-3 text-slate-400 ml-0.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
