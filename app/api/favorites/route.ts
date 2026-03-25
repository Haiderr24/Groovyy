import { NextRequest, NextResponse } from 'next/server';
import { getUserFavorites, addUserFavorite, removeUserFavorite, isTrackFavorite } from '@/lib/userFavorites';
import { recordFavoriteEvent } from '@/lib/listening-history';
import { ObjectId } from 'mongodb';

// GET /api/favorites - Get user's favorites
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const userFavorites = await getUserFavorites(userId);

    // Transform UserFavorite to Track format (trackId -> id, Date -> string)
    const favorites = userFavorites.map(fav => ({
      id: fav.trackId,
      title: fav.title,
      artist: fav.artist,
      genre: fav.genre,
      previewUrl: fav.previewUrl,
      artworkUrl: fav.artworkUrl,
      albumName: fav.albumName,
      releaseDate: fav.releaseDate,
      trackTimeMillis: fav.trackTimeMillis,
      addedAt: fav.addedAt instanceof Date ? fav.addedAt.toISOString() : fav.addedAt,
    }));

    return NextResponse.json({ favorites });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    return NextResponse.json({ error: 'Failed to fetch favorites' }, { status: 500 });
  }
}

// POST /api/favorites - Add a favorite
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, track } = body;

    if (!userId || !track) {
      return NextResponse.json({ error: 'User ID and track are required' }, { status: 400 });
    }

    // Transform Track to UserFavorite format (id -> trackId)
    const userFavorite = {
      trackId: track.id,
      title: track.title,
      artist: track.artist,
      genre: track.genre,
      previewUrl: track.previewUrl,
      artworkUrl: track.artworkUrl,
      albumName: track.albumName,
      releaseDate: track.releaseDate,
      trackTimeMillis: track.trackTimeMillis,
    };

    const success = await addUserFavorite(userId, userFavorite);

    if (success) {
      // Track the favorite event for analytics
      try {
        await recordFavoriteEvent({
          userId: new ObjectId(userId),
          trackId: track.id,
          trackTitle: track.title,
          trackArtist: track.artist,
          trackGenre: track.genre,
          albumName: track.albumName,
          artworkUrl: track.artworkUrl,
          action: 'added',
        });
      } catch (err) {
        console.error('Failed to record favorite event:', err);
        // Don't fail the request if analytics tracking fails
      }

      return NextResponse.json({ success: true, message: 'Track added to favorites' });
    } else {
      return NextResponse.json({ error: 'Failed to add favorite' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error adding favorite:', error);
    return NextResponse.json({ error: 'Failed to add favorite' }, { status: 500 });
  }
}

// DELETE /api/favorites - Remove a favorite
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const trackId = searchParams.get('trackId');

    if (!userId || !trackId) {
      return NextResponse.json({ error: 'User ID and track ID are required' }, { status: 400 });
    }

    // Get track details before removing for analytics
    const favorites = await getUserFavorites(userId);
    const trackToRemove = favorites.find(fav => fav.trackId === parseInt(trackId));

    const success = await removeUserFavorite(userId, parseInt(trackId));

    if (success) {
      // Track the unfavorite event for analytics
      if (trackToRemove) {
        try {
          await recordFavoriteEvent({
            userId: new ObjectId(userId),
            trackId: trackToRemove.trackId,
            trackTitle: trackToRemove.title,
            trackArtist: trackToRemove.artist,
            trackGenre: trackToRemove.genre,
            albumName: trackToRemove.albumName,
            artworkUrl: trackToRemove.artworkUrl,
            action: 'removed',
          });
        } catch (err) {
          console.error('Failed to record favorite removal event:', err);
          // Don't fail the request if analytics tracking fails
        }
      }

      return NextResponse.json({ success: true, message: 'Track removed from favorites' });
    } else {
      return NextResponse.json({ error: 'Failed to remove favorite' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error removing favorite:', error);
    return NextResponse.json({ error: 'Failed to remove favorite' }, { status: 500 });
  }
}
