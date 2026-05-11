import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import { savePlaylist, getUserPlaylists } from '@/lib/playlists';
import { Track } from '@/lib/itunes';

/**
 * GET /api/playlists - Get all playlists for the logged-in user
 */
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

    const playlists = await getUserPlaylists(new ObjectId(decoded.userId));

    return NextResponse.json({
      playlists: playlists.map((p) => ({
        id: p._id?.toString(),
        name: p.name,
        prompt: p.prompt,
        trackCount: p.tracks.length,
        aiGenerated: p.aiGenerated,
        createdAt: p.createdAt,
        tracks: p.tracks,
      })),
    });
  } catch (error) {
    console.error('Error fetching playlists:', error);
    return NextResponse.json(
      { error: 'Failed to fetch playlists' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/playlists - Save a new playlist
 */
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
    const { name, prompt, tracks, aiGenerated = true } = body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!tracks || !Array.isArray(tracks) || tracks.length === 0) {
      return NextResponse.json(
        { error: 'Tracks array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Save to MongoDB
    const playlistId = await savePlaylist(
      new ObjectId(decoded.userId),
      name.trim(),
      prompt || '',
      tracks as Track[],
      aiGenerated
    );

    return NextResponse.json({
      success: true,
      playlistId: playlistId.toString(),
      message: 'Playlist saved successfully',
    });
  } catch (error) {
    console.error('Error saving playlist:', error);
    return NextResponse.json(
      { error: 'Failed to save playlist' },
      { status: 500 }
    );
  }
}
