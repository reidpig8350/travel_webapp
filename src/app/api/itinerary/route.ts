import { NextResponse } from 'next/server';
import {
  getItinerary,
  addItineraryRow,
  updateItineraryRow,
  deleteItineraryRow,
} from '@/lib/googleSheets';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const trip = searchParams.get('trip') || undefined;
    const data = await getItinerary(trip);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch itinerary' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const body = await req.json();
    const { trip: bodyTrip, ...itemData } = body;
    const trip = bodyTrip || searchParams.get('trip') || undefined;
    const newItem = await addItineraryRow(itemData, trip);
    return NextResponse.json(newItem, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to add item' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const body = await req.json();
    const { rowIndex, trip: bodyTrip, ...updates } = body;
    const trip = bodyTrip || searchParams.get('trip') || undefined;
    if (!rowIndex) {
      return NextResponse.json({ error: 'rowIndex is required for updating' }, { status: 400 });
    }
    await updateItineraryRow(rowIndex, updates, trip);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update item' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let rowIndex: number | undefined;
    let trip: string | undefined;

    try {
      const body = await req.json();
      if (body && body.rowIndex) {
        rowIndex = Number(body.rowIndex);
      }
      if (body && body.trip) {
        trip = body.trip;
      }
    } catch {
      // 若無 JSON body，改讀取 query string
    }

    if (!rowIndex && searchParams.get('rowIndex')) {
      rowIndex = Number(searchParams.get('rowIndex'));
    }
    if (!trip && searchParams.get('trip')) {
      trip = searchParams.get('trip') || undefined;
    }

    if (!rowIndex) {
      return NextResponse.json({ error: 'rowIndex is required for deletion' }, { status: 400 });
    }

    await deleteItineraryRow(rowIndex, trip);
    return NextResponse.json({ success: true, message: 'Deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete item' }, { status: 500 });
  }
}
