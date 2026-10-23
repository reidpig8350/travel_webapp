import { google, sheets_v4 } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { ItineraryItem, ExpenseItem } from '@/types';

const MOCK_ITINERARY_PATH = path.join(process.cwd(), 'data', 'mock_itinerary.json');
const MOCK_EXPENSES_PATH = path.join(process.cwd(), 'data', 'mock_expenses.json');

export const ITINERARY_HEADERS = [
  '日期', '時間', '國家', '城市', '景點名稱', '類別', '緯度', '經度', '門票狀態', '預估費用', '備註提醒', '已完成',
];

export const EXPENSES_HEADERS = [
  '記錄時間', '消費項目', '消費類別', '當地金額', '幣別', '兌台幣匯率', '折合台幣', '支付方式', '緯度', '經度', '地點名稱', '備註備忘',
];

// 讀取/寫入 Mock 檔案的輔助函式
export function readMockItinerary(): ItineraryItem[] {
  try {
    if (fs.existsSync(MOCK_ITINERARY_PATH)) {
      const data = fs.readFileSync(MOCK_ITINERARY_PATH, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Failed to read mock itinerary:', err);
  }
  return [];
}

export function writeMockItinerary(items: ItineraryItem[]): void {
  try {
    fs.writeFileSync(MOCK_ITINERARY_PATH, JSON.stringify(items, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write mock itinerary:', err);
  }
}

export function readMockExpenses(): ExpenseItem[] {
  try {
    if (fs.existsSync(MOCK_EXPENSES_PATH)) {
      const data = fs.readFileSync(MOCK_EXPENSES_PATH, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Failed to read mock expenses:', err);
  }
  return [];
}

export function writeMockExpenses(items: ExpenseItem[]): void {
  try {
    fs.writeFileSync(MOCK_EXPENSES_PATH, JSON.stringify(items, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write mock expenses:', err);
  }
}

/**
 * 解析環境變數中的 GOOGLE_SPREADSHEET_ID
 * 支援直接貼上完整 Google Sheet 網址（如 https://docs.google.com/spreadsheets/d/1BxiMVs.../edit）或單純的 Unique ID
 */
export function parseSpreadsheetId(rawInput?: string): string | null {
  if (!rawInput) return null;
  const trimmed = rawInput.trim();
  if (
    !trimmed ||
    trimmed === 'your_google_spreadsheet_id_here' ||
    trimmed === 'your_google_spreadsheet_url_or_id_here'
  ) {
    return null;
  }
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : trimmed;
}

/**
 * 取得環境變數設定的預設旅行分頁名稱
 */
export function getDefaultTripName(): string {
  const envTrip = process.env.GOOGLE_SHEET_DEFAULT_TRIP?.trim();
  return envTrip || '歐洲行_2026';
}

/**
 * 依據旅行名稱取得配對的「行程分頁」與「記帳分頁」名稱
 * 例如：旅行名稱「歐洲行_2026」 ➔ 行程分頁「歐洲行_2026」、記帳分頁「歐洲行_2026_Expenses」
 * 同時向下相容舊版預設分頁「Itinerary」與「Expenses」
 */
export function getTripSheetNames(tripName?: string): {
  trip: string;
  itineraryTab: string;
  expensesTab: string;
} {
  const trip = tripName?.trim() || getDefaultTripName();
  if (trip.toLowerCase() === 'itinerary') {
    return {
      trip: 'Itinerary',
      itineraryTab: 'Itinerary',
      expensesTab: 'Expenses',
    };
  }
  return {
    trip,
    itineraryTab: trip,
    expensesTab: `${trip}_Expenses`,
  };
}

/**
 * 安全組裝 Google Sheets A1 Notation Range（處理中文、空白與單引號）
 */
export function formatSheetRange(tabName: string, cellRange: string): string {
  const escaped = tabName.replace(/'/g, "''");
  return `'${escaped}'!${cellRange}`;
}

// 判斷 Google Sheets 是否配置齊全
export function isGoogleSheetsConfigured(): boolean {
  const sheetId = parseSpreadsheetId(process.env.GOOGLE_SPREADSHEET_ID);
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.trim();
  return Boolean(sheetId && key);
}

// 建立 Google Sheets API 客戶端
async function getSheetsClient(): Promise<{ sheets: sheets_v4.Sheets; spreadsheetId: string }> {
  const spreadsheetId = parseSpreadsheetId(process.env.GOOGLE_SPREADSHEET_ID);
  const keySource = process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.trim();

  if (!spreadsheetId || !keySource) {
    throw new Error('Google Sheets credentials not provided in environment variables.');
  }

  let credentials;
  // 判斷 keySource 是檔案路徑、JSON 字串還是 Base64 字串
  const resolvedKeyPath = fs.existsSync(keySource)
    ? keySource
    : path.resolve(/*turbopackIgnore: true*/ process.cwd(), keySource);

  if (keySource.startsWith('{')) {
    credentials = JSON.parse(keySource);
  } else if (fs.existsSync(resolvedKeyPath)) {
    const raw = fs.readFileSync(resolvedKeyPath, 'utf-8');
    credentials = JSON.parse(raw);
  } else {
    // 嘗試 Base64 解碼
    try {
      const decoded = Buffer.from(keySource, 'base64').toString('utf-8');
      credentials = JSON.parse(decoded);
    } catch {
      throw new Error('Unable to parse GOOGLE_SERVICE_ACCOUNT_KEY (not JSON or valid file path)');
    }
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  return { sheets, spreadsheetId };
}

// 取得工作表的數值 sheetId（用於 batchUpdate 搬移或交換列）
async function getSheetTabId(sheets: sheets_v4.Sheets, spreadsheetId: string, title: string): Promise<number> {
  const res = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = res.data.sheets?.find(s => s.properties?.title?.toLowerCase() === title.toLowerCase());
  return sheet?.properties?.sheetId ?? 0;
}

/**
 * 取得 Google Sheet 中所有可用的「旅行分頁」清單
 * 自動過濾掉 `*_Expenses`、`Expenses` 與預設空白工作表 (`Sheet1`, `工作表1`)
 */
export async function getAvailableTrips(): Promise<string[]> {
  const defaultTrip = getDefaultTripName();
  if (!isGoogleSheetsConfigured()) {
    return [defaultTrip];
  }

  try {
    const { sheets, spreadsheetId } = await getSheetsClient();
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const allTitles = (meta.data.sheets?.map(s => s.properties?.title).filter(Boolean) as string[]) || [];

    const tripTabs = allTitles.filter(title => {
      const lower = title.toLowerCase();
      if (lower === 'expenses' || lower.endsWith('_expenses')) return false;
      if ((lower === 'sheet1' || title === '工作表1') && title !== defaultTrip) return false;
      return true;
    });

    if (tripTabs.length === 0) {
      return [defaultTrip];
    }
    return tripTabs;
  } catch (err) {
    console.error('Failed to list available trips from Google Sheets:', err);
    return [defaultTrip];
  }
}

/**
 * 確保指定旅行的行程分頁與記帳分頁皆已存在；若不存在則自動建立並填入標題列
 */
async function ensureTripSheetsExist(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  tripName?: string
): Promise<{ itineraryTab: string; expensesTab: string }> {
  const { itineraryTab, expensesTab } = getTripSheetNames(tripName);
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existingTitles = (meta.data.sheets?.map(s => s.properties?.title).filter(Boolean) as string[]) || [];

  const createdItinerary = !existingTitles.includes(itineraryTab);
  const createdExpenses = !existingTitles.includes(expensesTab);

  const requests: sheets_v4.Schema$Request[] = [];
  if (createdItinerary) {
    requests.push({ addSheet: { properties: { title: itineraryTab } } });
  }
  if (createdExpenses) {
    requests.push({ addSheet: { properties: { title: expensesTab } } });
  }

  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } });
  }

  if (createdItinerary) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: formatSheetRange(itineraryTab, 'A1:L1'),
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [ITINERARY_HEADERS] },
    });
  }

  if (createdExpenses) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: formatSheetRange(expensesTab, 'A1:L1'),
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [EXPENSES_HEADERS] },
    });
  }

  return { itineraryTab, expensesTab };
}

