import { NextResponse } from 'next/server';

const cache = new Map<string, string>();

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const query = searchParams.get('q');

  // 反向地理編碼 (Reverse Geocoding: 經緯度 -> 地名)
  if (lat && lng) {
    const key = `rev_${lat.slice(0, 6)}_${lng.slice(0, 6)}`;
    if (cache.has(key)) {
      return NextResponse.json({ locationName: cache.get(key) });
    }

    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'EuroTripPlannerApp/1.0 (contact@example.com)',
          'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
        },
        next: { revalidate: 86400 },
      });

      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        const district =
          addr.suburb || addr.city_district || addr.quarter || addr.neighbourhood || addr.borough || '';
        const city =
          addr.city || addr.town || addr.village || addr.municipality || addr.county || addr.state || '';
        const country = addr.country || '';

        const uniqueParts = Array.from(new Set([country, city, district].filter(Boolean)));
        const locationName =
          uniqueParts.length > 0
            ? uniqueParts.join(' · ')
            : data.display_name?.split(',').slice(0, 3).join(', ') || '';

        cache.set(key, locationName);
        return NextResponse.json({ locationName });
      }
    } catch (err) {
      console.warn('Reverse geocoding error:', err);
    }

    return NextResponse.json({ locationName: '' });
  }

  // 正向地理編碼 (Forward Geocoding: 地名 -> 經緯度)
  if (query) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'EuroTripPlannerApp/1.0 (contact@example.com)' },
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          return NextResponse.json({
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
            displayName: data[0].display_name,
          });
        }
      }
    } catch (err) {
      console.warn('Geocoding query error:', err);
    }
  }

  return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
}
