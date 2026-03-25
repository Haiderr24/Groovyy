import { NextRequest, NextResponse } from 'next/server';
import { getListeningStats } from '@/lib/listening-history';
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

    const stats = await getListeningStats(new ObjectId(decoded.userId));

    return NextResponse.json({
      stats: {
        totalPlays: stats.totalPlays,
        totalDuration: stats.totalDuration,
        totalDurationFormatted: formatDuration(stats.totalDuration),
        uniqueTracks: stats.uniqueTracks,
        uniqueArtists: stats.uniqueArtists,
        uniqueGenres: stats.uniqueGenres,
      },
    });
  } catch (error) {
    console.error('Error fetching listening stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch listening stats' },
      { status: 500 }
    );
  }
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
