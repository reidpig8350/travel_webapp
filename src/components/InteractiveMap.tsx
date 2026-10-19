'use client';

import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ItineraryItem, ExpenseItem } from '@/types';
import { Locate, Maximize2, Navigation } from 'lucide-react';

interface InteractiveMapProps {
  itinerary: ItineraryItem[];
  expenses: ExpenseItem[];
  userLocation: { lat: number; lng: number } | null;
  selectedSpot: ItineraryItem | null;
  onSelectSpot: (spot: ItineraryItem) => void;
  activeTab?: 'pending' | 'completed' | 'all';
}

// 景點分類對應 Emoji 與配色
function getCategoryMeta(category: string) {
  switch (category) {
    case '景點':
      return { emoji: '🏰', color: 'bg-indigo-500', border: 'border-indigo-600', text: 'text-indigo-600' };
    case '美食':
      return { emoji: '🥐', color: 'bg-amber-500', border: 'border-amber-600', text: 'text-amber-600' };
    case '交通':
      return { emoji: '🚆', color: 'bg-sky-500', border: 'border-sky-600', text: 'text-sky-600' };
    case '購物':
      return { emoji: '🛍️', color: 'bg-rose-500', border: 'border-rose-600', text: 'text-rose-600' };
    case '住宿':
      return { emoji: '🏨', color: 'bg-emerald-500', border: 'border-emerald-600', text: 'text-emerald-600' };
    default:
      return { emoji: '📍', color: 'bg-rose-500', border: 'border-rose-600', text: 'text-rose-600' };
  }
}

// 建立可愛自訂景點圖標 (DivIcon)
function createSpotIcon(category: string, number: number, isSelected: boolean, isCompleted: boolean = false) {
  const meta = getCategoryMeta(category);
  const size = isSelected ? 44 : 36;
  const ring = isSelected ? 'ring-4 ring-sky-400 scale-110 animate-bounce' : 'shadow-md';
  const bgColor = isCompleted ? 'bg-slate-400' : meta.color;
  const badgeHtml = isCompleted
    ? '<span class="absolute -top-1.5 -right-1.5 w-4 h-4 bg-emerald-500 rounded-full border border-white flex items-center justify-center text-[9px] text-white font-bold leading-none">✓</span>'
    : '';

  return L.divIcon({
    className: 'custom-spot-icon',
    html: `
      <div style="width:${size}px; height:${size}px;" class="relative flex items-center justify-center rounded-2xl ${bgColor} text-white font-black text-xs border-2 border-white ${ring} transition-all duration-300">
        <span class="text-sm mr-0.5">${meta.emoji}</span>
        <span class="text-[11px] font-bold">${number}</span>
        ${badgeHtml}
        <div class="absolute -bottom-1 w-2 h-2 ${bgColor} rotate-45 border-r-2 border-b-2 border-white"></div>
      </div>
    `,
    iconSize: [size, size + 4],
    iconAnchor: [size / 2, size + 4],
    popupAnchor: [0, -(size + 4)],
  });
}

