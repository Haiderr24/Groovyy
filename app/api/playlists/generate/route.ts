import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import { generatePlaylistSuggestions } from '@/lib/openai';
import { searchTracks, type Track } from '@/lib/itunes';
import { getTopArtists, getGenreDistribution } from '@/lib/listening-history';

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // 2. Get user prompt from request body
    const body = await request.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    console.log('🎵 [Playlist Generator] User:', decoded.userId);
    console.log('🎵 [Playlist Generator] Prompt:', prompt);

    // 3. Fetch user's listening context from MongoDB
    const userId = new ObjectId(decoded.userId);

    const [topArtistsData, genresData] = await Promise.all([
      getTopArtists(userId, 5),
      getGenreDistribution(userId),
    ]);

    const topArtists = topArtistsData.map((artist: any) => artist._id as string);
    const topGenres = genresData.slice(0, 5).map((genre: any) => genre._id as string);

    console.log('🎵 [Playlist Generator] User context:', {
      topArtists,
      topGenres,
    });

    // 4. Generate song suggestions using OpenAI
    const suggestions = await generatePlaylistSuggestions({
      userPrompt: prompt,
      userContext: {
        topGenres,
        topArtists,
      },
    });

    console.log(`🎵 [Playlist Generator] Got ${suggestions.length} suggestions from OpenAI`);

    // 5. Search iTunes for each suggestion to get full track data
    const trackPromises = suggestions.map(async (suggestion) => {
      const searchQuery = `${suggestion.artist} ${suggestion.title}`;
      console.log(`🔍 [iTunes] Searching for: ${searchQuery}`);

      const results = await searchTracks(searchQuery, 5);

      if (results.length > 0) {
        // Return the first match (usually the most relevant)
        return results[0];
      }

      // If no exact match, try just the artist
      const artistResults = await searchTracks(suggestion.artist, 3);
      if (artistResults.length > 0) {
        return artistResults[0];
      }

      return null;
    });

    const tracks = (await Promise.all(trackPromises)).filter(
      (track): track is Track => track !== null
    );

    console.log(`✅ [Playlist Generator] Found ${tracks.length} tracks on iTunes`);

    // 6. Return the generated playlist
    return NextResponse.json({
      success: true,
      playlist: {
        prompt,
        tracks,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('❌ [Playlist Generator] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate playlist',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
