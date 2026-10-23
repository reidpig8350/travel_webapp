import { NextResponse } from 'next/server';
import {
  syncMockDataToGoogleSheet,
  isGoogleSheetsConfigured,
  parseSpreadsheetId,
  getDefaultTripName,
  getAvailableTrips,
} from '@/lib/googleSheets';

export async function GET() {
  const spreadsheetId = parseSpreadsheetId(process.env.GOOGLE_SPREADSHEET_ID);
  const availableTrips = await getAvailableTrips();
  return NextResponse.json({
    configured: isGoogleSheetsConfigured(),
    spreadsheetId: spreadsheetId ? `${spreadsheetId.slice(0, 8)}...` : null,
    spreadsheetUrl: spreadsheetId ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit` : null,
    defaultTrip: getDefaultTripName(),
    availableTrips,
  });
}

export async function POST(req: Request) {
  try {
    let trip: string | undefined;
    let mode: 'mock' | 'empty' = 'mock';
    try {
      const body = await req.json();
      trip = body?.trip;
      if (body?.mode === 'empty') {
        mode = 'empty';
      }
    } catch {
      // body 可能為空，使用預設值
    }

    const result = await syncMockDataToGoogleSheet(trip, mode);
    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Sync failed' }, { status: 500 });
  }
}
