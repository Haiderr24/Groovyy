import { NextRequest, NextResponse } from 'next/server';
import { getTopTracks } from '@/lib/listening-history';
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

    const topTracks = await getTopTracks(new ObjectId(decoded.userId), limit);

    return NextResponse.json({
      topTracks: topTracks.map(track => ({
        trackId: track._id,
        title: track.trackTitle,
        artist: track.trackArtist,
        genre: track.trackGenre,
        artworkUrl: track.artworkUrl,
        playCount: track.playCount,
        totalDuration: track.totalDuration,
        lastPlayed: track.lastPlayed,
      })),
    });
  } catch (error) {
    console.error('Error fetching top tracks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch top tracks' },
      { status: 500 }
    );
  }
}
