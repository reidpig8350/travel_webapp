'use client';

import React, { useState } from 'react';
import { Plus, Receipt, MapPin, Sparkles } from 'lucide-react';

interface FloatingActionButtonProps {
  onOpenExpense: () => void;
  onOpenAddSpot: () => void;
  onOpenExpensesList: () => void;
  expenseCount: number;
}

export default function FloatingActionButton({
  onOpenExpense,
  onOpenAddSpot,
  onOpenExpensesList,
  expenseCount,
}: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* 點擊選單外部遮罩 */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/15 backdrop-blur-[1px] transition-opacity cursor-pointer"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* 右下角浮動操作按鈕與展開項目 */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {isOpen && (
          <div className="flex flex-col items-end gap-2.5 mb-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
            {/* 1. 記帳明細 */}
            <button
              onClick={() => {
                setIsOpen(false);
                onOpenExpensesList();
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-sky-500 hover:bg-sky-600 active:scale-95 text-white font-bold text-xs shadow-lg shadow-sky-500/25 ring-2 ring-white transition-all cursor-pointer"
            >
              <span>🧾</span>
              <span>記帳明細</span>
              <span className="px-1.5 py-0.2 rounded-full bg-white/25 text-[10px] font-bold">
                {expenseCount}
              </span>
            </button>

            {/* 2. 新增踩點 */}
            <button
              onClick={() => {
                setIsOpen(false);
                onOpenAddSpot();
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-sky-500 hover:bg-sky-600 active:scale-95 text-white font-bold text-xs shadow-lg shadow-sky-500/25 ring-2 ring-white transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>新增踩點</span>
            </button>

            {/* 3. 即時記帳 */}
            <button
              onClick={() => {
                setIsOpen(false);
                onOpenExpense();
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-sky-500 hover:bg-sky-600 active:scale-95 text-white font-bold text-xs shadow-lg shadow-sky-500/25 ring-2 ring-white transition-all cursor-pointer"
            >
              <span>💶</span>
              <span>即時記帳</span>
            </button>
          </div>
        )}

        {/* 核心十字按鈕 (點擊展開 / 關閉時旋轉45度成為叉叉) */}
        <button
          onClick={() => setIsOpen(prev => !prev)}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl ring-4 ring-white cursor-pointer transition-all duration-200 active:scale-90 ${
            isOpen
              ? 'bg-slate-800 hover:bg-slate-900 text-white shadow-slate-800/30'
              : 'bg-sky-500 hover:bg-sky-600 text-white shadow-sky-500/30'
          }`}
          aria-label="功能選單"
        >
          <Plus
            className={`w-7 h-7 stroke-[2.5] transition-transform duration-200 ${
              isOpen ? 'rotate-45' : 'rotate-0'
            }`}
          />
        </button>
      </div>
    </>
  );
}
