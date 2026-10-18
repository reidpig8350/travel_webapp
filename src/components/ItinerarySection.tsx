'use client';

import React from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { GripVertical, Clock, MapPin, Ticket, ChevronRight, Sparkles } from 'lucide-react';
import { ItineraryItem } from '@/types';

interface ItinerarySectionProps {
  itinerary: ItineraryItem[];
  selectedSpot: ItineraryItem | null;
  onSelectSpot: (spot: ItineraryItem) => void;
  onEditSpot: (spot: ItineraryItem) => void;
  onReorder: (sourceIndex: number, destinationIndex: number) => void;
  onOpenAddModal?: () => void;
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
}: ItinerarySectionProps) {
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    if (result.destination.index === result.source.index) return;
    onReorder(result.source.index, result.destination.index);
  };

  // 取得不重複的日期清單，用來顯示分日天數標題（Day 1, Day 2...）
  const uniqueDates = Array.from(new Set(itinerary.map(item => item.date).filter(Boolean)));
  const dateToDayIndex = new Map(uniqueDates.map((date, idx) => [date, idx + 1]));

  return (
    <div className="max-w-6xl mx-auto px-4 mt-6 mb-16">
      {/* 拖拉排序容器 */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="itinerary-list">
          {provided => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-3"
            >
              {itinerary.map((item, index) => {
                const isSelected = selectedSpot?.spot_name === item.spot_name;
                const dayNum = dateToDayIndex.get(item.date) || 1;
                const isFirstOfDay = index === 0 || itinerary[index - 1].date !== item.date;

                return (
                  <React.Fragment key={`${item.spot_name}-${index}`}>
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

                    <Draggable draggableId={`item-${index}`} index={index}>
                      {(dragProvided, dragSnapshot) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          onClick={() => onSelectSpot(item)}
                          className={`group relative rounded-2xl border transition-all duration-200 flex items-center gap-3 p-3.5 cursor-pointer ${
                            dragSnapshot.isDragging
                              ? 'bg-sky-50 border-sky-400 shadow-lg scale-[1.02] z-30'
                              : isSelected
                              ? 'bg-sky-50/60 border-sky-400 ring-2 ring-sky-200 shadow-sm'
                              : 'bg-white border-slate-200 hover:border-sky-300 hover:shadow-xs'
                          }`}
                        >
                          {/* 拖拉握把 (Drag Handle) */}
                          <div
                            {...dragProvided.dragHandleProps}
                            className="p-1 rounded-lg text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-grab active:cursor-grabbing"
                            title="按住拖拉改變行程順序"
                            onClick={e => e.stopPropagation()}
                          >
                            <GripVertical className="w-5 h-5" />
                          </div>

                          {/* 順序編號小圓圈 */}
                          <div className="w-7 h-7 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-xs font-bold text-sky-700 shrink-0">
                            {index + 1}
                          </div>

                          {/* 行程主內容 */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 mb-1">
                              {/* 類別 */}
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-md font-bold border ${getCategoryBadge(
                                    item.category
                                )}`}
                              >
                                {item.category}
                              </span>

                              {/* 時間 */}
                              {item.time && (
                                <span className="text-[11px] text-gray-500 font-semibold flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-gray-400" />
                                  {item.time}
                                </span>
                              )}

                              {/* 城市 */}
                              <span className="text-[11px] text-slate-600 font-medium flex items-center gap-0.5">
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
                            </div>

                            {/* 景點名稱 */}
                            <h3 className="font-bold text-sm sm:text-base text-gray-900 truncate">
                              {item.spot_name}
                            </h3>

                            {/* 備註預覽 */}
                            {item.notes && (
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                                {item.notes}
                              </p>
                            )}
                          </div>

                          {/* 右側：預估花費與查看箭頭 */}
                          <div className="flex items-center gap-2 shrink-0">
                            {item.cost_estimate > 0 && (
                              <span className="text-xs font-bold text-slate-600 px-2 py-1 bg-slate-50 rounded-lg border border-slate-200 hidden sm:inline-block">
                                {item.cost_estimate} €
                              </span>
                            )}
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                onEditSpot(item);
                              }}
                              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                              title="編輯此行程詳細資料"
                            >
                              <ChevronRight className="w-5 h-5" />
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
    </div>
  );
}
