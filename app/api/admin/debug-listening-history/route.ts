import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
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

    const db = await getDatabase();

    // Get last 5 listening events for this user
    const events = await db
      .collection('listening_history')
      .find({ userId: new ObjectId(decoded.userId) })
      .sort({ playedAt: -1 })
      .limit(5)
      .toArray();

    console.log('🔍 [Debug] Last 5 listening events:', events);

    return NextResponse.json({
      events: events.map(event => ({
        trackTitle: event.trackTitle,
        durationPlayed: event.durationPlayed,
        durationPlayedType: typeof event.durationPlayed,
        completed: event.completed,
        playedAt: event.playedAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching debug info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch debug info' },
      { status: 500 }
    );
  }
}
