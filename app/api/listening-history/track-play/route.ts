import { NextRequest, NextResponse } from 'next/server';
import { recordPlayEvent } from '@/lib/listening-history';
import { verifyToken } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const {
      trackId,
      trackTitle,
      trackArtist,
      trackGenre,
      albumName,
      artworkUrl,
      previewUrl,
      durationPlayed,
      completed,
    } = body;

    if (!trackId || !trackTitle || !trackArtist) {
      return NextResponse.json(
        { error: 'Missing required track information' },
        { status: 400 }
      );
    }

    const eventId = await recordPlayEvent({
      userId: new ObjectId(decoded.userId),
      trackId,
      trackTitle,
      trackArtist,
      trackGenre: trackGenre || 'Unknown',
      albumName: albumName || '',
      artworkUrl: artworkUrl || '',
      previewUrl: previewUrl || '',
      durationPlayed: durationPlayed || 0,
      completed: completed || false,
      playedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      eventId: eventId.toString(),
    });
  } catch (error) {
    console.error('Error recording play event:', error);
    return NextResponse.json(
      { error: 'Failed to record play event' },
      { status: 500 }
    );
  }
}
