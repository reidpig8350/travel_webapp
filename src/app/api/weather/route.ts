import { NextResponse } from 'next/server';

function getWeatherDesc(code: number): { text: string; icon: string } {
  if (code === 0) return { text: '晴空萬里', icon: '☀️' };
  if (code === 1 || code === 2) return { text: '晴時多雲', icon: '🌤️' };
  if (code === 3) return { text: '多雲陰天', icon: '☁️' };
  if (code >= 45 && code <= 48) return { text: '霧氣瀰漫', icon: '🌫️' };
  if (code >= 51 && code <= 67) return { text: '微雨毛毛雨', icon: '🌧️' };
  if (code >= 71 && code <= 77) return { text: '飄雪浪漫', icon: '❄️' };
  if (code >= 80 && code <= 82) return { text: '短暫陣雨', icon: '🌦️' };
  if (code >= 95) return { text: '雷陣雨', icon: '⛈️' };
  return { text: '舒適宜人', icon: '⛅' };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get('lat') || '47.8095'; // 預設薩爾斯堡
  const lng = searchParams.get('lng') || '13.0550';

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code&daily=sunset&timezone=auto`;
    const res = await fetch(url, { next: { revalidate: 1800 } });

    if (res.ok) {
      const data = await res.json();
      const temp = Math.round(data.current?.temperature_2m ?? 21);
      const code = data.current?.weather_code ?? 0;
      const { text, icon } = getWeatherDesc(code);

      const sunsetIso = data.daily?.sunset?.[0]; // e.g. "2026-06-15T21:18"
      let sunsetTimeStr = '21:15';
      let minutesLeft = 240;

      if (sunsetIso) {
        const sunsetDate = new Date(sunsetIso);
        const hours = sunsetDate.getHours().toString().padStart(2, '0');
        const mins = sunsetDate.getMinutes().toString().padStart(2, '0');
        sunsetTimeStr = `${hours}:${mins}`;

        const diffMs = sunsetDate.getTime() - Date.now();
        minutesLeft = Math.max(0, Math.round(diffMs / 60000));
      }

      return NextResponse.json({
        temperature: temp,
        weatherCode: code,
        weatherText: text,
        weatherIcon: icon,
        sunsetTime: sunsetTimeStr,
        sunsetMinutesLeft: minutesLeft,
      });
    }
  } catch (err) {
    console.warn('Weather fetch failed, returning fallback:', err);
  }

  return NextResponse.json({
    temperature: 22,
    weatherCode: 1,
    weatherText: '阿爾卑斯微風',
    weatherIcon: '🌤️',
    sunsetTime: '21:15',
    sunsetMinutesLeft: 180,
  });
}
