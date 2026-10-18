'use client';

import React from 'react';
import { X, MapPin, Clock, CreditCard, Sparkles, Receipt } from 'lucide-react';
import { ExpenseItem } from '@/types';

interface ExpensesListModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenses: ExpenseItem[];
}

export default function ExpensesListModal({ isOpen, onClose, expenses }: ExpensesListModalProps) {
  if (!isOpen) return null;

  const totalTWD = expenses.reduce((sum, e) => sum + (e.amount_twd || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col font-sans">
        {/* 頂部 Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-sky-500 text-white flex items-center justify-center text-lg shadow-sm">
              💶
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">歐洲旅行記帳明細</h3>
              <p className="text-xs text-slate-500">即時定位記錄 · 自動同步 Google Sheets</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 總計摘要 */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700 flex items-center gap-1.5">
            <Receipt className="w-4 h-4 text-sky-500" />
            共記錄 {expenses.length} 筆消費
          </span>
          <span className="font-bold text-sky-600 text-sm">
            累計折合台幣: NT$ {totalTWD.toLocaleString()}
          </span>
        </div>

        {/* 消費列表 */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {expenses.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p className="text-3xl mb-2">🥐</p>
              <p className="font-medium text-sm">目前還沒有記帳記錄喔！</p>
              <p className="text-xs mt-1">點擊右下角的「💶 即時記帳」按鈕記下第一筆旅行花費吧！</p>
            </div>
          ) : (
            expenses.map((exp, idx) => (
              <div
                key={exp.id || idx}
                className="p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-sky-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-lg shadow-2xs shrink-0">
                    {exp.category === '美食'
                      ? '🥐'
                      : exp.category === '交通'
                      ? '🚆'
                      : exp.category === '門票'
                      ? '🎟️'
                      : exp.category === '購物'
                      ? '🛍️'
                      : exp.category === '住宿'
                      ? '🏨'
                      : '💡'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-900">{exp.item}</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 font-bold border border-sky-200">
                        {exp.category}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 mt-1">
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {exp.timestamp}
                      </span>
                      {exp.location_name && (
                        <span className="flex items-center gap-0.5 text-slate-600 font-medium">
                          <MapPin className="w-3 h-3 text-sky-500" />
                          {exp.location_name}
                        </span>
                      )}
                      <span className="flex items-center gap-0.5 text-slate-600">
                        <CreditCard className="w-3 h-3 text-slate-400" />
                        {exp.payment_type}
                      </span>
                    </div>

                    {exp.notes && (
                      <p className="text-xs text-slate-500 mt-1 italic">
                        &ldquo;{exp.notes}&rdquo;
                      </p>
                    )}
                  </div>
                </div>

                {/* 右側：金額 */}
                <div className="text-right sm:shrink-0 self-end sm:self-center">
                  <div className="font-bold text-slate-900 text-base">
                    {exp.amount_orig} {exp.currency}
                  </div>
                  <div className="text-xs font-bold text-sky-600">
                    ≈ NT$ {exp.amount_twd.toLocaleString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