// ==========================================
// 行程管理 (Itinerary)
// ==========================================

export async function getItinerary(tripName?: string): Promise<{
  items: ItineraryItem[];
  source: 'google_sheets' | 'mock';
  currentTrip: string;
  availableTrips: string[];
}> {
  const { trip, itineraryTab } = getTripSheetNames(tripName);

  if (!isGoogleSheetsConfigured()) {
    return {
      items: readMockItinerary(),
      source: 'mock',
      currentTrip: trip,
      availableTrips: [getDefaultTripName()],
    };
  }

  try {
    const { sheets, spreadsheetId } = await getSheetsClient();
    const availableTrips = await getAvailableTrips();

    // 若指定分頁尚不存在，檢查是否可讀取第一個可用旅行或回傳空陣列
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const existingTitles = (meta.data.sheets?.map(s => s.properties?.title).filter(Boolean) as string[]) || [];

    if (!existingTitles.includes(itineraryTab)) {
      // 若該旅行分頁還沒建立過，回傳 Mock 示範行程但標記為 google_sheets 已連線（方便使用者一鍵匯入）
      return {
        items: readMockItinerary(),
        source: 'google_sheets',
        currentTrip: trip,
        availableTrips: availableTrips.includes(trip) ? availableTrips : [trip, ...availableTrips],
      };
    }

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: formatSheetRange(itineraryTab, 'A2:L'),
    });

    const rows = res.data.values || [];
    const items: ItineraryItem[] = rows.map((row, idx) => ({
      rowIndex: idx + 2, // 1-based, 標題為第 1 列，資料從第 2 列開始
      date: row[0] || '',
      time: row[1] || '',
      country: row[2] || '',
      city: row[3] || '',
      spot_name: row[4] || '',
      category: row[5] || '景點',
      lat: parseFloat(row[6]) || 0,
      lng: parseFloat(row[7]) || 0,
      ticket_status: row[8] || '免門票',
      cost_estimate: parseFloat(row[9]) || 0,
      notes: row[10] || '',
      completed: row[11] === 'TRUE' || row[11] === 'true' || row[11] === true || false,
    }));

    return {
      items,
      source: 'google_sheets',
      currentTrip: trip,
      availableTrips: availableTrips.includes(trip) ? availableTrips : [trip, ...availableTrips],
    };
  } catch (err) {
    console.error('Google Sheets getItinerary error, falling back to mock:', err);
    return {
      items: readMockItinerary(),
      source: 'mock',
      currentTrip: trip,
      availableTrips: [trip],
    };
  }
}

