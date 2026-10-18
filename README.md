# 🥐 EuroTrip Wanderlust 歐洲漫遊小手冊

> 專為歐洲旅行設計的個人網頁應用程式：即時地理定位、互動路線地圖、Google Sheets 雲端資料庫雙向同步（支援拖拉換列）、即時定位記帳與多幣別換算，可直接容器化部署於 GCP Cloud Run！

---

## ✨ 核心特色與實用功能

1. **🧭 即時 GPS 定位與歐洲路線地圖**：
   - 透過瀏覽器 HTML5 Geolocation API 自動抓取使用者當前位置，並在地圖上呈現脈衝光暈圖標。
   - 繪製 Day 1 ~ Day 3 景點路線軌跡（Polyline），提供「🎯 我的定位」與「🗺️ 歐洲全景」一鍵視角切換。
   - 支援景點分類圖標（🏰 景點、🥐 美食、🚆 交通、🛍️ 購物、🏨 住宿）。
2. **📊 Google Sheets 雲端資料庫與無痛自然表格**：
   - **完全免填 ID 與第幾天**：移除人工繁瑣編號，以物理列（Row Index）為定位，並自動以日期計算 Day 1、Day 2。
   - **拖拉交換列 (Row Swap)**：在前端上下拖拉行程卡片，後端透過 Google Sheets API 的 `MoveDimensionRequest` 即時同步試算表的實體列順序！
   - **卡片點擊詳細檢視與編輯**：支援在彈窗內編輯景點資訊、備註提醒與預估花費，並具備「依地名自動查詢經緯度」功能。
3. **💶 即時定位記帳系統**：
   - 記帳時**自動抓取當前 GPS 經緯度、當前時間與逆向地理編碼街區名稱**（如「奧地利薩爾斯堡老城區」）。
   - 自動即時換算多國幣別（EUR 歐元、CHF 瑞士法郎、GBP 英鎊 ➔ TWD 新台幣）。
   - 支援附加拍立得風格相片。
   - 點擊直接 append 寫入 Google Sheets 的 `Expenses` 工作表。
4. **🥐 可頌預算晴雨表與實用旅行小卡**：
   - 每日預算進度條：預算內呈現酥脆快樂可頌 🥐，超支切換為法棍預警 🥖。
   - ☀️ 當地即時氣溫與日落倒數小卡：依當前經緯度自動計算今日日落倒數（歐洲夏季 21:30 日落，拍照掌握黃金時刻）。
   - 💱 多幣別即時匯率速算小工具（如咖啡 4€、午餐 18€ 速算折合台幣）。
5. **雙模式切換 (Dual Mode)**：
   - **示範模式 (Mock Mode)**：內建蘇黎世 ➔ 薩爾斯堡 ➔ 哈修塔特 3 天經典行程與記帳資料，離線也能完整體驗拖拉與記帳。
   - **Google 雲端模式**：填入憑證後平滑切換至真實 Google Sheets，並提供「一鍵匯入三天範例至 Google Sheet」按鈕。

---

## 🗺️ 內建三天經典示範行程

- **Day 1 (2026-06-15)**：
  - 08:30 蘇黎世火車站 (Zürich HB) ➔ 搭乘跨國 Railjet 景觀特快列車前往薩爾斯堡
  - 14:15 薩爾斯堡中央火車站 (Salzburg Hbf) ➔ 老城區飯店 Check-in
  - 16:00 米拉貝爾宮花園 (Mirabell Palace) ➔ 《真善美》電影名場景飛馬噴泉
- **Day 2 (2026-06-16)**：
  - 09:00 高地薩爾斯堡要塞 (Festung Hohensalzburg) ➔ 登山纜車俯瞰全景
  - 12:30 蓋特萊德巷 & 莫札特出生地 (Getreidegasse) ➔ 鍛鐵招牌與炸牛排午餐
  - 15:30 薩爾斯堡大教堂 (Salzburger Dom) ➔ 巴洛克穹頂與莫札特受洗聖堂
- **Day 3 (2026-06-17)**：
  - 08:15 薩爾斯堡至哈修塔特 ➔ 150 號公車經巴德伊舍轉渡輪
  - 10:30 哈修塔特明信片角度拍照點 (Classic Postcard Viewpoint) ➔ 仙境倒影拍攝
  - 12:00 哈修塔特世界文化遺產古老鹽礦 (Salzwelten Hallstatt) ➔ 天際 Skywalk 與木滑梯
  - 15:00 市集廣場與湖畔下午茶 (Marktplatz) ➔ 湖畔露台現烤蘋果卷

---

## 🚀 本地開發與啟動

