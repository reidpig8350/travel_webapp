'use client';

import React, { useState, useRef, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { GripVertical, Clock, MapPin, Ticket, Sparkles, Check, Navigation, CheckCircle2 } from 'lucide-react';
import { ItineraryItem } from '@/types';

interface ItinerarySectionProps {
  itinerary: ItineraryItem[];
  selectedSpot: ItineraryItem | null;
  onSelectSpot: (spot: ItineraryItem) => void;
  onEditSpot: (spot: ItineraryItem) => void;
  onReorder: (sourceIndex: number, destinationIndex: number) => void;
  onOpenAddModal?: () => void;
  onToggleComplete: (spot: ItineraryItem) => void;
  activeTab?: 'pending' | 'completed' | 'all';
  onTabChange?: (tab: 'pending' | 'completed' | 'all') => void;
}

// 分類小標籤色彩
function getCategoryBadge(category: string) {
  switch (category) {
    case '景點':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case '美食':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case '交通':
      return 'bg-sky-50 text-sky-700 border-sky-200';
    case '購物':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case '住宿':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
}

export default function ItinerarySection({
  itinerary,
  selectedSpot,
  onSelectSpot,
  onEditSpot,
  onReorder,
  onOpenAddModal,
  onToggleComplete,
  activeTab: controlledActiveTab,
  onTabChange,
}: ItinerarySectionProps) {
  // 分頁狀態：支援外部控制（controlled）或內部狀態
  const [internalTab, setInternalTab] = useState<'pending' | 'completed' | 'all'>('pending');
  const activeTab = controlledActiveTab ?? internalTab;
  const setActiveTab = onTabChange ?? setInternalTab;

  const pendingItems = itinerary.filter(item => !item.completed);
  const completedItems = itinerary.filter(item => item.completed);

  // 依當前分頁過濾
  const filteredList =
    activeTab === 'pending'
      ? pendingItems
      : activeTab === 'completed'
      ? completedItems
      : itinerary;

  // 0.5 秒長按編輯狀態管理
  const [pressingItemKey, setPressingItemKey] = useState<string | null>(null);
  const [isPressFilled, setIsPressFilled] = useState<boolean>(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const isLongPressTriggeredRef = useRef<boolean>(false);

  // 清除長按計時與動畫
  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setPressingItemKey(null);
    setIsPressFilled(false);
    touchStartPosRef.current = null;
  };

  // 組件卸載時清除計時器
  useEffect(() => {
    return () => {
      cancelLongPress();
    };
  }, []);

  // 按下卡片（桌面滑鼠點擊或觸控按住）
  const handlePointerDown = (item: ItineraryItem, itemKey: string, e: React.PointerEvent) => {
    // 僅響應滑鼠主鍵 (button === 0) 或觸控
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    cancelLongPress();
    isLongPressTriggeredRef.current = false;
    touchStartPosRef.current = { x: e.clientX, y: e.clientY };
    setPressingItemKey(itemKey);
    setIsPressFilled(false);

    // 下一影格觸發 scaleX(1) 啟動 0.5s 平滑過渡動畫
    animFrameRef.current = requestAnimationFrame(() => {
      setIsPressFilled(true);
    });

    // 0.5 秒（500ms）後觸發編輯視窗
    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      cancelLongPress();
      onSelectSpot(item);
      onEditSpot(item);
    }, 500);
  };

  // 滑動或移出卡片時取消長按（防捲動誤觸）
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!touchStartPosRef.current) return;
    const deltaX = Math.abs(e.clientX - touchStartPosRef.current.x);
    const deltaY = Math.abs(e.clientY - touchStartPosRef.current.y);
    // 移動超過 10px 視為使用者正在捲動頁面
    if (deltaX > 10 || deltaY > 10) {
      cancelLongPress();
    }
  };

  // 放開卡片：未滿 0.5s 視為單擊（聚焦景點 + 地圖移動）
  const handlePointerUp = (item: ItineraryItem) => {
    if (!isLongPressTriggeredRef.current && touchStartPosRef.current) {
      // 屬於單擊聚焦
      onSelectSpot(item);
    }
    cancelLongPress();
  };

  // 拖拉排序（映射回原陣列索引）
  const handleDragEnd = (result: DropResult) => {
    cancelLongPress();
    if (!result.destination) return;
    if (result.destination.index === result.source.index) return;

    const sourceItem = filteredList[result.source.index];
    const destItem = filteredList[result.destination.index];

    if (!sourceItem || !destItem) return;

    const sourceOriginalIndex = itinerary.findIndex(i => i.rowIndex === sourceItem.rowIndex);
    const destOriginalIndex = itinerary.findIndex(i => i.rowIndex === destItem.rowIndex);

    if (sourceOriginalIndex !== -1 && destOriginalIndex !== -1) {
      onReorder(sourceOriginalIndex, destOriginalIndex);
    }
  };

  // 開啟 Google Maps 路線導航
  const handleOpenGoogleMaps = (e: React.MouseEvent, item: ItineraryItem) => {
    e.stopPropagation();
    let url = '';
    if (item.lat && item.lng && (item.lat !== 0 || item.lng !== 0)) {
      url = `https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}`;
    } else {
      url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${item.city} ${item.spot_name}`)}`;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // 取得不重複的日期清單，用來顯示分日天數標題（Day 1, Day 2...）
  const uniqueDates = Array.from(new Set(itinerary.map(item => item.date).filter(Boolean)));
  const dateToDayIndex = new Map(uniqueDates.map((date, idx) => [date, idx + 1]));

  return (
    <div className="max-w-6xl mx-auto px-4 mt-6 mb-16">
      {/* 分頁標籤切換列 */}
      <div className="flex items-center justify-between gap-3 mb-4 pb-2 border-b border-slate-100 flex-wrap">
        <div className="inline-flex p-1 bg-slate-100/90 rounded-2xl gap-1">
          {/* 探索中 Exploring */}
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Exploring</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                activeTab === 'pending'
                  ? 'bg-sky-100 text-sky-700'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {pendingItems.length}
            </span>
          </button>

          {/* 已解鎖 Collected */}
          <button
            type="button"
            onClick={() => setActiveTab('completed')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'completed'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Collected</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                activeTab === 'completed'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {completedItems.length}
            </span>
          </button>

          {/* 全行程 All */}
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'all'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>All</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                activeTab === 'all'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {itinerary.length}
            </span>
          </button>
        </div>

        {/* 提示小字 */}
        <div className="text-xs text-slate-500 flex items-center gap-2">
          <span>💡 單擊聚焦地圖 · 長按 0.5 秒開啟編輯</span>
          {activeTab === 'completed' && <span className="hidden sm:inline">· ✨ 可隨時取消勾選重返探索</span>}
        </div>
      </div>

      {/* 空狀態顯示 */}
      {filteredList.length === 0 && (
        <div className="py-16 text-center bg-slate-50/60 rounded-3xl border border-dashed border-slate-200 my-4">
          {activeTab === 'pending' ? (
            <div className="flex flex-col items-center">
              <span className="text-4xl mb-2">🎉</span>
              <h4 className="font-bold text-slate-800 text-sm">太棒了！所有行程皆已全部解鎖探索完畢！</h4>
              <p className="text-xs text-slate-600 mt-1">
                您可以切換至「🏷️ 已解鎖 Collected」回味足跡，或使用右下角「+」按鈕新增景點。
              </p>
            </div>
          ) : activeTab === 'completed' ? (
            <div className="flex flex-col items-center">
              <span className="text-4xl mb-2">🏷️</span>
              <h4 className="font-bold text-slate-800 text-sm">尚未有已解鎖的行程</h4>
              <p className="text-xs text-slate-600 mt-1">
                出發踩點跑完行程後，點擊卡片左側打勾方塊，即可收服至此處。
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <span className="text-4xl mb-2">🗺️</span>
              <h4 className="font-bold text-slate-800 text-sm">目前尚無任何行程</h4>
              <p className="text-xs text-slate-600 mt-1">
                點擊右下角按鈕新增行程，開始您的歐洲漫遊！
              </p>
            </div>
          )}
          {onOpenAddModal && (
            <button
              type="button"
              onClick={onOpenAddModal}
              className="mt-3 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-2xs"
            >
              + 新增景點行程
            </button>
          )}
        </div>
      )}

      {/* 拖拉排序容器 */}
      {filteredList.length > 0 && (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="itinerary-list">
            {provided => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-3"
              >
                {filteredList.map((item, index) => {
                  const itemKey = `item-${item.rowIndex}-${index}`;
                  const isSelected = selectedSpot?.spot_name === item.spot_name;
                  const dayNum = dateToDayIndex.get(item.date) || 1;
                  const isFirstOfDay =
                    index === 0 || filteredList[index - 1].date !== item.date;
                  const isDone = Boolean(item.completed);

                  return (
                    <React.Fragment key={`${item.spot_name}-${item.rowIndex}-${index}`}>
                      {/* 若為當天第一個行程，插入天數小標題 */}
                      {isFirstOfDay && (
                        <div className="pt-3 pb-1 flex items-center gap-2">
                          <div className="px-3 py-1 rounded-xl bg-sky-50 text-sky-800 font-bold text-xs border border-sky-200 flex items-center gap-1.5 shadow-2xs">
                            <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                            <span>Day {dayNum} · {item.date}</span>
                          </div>
                          <span className="text-xs font-semibold text-slate-600">
                            {item.country} · {item.city}
                          </span>
                          <div className="flex-1 h-px bg-slate-200 ml-2" />
                        </div>
                      )}

                      <Draggable
                        draggableId={`item-${item.rowIndex}`}
                        index={index}
                      >
                        {(dragProvided, dragSnapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            onPointerDown={e => handlePointerDown(item, itemKey, e)}
                            onPointerMove={handlePointerMove}
                            onPointerUp={() => handlePointerUp(item)}
                            onPointerCancel={cancelLongPress}
                            onPointerLeave={cancelLongPress}
                            className={`group relative rounded-2xl border transition-all duration-200 flex items-center gap-2.5 sm:gap-3 p-3 sm:p-3.5 cursor-pointer overflow-hidden select-none ${
                              dragSnapshot.isDragging
                                ? 'bg-sky-50 border-sky-400 shadow-lg scale-[1.02] z-30'
                                : isDone
                                ? 'bg-slate-50/90 border-slate-200 text-slate-500 hover:bg-slate-100/80 shadow-2xs'
                                : isSelected
                                ? 'bg-sky-50/60 border-sky-400 ring-2 ring-sky-200 shadow-sm'
                                : 'bg-white border-slate-200 hover:border-sky-300 hover:shadow-xs'
                            }`}
                          >
                            {/* 長按 0.5 秒從左往右平滑填滿的淺藍色背景動畫 */}
                            {pressingItemKey === itemKey && (
                              <div
                                className="absolute inset-0 bg-sky-200/50 pointer-events-none origin-left transition-transform ease-linear"
                                style={{
                                  transform: isPressFilled ? 'scaleX(1)' : 'scaleX(0)',
                                  transitionDuration: isPressFilled ? '500ms' : '150ms',
                                }}
                              />
                            )}

                            {/* 左側：拖拉握把 (Drag Handle) + 順序編號小圓圈 */}
                            <div className="relative z-10 flex items-center gap-1.5 shrink-0">
                              <div
                                {...dragProvided.dragHandleProps}
                                className="p-1 rounded-lg text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-grab active:cursor-grabbing shrink-0"
                                title="按住拖拉改變行程順序"
                                onPointerDown={e => e.stopPropagation()}
                                onClick={e => e.stopPropagation()}
                              >
                                <GripVertical className="w-4 h-4 sm:w-5 sm:h-5" />
                              </div>

                              <div
                                className={`w-6 h-6 sm:w-7 sm:h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                                  isDone
                                    ? 'bg-slate-200/80 text-slate-500 border border-slate-300'
                                    : 'bg-sky-50 border border-sky-200 text-sky-700'
                                }`}
                              >
                                {index + 1}
                              </div>
                            </div>

                            {/* 行程主內容 */}
                            <div className="relative z-10 flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                {/* 類別 */}
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-md font-bold border ${
                                    isDone
                                      ? 'bg-slate-200/80 text-slate-500 border-slate-300'
                                      : getCategoryBadge(item.category)
                                  }`}
                                >
                                  {item.category}
                                </span>

                                {/* 時間 */}
                                {item.time && (
                                  <span
                                    className={`text-[11px] font-semibold flex items-center gap-1 ${
                                      isDone ? 'text-slate-500' : 'text-gray-500'
                                    }`}
                                  >
                                    <Clock className="w-3 h-3 text-gray-400" />
                                    {item.time}
                                  </span>
                                )}

                                {/* 城市 */}
                                <span
                                  className={`text-[11px] font-medium flex items-center gap-0.5 ${
                                    isDone ? 'text-slate-500' : 'text-slate-600'
                                  }`}
                                >
                                  <MapPin className="w-3 h-3 text-sky-500" />
                                  {item.city}
                                </span>

                                {/* 門票狀態 */}
                                {item.ticket_status && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium inline-flex items-center gap-0.5">
                                    <Ticket className="w-2.5 h-2.5" />
                                    {item.ticket_status}
                                  </span>
                                )}

                                {isDone && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 inline-flex items-center gap-0.5">
                                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                    已解鎖
                                  </span>
                                )}
                              </div>

                              {/* 景點名稱 */}
                              <h3
                                className={`font-bold text-sm sm:text-base truncate transition-colors ${
                                  isDone
                                    ? 'line-through text-slate-500'
                                    : 'text-gray-900'
                                }`}
                              >
                                {item.spot_name}
                              </h3>

                              {/* 備註預覽 */}
                              {item.notes && (
                                <p
                                  className={`text-xs mt-0.5 line-clamp-1 ${
                                    isDone ? 'text-slate-500' : 'text-gray-500'
                                  }`}
                                >
                                  {item.notes}
                                </p>
                              )}
                            </div>

                            {/* 右側：Google Maps 導航按鈕、最右側打勾 Checkbox 按鈕 */}
                            <div className="relative z-10 flex items-center gap-2 sm:gap-2.5 shrink-0">
                              {/* Google Maps 一鍵路線導航 */}
                              <button
                                type="button"
                                onPointerDown={e => e.stopPropagation()}
                                onClick={e => handleOpenGoogleMaps(e, item)}
                                className={`px-2 py-1.5 sm:px-2.5 sm:py-1.5 rounded-xl transition-all flex items-center gap-1 text-xs font-bold cursor-pointer ${
                                  isDone
                                    ? 'bg-slate-200/80 hover:bg-slate-200 text-slate-600 border border-slate-300'
                                    : 'bg-sky-50 hover:bg-sky-100 active:scale-95 text-sky-700 border border-sky-200 shadow-2xs'
                                }`}
                                title="開啟 Google Maps 路線導航"
                              >
                                <Navigation className="w-3.5 h-3.5 text-sky-600" />
                                <span className="hidden sm:inline">導航</span>
                              </button>

                              {/* 最右側：打勾 Checkbox 按鈕 */}
                              <button
                                type="button"
                                onPointerDown={e => e.stopPropagation()}
                                onClick={e => {
                                  e.stopPropagation();
                                  onToggleComplete(item);
                                }}
                                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                                  isDone
                                    ? 'bg-emerald-500 text-white shadow-2xs hover:bg-emerald-600 border border-emerald-600'
                                    : 'border-2 border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/60 bg-white'
                                }`}
                                title={isDone ? '點擊取消打勾，重回探索清單' : '點擊打勾完成，收進已解鎖分頁'}
                              >
                                {isDone && <Check className="w-4 h-4 stroke-[3]" />}
                              </button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    </React.Fragment>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </div>
  );
}
