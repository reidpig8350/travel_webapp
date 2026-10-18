'use client';

import React, { useState } from 'react';
import { X, Database, CheckCircle2, AlertCircle, ArrowUpRight, Copy, RefreshCw } from 'lucide-react';

interface SheetSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isGoogleConnected: boolean;
  onRefreshData: () => void;
}

export default function SheetSettingsModal({
  isOpen,
  onClose,
  isGoogleConnected,
  onRefreshData,
}: SheetSettingsModalProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSyncToGoogle = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch('/api/sync-sheet', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSyncMessage(`🎉 ${data.message || '已成功將三天示範行程同步至 Google Sheet！'}`);
        onRefreshData();
      } else {
        setSyncMessage(`⚠️ 同步失敗: ${data.error || '請確認環境變數與試算表權限'}`);
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
              <h3 className="font-bold text-slate-900 text-base">Google Sheets 資料庫設定</h3>
              <p className="text-xs text-slate-500">雲端試算表雙向同步與部署配置</p>
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
            className={`p-4 rounded-2xl border flex items-center gap-3 ${
              isGoogleConnected
                ? 'bg-sky-50/70 border-sky-200 text-sky-950'
                : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            {isGoogleConnected ? (
              <CheckCircle2 className="w-6 h-6 text-sky-600 shrink-0" />
            ) : (
              <AlertCircle className="w-6 h-6 text-slate-400 shrink-0" />
            )}
            <div>
              <div className="font-bold text-sm">
                目前模式：{isGoogleConnected ? '🟢 已連線至 Google Sheets' : '⚪ 本機示範資料模式 (Mock Mode)'}
              </div>
              <p className="mt-0.5 text-slate-500">
                {isGoogleConnected
                  ? '所有行程更動、拖拉交換列與即時定位記帳均會即時同步至您的 Google 試算表。'
                  : '目前使用內建的 3 天歐洲範例資料（蘇黎世➔薩爾斯堡➔哈修塔特），拖拉排序與記帳會自動保存在本地 JSON 檔案。'}
              </p>
            </div>
          </div>

          {/* 一鍵同步至 Google Sheet */}
          {isGoogleConnected && (
            <div className="p-4 rounded-2xl bg-sky-50/50 border border-sky-100 space-y-2">
              <div className="font-bold text-slate-900">匯入預設範本行程至 Google Sheet</div>
              <p className="text-slate-600">
                如果您的試算表是全新空白的，點擊下方按鈕可一鍵自動建立 `Itinerary` 與 `Expenses` 分頁，並填入三天行程範例。
              </p>
              <button
                onClick={handleSyncToGoogle}
                disabled={isSyncing}
                className="w-full py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 active:scale-95 text-white font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? '同步寫入中...' : '一鍵將三天範例行程寫入 Google Sheet'}</span>
              </button>
              {syncMessage && (
                <p className="text-[11px] font-semibold text-center mt-1 text-sky-800">
                  {syncMessage}
                </p>
              )}
            </div>
          )}

          {/* 如何綁定 Google Sheet 教學說明 */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 text-sm">如何綁定您個人的 Google Sheet？</h4>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <li>前往 Google 雲端硬碟新增一份空白的 Google 試算表。</li>
              <li>複製試算表網址中的 <code>SPREADSHEET_ID</code>。</li>
              <li>在 GCP IAM 建立一個 Service Account，下載其 JSON 金鑰檔案。</li>
              <li>
                將該 Service Account 的 Email（如 <code>xxx@xxx.iam.gserviceaccount.com</code>）加為試算表的「<strong>編輯者</strong>」。
              </li>
              <li>
                在專案的 <code>.env.local</code>（或 GCP Cloud Run 環境變數）填入：
                <pre className="mt-1 p-2 bg-slate-900 text-sky-300 rounded-lg text-[10px] overflow-x-auto">
{`GOOGLE_SPREADSHEET_ID=你的試算表ID
GOOGLE_SERVICE_ACCOUNT_KEY=./service_account.json`}
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
