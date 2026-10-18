'use client';

import React, { useState } from 'react';
import { ArrowRightLeft, Coins } from 'lucide-react';
import { ExchangeRates, ExpenseItem } from '@/types';

interface BudgetCroissantBarProps {
  expenses: ExpenseItem[];
  rates: ExchangeRates;
}

export default function BudgetCroissantBar({ expenses, rates }: BudgetCroissantBarProps) {
  const [dailyBudgetEUR, setDailyBudgetEUR] = useState<number>(85); // 預設每日預算 85 歐元
  const [showConverter, setShowConverter] = useState<boolean>(false);
  const [calcAmount, setCalcAmount] = useState<string>('5');
  const [calcCurrency, setCalcCurrency] = useState<'EUR' | 'CHF' | 'GBP'>('EUR');

  // 計算今日或總花費折算歐元與台幣
  const todayStr = new Date().toISOString().split('T')[0];
  const todayExpenses = expenses.filter(e => e.timestamp?.startsWith(todayStr));
  const activeExpenses = todayExpenses.length > 0 ? todayExpenses : expenses.slice(0, 4);

  const totalSpentTWD = activeExpenses.reduce((sum, e) => sum + (e.amount_twd || 0), 0);
  const totalSpentEUR = rates.EUR > 0 ? Math.round(totalSpentTWD / rates.EUR) : 0;

  // 計算百分比
  const percentage = Math.min(Math.round((totalSpentEUR / dailyBudgetEUR) * 100), 150);

  // 心情與表情判斷
  let moodEmoji = '🥐';
  let moodTitle = '預算控制極佳，享受美好旅程';
  let moodColor = 'text-sky-700 bg-sky-50 border-sky-100';
  let progressBg = 'bg-sky-500';

  if (percentage > 100) {
    moodEmoji = '🥖';
    moodTitle = '今日支出稍微超出預算，明天平衡一下';
    moodColor = 'text-rose-600 bg-rose-50 border-rose-100';
    progressBg = 'bg-rose-400';
  } else if (percentage >= 80) {
    moodEmoji = '🥐';
    moodTitle = '接近今日預算上限，挑選精緻晚餐';
    moodColor = 'text-amber-600 bg-amber-50 border-amber-100';
    progressBg = 'bg-sky-400';
  }

  // 即時匯率換算
  const calcRate = rates[calcCurrency] || 35.2;
  const convertedTWD = Math.round((parseFloat(calcAmount) || 0) * calcRate);

  return (
    <div className="max-w-6xl mx-auto px-4 mt-3 mb-2">
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4 shadow-2xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          {/* 左側：可頌表情與文字 */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-sky-50 flex items-center justify-center text-2xl border border-sky-100">
              {moodEmoji}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 text-sm sm:text-base">
                  當日預算進度
                </span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${moodColor}`}>
                  {percentage}% 消耗
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{moodTitle}</p>
            </div>
          </div>

          {/* 中間：進度條與金額 */}
          <div className="flex-1 w-full md:max-w-md">
            <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
              <span>
                已花費: <strong className="text-slate-900 font-semibold">{totalSpentEUR} €</strong>{' '}
                <span className="text-slate-400 font-normal">(約 NT$ {totalSpentTWD.toLocaleString()})</span>
              </span>
              <span>
                目標: {dailyBudgetEUR} €{' '}
                <button
                  onClick={() => {
                    const newBudget = prompt('設定每日預算 (EUR):', String(dailyBudgetEUR));
                    if (newBudget && !isNaN(Number(newBudget))) setDailyBudgetEUR(Number(newBudget));
                  }}
                  className="text-sky-600 underline hover:text-sky-700 text-[10px]"
                >
                  修改
                </button>
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-700 ${progressBg}`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
          </div>

          {/* 右側：匯率速算按鈕 */}
          <div className="flex items-center gap-2 self-end md:self-center">
            <button
              onClick={() => setShowConverter(!showConverter)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-sky-50 active:scale-95 text-slate-700 text-xs font-medium border border-slate-200 hover:border-sky-300 transition-all cursor-pointer"
            >
              <Coins className="w-3.5 h-3.5 text-sky-500" />
              <span>匯率速算</span>
              <span className="text-[10px] text-sky-600">1€ ≈ NT${rates.EUR}</span>
            </button>
          </div>
        </div>

        {/* 展開式多幣別即時換算小鍵盤 */}
        {showConverter && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs bg-slate-50/70 p-2.5 rounded-xl">
            <span className="font-semibold text-slate-800 flex items-center gap-1">
              <ArrowRightLeft className="w-3.5 h-3.5 text-sky-500" /> 換算台幣:
            </span>
            <input
              type="number"
              value={calcAmount}
              onChange={e => setCalcAmount(e.target.value)}
              className="w-16 px-2 py-1 bg-white border border-slate-200 rounded-lg text-center font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-400"
              placeholder="金額"
            />
            <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden">
              {(['EUR', 'CHF', 'GBP'] as const).map(curr => (
                <button
                  key={curr}
                  onClick={() => setCalcCurrency(curr)}
                  className={`px-2 py-1 font-medium text-[11px] ${
                    calcCurrency === curr
                      ? 'bg-sky-500 text-white'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {curr === 'EUR' ? '€ 歐元' : curr === 'CHF' ? 'CHF 法郎' : '£ 英鎊'}
                </button>
              ))}
            </div>
            <span className="text-slate-400 font-bold">=</span>
            <span className="px-2.5 py-1 bg-sky-50 border border-sky-200 rounded-lg font-bold text-sky-600 text-sm">
              NT$ {convertedTWD.toLocaleString()}
            </span>

            {/* 常用參考點 */}
            <div className="flex items-center gap-1 ml-auto text-[11px]">
              <span className="text-slate-400">快速填入:</span>
              {[
                { label: '咖啡 4€', val: '4' },
                { label: '午餐 18€', val: '18' },
                { label: '門票 14€', val: '14' },
                { label: '鹽礦 40€', val: '40' },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={() => {
                    setCalcAmount(item.val);
                    setCalcCurrency('EUR');
                  }}
                  className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:border-sky-300 font-medium"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
