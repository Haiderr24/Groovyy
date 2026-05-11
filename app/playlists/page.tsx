'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Track } from '@/lib/itunes';

interface SavedPlaylist {
  id: string;
  name: string;
  prompt: string;
  trackCount: number;
  aiGenerated: boolean;
  createdAt: string;
  tracks: Track[];
}

export default function PlaylistsPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();

  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTracks, setGeneratedTracks] = useState<Track[]>([]);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [savedPlaylists, setSavedPlaylists] = useState<SavedPlaylist[]>([]);
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [playlistName, setPlaylistName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) {
      fetchSavedPlaylists();
    }
  }, [user]);

  const fetchSavedPlaylists = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/playlists', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch playlists');

      const data = await response.json();
      setSavedPlaylists(data.playlists);
    } catch (err) {
      console.error('Error fetching playlists:', err);
    } finally {
      setIsLoadingPlaylists(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedTracks([]);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/playlists/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate playlist');
      }

      const data = await response.json();
      setGeneratedTracks(data.playlist.tracks);
      setGeneratedPrompt(data.playlist.prompt);
      setPlaylistName(`${prompt.slice(0, 30)}${prompt.length > 30 ? '...' : ''}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate playlist');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSavePlaylist = async () => {
    if (!playlistName.trim()) {
      setError('Please enter a playlist name');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/playlists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: playlistName,
          prompt: generatedPrompt,
          tracks: generatedTracks,
          aiGenerated: true,
        }),
      });

      if (!response.ok) throw new Error('Failed to save playlist');

      // Refresh saved playlists
      await fetchSavedPlaylists();

      // Reset generation state
      setGeneratedTracks([]);
      setGeneratedPrompt('');
      setPrompt('');
      setPlaylistName('');
      setShowSaveDialog(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save playlist');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    if (!confirm('Are you sure you want to delete this playlist?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/playlists/${playlistId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to delete playlist');

      // Refresh saved playlists
      await fetchSavedPlaylists();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete playlist');
    }
  };

  if (authLoading || isLoadingPlaylists) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900/20 to-pink-900/20 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900/20 to-pink-900/20 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-50 backdrop-blur-md bg-black/30 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-white/70 hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-white">AI Playlist Generator</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/favorites" className="text-white/70 hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-white/10">
              Favorites
            </Link>
            <Link href="/analytics" className="text-white/70 hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-white/10">
              Analytics
            </Link>
            <Link href="/settings" className="text-white/70 hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-white/10">
              Settings
            </Link>
            <button onClick={logout} className="text-white/70 hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-white/10">
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Generator Section */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Generate Playlist with AI</h2>
          <p className="text-white/60 mb-6">
            Describe the playlist you want and let AI create it for you. Try prompts like "upbeat 2000s pop for working out" or "chill indie songs for studying"
          </p>

          <div className="flex gap-4 mb-4">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              placeholder="e.g., upbeat 2000s pop for working out"
              className="flex-1 px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={isGenerating}
            />
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? 'Generating...' : 'Generate'}
            </button>
          </div>

          {error && (
            <div className="text-red-400 text-sm mb-4">{error}</div>
          )}

          {/* Generated Tracks */}
          {generatedTracks.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Generated Playlist</h3>
                <button
                  onClick={() => setShowSaveDialog(true)}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all"
                >
                  Save Playlist
                </button>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {generatedTracks.map((track, index) => (
                  <div key={index} className="bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-all">
                    <div className="flex gap-3">
                      <div className="relative w-16 h-16 flex-shrink-0">
                        <Image
                          src={track.artworkUrl}
                          alt={track.title}
                          fill
                          className="rounded object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium truncate">{track.title}</div>
                        <div className="text-white/60 text-sm truncate">{track.artist}</div>
                        <div className="text-white/40 text-xs truncate">{track.genre}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Save Dialog */}
        {showSaveDialog && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gradient-to-br from-purple-900/90 to-pink-900/90 rounded-2xl p-8 border border-white/20 max-w-md w-full mx-4">
              <h3 className="text-2xl font-bold text-white mb-4">Save Playlist</h3>
              <input
                type="text"
                value={playlistName}
                onChange={(e) => setPlaylistName(e.target.value)}
                placeholder="Enter playlist name"
                className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4"
              />
              <div className="flex gap-4">
                <button
                  onClick={() => setShowSaveDialog(false)}
                  className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePlaylist}
                  disabled={isSaving || !playlistName.trim()}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Saved Playlists */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
          <h2 className="text-2xl font-bold text-white mb-6">Your Playlists</h2>

          {savedPlaylists.length === 0 ? (
            <div className="text-white/60 text-center py-12">
              No saved playlists yet. Generate your first playlist above!
            </div>
          ) : (
            <div className="space-y-4">
              {savedPlaylists.map((playlist) => (
                <div
                  key={playlist.id}
                  className="bg-white/5 rounded-lg p-6 border border-white/10 hover:bg-white/10 transition-all"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white">{playlist.name}</h3>
                      <p className="text-white/60 text-sm mt-1">{playlist.prompt}</p>
                      <p className="text-white/40 text-xs mt-2">
                        {playlist.trackCount} tracks • Created {new Date(playlist.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeletePlaylist(playlist.id)}
                      className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all"
                    >
                      Delete
                    </button>
                  </div>

                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {playlist.tracks.slice(0, 4).map((track, index) => (
                      <div key={index} className="flex items-center gap-2 bg-white/5 rounded p-2">
                        <div className="relative w-10 h-10 flex-shrink-0">
                          <Image
                            src={track.artworkUrl}
                            alt={track.title}
                            fill
                            className="rounded object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white text-sm truncate">{track.title}</div>
                          <div className="text-white/60 text-xs truncate">{track.artist}</div>
                        </div>
                      </div>
                    ))}
                    {playlist.trackCount > 4 && (
                      <div className="flex items-center justify-center bg-white/5 rounded p-2 text-white/60 text-sm">
                        +{playlist.trackCount - 4} more
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
