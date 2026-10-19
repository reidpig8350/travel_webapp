'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, MapPin, Search, Calendar, Clock, DollarSign, Tag, FileText, Check } from 'lucide-react';
import { ItineraryItem } from '@/types';

interface EditItineraryModalProps {
  spot: ItineraryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: ItineraryItem) => Promise<void>;
}

export default function EditItineraryModal({
  spot,
  isOpen,
  onClose,
  onSave,
}: EditItineraryModalProps) {
  const [formData, setFormData] = useState<ItineraryItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
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
          {/* 景點名稱 */}
          <div>
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

          {/* 日期與時間 */}
          <div className="grid grid-cols-2 gap-3">
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
          </div>

          {/* 經度與緯度 (可一鍵自動查詢) */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-sky-500" /> 地圖經緯度座標
              </label>
              <button
                type="button"
                onClick={handleSearchCoordinates}
                disabled={isSearchingCoord}
                className="text-[11px] px-2.5 py-1 bg-sky-50 hover:bg-sky-100 rounded-lg text-sky-700 border border-sky-200 font-bold flex items-center gap-1 transition-all cursor-pointer"
              >
                <Search className="w-3 h-3" />
                {isSearchingCoord ? '查詢中...' : '依景點名自動搜尋座標'}
              </button>
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

          {/* 門票狀態與預估花費 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
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

          {/* 行程探索狀態 (探索中 / 已解鎖) */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="block text-xs font-bold text-slate-700">行程探索狀態</span>
              <span className="text-[11px] text-slate-600">已解鎖將收納至「已解鎖 Collected」分頁並呈現灰階</span>
            </div>
            <button
              type="button"
              onClick={() => handleChange('completed', !formData.completed)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                formData.completed
                  ? 'bg-emerald-500 text-white shadow-2xs hover:bg-emerald-600'
                  : 'bg-white border border-slate-300 text-slate-600 hover:border-slate-400'
              }`}
            >
              {formData.completed ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>已解鎖 Collected</span>
                </>
              ) : (
                <span>🥐 探索中 Exploring</span>
              )}
            </button>
          </div>

          {/* 送出與取消按鈕 */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 active:scale-95 text-white text-sm font-bold shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? '儲存中...' : '儲存變更'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
