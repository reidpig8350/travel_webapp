import { NextResponse } from 'next/server';
import { reorderItinerary } from '@/lib/googleSheets';

export async function POST(req: Request) {
  try {
    const { sourceIndex, destinationIndex } = await req.json();

    if (sourceIndex === undefined || destinationIndex === undefined) {
      return NextResponse.json({ error: 'sourceIndex and destinationIndex are required' }, { status: 400 });
    }

    await reorderItinerary(Number(sourceIndex), Number(destinationIndex));
    return NextResponse.json({ success: true, message: 'Reordered successfully' });
  } catch (err: any) {
    console.error('Reorder error:', err);
    return NextResponse.json({ error: err.message || 'Failed to reorder' }, { status: 500 });
  }
}
