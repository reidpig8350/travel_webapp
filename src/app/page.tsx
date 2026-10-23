'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Navigation, RefreshCw } from 'lucide-react';
import Header from '@/components/Header';
import ItinerarySection from '@/components/ItinerarySection';
import EditItineraryModal from '@/components/EditItineraryModal';
import AddItineraryModal from '@/components/AddItineraryModal';
import ExpenseModal from '@/components/ExpenseModal';
import ExpensesListModal from '@/components/ExpensesListModal';
import SheetSettingsModal from '@/components/SheetSettingsModal';
import FloatingActionButton from '@/components/FloatingActionButton';
import ShoppingModal from '@/components/ShoppingModal';
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

const ACTIVE_TRIP_STORAGE_KEY = 'euro_trip_active_tab';

export default function Home() {
  // 核心狀態
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [currentTrip, setCurrentTrip] = useState<string>('歐洲行_2026');
  const [availableTrips, setAvailableTrips] = useState<string[]>(['歐洲行_2026']);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [userCity, setUserCity] = useState<string>('定位中...');
  const [isLocating, setIsLocating] = useState<boolean>(true);
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
  const [isShoppingOpen, setIsShoppingOpen] = useState<boolean>(false);
  const [prefilledExpense, setPrefilledExpense] = useState<{ amount: string; currency: 'EUR' | 'CHF' }>({
    amount: '',
    currency: 'EUR',
  });

  // 行程篩選分頁狀態：'pending' (探索中) | 'completed' (已解鎖) | 'all' (全行程)
  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'all'>('pending');

  // 1. 取得使用者即時 GPS 定位
  const updateLocationAndCity = useCallback((lat: number, lng: number) => {
    setUserLocation({ lat, lng });
    fetch(`/api/geocode?lat=${lat}&lng=${lng}`)
      .then(res => res.json())
      .then(data => {
        if (data.locationName && data.locationName !== '歐洲旅遊足跡點') {
          setUserCity(data.locationName);
        } else {
          setUserCity(`GPS (${lat.toFixed(3)}, ${lng.toFixed(3)})`);
        }
      })
      .catch(() => {
        setUserCity(`GPS (${lat.toFixed(3)}, ${lng.toFixed(3)})`);
      })
      .finally(() => {
        setIsLocating(false);
      });
  }, []);

  const requestUserLocation = useCallback(() => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setUserLocation({ lat: 47.8095, lng: 13.055 });
      setUserCity('薩爾斯堡 (Salzburg)');
      setIsLocating(false);
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        updateLocationAndCity(pos.coords.latitude, pos.coords.longitude);
      },
      err => {
        console.warn('Geolocation access denied or unavailable:', err.message);
        setUserLocation({ lat: 47.8095, lng: 13.055 });
        setUserCity('薩爾斯堡 (未開啟GPS定位)');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [updateLocationAndCity]);

  useEffect(() => {
    requestUserLocation();

    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        pos => {
          updateLocationAndCity(pos.coords.latitude, pos.coords.longitude);
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 30000 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [requestUserLocation, updateLocationAndCity]);

  // 2. 載入行程資料（支援指定旅行分頁）
  const fetchItinerary = useCallback(async (tripParam?: string) => {
    try {
      const query = tripParam ? `?trip=${encodeURIComponent(tripParam)}` : '';
      const res = await fetch(`/api/itinerary${query}`);
      if (res.ok) {
        const data = await res.json();
        setItinerary(data.items || []);
        setIsGoogleConnected(data.source === 'google_sheets');
        if (data.currentTrip) {
          setCurrentTrip(data.currentTrip);
        }
        if (Array.isArray(data.availableTrips) && data.availableTrips.length > 0) {
          setAvailableTrips(data.availableTrips);
        }
      }
    } catch (err) {
      console.error('Failed to fetch itinerary:', err);
    }
  }, []);

  // 3. 載入記帳資料（支援指定旅行分頁）
  const fetchExpenses = useCallback(async (tripParam?: string) => {
    try {
      const query = tripParam ? `?trip=${encodeURIComponent(tripParam)}` : '';
      const res = await fetch(`/api/expenses${query}`);
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
      const savedTrip =
        typeof window !== 'undefined'
          ? window.localStorage.getItem(ACTIVE_TRIP_STORAGE_KEY) || undefined
          : undefined;
      await Promise.all([fetchItinerary(savedTrip), fetchExpenses(savedTrip), fetchRates()]);
      setIsLoading(false);
    }
    init();
  }, [fetchItinerary, fetchExpenses, fetchRates]);

  // 切換旅行分頁
  const handleSelectTrip = useCallback(
    async (nextTrip: string) => {
      if (!nextTrip) return;
      setCurrentTrip(nextTrip);
      setSelectedSpot(null);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(ACTIVE_TRIP_STORAGE_KEY, nextTrip);
      }
      setIsLoading(true);
      await Promise.all([fetchItinerary(nextTrip), fetchExpenses(nextTrip)]);
      setIsLoading(false);
    },
    [fetchItinerary, fetchExpenses]
  );

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
        body: JSON.stringify({ sourceIndex, destinationIndex, trip: currentTrip }),
      });
    } catch (err) {
      console.error('Failed to sync reorder to server:', err);
      // 失敗時重新獲取保證一致
      fetchItinerary(currentTrip);
    }
  };

  // 編輯行程點儲存
  const handleSaveItinerary = async (updated: ItineraryItem) => {
    const res = await fetch('/api/itinerary', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...updated, trip: currentTrip }),
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
        body: JSON.stringify({ ...updatedSpot, trip: currentTrip }),
      });
      if (!res.ok) throw new Error('更新完成狀態失敗');
    } catch (err) {
      console.error('Failed to toggle completion status:', err);
      fetchItinerary(currentTrip);
    }
  };

  // 新增行程點
  const handleAddItinerary = async (newItem: Omit<ItineraryItem, 'rowIndex'>) => {
    const res = await fetch('/api/itinerary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newItem, trip: currentTrip }),
    });
    if (!res.ok) throw new Error('新增失敗');
    const created = await res.json();
    setItinerary(prev => [...prev, created]);
  };

  // 刪除行程點（樂觀更新 + 後端持久化）
  const handleDeleteItinerary = async (spot: ItineraryItem) => {
    // 樂觀更新：從前端即時移除，並重新計算 rowIndex
    setItinerary(prev => {
      const remaining = prev.filter(item => item.rowIndex !== spot.rowIndex);
      return remaining.map((item, idx) => ({ ...item, rowIndex: idx + 2 }));
    });

    if (selectedSpot?.rowIndex === spot.rowIndex) {
      setSelectedSpot(null);
    }

    try {
      const res = await fetch('/api/itinerary', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rowIndex: spot.rowIndex, trip: currentTrip }),
      });
      if (!res.ok) throw new Error('刪除行程失敗');
    } catch (err) {
      console.error('Failed to delete itinerary spot:', err);
      fetchItinerary(currentTrip);
      alert('刪除行程失敗，已重新載入最新行程');
    }
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
        isLocating={isLocating}
        isGoogleConnected={isGoogleConnected}
        currentTrip={currentTrip}
        availableTrips={availableTrips}
        onSelectTrip={handleSelectTrip}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onRefreshLocation={requestUserLocation}
        onOpenExpensesList={() => setIsExpensesListOpen(true)}
        expenseCount={expenses.length}
      />

      {/* 主地圖區塊 */}
      <main className="max-w-6xl mx-auto px-4 w-full flex-1">
        <div className="mt-3">
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
            <p className="font-bold text-sm">正在載入「{currentTrip}」行程與記帳分頁...</p>
          </div>
        ) : (
          <ItinerarySection
            itinerary={itinerary}
            selectedSpot={selectedSpot}
            onSelectSpot={spot => setSelectedSpot(spot)}
            onEditSpot={spot => setEditingSpot(spot)}
            onReorder={handleReorder}
            onToggleComplete={handleToggleComplete}
            onDeleteSpot={handleDeleteItinerary}
            onOpenAddModal={() => setIsAddOpen(true)}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        )}
      </main>

      {/* 浮動十字操作按鈕 (內含：購物模式、記帳明細、新增踩點、即時記帳) */}
      <FloatingActionButton
        onOpenExpense={() => {
          setPrefilledExpense({ amount: '', currency: 'EUR' });
          setIsExpenseOpen(true);
        }}
        onOpenAddSpot={() => setIsAddOpen(true)}
        onOpenExpensesList={() => setIsExpensesListOpen(true)}
        onOpenShopping={() => setIsShoppingOpen(true)}
        expenseCount={expenses.length}
      />

      {/* 編輯行程 Modal */}
      <EditItineraryModal
        spot={editingSpot}
        isOpen={Boolean(editingSpot)}
        onClose={() => setEditingSpot(null)}
        onSave={handleSaveItinerary}
        onDelete={handleDeleteItinerary}
      />

      {/* 新增行程 Modal */}
      <AddItineraryModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAdd={handleAddItinerary}
      />

      {/* 購物模式 Modal (計算機 + 即時翻譯) */}
      <ShoppingModal
        isOpen={isShoppingOpen}
        onClose={() => setIsShoppingOpen(false)}
        rates={rates}
        onTransferToExpense={(amount, currency) => {
          setPrefilledExpense({ amount: amount.toString(), currency });
          setIsShoppingOpen(false);
          setIsExpenseOpen(true);
        }}
      />

      {/* 記帳 Modal */}
      <ExpenseModal
        isOpen={isExpenseOpen}
        onClose={() => {
          setIsExpenseOpen(false);
          setPrefilledExpense({ amount: '', currency: 'EUR' });
        }}
        userLocation={userLocation}
        rates={rates}
        currentTrip={currentTrip}
        initialAmount={prefilledExpense.amount}
        initialCurrency={prefilledExpense.currency}
        initialCategory={prefilledExpense.amount ? '購物' : '美食'}
        onExpenseAdded={handleExpenseAdded}
      />

      {/* 記帳明細列表 Modal */}
      <ExpensesListModal
        isOpen={isExpensesListOpen}
        onClose={() => setIsExpensesListOpen(false)}
        expenses={expenses}
      />

      {/* Google Sheets 連線設定與多旅行分頁管理 Modal */}
      <SheetSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        isGoogleConnected={isGoogleConnected}
        currentTrip={currentTrip}
        availableTrips={availableTrips}
        onSelectTrip={handleSelectTrip}
        onRefreshData={targetTrip => {
          const tripToFetch = targetTrip || currentTrip;
          fetchItinerary(tripToFetch);
          fetchExpenses(tripToFetch);
        }}
      />

      {/* 頁尾旅行小語 */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <p className="flex items-center justify-center gap-1.5 font-medium">
          <span>🥐 歐洲旅行萬用小手冊</span>
          <span>·</span>
          <span>Google Sheets 多旅行分頁雲端資料庫</span>
          <span>·</span>
          <span>Powered by GCP Cloud Run</span>
        </p>
      </footer>
    </div>
  );
}
