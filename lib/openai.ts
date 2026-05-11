import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY environment variable');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface SongSuggestion {
  artist: string;
  title: string;
}

export interface PlaylistGenerationInput {
  userPrompt: string;
  userContext?: {
    topGenres?: string[];
    topArtists?: string[];
  };
}

/**
 * Generate playlist suggestions using OpenAI GPT-4o-mini
 * @param input - User prompt and optional listening context
 * @returns Array of song suggestions (artist + title)
 */
export async function generatePlaylistSuggestions(
  input: PlaylistGenerationInput
): Promise<SongSuggestion[]> {
  const { userPrompt, userContext } = input;

  // Build context string from user's listening history
  let contextString = '';
  if (userContext?.topGenres && userContext.topGenres.length > 0) {
    contextString += `\nUser's Top Genres: ${userContext.topGenres.slice(0, 5).join(', ')}`;
  }
  if (userContext?.topArtists && userContext.topArtists.length > 0) {
    contextString += `\nUser's Top Artists: ${userContext.topArtists.slice(0, 5).join(', ')}`;
  }

  const systemPrompt = `You are an expert music curator with deep knowledge of music across all genres and eras. Your job is to create personalized playlists based on user requests.

Rules:
1. Return EXACTLY 12 songs
2. Choose songs that match the user's request perfectly
3. Include a mix of popular hits and hidden gems
4. Consider the user's listening history if provided
5. Return ONLY valid JSON - no markdown, no explanations, no additional text
6. Each song must have both "artist" and "title" fields
7. Use exact artist and track names as they appear on iTunes/Spotify

Format your response as a JSON array:
[
  {"artist": "Artist Name", "title": "Song Title"},
  {"artist": "Artist Name", "title": "Song Title"}
]`;

  const userMessage = `Create a playlist for: "${userPrompt}"${contextString}`;

  console.log('🤖 [OpenAI] Generating playlist...');
  console.log('📝 User prompt:', userPrompt);
  console.log('🎵 Context:', contextString || 'No context provided');

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.8, // Some creativity but not too random
      response_format: { type: 'json_object' },
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    console.log('✅ [OpenAI] Raw response:', responseText);

    // Parse the JSON response
    const parsed = JSON.parse(responseText);

    // Handle both array format and object with songs array
    let suggestions: SongSuggestion[];
    if (Array.isArray(parsed)) {
      suggestions = parsed;
    } else if (parsed.songs && Array.isArray(parsed.songs)) {
      suggestions = parsed.songs;
    } else if (parsed.playlist && Array.isArray(parsed.playlist)) {
      suggestions = parsed.playlist;
    } else {
      throw new Error('Invalid response format from OpenAI');
    }

    // Validate the suggestions
    const validSuggestions = suggestions.filter(
      (s) => s.artist && s.title && typeof s.artist === 'string' && typeof s.title === 'string'
    );

    console.log(`✅ [OpenAI] Generated ${validSuggestions.length} valid suggestions`);

    return validSuggestions.slice(0, 12); // Ensure max 12 songs
  } catch (error) {
    console.error('❌ [OpenAI] Error generating playlist:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to generate playlist suggestions'
    );
  }
}
