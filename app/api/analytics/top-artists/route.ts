import { NextRequest, NextResponse } from 'next/server';
import { getTopArtists } from '@/lib/listening-history';
import { verifyToken } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    const topArtists = await getTopArtists(new ObjectId(decoded.userId), limit);

    return NextResponse.json({
      topArtists: topArtists.map(artist => ({
        name: artist._id,
        playCount: artist.playCount,
        totalDuration: artist.totalDuration,
        genres: artist.genres,
        lastPlayed: artist.lastPlayed,
      })),
    });
  } catch (error) {
    console.error('Error fetching top artists:', error);
    return NextResponse.json(
      { error: 'Failed to fetch top artists' },
      { status: 500 }
    );
  }
}
