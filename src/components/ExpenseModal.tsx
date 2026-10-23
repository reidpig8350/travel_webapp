'use client';

import React, { useState, useEffect } from 'react';
import { X, MapPin, Clock, Camera, Check, Sparkles, CreditCard, DollarSign } from 'lucide-react';
import { ExchangeRates, ExpenseItem } from '@/types';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  userLocation: { lat: number; lng: number } | null;
  rates: ExchangeRates;
  onExpenseAdded: (newExpense: ExpenseItem) => void;
  currentTrip?: string;
  initialAmount?: string;
  initialCurrency?: 'EUR' | 'CHF' | 'GBP' | 'TWD';
  initialCategory?: '美食' | '交通' | '門票' | '住宿' | '購物' | '其他';
}

export default function ExpenseModal({
  isOpen,
  onClose,
  userLocation,
  rates,
  onExpenseAdded,
  currentTrip,
  initialAmount = '',
  initialCurrency = 'EUR',
  initialCategory = '美食',
}: ExpenseModalProps) {
  const [item, setItem] = useState('');
  const [category, setCategory] = useState<'美食' | '交通' | '門票' | '住宿' | '購物' | '其他'>(initialCategory);
  const [amountOrig, setAmountOrig] = useState(initialAmount);
  const [currency, setCurrency] = useState<'EUR' | 'CHF' | 'GBP' | 'TWD'>(initialCurrency);
  const [paymentType, setPaymentType] = useState<'Apple Pay' | '信用卡' | '現金'>('Apple Pay');
  const [notes, setNotes] = useState('');
  const [locationName, setLocationName] = useState('定位查詢中...');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 當開啟時，取得目前時間與位置反查地名
  useEffect(() => {
    if (isOpen) {
      setItem('');
      setAmountOrig(initialAmount);
      setCurrency(initialCurrency);
      setCategory(initialCategory);
      setNotes('');
      setPhotoPreview(null);

      if (userLocation) {
        fetch(`/api/geocode?lat=${userLocation.lat}&lng=${userLocation.lng}`)
          .then(res => res.json())
          .then(data => {
            if (data.locationName) setLocationName(data.locationName);
            else setLocationName('當前定位點');
          })
          .catch(() => setLocationName('當前定位點'));
      } else {
        setLocationName('未取得 GPS 定位（以預設點記錄）');
      }
    }
  }, [isOpen, userLocation]);

  if (!isOpen) return null;

  // 計算換算台幣金額
  const activeRate = rates[currency] || 35.2;
  const numAmount = parseFloat(amountOrig) || 0;
  const calculatedTWD = Math.round(numAmount * activeRate);

  // 處理相片拍立得上傳
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || !amountOrig) {
      alert('請填寫消費項目與金額');
      return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date();
      const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
        now.getDate()
      ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trip: currentTrip,
          timestamp,
          item,
          category,
          amount_orig: numAmount,
          currency,
          rate_to_twd: activeRate,
          payment_type: paymentType,
          lat: userLocation ? userLocation.lat : 47.8095,
          lng: userLocation ? userLocation.lng : 13.055,
          location_name: locationName,
          notes,
          photo_url: photoPreview,
        }),
      });

      if (res.ok) {
        const savedExpense = await res.json();
        onExpenseAdded(savedExpense);
        onClose();
      } else {
        const err = await res.json();
        alert(`記帳失敗: ${err.error || '請稍後重試'}`);
      }
    } catch {
      alert('記帳連線失敗');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col font-sans">
        {/* 頂部 Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-sky-500 text-white flex items-center justify-center text-lg shadow-sm">
              💶
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-1.5">
                <span>即時定位記帳</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 font-bold border border-sky-200">
                  即時 GPS + 時間戳記
                </span>
              </h3>
              <p className="text-xs text-slate-500">自動記錄當下歐洲地理座標並同步至試算表</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 記帳表單 */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 font-sans">
          {/* 即時定位地點與時間自動顯示區 */}
          <div className="p-3 rounded-2xl bg-sky-50/50 border border-sky-100 text-xs flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-sky-950">
              <span className="font-bold flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-sky-600 animate-bounce" /> 當前即時地點:
              </span>
              <span className="text-slate-500 flex items-center gap-1 font-medium">
                <Clock className="w-3 h-3" /> 當前時間
              </span>
            </div>
            <div className="font-semibold text-slate-800 bg-white px-2.5 py-1.5 rounded-xl border border-sky-200 truncate">
              {locationName}
            </div>
          </div>

          {/* 消費項目名稱 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">消費項目 *</label>
            <input
              type="text"
              required
              value={item}
              onChange={e => setItem(e.target.value)}
              placeholder="例：薩爾斯堡莫札特咖啡廳 下午茶"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* 類別選擇 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">消費類別</label>
            <div className="grid grid-cols-6 gap-1.5 text-center text-xs">
              {[
                { label: '美食', emoji: '🥐' },
                { label: '交通', emoji: '🚆' },
                { label: '門票', emoji: '🎟️' },
                { label: '購物', emoji: '🛍️' },
                { label: '住宿', emoji: '🏨' },
                { label: '其他', emoji: '💡' },
              ].map(cat => (
                <button
                  type="button"
                  key={cat.label}
                  onClick={() => setCategory(cat.label as any)}
                  className={`py-2 px-1 rounded-xl font-bold border transition-all cursor-pointer flex flex-col items-center gap-1 ${
                    category === cat.label
                      ? 'bg-sky-500 text-white border-sky-600 shadow-sm scale-105'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-sm">{cat.emoji}</span>
                  <span className="text-[11px]">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 金額、幣別與即時折算台幣 */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-sky-600" /> 當地原幣金額 *
              </label>
              {/* 幣別切換 */}
              <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden text-[11px]">
                {(['EUR', 'CHF', 'GBP', 'TWD'] as const).map(curr => (
                  <button
                    key={curr}
                    type="button"
                    onClick={() => setCurrency(curr)}
                    className={`px-2 py-0.5 font-bold ${
                      currency === curr ? 'bg-sky-500 text-white' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {curr === 'EUR' ? '€ 歐元' : curr === 'CHF' ? 'CHF 法郎' : curr === 'GBP' ? '£ 英鎊' : 'NT$'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                step="any"
                required
                value={amountOrig}
                onChange={e => setAmountOrig(e.target.value)}
                placeholder="0.00"
                className="w-1/2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-lg font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <div className="w-1/2 px-3 py-2 bg-sky-50 border border-sky-200 rounded-xl flex items-center justify-between">
                <span className="text-xs text-sky-800 font-bold">折合台幣:</span>
                <span className="text-base font-black text-sky-600">
                  NT$ {calculatedTWD.toLocaleString()}
                </span>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              當前即時匯率: 1 {currency} ≈ {activeRate} TWD
            </p>
          </div>

          {/* 支付方式 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5 text-slate-400" /> 支付方式
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Apple Pay', '信用卡', '現金'] as const).map(pt => (
                <button
                  type="button"
                  key={pt}
                  onClick={() => setPaymentType(pt)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    paymentType === pt
                      ? 'bg-sky-50 border-sky-300 text-sky-900 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {pt === 'Apple Pay' ? '🍎 Apple Pay' : pt === '信用卡' ? '💳 信用卡' : '💶 現金'}
                </button>
              ))}
            </div>
          </div>

          {/* 備註與拍照打卡 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">記帳小語或備忘</label>
              <label className="text-[11px] text-sky-600 hover:text-sky-700 font-bold flex items-center gap-1 cursor-pointer">
                <Camera className="w-3.5 h-3.5" />
                <span>附加拍立得照片</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </label>
            </div>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="例：兩個人一起吃，蘋果卷超香酥，服務生非常親切！"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* 拍立得照片預覽小卡 */}
          {photoPreview && (
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-3">
              <img
                src={photoPreview}
                alt="Receipt or moment"
                className="w-16 h-16 object-cover rounded-xl border border-white shadow-md"
              />
              <div className="text-xs">
                <p className="font-bold text-slate-800 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-sky-500" /> 已附加旅行照片
                </p>
                <button
                  type="button"
                  onClick={() => setPhotoPreview(null)}
                  className="text-sky-600 underline text-[11px] mt-1"
                >
                  移除相片
                </button>
              </div>
            </div>
          )}

          {/* 送出與取消 */}
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
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 active:scale-95 text-white text-sm font-bold shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {isSubmitting ? '記帳記錄中...' : '記下這筆花費'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
