'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Plus, Navigation, RefreshCw } from 'lucide-react';
import Header from '@/components/Header';
import BudgetCroissantBar from '@/components/BudgetCroissantBar';
import ItinerarySection from '@/components/ItinerarySection';
import EditItineraryModal from '@/components/EditItineraryModal';
import AddItineraryModal from '@/components/AddItineraryModal';
import ExpenseModal from '@/components/ExpenseModal';
import ExpensesListModal from '@/components/ExpensesListModal';
import SheetSettingsModal from '@/components/SheetSettingsModal';
import FloatingActionButton from '@/components/FloatingActionButton';
import { ItineraryItem, ExpenseItem, WeatherInfo, ExchangeRates } from '@/types';

// 動態載入 Leaflet 地圖，防止 SSR Hydration 錯誤
const InteractiveMap = dynamic(() => import('@/components/InteractiveMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] sm:h-[480px] rounded-3xl bg-slate-50 flex flex-col items-center justify-center text-slate-600 animate-pulse border border-slate-200">
      <Navigation className="w-8 h-8 animate-spin-slow mb-2 text-sky-500" />
      <span className="font-bold text-sm">正在載入阿爾卑斯浪漫地圖...</span>
    </div>
  ),
});

export default function Home() {
  // 核心狀態
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [userCity, setUserCity] = useState<string>('瑞士/奧地利');
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [rates, setRates] = useState<ExchangeRates>({
    EUR: 35.2,
    CHF: 36.8,
    GBP: 41.5,
    TWD: 1,
    updatedAt: '',
  });
  const [isGoogleConnected, setIsGoogleConnected] = useState<boolean>(false);
  const [selectedSpot, setSelectedSpot] = useState<ItineraryItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 彈跳視窗開關
  const [editingSpot, setEditingSpot] = useState<ItineraryItem | null>(null);
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [isExpenseOpen, setIsExpenseOpen] = useState<boolean>(false);
  const [isExpensesListOpen, setIsExpensesListOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // 行程篩選分頁狀態：'pending' (探索中) | 'completed' (已解鎖) | 'all' (全行程)
  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'all'>('pending');

  // 1. 取得使用者即時 GPS 定位
  useEffect(() => {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(loc);

          // 透過反向地理編碼取得地名
          fetch(`/api/geocode?lat=${loc.lat}&lng=${loc.lng}`)
            .then(res => res.json())
            .then(data => {
              if (data.locationName && data.locationName !== '歐洲旅遊足跡點') {
                setUserCity(data.locationName);
              }
            })
            .catch(() => {});
        },
        err => {
          console.warn('Geolocation access denied or unavailable:', err.message);
          // 預設為薩爾斯堡中心
          setUserLocation({ lat: 47.8095, lng: 13.055 });
          setUserCity('薩爾斯堡 (Salzburg)');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  // 2. 載入行程資料
  const fetchItinerary = useCallback(async () => {
    try {
      const res = await fetch('/api/itinerary');
      if (res.ok) {
        const data = await res.json();
        setItinerary(data.items || []);
        setIsGoogleConnected(data.source === 'google_sheets');
      }
    } catch (err) {
      console.error('Failed to fetch itinerary:', err);
    }
  }, []);

  // 3. 載入記帳資料
  const fetchExpenses = useCallback(async () => {
    try {
      const res = await fetch('/api/expenses');
      if (res.ok) {
        const data = await res.json();
        setExpenses(data.items || []);
      }
    } catch (err) {
      console.error('Failed to fetch expenses:', err);
    }
  }, []);

  // 4. 載入匯率
  const fetchRates = useCallback(async () => {
    try {
      const res = await fetch('/api/rates');
      if (res.ok) {
        const data = await res.json();
        setRates(data);
      }
    } catch (err) {
      console.error('Failed to fetch rates:', err);
    }
  }, []);

  // 5. 載入天氣
  const fetchWeather = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch(`/api/weather?lat=${lat}&lng=${lng}`);
      if (res.ok) {
        const data = await res.json();
        setWeather(data);
      }
    } catch (err) {
      console.error('Failed to fetch weather:', err);
    }
  }, []);

  // 初始化資料載入
  useEffect(() => {
    async function init() {
      setIsLoading(true);
      await Promise.all([fetchItinerary(), fetchExpenses(), fetchRates()]);
      setIsLoading(false);
    }
    init();
  }, [fetchItinerary, fetchExpenses, fetchRates]);

  // 當取得使用者位置或行程首站時，載入對應天氣
  useEffect(() => {
    if (userLocation) {
      fetchWeather(userLocation.lat, userLocation.lng);
    } else if (itinerary.length > 0 && itinerary[0].lat) {
      fetchWeather(itinerary[0].lat, itinerary[0].lng);
    }
  }, [userLocation, itinerary, fetchWeather]);

  // 拖拉排序（樂觀更新 + 後端同步）
  const handleReorder = async (sourceIndex: number, destinationIndex: number) => {
    const nextList = [...itinerary];
    const [moved] = nextList.splice(sourceIndex, 1);
    nextList.splice(destinationIndex, 0, moved);
    setItinerary(nextList);

    try {
      await fetch('/api/itinerary/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceIndex, destinationIndex }),
      });
    } catch (err) {
      console.error('Failed to sync reorder to server:', err);
      // 失敗時重新獲取保證一致
      fetchItinerary();
    }
  };

  // 編輯行程點儲存
  const handleSaveItinerary = async (updated: ItineraryItem) => {
    const res = await fetch('/api/itinerary', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    if (!res.ok) throw new Error('儲存失敗');

    setItinerary(prev =>
      prev.map(item => (item.rowIndex === updated.rowIndex ? updated : item))
    );
  };

  // 切換行程完成/已解鎖狀態（樂觀更新 + 後端持久化）
  const handleToggleComplete = async (spot: ItineraryItem) => {
    const nextCompleted = !spot.completed;
    const updatedSpot = { ...spot, completed: nextCompleted };

    // 樂觀更新
    setItinerary(prev =>
      prev.map(item => (item.rowIndex === spot.rowIndex ? updatedSpot : item))
    );

    try {
      const res = await fetch('/api/itinerary', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSpot),
      });
      if (!res.ok) throw new Error('更新完成狀態失敗');
    } catch (err) {
      console.error('Failed to toggle completion status:', err);
      fetchItinerary();
    }
  };

  // 新增行程點
  const handleAddItinerary = async (newItem: Omit<ItineraryItem, 'rowIndex'>) => {
    const res = await fetch('/api/itinerary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem),
    });
    if (!res.ok) throw new Error('新增失敗');
    const created = await res.json();
    setItinerary(prev => [...prev, created]);
  };

  // 記帳完成回呼
  const handleExpenseAdded = (newExp: ExpenseItem) => {
    setExpenses(prev => [newExp, ...prev]);
  };

  // 依據當前分頁篩選在地圖上顯示的行程點
  const displayedItinerary =
    activeTab === 'pending'
      ? itinerary.filter(item => !item.completed)
      : activeTab === 'completed'
      ? itinerary.filter(item => item.completed)
      : itinerary;

  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col font-sans selection:bg-sky-100 selection:text-sky-900">
      {/* 頂部導覽 */}
      <Header
        weather={weather}
        userCity={userCity}
        isGoogleConnected={isGoogleConnected}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenExpensesList={() => setIsExpensesListOpen(true)}
        expenseCount={expenses.length}
      />

      {/* 當日預算晴雨表與即時匯率小工具 */}
      <BudgetCroissantBar expenses={expenses} rates={rates} />

      {/* 主地圖區塊 */}
      <main className="max-w-6xl mx-auto px-4 w-full flex-1">
        <div className="mt-2">
          <InteractiveMap
            itinerary={displayedItinerary}
            expenses={expenses}
            userLocation={userLocation}
            selectedSpot={selectedSpot}
            onSelectSpot={spot => setSelectedSpot(spot)}
            activeTab={activeTab}
          />
        </div>

        {/* 行程列表與拖拉區塊 */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin text-sky-500 mb-3" />
            <p className="font-bold text-sm">正在整理三天歐洲精美行程與試算表...</p>
          </div>
        ) : (
          <ItinerarySection
            itinerary={itinerary}
            selectedSpot={selectedSpot}
            onSelectSpot={spot => setSelectedSpot(spot)}
            onEditSpot={spot => setEditingSpot(spot)}
            onReorder={handleReorder}
            onToggleComplete={handleToggleComplete}
            onOpenAddModal={() => setIsAddOpen(true)}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        )}
      </main>

      {/* 浮動十字操作按鈕 (內含：記帳明細、新增踩點、即時記帳) */}
      <FloatingActionButton
        onOpenExpense={() => setIsExpenseOpen(true)}
        onOpenAddSpot={() => setIsAddOpen(true)}
        onOpenExpensesList={() => setIsExpensesListOpen(true)}
        expenseCount={expenses.length}
      />

      {/* 編輯行程 Modal */}
      <EditItineraryModal
        spot={editingSpot}
        isOpen={Boolean(editingSpot)}
        onClose={() => setEditingSpot(null)}
        onSave={handleSaveItinerary}
      />

      {/* 新增行程 Modal */}
      <AddItineraryModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAdd={handleAddItinerary}
      />

      {/* 記帳 Modal */}
      <ExpenseModal
        isOpen={isExpenseOpen}
        onClose={() => setIsExpenseOpen(false)}
        userLocation={userLocation}
        rates={rates}
        onExpenseAdded={handleExpenseAdded}
      />

      {/* 記帳明細列表 Modal */}
      <ExpensesListModal
        isOpen={isExpensesListOpen}
        onClose={() => setIsExpensesListOpen(false)}
        expenses={expenses}
      />

      {/* Google Sheets 連線設定 Modal */}
      <SheetSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        isGoogleConnected={isGoogleConnected}
        onRefreshData={fetchItinerary}
      />

      {/* 頁尾旅行小語 */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <p className="flex items-center justify-center gap-1.5 font-medium">
          <span>🥐 歐洲旅行萬用小手冊</span>
          <span>·</span>
          <span>Google Sheets 雲端無伺服器資料庫</span>
          <span>·</span>
          <span>Powered by GCP Cloud Run</span>
        </p>
      </footer>
    </div>
  );
}