// 建立使用者 GPS 定位圖標（帶脈衝動畫）
function createUserIcon() {
  return L.divIcon({
    className: 'custom-user-icon',
    html: `
      <div class="relative flex items-center justify-center w-8 h-8">
        <div class="absolute w-8 h-8 rounded-full bg-blue-500/30 animate-ping"></div>
        <div class="relative w-6 h-6 rounded-full bg-blue-600 border-3 border-white shadow-lg flex items-center justify-center text-white text-[10px]">
          🧭
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

// 建立記帳標記圖標
function createExpenseIcon() {
  return L.divIcon({
    className: 'custom-expense-icon',
    html: `
      <div class="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 border-2 border-white text-white text-[10px] shadow-sm">
        💶
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

// 地圖視角控制子元件
function MapController({
  userLocation,
  selectedSpot,
  itinerary,
}: {
  userLocation: { lat: number; lng: number } | null;
  selectedSpot: ItineraryItem | null;
  itinerary: ItineraryItem[];
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedSpot && selectedSpot.lat && selectedSpot.lng) {
      map.flyTo([selectedSpot.lat, selectedSpot.lng], 15, { duration: 1.2 });
    }
  }, [selectedSpot, map]);

  return null;
}

export default function InteractiveMap({
  itinerary,
  expenses,
  userLocation,
  selectedSpot,
  onSelectSpot,
  activeTab,
}: InteractiveMapProps) {
  const mapRef = useRef<L.Map | null>(null);

  // 整理有效經緯度的行程點
  const validSpots = itinerary.filter(s => s.lat && s.lng);
  const routePolyline: [number, number][] = validSpots.map(s => [s.lat, s.lng]);

  // 預設中心點（以行程第一個點或薩爾斯堡為中心）
  const defaultCenter: [number, number] =
    validSpots.length > 0 ? [validSpots[0].lat, validSpots[0].lng] : [47.8095, 13.055];

  // 當切換分頁時，自動將地圖視野縮放至該分頁包含的所有行程景點
  useEffect(() => {
    if (mapRef.current && validSpots.length > 0) {
      const bounds = L.latLngBounds(validSpots.map(s => [s.lat, s.lng]));
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [activeTab]);

  // 點擊「定位我的位置」
  const handleLocateMe = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.flyTo([userLocation.lat, userLocation.lng], 15, { duration: 1 });
    } else {
      alert('正在抓取 GPS 位置或未開啟瀏覽器定位權限');
    }
  };

  // 點擊「縮放至全景」
  const handleFitBounds = () => {
    if (!mapRef.current || validSpots.length === 0) return;
    const bounds = L.latLngBounds(validSpots.map(s => [s.lat, s.lng]));
    if (userLocation) {
      bounds.extend([userLocation.lat, userLocation.lng]);
    }
    mapRef.current.fitBounds(bounds, { padding: [50, 50] });
  };

  // CARTO 底圖 API Key（若有設定則帶上金鑰以移除浮水印）
  const cartoApiKey = process.env.NEXT_PUBLIC_CARTO_API_KEY?.trim();
  const tileUrl = cartoApiKey
    ? `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${cartoApiKey}`
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

  return (
    <div className="relative w-full h-[400px] sm:h-[480px] rounded-3xl overflow-hidden border border-slate-200 shadow-sm">
      <MapContainer
        center={defaultCenter}
        zoom={9}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
        ref={mapRef}
      >
        {/* 底圖圖層：採用 CartoDB Voyager，清爽文青旅遊風 */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://openstreetmap.org">OSM</a>'
          url={tileUrl}
        />

        <MapController
          userLocation={userLocation}
          selectedSpot={selectedSpot}
          itinerary={itinerary}
        />

        {/* 行程連線軌跡 (Polyline) */}
        {routePolyline.length > 1 && (
          <Polyline
            positions={routePolyline}
            pathOptions={{
              color: '#0284c7',
              weight: 4,
              dashArray: '8, 8',
              opacity: 0.85,
            }}
          />
        )}

        {/* 使用者當前 GPS 定位點 */}
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={createUserIcon()}>
            <Popup>
              <div className="p-1 text-center font-sans">
                <span className="text-sky-600 font-bold block text-xs">🧭 您的當前即時位置</span>
                <span className="text-[11px] text-gray-500">
                  {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                </span>
              </div>
            </Popup>
          </Marker>
        )}

        {/* 行程景點圖標 (Markers) */}
        {validSpots.map((spot, index) => {
          const isSelected = selectedSpot?.spot_name === spot.spot_name;
          const meta = getCategoryMeta(spot.category);
          const mapsUrl =
            spot.lat && spot.lng && (spot.lat !== 0 || spot.lng !== 0)
              ? `https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}`
              : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${spot.city} ${spot.spot_name}`)}`;

          return (
            <Marker
              key={`${spot.spot_name}-${index}`}
              position={[spot.lat, spot.lng]}
              icon={createSpotIcon(spot.category, index + 1, isSelected, Boolean(spot.completed))}
              eventHandlers={{
                click: () => onSelectSpot(spot),
              }}
            >
              <Popup>
                <div className="p-1.5 max-w-[220px] font-sans">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold text-white ${meta.color}`}>
                      {spot.category}
                    </span>
                    <span className="text-[10px] text-gray-500 font-medium">
                      {spot.time || spot.date}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-gray-900 leading-tight">
                    {index + 1}. {spot.spot_name}
                  </h4>
                  <p className="text-[11px] text-gray-600 mt-1 line-clamp-2">
                    {spot.notes || '點擊卡片查看詳細備註與編輯'}
                  </p>
                  <div className="mt-2 pt-1 border-t border-gray-100 flex items-center justify-between text-[11px] gap-2">
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-sky-600 hover:text-sky-800 font-bold bg-sky-50 px-2 py-1 rounded-md border border-sky-200 inline-flex items-center gap-1"
                    >
                      🧭 導航
                    </a>
                    <button
                      onClick={() => onSelectSpot(spot)}
                      className="text-sky-600 hover:text-sky-700 font-bold"
                    >
                      查看詳細 ➔
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* 記帳地點圖標 (Expenses) */}
        {expenses
          .filter(e => e.lat && e.lng)
          .map(expense => (
            <Marker
              key={expense.id}
              position={[expense.lat!, expense.lng!]}
              icon={createExpenseIcon()}
            >
              <Popup>
                <div className="p-1 font-sans text-xs">
                  <span className="font-bold text-emerald-700 block">💶 記帳: {expense.item}</span>
                  <span className="text-gray-800 font-semibold">
                    {expense.amount_orig} {expense.currency} (NT$ {expense.amount_twd})
                  </span>
                  <span className="text-[10px] text-gray-400 block mt-0.5">
                    {expense.timestamp} · {expense.location_name}
                  </span>
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>

      {/* 浮動地圖快捷控制按鈕 */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <button
          onClick={handleLocateMe}
          className="p-2.5 rounded-2xl bg-white/95 text-sky-600 hover:bg-white active:scale-95 shadow-sm border border-slate-200 cursor-pointer transition-all flex items-center justify-center"
          title="定位我的當前位置"
        >
          <Locate className="w-5 h-5" />
        </button>

        <button
          onClick={handleFitBounds}
          className="p-2.5 rounded-2xl bg-white/95 text-slate-700 hover:bg-white active:scale-95 shadow-sm border border-slate-200 cursor-pointer transition-all flex items-center justify-center"
          title="縮放至歐洲全景"
        >
          <Maximize2 className="w-5 h-5" />
        </button>
      </div>

      {/* 左下角：行程天數與景點統計小標籤 */}
      <div className="absolute bottom-3 left-3 z-10 bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-2xl border border-slate-200 text-[11px] font-semibold text-slate-700 shadow-sm flex items-center gap-2">
        <Navigation className="w-3.5 h-3.5 text-sky-500" />
        <span>
          {activeTab === 'pending'
            ? `🥐 探索中：${validSpots.length} 個景點`
            : activeTab === 'completed'
            ? `🏷️ 已解鎖：${validSpots.length} 個景點`
            : `🗺️ 全行程：${validSpots.length} 個景點`}
        </span>
        <span className="text-slate-300">|</span>
        <span className="text-emerald-700">{expenses.length} 筆定位記帳</span>
      </div>
    </div>
  );
}