在專案目錄下：

```bash
# 啟動開發伺服器
npm run dev
```

開啟瀏覽器前往：[http://localhost:3000](http://localhost:3000) 即可開始體驗！

---

## 📊 如何綁定您的 Google 試算表？

1. **建立 Google 試算表**：
   - 前往 Google Drive 建立一份空白試算表。
   - 複製網址中的試算表 ID：`https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit`
2. **建立 GCP Service Account**：
   - 前往 [Google Cloud Console > IAM & Admin > Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)。
   - 建立一個 Service Account，並建立一組 **JSON 格式的金鑰**下載至專案根目錄，命名為 `service_account.json`。
   - 前往 [Google Cloud API Library](https://console.cloud.google.com/apis/library/sheets.googleapis.com)，啟用 **Google Sheets API**。
3. **共用試算表權限**：
   - 在 Google 試算表中點擊右上角「共用」，將 Service Account 的 Email（例如 `my-bot@project.iam.gserviceaccount.com`）新增為「**編輯者**」。
4. **設定環境變數**：
   - 建立 `.env.local` 檔案：
     ```bash
     GOOGLE_SPREADSHEET_ID=你的試算表ID
     GOOGLE_SERVICE_ACCOUNT_KEY=./service_account.json
     ```
5. **一鍵初始化試算表**：
   - 重啟伺服器後，點擊網頁右上角的「Google Sheets 設定」按鈕，點擊「**一鍵將三天範例行程寫入 Google Sheet**」，系統會自動建立 `Itinerary` 與 `Expenses` 工作表分頁並填好標題與示範資料！

---

## ☁️ 部署至 GCP Cloud Run

本專案已包含針對 Next.js 進行體積優化的 `Dockerfile` 與自動化部署腳本：

```bash
# 確保已登入 GCP
gcloud auth login
gcloud config set project <YOUR_GCP_PROJECT_ID>

# 執行自動化部署
./deploy-cloudrun.sh
```

部署至 Cloud Run 時，請至 Cloud Run 服務管理頁面之「Variables & Secrets」填入：
- `GOOGLE_SPREADSHEET_ID`：試算表 ID
- `GOOGLE_SERVICE_ACCOUNT_KEY`：可直接將 `service_account.json` 的完整 JSON 內容貼入環境變數中，系統能自動識別解析！

---

## 📁 專案結構一覽

```text
euro_trip/
├── data/
│   ├── mock_itinerary.json    # 3 天歐洲示範行程（蘇黎世➔薩爾斯堡➔哈修塔特）
│   └── mock_expenses.json     # 定位記帳示範資料
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── itinerary/     # 行程 CRUD 與拖拉交換列 API
│   │   │   ├── expenses/      # 即時 GPS 定位記帳 API
│   │   │   ├── rates/         # 多幣別即時匯率 API
│   │   │   ├── weather/       # Open-Meteo 當地氣溫與日落倒數 API
│   │   │   ├── geocode/       # 經緯度反查地名與座標搜尋 API
│   │   │   └── sync-sheet/    # Google Sheets 連線與一鍵同步 API
│   │   ├── globals.css        # Tailwind CSS 與 Leaflet 美化樣式
│   │   ├── layout.tsx         # Layout 與 PWA 可愛圖示
│   │   └── page.tsx           # 主頁面 (地圖 + 預算條 + 拖拉行程清單 + 記帳)
│   ├── components/
│   │   ├── Header.tsx         # 頂部導覽、即時位置、天氣日落卡
│   │   ├── BudgetCroissantBar.tsx # 可頌預算晴雨表與匯率速算小工具
│   │   ├── InteractiveMap.tsx # Leaflet 互動地圖、路線軌跡與 Marker
│   │   ├── ItinerarySection.tsx # 拖拉行程清單（以日期分天標題）
│   │   ├── EditItineraryModal.tsx # 行程詳情檢視與編輯 Modal
│   │   ├── AddItineraryModal.tsx  # 新增踩點 Modal
│   │   ├── ExpenseModal.tsx       # 即時定位記帳彈窗
│   │   ├── ExpensesListModal.tsx  # 記帳明細列表
│   │   └── SheetSettingsModal.tsx # Google Sheets 連線與初始化彈窗
│   ├── lib/
│   │   └── googleSheets.ts    # Google Sheets API 封裝 (含 moveDimension)
│   └── types/
│       └── index.ts           # TypeScript 資料型別定義
├── Dockerfile                 # GCP Cloud Run 專用多階段建置
├── deploy-cloudrun.sh         # 一鍵部署 Bash 腳本
└── package.json
```