export async function updateItineraryRow(
  rowIndex: number,
  item: Partial<ItineraryItem>,
  tripName?: string
): Promise<void> {
  if (!isGoogleSheetsConfigured()) {
    const items = readMockItinerary();
    const targetIdx = items.findIndex(i => i.rowIndex === rowIndex);
    if (targetIdx !== -1) {
      items[targetIdx] = { ...items[targetIdx], ...item };
      writeMockItinerary(items);
    }
    return;
  }

  const { sheets, spreadsheetId } = await getSheetsClient();
  const { itineraryTab } = await ensureTripSheetsExist(sheets, spreadsheetId, tripName);
  const range = formatSheetRange(itineraryTab, `A${rowIndex}:L${rowIndex}`);

  // 先讀取原該列，做 partial merge，以防部分更新遺失原有欄位
  const getRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });
  const existing = getRes.data.values?.[0] || [];

  const merged = [
    item.date !== undefined ? item.date : (existing[0] ?? ''),
    item.time !== undefined ? item.time : (existing[1] ?? ''),
    item.country !== undefined ? item.country : (existing[2] ?? ''),
    item.city !== undefined ? item.city : (existing[3] ?? ''),
    item.spot_name !== undefined ? item.spot_name : (existing[4] ?? ''),
    item.category !== undefined ? item.category : (existing[5] ?? '景點'),
    item.lat !== undefined ? item.lat : (existing[6] ?? ''),
    item.lng !== undefined ? item.lng : (existing[7] ?? ''),
    item.ticket_status !== undefined ? item.ticket_status : (existing[8] ?? ''),
    item.cost_estimate !== undefined ? item.cost_estimate : (existing[9] ?? 0),
    item.notes !== undefined ? item.notes : (existing[10] ?? ''),
    item.completed !== undefined ? (item.completed ? 'TRUE' : 'FALSE') : (existing[11] ?? 'FALSE'),
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [merged] },
  });
}

export async function addItineraryRow(
  item: Omit<ItineraryItem, 'rowIndex'>,
  tripName?: string
): Promise<ItineraryItem> {
  if (!isGoogleSheetsConfigured()) {
    const items = readMockItinerary();
    const nextRow = items.length > 0 ? Math.max(...items.map(i => i.rowIndex)) + 1 : 2;
    const newItem: ItineraryItem = { ...item, rowIndex: nextRow };
    items.push(newItem);
    writeMockItinerary(items);
    return newItem;
  }

  const { sheets, spreadsheetId } = await getSheetsClient();
  const { itineraryTab } = await ensureTripSheetsExist(sheets, spreadsheetId, tripName);
  const values = [
    [
      item.date,
      item.time,
      item.country,
      item.city,
      item.spot_name,
      item.category,
      item.lat,
      item.lng,
      item.ticket_status,
      item.cost_estimate,
      item.notes,
      item.completed ? 'TRUE' : 'FALSE',
    ],
  ];

  const res = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: formatSheetRange(itineraryTab, 'A:L'),
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });

  const updatedRange = res.data.updates?.updatedRange || '';
  const match = updatedRange.match(/!A(\d+)/);
  const rowIndex = match ? parseInt(match[1], 10) : 2;

  return { ...item, rowIndex };
}

