import { NextResponse } from 'next/server';
import { getExpenses, addExpense } from '@/lib/googleSheets';
import { ExpenseItem } from '@/types';

export async function GET() {
  try {
    const data = await getExpenses();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch expenses' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 格式化記帳資料
    const expense: Omit<ExpenseItem, 'rowIndex'> = {
      id: `EXP-${Date.now()}`,
      timestamp: body.timestamp || new Date().toLocaleString('zh-TW', { hour12: false }),
      item: body.item || '未命名消費',
      category: body.category || '其他',
      amount_orig: Number(body.amount_orig) || 0,
      currency: body.currency || 'EUR',
      rate_to_twd: Number(body.rate_to_twd) || 35.0,
      amount_twd: Math.round((Number(body.amount_orig) || 0) * (Number(body.rate_to_twd) || 35.0)),
      payment_type: body.payment_type || 'Apple Pay',
      lat: body.lat ? Number(body.lat) : null,
      lng: body.lng ? Number(body.lng) : null,
      location_name: body.location_name || '',
      notes: body.notes || '',
      photo_url: body.photo_url || '',
    };

    const saved = await addExpense(expense);
    return NextResponse.json(saved, { status: 201 });
  } catch (err: any) {
    console.error('Failed to add expense:', err);
    return NextResponse.json({ error: err.message || 'Failed to record expense' }, { status: 500 });
  }
}
