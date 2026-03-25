import { NextRequest, NextResponse } from 'next/server';
import { getGenreDistribution } from '@/lib/listening-history';
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

    const genreDistribution = await getGenreDistribution(new ObjectId(decoded.userId));

    return NextResponse.json({
      genres: genreDistribution.map(genre => ({
        name: genre._id,
        playCount: genre.playCount,
        totalDuration: genre.totalDuration,
      })),
    });
  } catch (error) {
    console.error('Error fetching genre distribution:', error);
    return NextResponse.json(
      { error: 'Failed to fetch genre distribution' },
      { status: 500 }
    );
  }
}
