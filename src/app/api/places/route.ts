import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');

    if (!lat || !lng) {
      return NextResponse.json({ error: 'Latitude and longitude are required.' }, { status: 400 });
    }

    const apiKey = 'AlzaSyPl0aYJ2eJUN9hFxXHdpzjFzNFQsljncqR';
    const radius = 5000;
    const type = 'hospital'; // queries both hospitals and clinical nodes

    const url = `https://maps.gomaps.pro/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type}&key=${apiKey}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to query GoMaps Places API');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Places Proxy error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
