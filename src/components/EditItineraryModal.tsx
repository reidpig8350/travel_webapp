'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, MapPin, Search, Calendar, Clock, DollarSign, Tag, FileText, Check, Trash2 } from 'lucide-react';
import { ItineraryItem } from '@/types';

interface EditItineraryModalProps {
  spot: ItineraryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: ItineraryItem) => Promise<void>;
  onDelete?: (spot: ItineraryItem) => Promise<void>;
}

export default function EditItineraryModal({
  spot,
  isOpen,
  onClose,
  onSave,
  onDelete,
}: EditItineraryModalProps) {
  const [formData, setFormData] = useState<ItineraryItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSearchingCoord, setIsSearchingCoord] = useState(false);

  useEffect(() => {
    if (spot) {
      setFormData({ ...spot });
    }
  }, [spot]);

  if (!isOpen || !formData) return null;

  const handleChange = (field: keyof ItineraryItem, value: any) => {
    setFormData(prev => (prev ? { ...prev, [field]: value } : null));
  };

  const handleSearchCoordinates = async () => {
    if (!formData.spot_name) return;
    setIsSearchingCoord(true);
    try {
      const query = `${formData.city} ${formData.spot_name}`;
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.lat && data.lng) {
          handleChange('lat', data.lat);
          handleChange('lng', data.lng);
          alert(`已自動定位經緯度：${data.lat.toFixed(4)}, ${data.lng.toFixed(4)}`);
        } else {
          alert('未能找到該景點精確座標，可手動輸入');
        }
      }
    } catch {
      alert('查詢座標失敗');
    } finally {
      setIsSearchingCoord(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;
    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err: any) {
      alert(`儲存失敗: ${err.message || '請稍後重試'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs cursor-pointer"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col font-sans cursor-default"
      >
        {/* 頂部標題 */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="text-xl">✏️</span>
            <div>
              <h3 className="font-bold text-slate-800 text-base">編輯行程詳細資訊</h3>
              <p className="text-xs text-slate-500">同步儲存至 Google Sheets 與地圖標籤</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 表單內容 */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* 景點名稱與門票狀態 (2:1 寬度比) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">景點 / 活動名稱 *</label>
              <input
                type="text"
                required
                value={formData.spot_name}
                onChange={e => handleChange('spot_name', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                placeholder="例：米拉貝爾宮花園"
              />
            </div>
            <div className="sm:col-span-1">
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-gray-400" /> 門票狀態
              </label>
              <select
                value={formData.ticket_status}
                onChange={e => handleChange('ticket_status', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
              >
                <option value="免門票">免門票</option>
                <option value="已購票">已購票</option>
                <option value="需預約">需預約</option>
                <option value="現場購票">現場購票</option>
              </select>
            </div>
          </div>

          {/* 國家、城市與類別 */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">國家</label>
              <input
                type="text"
                value={formData.country}
                onChange={e => handleChange('country', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">城市</label>
              <input
                type="text"
                value={formData.city}
                onChange={e => handleChange('city', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">類別</label>
              <select
                value={formData.category}
                onChange={e => handleChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
              >
                <option value="景點">🏰 景點</option>
                <option value="美食">🥐 美食</option>
                <option value="交通">🚆 交通</option>
                <option value="購物">🛍️ 購物</option>
                <option value="住宿">🏨 住宿</option>
              </select>
            </div>
          </div>

          {/* 日期、時間與預估費用 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-sky-500" /> 日期 (YYYY-MM-DD)
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={e => handleChange('date', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-sky-500" /> 時間 (HH:mm)
              </label>
              <input
                type="time"
                value={formData.time}
                onChange={e => handleChange('time', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-gray-400" /> 預估費用 (€)
              </label>
              <input
                type="number"
                value={formData.cost_estimate}
                onChange={e => handleChange('cost_estimate', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
              />
            </div>
          </div>

          {/* 經度與緯度 (可一鍵自動查詢，並整合已探索勾選) */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-sky-500" /> 地圖經緯度座標
              </label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-700 select-none hover:text-sky-600 transition-colors">
                  <input
                    type="checkbox"
                    checked={!!formData.completed}
                    onChange={e => handleChange('completed', e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                  />
                  <span>已探索</span>
                </label>
                <button
                  type="button"
                  onClick={handleSearchCoordinates}
                  disabled={isSearchingCoord}
                  className="text-[11px] px-2.5 py-1 bg-white hover:bg-sky-50 rounded-lg text-sky-700 border border-sky-200 font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                >
                  <Search className="w-3 h-3" />
                  {isSearchingCoord ? '查詢中...' : '依景點自動定位'}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                step="any"
                value={formData.lat}
                onChange={e => handleChange('lat', parseFloat(e.target.value) || 0)}
                placeholder="緯度 (lat)"
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs"
              />
              <input
                type="number"
                step="any"
                value={formData.lng}
                onChange={e => handleChange('lng', parseFloat(e.target.value) || 0)}
                placeholder="經度 (lng)"
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs"
              />
            </div>
          </div>

          {/* 詳細備註 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-gray-400" /> 詳細備註、預約號、提醒事項
            </label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={e => handleChange('notes', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="例：預約編號 #FR-1234，需提早 15 分鐘在北門集合..."
            />
          </div>

          {/* 送出、取消與刪除按鈕 */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
            <div>
              {onDelete && (
                <button
                  type="button"
                  disabled={isDeleting || isSaving}
                  onClick={async () => {
                    if (window.confirm(`確定要刪除「${formData.spot_name}」嗎？此操作無法復原。`)) {
                      setIsDeleting(true);
                      try {
                        await onDelete(formData);
                        onClose();
                      } catch (err: any) {
                        alert(`刪除失敗: ${err.message || '請稍後重試'}`);
                      } finally {
                        setIsDeleting(false);
                      }
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl bg-white border border-rose-300 text-rose-600 hover:bg-rose-50 hover:border-rose-400 text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shadow-2xs"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isDeleting ? '刪除中...' : '刪除'}</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold cursor-pointer"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isSaving || isDeleting}
                className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 active:scale-95 text-white text-sm font-bold shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSaving ? '儲存中...' : '儲存變更'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
