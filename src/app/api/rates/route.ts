import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 透過免費且無需金鑰之 open.er-api.com 取得最新匯率
    const res = await fetch('https://open.er-api.com/v6/latest/EUR', {
      next: { revalidate: 3600 }, // 快取 1 小時
    });

    if (res.ok) {
      const data = await res.json();
      const rates = data.rates || {};
      const eurToTwd = rates.TWD || 35.2;
      const eurToChf = rates.CHF || 0.96;
      const eurToGbp = rates.GBP || 0.85;

      return NextResponse.json({
        EUR: Number(eurToTwd.toFixed(2)),
        CHF: Number((eurToTwd / eurToChf).toFixed(2)),
        GBP: Number((eurToTwd / eurToGbp).toFixed(2)),
        TWD: 1,
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.warn('Failed to fetch real-time exchange rates, using fallback:', err);
  }

  // 斷網或 API 異常時之平滑備用預設匯率
  return NextResponse.json({
    EUR: 35.2,
    CHF: 36.8,
    GBP: 41.5,
    TWD: 1,
    updatedAt: new Date().toISOString(),
  });
}