// 核心功能：拖拉交換列 / 重新排序
export async function reorderItinerary(
  sourceIndex: number,
  destinationIndex: number,
  tripName?: string
): Promise<void> {
  // sourceIndex 與 destinationIndex 為前端 0-based 陣列索引
  if (!isGoogleSheetsConfigured()) {
    const items = readMockItinerary();
    const [moved] = items.splice(sourceIndex, 1);
    items.splice(destinationIndex, 0, moved);
    // 重新編定 rowIndex
    const updated = items.map((it, idx) => ({ ...it, rowIndex: idx + 2 }));
    writeMockItinerary(updated);
    return;
  }

  const { sheets, spreadsheetId } = await getSheetsClient();
  const { itineraryTab } = await ensureTripSheetsExist(sheets, spreadsheetId, tripName);
  const sheetTabId = await getSheetTabId(sheets, spreadsheetId, itineraryTab);

  // Google Sheets API 0-indexed 行索引（第 1 列標題為 index 0，第 2 列行程首行為 index 1）
  const sourceSheetRow = sourceIndex + 1;
  const destSheetRow = destinationIndex > sourceIndex ? destinationIndex + 2 : destinationIndex + 1;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          moveDimension: {
            source: {
              sheetId: sheetTabId,
              dimension: 'ROWS',
              startIndex: sourceSheetRow,
              endIndex: sourceSheetRow + 1,
            },
            destinationIndex: destSheetRow,
          },
        },
      ],
    },
  });
}

// 刪除行程列 (Row Delete)
export async function deleteItineraryRow(rowIndex: number, tripName?: string): Promise<void> {
  if (!isGoogleSheetsConfigured()) {
    const items = readMockItinerary();
    const targetIdx = items.findIndex(i => i.rowIndex === rowIndex);
    if (targetIdx !== -1) {
      items.splice(targetIdx, 1);
      // 刪除後將剩餘行程重新編訂 rowIndex（維持與試算表列數一致）
      const updated = items.map((it, idx) => ({ ...it, rowIndex: idx + 2 }));
      writeMockItinerary(updated);
    }
    return;
  }

  const { sheets, spreadsheetId } = await getSheetsClient();
  const { itineraryTab } = await ensureTripSheetsExist(sheets, spreadsheetId, tripName);
  const sheetTabId = await getSheetTabId(sheets, spreadsheetId, itineraryTab);

  // Google Sheets API 0-indexed 行索引（第 1 列標題為 index 0，第 rowIndex 列為 index: rowIndex - 1）
  const startSheetRow = rowIndex - 1;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: sheetTabId,
              dimension: 'ROWS',
              startIndex: startSheetRow,
              endIndex: startSheetRow + 1,
            },
          },
        },
      ],
    },
  });
}

// ==========================================
// 記帳管理 (Expenses)
// ==========================================

export async function getExpenses(tripName?: string): Promise<{
  items: ExpenseItem[];
  source: 'google_sheets' | 'mock';
  currentTrip: string;
}> {
  const { trip, expensesTab } = getTripSheetNames(tripName);

  if (!isGoogleSheetsConfigured()) {
    return { items: readMockExpenses(), source: 'mock', currentTrip: trip };
  }

  try {
    const { sheets, spreadsheetId } = await getSheetsClient();
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const existingTitles = (meta.data.sheets?.map(s => s.properties?.title).filter(Boolean) as string[]) || [];

    if (!existingTitles.includes(expensesTab)) {
      return { items: [], source: 'google_sheets', currentTrip: trip };
    }

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: formatSheetRange(expensesTab, 'A2:L'),
    });

    const rows = res.data.values || [];
    const items: ExpenseItem[] = rows.map((row, idx) => ({
      rowIndex: idx + 2,
      id: `EXP-${idx + 1}`,
      timestamp: row[0] || '',
      item: row[1] || '',
      category: row[2] || '其他',
      amount_orig: parseFloat(row[3]) || 0,
      currency: row[4] || 'EUR',
      rate_to_twd: parseFloat(row[5]) || 35.0,
      amount_twd: parseFloat(row[6]) || 0,
      payment_type: row[7] || 'Apple Pay',
      lat: row[8] ? parseFloat(row[8]) : null,
      lng: row[9] ? parseFloat(row[9]) : null,
      location_name: row[10] || '',
      notes: row[11] || '',
    }));

    return { items, source: 'google_sheets', currentTrip: trip };
  } catch (err) {
    console.error('Google Sheets getExpenses error, falling back to mock:', err);
    return { items: readMockExpenses(), source: 'mock', currentTrip: trip };
  }
}

