'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  X,
  RotateCw,
  Sparkles,
  Volume2,
  Copy,
  Check,
  ArrowUpDown,
  Calculator,
  Languages,
  ChevronRight,
  ChevronDown,
  Receipt,
  CornerDownLeft,
  Trash2,
  Loader2,
} from 'lucide-react';
import { ExchangeRates } from '@/types';

interface ShoppingModalProps {
  isOpen: boolean;
  onClose: () => void;
  rates: ExchangeRates;
  onTransferToExpense?: (amount: number, currency: 'EUR' | 'CHF') => void;
}

interface LanguageOption {
  code: string;
  name: string;
}

// 預設語言清單（義大利、瑞士、奧地利三國旅遊常備）
const DEFAULT_SOURCE_LANGS: LanguageOption[] = [
  { code: 'zh-TW', name: '繁體中文' },
  { code: 'en', name: 'English (英文)' },
];

const DEFAULT_TARGET_LANGS: LanguageOption[] = [
  { code: 'it', name: 'Italiano (義大利文)' },
  { code: 'de', name: 'Deutsch (德文)' },
  { code: 'en', name: 'English (英文)' },
  { code: 'fr', name: 'Français (法文)' },
];

// 旅遊常用購物片語快捷標籤預設值
const DEFAULT_QUICK_PHRASES = [
  '請問可以退稅嗎？',
  '可以刷 Apple Pay 嗎？',
  '有新的或別的尺寸嗎？',
  '請給我明細收據，謝謝！',
  '請問這件多少錢？',
  '我可以試穿這個嗎？',
];

// 解析環境變數中的常用句清單（支援逗號分隔或 JSON 陣列）
function parseQuickPhrases(envStr: string | undefined, fallback: string[]): string[] {
  if (!envStr || !envStr.trim()) return fallback;
  try {
    const trimmed = envStr.trim();
    if (trimmed.startsWith('[')) {
      return JSON.parse(trimmed);
    }
    const parsed = trimmed
      .split(',')
      .map(p => p.trim())
      .filter(Boolean);
    return parsed.length > 0 ? parsed : fallback;
  } catch (err) {
    console.warn('Failed to parse quick phrases from env:', err);
    return fallback;
  }
}

// 解析環境變數中的語言清單（格式支援 "code:名稱,code:名稱" 或 JSON）
function parseLanguages(envStr: string | undefined, fallback: LanguageOption[]): LanguageOption[] {
  if (!envStr || !envStr.trim()) return fallback;
  try {
    const trimmed = envStr.trim();
    if (trimmed.startsWith('[')) {
      return JSON.parse(trimmed);
    }
    const parsed = trimmed
      .split(',')
      .map(part => {
        const [code, ...nameParts] = part.trim().split(':');
        return {
          code: code?.trim(),
          name: nameParts.join(':')?.trim() || code?.trim(),
        };
      })
      .filter(item => item.code && item.name);
    return parsed.length > 0 ? parsed : fallback;
  } catch (err) {
    console.warn('Failed to parse translation languages from env:', err);
    return fallback;
  }
}

// 安全四則運算解析器（具備運算子優先級，無需使用危險 eval）
function evaluateMath(expr: string): number | null {
  try {
    const clean = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/,/g, '');
    if (!/^[0-9+\-*/.\s]+$/.test(clean)) return null;

    const tokens = clean.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return null;

    // 剔除末尾未完成的運算子進行即時預算
    const validTokens = [...tokens];
    while (
      validTokens.length > 0 &&
      ['+', '-', '*', '/'].includes(validTokens[validTokens.length - 1])
    ) {
      validTokens.pop();
    }
    if (validTokens.length === 0) return null;

    // 第一階段：優先運算乘除法
    const pass1: (number | string)[] = [];
    let i = 0;
    while (i < validTokens.length) {
      const tok = validTokens[i];
      if (tok === '*' || tok === '/') {
        const prev = Number(pass1.pop());
        const next = Number(validTokens[i + 1]);
        if (isNaN(prev) || isNaN(next)) return null;
        const res = tok === '*' ? prev * next : next !== 0 ? prev / next : 0;
        pass1.push(res);
        i += 2;
      } else if (!isNaN(Number(tok))) {
        pass1.push(Number(tok));
        i++;
      } else {
        pass1.push(tok);
        i++;
      }
    }

    // 第二階段：運算加減法
    let result = Number(pass1[0]);
    if (isNaN(result)) return null;

    for (let j = 1; j < pass1.length; j += 2) {
      const op = pass1[j];
      const next = Number(pass1[j + 1]);
      if (isNaN(next)) break;
      if (op === '+') result += next;
      else if (op === '-') result -= next;
    }

    return isFinite(result) ? result : null;
  } catch {
    return null;
  }
}

