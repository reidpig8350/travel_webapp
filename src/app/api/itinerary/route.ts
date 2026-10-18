import { NextResponse } from 'next/server';
import { getItinerary, addItineraryRow, updateItineraryRow } from '@/lib/googleSheets';

export async function GET() {
  try {
    const data = await getItinerary();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch itinerary' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const newItem = await addItineraryRow(body);
    return NextResponse.json(newItem, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to add item' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { rowIndex, ...updates } = body;
    if (!rowIndex) {
      return NextResponse.json({ error: 'rowIndex is required for updating' }, { status: 400 });
    }
    await updateItineraryRow(rowIndex, updates);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update item' }, { status: 500 });
  }
}
