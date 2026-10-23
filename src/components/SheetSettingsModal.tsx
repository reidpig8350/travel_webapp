'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FolderPlus,
  ExternalLink,
  Layers,
} from 'lucide-react';

interface SheetSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isGoogleConnected: boolean;
  currentTrip: string;
  availableTrips: string[];
  onSelectTrip: (trip: string) => void;
  onRefreshData: (targetTrip?: string) => void;
}

export default function SheetSettingsModal({
  isOpen,
  onClose,
  isGoogleConnected,
  currentTrip,
  availableTrips,
  onSelectTrip,
  onRefreshData,
}: SheetSettingsModalProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [targetTripName, setTargetTripName] = useState<string>(currentTrip || '歐洲行_2026');
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTargetTripName(currentTrip || '歐洲行_2026');
      setSyncMessage(null);
      fetch('/api/sync-sheet')
        .then(res => res.json())
        .then(data => {
          if (data.spreadsheetUrl) {
            setSpreadsheetUrl(data.spreadsheetUrl);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, currentTrip]);

  if (!isOpen) return null;

  const trimmedTargetTrip = targetTripName.trim() || currentTrip || '歐洲行_2026';
  const pairedExpensesTab =
    trimmedTargetTrip.toLowerCase() === 'itinerary'
      ? 'Expenses'
      : `${trimmedTargetTrip}_Expenses`;

  const handleSyncToGoogle = async (mode: 'mock' | 'empty') => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch('/api/sync-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trip: trimmedTargetTrip,
          mode,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSyncMessage(`🎉 ${data.message}`);
        onSelectTrip(trimmedTargetTrip);
        onRefreshData(trimmedTargetTrip);
      } else {
        setSyncMessage(`⚠️ 同步失敗: ${data.error || '請確認環境變數與試算表編輯者權限'}`);
      }
    } catch {
      setSyncMessage('⚠️ 無法連線至伺服器');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs font-sans">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
        {/* 頂部 Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500 text-white flex items-center justify-center text-sm font-bold shadow-xs">
              📊
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Google Sheets 多旅行資料庫設定</h3>
              <p className="text-xs text-slate-500">不同分頁代表不同旅行 · 行程與記帳自動配對</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 設定內容 */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* 當前連線狀態 */}
          <div
            className={`p-4 rounded-2xl border flex items-start gap-3 ${
              isGoogleConnected
                ? 'bg-sky-50/70 border-sky-200 text-sky-950'
                : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            {isGoogleConnected ? (
              <CheckCircle2 className="w-6 h-6 text-sky-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-6 h-6 text-slate-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="font-bold text-sm">
                  目前模式：{isGoogleConnected ? '🟢 已連線至 Google Sheets' : '⚪ 本機示範資料模式 (Mock Mode)'}
                </div>
                {isGoogleConnected && spreadsheetUrl && (
                  <a
                    href={spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-sky-200 text-sky-700 hover:bg-sky-100 font-semibold text-[11px] shrink-0 transition-colors"
                  >
                    <span>開啟試算表</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <p className="mt-1 text-slate-600 leading-relaxed">
                {isGoogleConnected
                  ? `目前讀取旅行：「${currentTrip}」（行程分頁：${currentTrip} ／ 記帳分頁：${
                      currentTrip.toLowerCase() === 'itinerary' ? 'Expenses' : `${currentTrip}_Expenses`
                    }）。`
                  : '目前尚未偵測到環境變數憑證，使用內建的本地 Mock JSON 資料。完成下方 .env.local 設定後即可一鍵將 Mock 資料上傳至 Google Sheet！'}
              </p>
            </div>
          </div>

          {/* 現有旅行分頁快速切換 */}
          {availableTrips.length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                <Layers className="w-4 h-4 text-sky-600" />
                <span>切換目前旅行分頁</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {availableTrips.map(trip => {
                  const isActive = trip === currentTrip;
                  return (
                    <button
                      key={trip}
                      type="button"
                      onClick={() => {
                        onSelectTrip(trip);
                        setTargetTripName(trip);
                      }}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer border ${
                        isActive
                          ? 'bg-sky-500 text-white border-sky-500 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-sky-300 hover:bg-sky-50/40'
                      }`}
                    >
                      🗂️ {trip}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 上傳 Mock 資料或建立新旅行分頁 */}
          <div className="p-4 rounded-2xl bg-sky-50/50 border border-sky-100 space-y-3">
            <div>
              <div className="font-bold text-slate-900 text-sm">
                上傳 Mock 資料 ／ 建立新旅行分頁
              </div>
              <p className="text-slate-600 mt-0.5">
                輸入旅行名稱後，系統會在 Google Sheet 自動建立成對的「<strong>{trimmedTargetTrip}</strong>」（行程）與「<strong>{pairedExpensesTab}</strong>」（記帳）分頁：
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                目標旅行（分頁）名稱
              </label>
              <input
                type="text"
                value={targetTripName}
                onChange={e => setTargetTripName(e.target.value)}
                placeholder="例如：歐洲行_2026、瑞士自由行、日本賞櫻..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleSyncToGoogle('mock')}
                disabled={isSyncing || !isGoogleConnected}
                className="py-2.5 px-3 rounded-xl bg-sky-500 hover:bg-sky-600 active:scale-95 text-white font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>上傳 Mock 資料至此旅行</span>
              </button>

              <button
                type="button"
                onClick={() => handleSyncToGoogle('empty')}
                disabled={isSyncing || !isGoogleConnected}
                className="py-2.5 px-3 rounded-xl bg-white hover:bg-slate-50 active:scale-95 text-slate-800 border border-slate-200 font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FolderPlus className="w-4 h-4 text-sky-600 shrink-0" />
                <span>建立全新空白旅行分頁</span>
              </button>
            </div>

            {!isGoogleConnected && (
              <p className="text-[11px] text-amber-700 bg-amber-50/80 border border-amber-200 rounded-xl px-3 py-1.5 font-medium">
                💡 請先依下方步驟在 <code>.env.local</code> 設定好環境變數並重啟開發伺服器，即可啟用一鍵上傳功能。
              </p>
            )}

            {syncMessage && (
              <p className="text-[11px] font-semibold text-center mt-1 text-sky-900 bg-white/80 py-1.5 px-3 rounded-xl border border-sky-200">
                {syncMessage}
              </p>
            )}
          </div>

          {/* 如何綁定 Google Sheet 與環境變數說明 */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 text-sm">需要設定哪些環境變數？</h4>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <li>前往 Google 雲端硬碟新增一份空白的 Google 試算表。</li>
              <li>
                直接複製<strong>整串試算表網址</strong>（或網址中的 <code>SPREADSHEET_ID</code>）。
              </li>
              <li>
                在 GCP Console (IAM &gt; Service Accounts) 建立一個 Service Account，下載 JSON 金鑰檔案，並在 GCP 啟用 <strong>Google Sheets API</strong>。
              </li>
              <li>
                將該 Service Account 的 Email（如 <code>xxx@xxx.iam.gserviceaccount.com</code>）加為試算表的「<strong>編輯者</strong>」。
              </li>
              <li>
                在專案的 <code>.env.local</code>（或 GCP Cloud Run 環境變數）設定以下 3 個變數：
                <pre className="mt-1.5 p-2.5 bg-slate-900 text-sky-300 rounded-xl text-[10px] overflow-x-auto leading-relaxed">
{`# 1. 可直接貼上 Google Sheet 完整網址 或 Unique ID
GOOGLE_SPREADSHEET_ID=https://docs.google.com/spreadsheets/d/你的試算表ID/edit

# 2. GCP Service Account 金鑰路徑（或完整 JSON 字串）
GOOGLE_SERVICE_ACCOUNT_KEY=./service_account.json

# 3. 預設開啟的旅行分頁名稱（選填，預設為 歐洲行_2026）
GOOGLE_SHEET_DEFAULT_TRIP=歐洲行_2026`}
                </pre>
              </li>
            </ol>
          </div>
        </div>

        {/* 底部關閉鈕 */}
        <div className="p-4 bg-white border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors cursor-pointer"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
}
