import { google, sheets_v4 } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { ItineraryItem, ExpenseItem } from '@/types';

const MOCK_ITINERARY_PATH = path.join(process.cwd(), 'data', 'mock_itinerary.json');
const MOCK_EXPENSES_PATH = path.join(process.cwd(), 'data', 'mock_expenses.json');

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

// 判斷 Google Sheets 是否配置齊全
export function isGoogleSheetsConfigured(): boolean {
  const sheetId = process.env.GOOGLE_SPREADSHEET_ID;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  return Boolean(sheetId && key);
}

// 建立 Google Sheets API 客戶端
async function getSheetsClient(): Promise<{ sheets: sheets_v4.Sheets; spreadsheetId: string }> {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  const keySource = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (!spreadsheetId || !keySource) {
    throw new Error('Google Sheets credentials not provided in environment variables.');
  }

  let credentials;
  // 判斷 keySource 是檔案路徑、JSON 字串還是 Base64 字串
  if (keySource.trim().startsWith('{')) {
    credentials = JSON.parse(keySource);
  } else if (fs.existsSync(keySource)) {
    const raw = fs.readFileSync(keySource, 'utf-8');
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

// ==========================================
// 行程管理 (Itinerary)
// ==========================================

export async function getItinerary(): Promise<{ items: ItineraryItem[]; source: 'google_sheets' | 'mock' }> {
  if (!isGoogleSheetsConfigured()) {
    return { items: readMockItinerary(), source: 'mock' };
  }

  try {
    const { sheets, spreadsheetId } = await getSheetsClient();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Itinerary!A2:L',
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

    // 若 Google Sheet 尚無資料，自動以 Mock 資料回傳
    if (items.length === 0) {
      return { items: readMockItinerary(), source: 'mock' };
    }

    return { items, source: 'google_sheets' };
  } catch (err) {
    console.error('Google Sheets getItinerary error, falling back to mock:', err);
    return { items: readMockItinerary(), source: 'mock' };
  }
}

export async function updateItineraryRow(rowIndex: number, item: Partial<ItineraryItem>): Promise<void> {
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
  const range = `Itinerary!A${rowIndex}:L${rowIndex}`;

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

export async function addItineraryRow(item: Omit<ItineraryItem, 'rowIndex'>): Promise<ItineraryItem> {
  if (!isGoogleSheetsConfigured()) {
    const items = readMockItinerary();
    const nextRow = items.length > 0 ? Math.max(...items.map(i => i.rowIndex)) + 1 : 2;
    const newItem: ItineraryItem = { ...item, rowIndex: nextRow };
    items.push(newItem);
    writeMockItinerary(items);
    return newItem;
  }

  const { sheets, spreadsheetId } = await getSheetsClient();
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
    range: 'Itinerary!A:L',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });

  const updatedRange = res.data.updates?.updatedRange || 'Itinerary!A2:K2';
  const match = updatedRange.match(/Itinerary!A(\d+)/);
  const rowIndex = match ? parseInt(match[1], 10) : 2;

  return { ...item, rowIndex };
}

// 核心功能：拖拉交換列 / 重新排序
export async function reorderItinerary(sourceIndex: number, destinationIndex: number): Promise<void> {
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
  const sheetTabId = await getSheetTabId(sheets, spreadsheetId, 'Itinerary');

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

// ==========================================
// 記帳管理 (Expenses)
// ==========================================

export async function getExpenses(): Promise<{ items: ExpenseItem[]; source: 'google_sheets' | 'mock' }> {
  if (!isGoogleSheetsConfigured()) {
    return { items: readMockExpenses(), source: 'mock' };
  }

  try {
    const { sheets, spreadsheetId } = await getSheetsClient();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Expenses!A2:L',
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

    return { items, source: 'google_sheets' };
  } catch (err) {
    console.error('Google Sheets getExpenses error, falling back to mock:', err);
    return { items: readMockExpenses(), source: 'mock' };
  }
}

export async function addExpense(expense: Omit<ExpenseItem, 'rowIndex'>): Promise<ExpenseItem> {
  if (!isGoogleSheetsConfigured()) {
    const items = readMockExpenses();
    const newItem: ExpenseItem = { ...expense, rowIndex: items.length + 2 };
    items.unshift(newItem); // 最新的放前面
    writeMockExpenses(items);
    return newItem;
  }

  const { sheets, spreadsheetId } = await getSheetsClient();
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
    range: 'Expenses!A:L',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });

  return expense;
}

// ==========================================
// 初始化 Google Sheet 表格結構與示範資料
// ==========================================

export async function syncMockDataToGoogleSheet(): Promise<{ success: boolean; message: string }> {
  if (!isGoogleSheetsConfigured()) {
    return { success: false, message: 'Google Sheets credentials not set in environment.' };
  }

  try {
    const { sheets, spreadsheetId } = await getSheetsClient();

    // 1. 確保工作表分頁存在
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const existingTitles = meta.data.sheets?.map(s => s.properties?.title) || [];

    const requests = [];
    if (!existingTitles.includes('Itinerary')) {
      requests.push({ addSheet: { properties: { title: 'Itinerary' } } });
    }
    if (!existingTitles.includes('Expenses')) {
      requests.push({ addSheet: { properties: { title: 'Expenses' } } });
    }
    if (requests.length > 0) {
      await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } });
    }

    // 2. 寫入標題列與範例行程
    const itineraryHeaders = [
      '日期', '時間', '國家', '城市', '景點名稱', '類別', '緯度', '經度', '門票狀態', '預估費用', '備註提醒', '已完成',
    ];
    const mockItinerary = readMockItinerary();
    const itineraryRows = [
      itineraryHeaders,
      ...mockItinerary.map(i => [
        i.date, i.time, i.country, i.city, i.spot_name, i.category, i.lat, i.lng, i.ticket_status, i.cost_estimate, i.notes, i.completed ? 'TRUE' : 'FALSE',
      ]),
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Itinerary!A1:L',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: itineraryRows },
    });

    // 3. 寫入標題列與範例花費
    const expensesHeaders = [
      '記錄時間', '消費項目', '消費類別', '當地金額', '幣別', '兌台幣匯率', '折合台幣', '支付方式', '緯度', '經度', '地點名稱', '備註備忘',
    ];
    const mockExpenses = readMockExpenses();
    const expenseRows = [
      expensesHeaders,
      ...mockExpenses.map(e => [
        e.timestamp, e.item, e.category, e.amount_orig, e.currency, e.rate_to_twd, e.amount_twd, e.payment_type, e.lat ?? '', e.lng ?? '', e.location_name, e.notes,
      ]),
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Expenses!A1:L',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: expenseRows },
    });

    return { success: true, message: '成功初始化 Google Sheet 工作表並同步三天行程與記帳資料！' };
  } catch (err: unknown) {
    console.error('Failed to sync to Google Sheet:', err);
    return { success: false, message: (err as Error)?.message || '同步失敗' };
  }
}