export async function addExpense(
  expense: Omit<ExpenseItem, 'rowIndex'>,
  tripName?: string
): Promise<ExpenseItem> {
  if (!isGoogleSheetsConfigured()) {
    const items = readMockExpenses();
    const newItem: ExpenseItem = { ...expense, rowIndex: items.length + 2 };
    items.unshift(newItem); // 最新的放前面
    writeMockExpenses(items);
    return newItem;
  }

  const { sheets, spreadsheetId } = await getSheetsClient();
  const { expensesTab } = await ensureTripSheetsExist(sheets, spreadsheetId, tripName);
  const values = [
    [
      expense.timestamp,
      expense.item,
      expense.category,
      expense.amount_orig,
      expense.currency,
      expense.rate_to_twd,
      expense.amount_twd,
      expense.payment_type,
      expense.lat ?? '',
      expense.lng ?? '',
      expense.location_name,
      expense.notes,
    ],
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: formatSheetRange(expensesTab, 'A:L'),
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });

  return expense;
}

// ==========================================
// 初始化 Google Sheet 旅行分頁結構與示範資料
// ==========================================

export async function syncMockDataToGoogleSheet(
  tripName?: string,
  mode: 'mock' | 'empty' = 'mock'
): Promise<{
  success: boolean;
  message: string;
  trip: string;
  availableTrips: string[];
}> {
  const { trip, itineraryTab, expensesTab } = getTripSheetNames(tripName);

  if (!isGoogleSheetsConfigured()) {
    return {
      success: false,
      message: '尚未設定 Google Sheets 環境變數 (GOOGLE_SPREADSHEET_ID 與 GOOGLE_SERVICE_ACCOUNT_KEY)',
      trip,
      availableTrips: [trip],
    };
  }

  try {
    const { sheets, spreadsheetId } = await getSheetsClient();

    // 1. 確保目標旅行的行程分頁與記帳分頁存在
    await ensureTripSheetsExist(sheets, spreadsheetId, trip);

    // 先清空舊範圍資料，避免殘留多餘列
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: formatSheetRange(itineraryTab, 'A1:L'),
    });
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: formatSheetRange(expensesTab, 'A1:L'),
    });

    // 2. 準備寫入行程分頁（標題列 + Mock 行程或空白）
    const mockItinerary = mode === 'mock' ? readMockItinerary() : [];
    const itineraryRows = [
      ITINERARY_HEADERS,
      ...mockItinerary.map(i => [
        i.date,
        i.time,
        i.country,
        i.city,
        i.spot_name,
        i.category,
        i.lat,
        i.lng,
        i.ticket_status,
        i.cost_estimate,
        i.notes,
        i.completed ? 'TRUE' : 'FALSE',
      ]),
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: formatSheetRange(itineraryTab, 'A1:L'),
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: itineraryRows },
    });

    // 3. 準備寫入記帳分頁（標題列 + Mock 記帳或空白）
    const mockExpenses = mode === 'mock' ? readMockExpenses() : [];
    const expenseRows = [
      EXPENSES_HEADERS,
      ...mockExpenses.map(e => [
        e.timestamp,
        e.item,
        e.category,
        e.amount_orig,
        e.currency,
        e.rate_to_twd,
        e.amount_twd,
        e.payment_type,
        e.lat ?? '',
        e.lng ?? '',
        e.location_name,
        e.notes,
      ]),
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: formatSheetRange(expensesTab, 'A1:L'),
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: expenseRows },
    });

    const availableTrips = await getAvailableTrips();
    const message =
      mode === 'mock'
        ? `成功將 Mock 行程與記帳資料上傳至「${itineraryTab}」與「${expensesTab}」分頁！`
        : `成功建立全新空白旅行分頁「${itineraryTab}」與「${expensesTab}」！`;

    return {
      success: true,
      message,
      trip,
      availableTrips: availableTrips.includes(trip) ? availableTrips : [trip, ...availableTrips],
    };
  } catch (err: unknown) {
    console.error('Failed to sync to Google Sheet:', err);
    return {
      success: false,
      message: (err as Error)?.message || '同步失敗',
      trip,
      availableTrips: [trip],
    };
  }
}