export default function ShoppingModal({
  isOpen,
  onClose,
  rates,
  onTransferToExpense,
}: ShoppingModalProps) {
  // 檢視模式：'calc' (計算機) | 'translate' (即時翻譯)
  const [activeView, setActiveView] = useState<'calc' | 'translate'>('calc');

  // 計算機狀態
  const [selectedCurrency, setSelectedCurrency] = useState<'EUR' | 'CHF'>('EUR');
  const [calcDisplay, setCalcDisplay] = useState<string>('0');
  const [hasEvaluated, setHasEvaluated] = useState<boolean>(false);

  // 翻譯狀態
  const [inputText, setInputText] = useState<string>('');
  const [translatedText, setTranslatedText] = useState<string>('');
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [isFlipped, setIsFlipped] = useState<boolean>(false); // 翻轉 180° 給店員閱讀
  const [hasCopied, setHasCopied] = useState<boolean>(false);

  // 語系設定（支援環境變數自訂）
  const sourceLangs = useMemo(
    () => parseLanguages(process.env.NEXT_PUBLIC_TRANSLATE_SOURCE_LANGS, DEFAULT_SOURCE_LANGS),
    []
  );
  const targetLangs = useMemo(
    () => parseLanguages(process.env.NEXT_PUBLIC_TRANSLATE_TARGET_LANGS, DEFAULT_TARGET_LANGS),
    []
  );

  // 旅遊常用句清單（支援環境變數自訂）
  const quickPhrases = useMemo(
    () => parseQuickPhrases(process.env.NEXT_PUBLIC_TRANSLATE_QUICK_PHRASES, DEFAULT_QUICK_PHRASES),
    []
  );

  const [selectedSource, setSelectedSource] = useState<string>(sourceLangs[0]?.code || 'zh-TW');
  const [selectedTarget, setSelectedTarget] = useState<string>(targetLangs[0]?.code || 'it');

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 每次開啟時重設必要狀態
  useEffect(() => {
    if (isOpen) {
      setActiveView('calc');
      setIsFlipped(false);
      setTranslationError(null);
    }
  }, [isOpen]);

  // 當前匯率與即時台幣換算
  const activeRate = rates[selectedCurrency] || (selectedCurrency === 'EUR' ? 35.2 : 36.8);
  const currentCalcValue = useMemo(() => {
    const val = evaluateMath(calcDisplay);
    return val !== null ? val : 0;
  }, [calcDisplay]);
  const calculatedTWD = Math.round(currentCalcValue * activeRate);

  // 計算機按鍵輸入邏輯
  const handleCalcInput = (char: string) => {
    setCalcDisplay(prev => {
      // 剛計算完若按數字重新開始，若按運算子則繼續連算
      if (hasEvaluated) {
        setHasEvaluated(false);
        if (['+', '-', '×', '÷'].includes(char)) {
          return `${prev} ${char} `;
        }
        return char === '.' ? '0.' : char;
      }

      if (prev === '0') {
        if (char === '.') return '0.';
        if (['+', '-', '×', '÷'].includes(char)) return `0 ${char} `;
        return char;
      }

      const lastChar = prev.trim().slice(-1);
      const isOperator = ['+', '-', '×', '÷'].includes(char);
      const lastIsOperator = ['+', '-', '×', '÷'].includes(lastChar);

      if (isOperator) {
        if (lastIsOperator) {
          // 替換最後一個運算子
          return prev.trimEnd().slice(0, -1) + `${char} `;
        }
        return `${prev} ${char} `;
      }

      if (char === '.') {
        const parts = prev.split(/\s[+\-×÷]\s/);
        const currentPart = parts[parts.length - 1];
        if (currentPart.includes('.')) return prev;
        return `${prev}.`;
      }

      return prev + char;
    });
  };

  const handleClear = () => {
    setCalcDisplay('0');
    setHasEvaluated(false);
  };

  const handleBackspace = () => {
    setCalcDisplay(prev => {
      if (prev.length <= 1 || prev === '0') return '0';
      // 若末尾為空格運算子 (例如 " + ")
      if (prev.endsWith(' ')) {
        return prev.trimEnd().slice(0, -1).trimEnd();
      }
      return prev.slice(0, -1) || '0';
    });
  };

  const handleEqual = () => {
    const res = evaluateMath(calcDisplay);
    if (res !== null) {
      // 格式化最多小數兩位
      const formatted = Number.isInteger(res) ? res.toString() : Number(res.toFixed(2)).toString();
      setCalcDisplay(formatted);
      setHasEvaluated(true);
    }
  };

  // 即時翻譯 API 呼叫 (串接 Gemini 2.5 Flash Lite)
  const triggerTranslation = useCallback(
    async (textToTranslate: string) => {
      const text = textToTranslate.trim();
      if (!text) {
        setTranslatedText('');
        setTranslationError(null);
        return;
      }

      // 中斷前一次尚未回傳的在途請求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsTranslating(true);
      setTranslationError(null);

      try {
        const sourceObj = sourceLangs.find(l => l.code === selectedSource);
        const targetObj = targetLangs.find(l => l.code === selectedTarget);

        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            sourceLang: selectedSource,
            targetLang: selectedTarget,
            sourceLangName: sourceObj?.name || selectedSource,
            targetLangName: targetObj?.name || selectedTarget,
          }),
          signal: controller.signal,
        });

        const data = await res.json();
        if (res.ok) {
          setTranslatedText(data.translatedText || '');
        } else {
          setTranslationError(data.error || '翻譯失敗，請稍後重試');
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          // 使用者持續輸入而取消，忽略
          return;
        }
        console.error('Translation error:', err);
        setTranslationError('無法連接翻譯服務，請檢查網路連線或 API 金鑰');
      } finally {
        setIsTranslating(false);
      }
    },
    [selectedSource, selectedTarget, sourceLangs, targetLangs]
  );

  // 防抖處理：打字停止約 1 秒 (1000ms) 自動啟動翻譯
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputText(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!val.trim()) {
      setTranslatedText('');
      setTranslationError(null);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      triggerTranslation(val);
    }, 1000);
  };

  // 按下 Enter 鍵立即送出翻譯 (支援 Shift+Enter 換行)
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      triggerTranslation(inputText);
    }
  };

  // 語音朗讀發音 (Web Speech API)
  const handleSpeak = (text: string, langCode: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode;
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  // 複製譯文至剪貼簿
  const handleCopy = () => {
    if (!translatedText) return;
    navigator.clipboard.writeText(translatedText).then(() => {
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000);
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
      {/* 遮罩點擊關閉 */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* 購物視窗主卡片 (固定為 85% 螢幕高度) */}
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 flex flex-col h-[85vh] overflow-hidden z-10 transition-all">
        {/* 頂部標題列與功能切換 Tab */}
        <div className="px-5 pt-4 pb-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-2xl">
            <button
              onClick={() => setActiveView('calc')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeView === 'calc'
                  ? 'bg-white text-sky-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>匯率計算機</span>
            </button>
            <button
              onClick={() => setActiveView('translate')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeView === 'translate'
                  ? 'bg-sky-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Languages className="w-3.5 h-3.5" />
              <span>即時翻譯</span>
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              title="關閉購物模式"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 內容區塊 */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {/* ==================== 1. 計算機模式 ==================== */}
          {activeView === 'calc' && (
            <div className="min-h-full p-4 sm:p-5 flex flex-col justify-between gap-3">
              {/* 幣別切換按鈕 (EUR 歐元 / CHF 瑞士法郎) */}
              <div className="flex items-center justify-between gap-2 bg-slate-100 p-1.5 rounded-2xl">
                <button
                  onClick={() => setSelectedCurrency('EUR')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    selectedCurrency === 'EUR'
                      ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                      : 'text-slate-600 hover:bg-white/60'
                  }`}
                >
                  <span className="text-sm">💶</span>
                  <span>EUR 歐元 (€)</span>
                  <span className="text-[10px] opacity-80 font-mono">
                    ≈ {rates.EUR || 35.2}
                  </span>
                </button>
                <button
                  onClick={() => setSelectedCurrency('CHF')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    selectedCurrency === 'CHF'
                      ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                      : 'text-slate-600 hover:bg-white/60'
                  }`}
                >
                  <span className="text-sm">🇨🇭</span>
                  <span>CHF 瑞郎 (Fr.)</span>
                  <span className="text-[10px] opacity-80 font-mono">
                    ≈ {rates.CHF || 36.8}
                  </span>
                </button>
              </div>

              {/* 計算機螢幕顯示區塊 */}
              <div className="bg-slate-900 text-white rounded-2xl p-4 flex flex-col justify-between shadow-inner">
                {/* 算式過程 */}
                <div className="text-right text-xs text-slate-400 min-h-[1.25rem] font-mono tracking-wider break-all">
                  {calcDisplay}
                </div>

                {/* 當前金額與台幣換算 */}
                <div className="mt-1 flex items-baseline justify-between gap-2">
                  <div className="text-sky-300 font-bold text-xs flex items-center gap-1 bg-sky-950/60 px-2.5 py-1 rounded-lg border border-sky-800/50">
                    <span>約合台幣</span>
                    <span className="text-base text-amber-300 font-mono font-extrabold">
                      NT$ {calculatedTWD.toLocaleString()}
                    </span>
                  </div>

                  {/* 外幣主數字 */}
                  <div className="text-right text-2xl sm:text-3xl font-extrabold font-mono text-white tracking-tight">
                    <span className="text-sm text-slate-400 font-normal mr-1">
                      {selectedCurrency === 'EUR' ? '€' : 'Fr.'}
                    </span>
                    {calcDisplay.split(' ').slice(-1)[0] || '0'}
                  </div>
                </div>
              </div>

              {/* 計算機按鍵區 (加減乘除與數字) */}
              <div className="grid grid-cols-4 gap-2 text-base font-bold">
                {/* Row 1 */}
                <button
                  onClick={handleClear}
                  className="py-3 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 active:scale-95 transition-all cursor-pointer font-bold"
                >
                  AC
                </button>
                <button
                  onClick={handleBackspace}
                  className="py-3 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
                >
                  ⌫
                </button>
                <button
                  onClick={() => handleCalcInput('÷')}
                  className="py-3 rounded-xl bg-sky-50 text-sky-600 hover:bg-sky-100 active:scale-95 transition-all cursor-pointer text-lg"
                >
                  ÷
                </button>
                <button
                  onClick={() => handleCalcInput('×')}
                  className="py-3 rounded-xl bg-sky-50 text-sky-600 hover:bg-sky-100 active:scale-95 transition-all cursor-pointer text-lg"
                >
                  ×
                </button>

                {/* Row 2 */}
                <button
                  onClick={() => handleCalcInput('7')}
                  className="py-3 rounded-xl bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-800 transition-all cursor-pointer shadow-2xs"
                >
                  7
                </button>
                <button
                  onClick={() => handleCalcInput('8')}
                  className="py-3 rounded-xl bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-800 transition-all cursor-pointer shadow-2xs"
                >
                  8
                </button>
                <button
                  onClick={() => handleCalcInput('9')}
                  className="py-3 rounded-xl bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-800 transition-all cursor-pointer shadow-2xs"
                >
                  9
                </button>
                <button
                  onClick={() => handleCalcInput('-')}
                  className="py-3 rounded-xl bg-sky-50 text-sky-600 hover:bg-sky-100 active:scale-95 transition-all cursor-pointer text-lg"
                >
                  -
                </button>

                {/* Row 3 */}
                <button
                  onClick={() => handleCalcInput('4')}
                  className="py-3 rounded-xl bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-800 transition-all cursor-pointer shadow-2xs"
                >
                  4
                </button>
                <button
                  onClick={() => handleCalcInput('5')}
                  className="py-3 rounded-xl bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-800 transition-all cursor-pointer shadow-2xs"
                >
                  5
                </button>
                <button
                  onClick={() => handleCalcInput('6')}
                  className="py-3 rounded-xl bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-800 transition-all cursor-pointer shadow-2xs"
                >
                  6
                </button>
                <button
                  onClick={() => handleCalcInput('+')}
                  className="py-3 rounded-xl bg-sky-50 text-sky-600 hover:bg-sky-100 active:scale-95 transition-all cursor-pointer text-lg"
                >
                  +
                </button>

                {/* Row 4 */}
                <button
                  onClick={() => handleCalcInput('1')}
                  className="py-3 rounded-xl bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-800 transition-all cursor-pointer shadow-2xs"
                >
                  1
                </button>
                <button
                  onClick={() => handleCalcInput('2')}
                  className="py-3 rounded-xl bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-800 transition-all cursor-pointer shadow-2xs"
                >
                  2
                </button>
                <button
                  onClick={() => handleCalcInput('3')}
                  className="py-3 rounded-xl bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-800 transition-all cursor-pointer shadow-2xs"
                >
                  3
                </button>
                <button
                  onClick={handleEqual}
                  className="row-span-2 py-3 rounded-xl bg-sky-500 hover:bg-sky-600 active:scale-95 text-white shadow-md shadow-sky-500/30 transition-all cursor-pointer text-xl flex items-center justify-center"
                >
                  =
                </button>

                {/* Row 5 */}
                <button
                  onClick={() => handleCalcInput('0')}
                  className="py-3 rounded-xl bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-800 transition-all cursor-pointer shadow-2xs"
                >
                  0
                </button>
                <button
                  onClick={() => handleCalcInput('00')}
                  className="py-3 rounded-xl bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-800 transition-all cursor-pointer shadow-2xs"
                >
                  00
                </button>
                <button
                  onClick={() => handleCalcInput('.')}
                  className="py-3 rounded-xl bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-800 transition-all cursor-pointer shadow-2xs"
                >
                  .
                </button>
              </div>

              {/* 帶入記帳按鈕 (常駐固定佔位，未輸入時 disabled，避免鍵盤上下跳動) */}
              {onTransferToExpense && (
                <button
                  onClick={() => {
                    if (currentCalcValue > 0) {
                      onTransferToExpense(currentCalcValue, selectedCurrency);
                      onClose();
                    }
                  }}
                  disabled={currentCalcValue <= 0}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border transition-all ${
                    currentCalcValue > 0
                      ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 cursor-pointer active:scale-98 shadow-2xs'
                      : 'bg-slate-50 text-slate-400/80 border-slate-200/60 cursor-not-allowed'
                  }`}
                >
                  <Receipt className="w-4 h-4" />
                  <span>
                    {currentCalcValue > 0
                      ? `將 ${currentCalcValue} ${selectedCurrency} 帶入即時記帳`
                      : '帶入即時記帳 (請先輸入或計算金額)'}
                  </span>
                </button>
              )}

              {/* 底部點擊呼叫即時翻譯按鈕卡片 */}
              <div
                onClick={() => setActiveView('translate')}
                className="mt-1 p-2.5 rounded-2xl bg-gradient-to-r from-sky-50 via-indigo-50 to-sky-50 border border-sky-100 text-sky-800 flex items-center justify-between cursor-pointer hover:bg-sky-100 active:scale-[0.99] transition-all group shadow-2xs"
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-sky-500 text-white flex items-center justify-center text-xs shadow-xs group-hover:scale-110 transition-transform">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold flex items-center gap-1">
                      <span>點擊開啟即時翻譯</span>
                      <ChevronRight className="w-3.5 h-3.5 text-sky-600 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
                <span className="text-xs font-bold text-sky-600 bg-white px-2.5 py-1 rounded-lg shadow-2xs border border-sky-100">
                  開啟翻譯 ➔
                </span>
              </div>
            </div>
          )}

          {/* ==================== 2. 即時翻譯模式 ==================== */}
          {activeView === 'translate' && (
            <div className="h-full p-4 sm:p-5 flex flex-col gap-2.5 justify-between overflow-hidden">
              {/* 頂部語言選擇工具列 (固定高度) */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 shrink-0">
                {/* 語言切換選擇器 */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-400 text-[11px] font-medium">翻譯：</span>
                  {/* 來源語言 */}
                  <select
                    value={selectedSource}
                    onChange={e => setSelectedSource(e.target.value)}
                    className="px-2 py-1.5 rounded-xl bg-slate-100 border-none font-bold text-slate-700 text-xs focus:ring-2 focus:ring-sky-500 cursor-pointer"
                  >
                    {sourceLangs.map(l => (
                      <option key={l.code} value={l.code}>
                        {l.name}
                      </option>
                    ))}
                  </select>

                  <span className="text-slate-400 font-bold">➔</span>

                  {/* 目標語言 */}
                  <select
                    value={selectedTarget}
                    onChange={e => setSelectedTarget(e.target.value)}
                    className="px-2 py-1.5 rounded-xl bg-sky-50 text-sky-800 border border-sky-200 font-bold text-xs focus:ring-2 focus:ring-sky-500 cursor-pointer"
                  >
                    {targetLangs.map(l => (
                      <option key={l.code} value={l.code}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>

                {isFlipped && (
                  <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-800 font-bold text-[10px] animate-pulse">
                    店員視角中
                  </span>
                )}
              </div>

              {/* 上方：翻譯後的語言 (Translated Text) */}
              <div
                className={`relative flex-1 min-h-0 p-4 rounded-2xl bg-slate-900 text-white shadow-md flex flex-col transition-transform duration-300 ${
                  isFlipped ? 'rotate-180 shadow-amber-500/10' : ''
                }`}
              >
                {/* 頂部標示與工具按鈕 (固定於頂部不隨內容滾動) */}
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-semibold text-emerald-300">
                      {targetLangs.find(l => l.code === selectedTarget)?.name || '目標語言'}
                    </span>
                    {isFlipped && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-400 text-slate-900 font-bold text-[10px]">
                        對向店員閱讀中
                      </span>
                    )}
                  </div>

                  {translatedText && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleSpeak(translatedText, selectedTarget)}
                        className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
                        title="朗讀發音"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleCopy}
                        className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
                        title="複製"
                      >
                        {hasCopied ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* 翻譯文字主內容 (內部獨立滾動區塊，長文自動換行且不撐大外層) */}
                <div className="flex-1 overflow-y-auto min-h-0 flex items-center justify-center text-center py-2 px-1">
                  {isTranslating ? (
                    <div className="flex items-center gap-2 text-sky-400 font-medium text-sm animate-pulse">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>翻譯中...</span>
                    </div>
                  ) : translationError ? (
                    <div className="text-rose-400 text-xs px-2 py-1 bg-rose-950/40 rounded-lg border border-rose-800/40">
                      {translationError}
                    </div>
                  ) : translatedText ? (
                    <div className="text-3xl sm:text-4xl font-bold text-white tracking-wide leading-relaxed font-sans select-all break-words max-w-full my-auto">
                      {translatedText}
                    </div>
                  ) : (
                    <div className="text-slate-500 text-xs flex flex-col items-center gap-1">
                      <Sparkles className="w-6 h-6 text-slate-600 mb-1" />
                      <span>請在下方輸入句子，停止打字 1 秒後將自動翻譯</span>
                    </div>
                  )}
                </div>

                {/* 底部標記 (固定於底部) */}
                <div className="text-[10px] text-slate-500 text-right pt-1 shrink-0">
                  Powered by Gemini 2.5 Flash Lite
                </div>
              </div>

              {/* 常用片語快捷小標籤 (固定高度) */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none shrink-0">
                <span className="text-[10px] text-slate-400 whitespace-nowrap">常用句：</span>
                {quickPhrases.map(phrase => (
                  <button
                    key={phrase}
                    onClick={() => {
                      setInputText(phrase);
                      triggerTranslation(phrase);
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 hover:bg-sky-50 hover:text-sky-600 text-slate-600 font-medium whitespace-nowrap transition-colors cursor-pointer border border-slate-200/60"
                  >
                    {phrase}
                  </button>
                ))}
              </div>

              {/* 下方：使用者輸入區塊 (User Input Area - 固定高度) */}
              <div className="flex flex-col gap-1.5 shrink-0">
                <div className="relative rounded-2xl border-2 border-slate-200 focus-within:border-sky-500 transition-colors bg-white shadow-2xs">
                  <textarea
                    rows={2}
                    value={inputText}
                    onChange={handleInputChange}
                    onKeyDown={handleInputKeyDown}
                    placeholder="輸入中文或英文，停止打字約 1 秒或按 Enter 自動翻譯..."
                    className="w-full p-3 pr-10 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-hidden resize-none rounded-2xl"
                  />

                  {/* 清除按鈕 */}
                  {inputText && (
                    <button
                      onClick={() => {
                        setInputText('');
                        setTranslatedText('');
                      }}
                      className="absolute top-2.5 right-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
                      title="清除"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* 輸入框下方功能列：店員對向翻轉按鈕 + 即時翻譯按鈕 */}
                <div className="flex items-center gap-2 pt-0.5">
                  {/* 180 度翻轉按鈕（移至下方，輸入完後手部最順手點擊） */}
                  <button
                    onClick={() => setIsFlipped(prev => !prev)}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs ${
                      isFlipped
                        ? "bg-amber-500 text-white shadow-md shadow-amber-500/25 ring-2 ring-amber-300"
                        : "bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200"
                    }`}
                    title="將上方文字上下顛倒 180 度，方便櫃台店員直接閱讀"
                  >
                    <RotateCw
                      className={`w-3.5 h-3.5 transition-transform duration-300 ${
                        isFlipped ? "rotate-180" : ""
                      }`}
                    />
                    <span>{isFlipped ? "👀 店員視角中 (點此翻正)" : "🔄 翻轉譯文給店員看"}</span>
                  </button>

                  {/* 即時翻譯按鈕 */}
                  <button
                    onClick={() => triggerTranslation(inputText)}
                    disabled={isTranslating || !inputText.trim()}
                    className="py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:opacity-40 text-white font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs text-xs active:scale-95"
                  >
                    {isTranslating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CornerDownLeft className="w-3.5 h-3.5" />
                    )}
                    <span>即時翻譯</span>
                  </button>
                </div>
              </div>

              {/* 向下滑動或切換回計算機提示 (固定高度) */}
              <button
                onClick={() => setActiveView('calc')}
                className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer shrink-0"
              >
                <ChevronDown className="w-3.5 h-3.5" />
                <span>切換回匯率計算機</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
