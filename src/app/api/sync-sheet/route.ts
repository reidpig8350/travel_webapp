import { NextResponse } from 'next/server';
import { syncMockDataToGoogleSheet, isGoogleSheetsConfigured } from '@/lib/googleSheets';

export async function GET() {
  return NextResponse.json({
    configured: isGoogleSheetsConfigured(),
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID ? `${process.env.GOOGLE_SPREADSHEET_ID.slice(0, 6)}...` : null,
  });
}

export async function POST() {
  try {
    const result = await syncMockDataToGoogleSheet();
    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Sync failed' }, { status: 500 });
  }
}
