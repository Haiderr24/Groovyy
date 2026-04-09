'use client';

import { useState, useEffect } from 'react';
import { useFavorites } from '@/hooks/useFavorites';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Track {
  id: number;
  title: string;
  artist: string;
  genre: string;
  previewUrl: string;
  artworkUrl: string;
  albumName: string;
  releaseDate: string;
  trackTimeMillis: number;
  addedAt?: string;
}

export default function FavoritesPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const userId = user?.id || '';
  
  const { favorites, removeFavorite, isLoading, error, refreshFavorites } = useFavorites(userId);
  const [playingTrackId, setPlayingTrackId] = useState<number | null>(null);

  const playingTrack = favorites.find(f => f.id === playingTrackId);
  const trackInfo = playingTrack ? {
    trackId: playingTrack.id,
    trackTitle: playingTrack.title,
    trackArtist: playingTrack.artist,
    trackGenre: playingTrack.genre,
    albumName: playingTrack.albumName,
    artworkUrl: playingTrack.artworkUrl,
    previewUrl: playingTrack.previewUrl,
  } : undefined;

  const { isPlaying, currentTime, duration, loadTrack, togglePlayPause, seek } = useAudioPlayer(trackInfo);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshFavorites();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refreshFavorites]);

  const handlePlayPause = (track: Track) => {
    if (playingTrackId === track.id && isPlaying) {
      togglePlayPause();
    } else {
      loadTrack(track.previewUrl);
      setPlayingTrackId(track.id);
      togglePlayPause();
    }
  };

  const handleRemoveFavorite = async (trackId: number) => {
    const success = await removeFavorite(trackId);
    if (success) {
      // Refresh the list to ensure it's up to date
      await refreshFavorites();
    }
  };

  const formatDuration = (millis: number) => {
    const minutes = Math.floor(millis / 60000);
    const seconds = Math.floor((millis % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white/60">
            {authLoading ? 'Loading...' : 'Loading your favorites...'}
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <p className="text-red-400 mb-4">Error: {error}</p>
          <Link href="/" className="text-white/60 hover:text-white underline">
            Back to Discovery
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-sm border-b border-white/10">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-white/60 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-white text-xl font-light">My Favorites</h1>
            <span className="text-white/40 text-sm">
              {user.fullName}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={refreshFavorites}
              className="text-white/60 hover:text-white transition-colors"
              title="Refresh favorites"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <div className="text-white/60 text-sm">
              {favorites.length} {favorites.length === 1 ? 'track' : 'tracks'}
            </div>
            <Link
              href="/analytics"
              className="text-white/60 hover:text-white transition-colors"
              title="Analytics"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </Link>
            <button
              onClick={() => {
                logout();
                router.push('/login');
              }}
              className="px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white/60 hover:bg-white/20 hover:text-white transition-all text-sm font-light"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-8">
        {favorites.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center">
              <svg className="w-8 h-8 text-white/40" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </div>
            <h2 className="text-white text-2xl font-light mb-3">No favorites yet</h2>
            <p className="text-white/60 mb-8">Start discovering music and save your favorites!</p>
            <Link 
              href="/"
              className="inline-block px-6 py-3 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-full font-light hover:bg-white/20 transition-all"
            >
              Discover Music
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {favorites.map((track, index) => (
              <div 
                key={`${track.id}-${index}`}
                className="flex items-center gap-4 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all"
              >
                {/* Album Artwork */}
                <div className="relative">
                  <img 
                    src={track.artworkUrl} 
                    alt={`${track.title} artwork`}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  {playingTrackId === track.id && isPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                      <div className="w-4 h-4 bg-white rounded-sm"></div>
                    </div>
                  )}
                </div>

                {/* Track Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-medium truncate">{track.title}</h3>
                  <p className="text-white/60 text-sm truncate">{track.artist}</p>
                  <p className="text-white/40 text-xs truncate">{track.albumName}</p>
                </div>

                {/* Track Details */}
                <div className="text-right text-white/40 text-sm">
                  <div className="mb-1">{formatDuration(track.trackTimeMillis)}</div>
                  {track.addedAt && <div className="text-xs">Added {formatDate(track.addedAt)}</div>}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {/* Play/Pause Button */}
                  <button
                    onClick={() => handlePlayPause(track)}
                    className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all"
                  >
                    {playingTrackId === track.id && isPlaying ? (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </button>

                  {/* Remove from Favorites */}
                  <button
                    onClick={() => handleRemoveFavorite(track.id)}
                    className="w-10 h-10 rounded-full bg-red-500/20 backdrop-blur-md border border-red-500/30 flex items-center justify-center text-red-400 hover:bg-red-500/30 transition-all"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
