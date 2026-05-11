/**
 * Test script for playlist generation
 *
 * Run this in your browser console while logged into the app:
 * 1. Open http://localhost:3000
 * 2. Make sure you're logged in
 * 3. Open browser console (F12)
 * 4. Copy and paste this entire script
 * 5. Press Enter
 */

(async function testPlaylistGeneration() {
  console.log('🎵 Testing Playlist Generation...\n');

  // Get token from localStorage
  const token = localStorage.getItem('token');

  if (!token) {
    console.error('❌ Error: No auth token found. Please log in first.');
    return;
  }

  console.log('✅ Found auth token');

  // Test prompt
  const prompt = 'upbeat 2000s pop for working out';
  console.log('📝 Prompt:', prompt);
  console.log('⏳ Generating playlist...\n');

  try {
    const response = await fetch('http://localhost:3000/api/playlists/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Error:', errorData);
      return;
    }

    const data = await response.json();

    console.log('✅ Success! Generated playlist with', data.playlist.tracks.length, 'tracks\n');
    console.log('📋 Playlist Details:');
    console.log('-------------------');
    console.log('Prompt:', data.playlist.prompt);
    console.log('Generated:', new Date(data.playlist.generatedAt).toLocaleString());
    console.log('\n🎵 Tracks:');

    data.playlist.tracks.forEach((track, i) => {
      console.log(`${i + 1}. ${track.artist} - ${track.title}`);
      console.log(`   Genre: ${track.genre}`);
      console.log(`   Preview: ${track.previewUrl ? '✅ Available' : '❌ Not available'}`);
    });

    console.log('\n✅ Test completed successfully!');
    console.log('📊 Full response:', data);

    return data;
  } catch (error) {
    console.error('❌ Request failed:', error);
  }
})();
