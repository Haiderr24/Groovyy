'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

interface Stats {
  totalPlays: number;
  totalDuration: number;
  totalDurationFormatted: string;
  uniqueTracks: number;
  uniqueArtists: number;
  uniqueGenres: number;
}

interface TopTrack {
  trackId: number;
  title: string;
  artist: string;
  genre: string;
  artworkUrl: string;
  playCount: number;
  totalDuration: number;
  lastPlayed: Date;
}

interface TopArtist {
  name: string;
  playCount: number;
  totalDuration: number;
  genres: string[];
  lastPlayed: Date;
}

interface GenreDistribution {
  name: string;
  playCount: number;
  totalDuration: number;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();

  const [stats, setStats] = useState<Stats | null>(null);
  const [topTracks, setTopTracks] = useState<TopTrack[]>([]);
  const [topArtists, setTopArtists] = useState<TopArtist[]>([]);
  const [genreDistribution, setGenreDistribution] = useState<GenreDistribution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;

    const fetchAnalytics = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('token');

        if (!token) {
          router.push('/login');
          return;
        }

        const headers = {
          'Authorization': `Bearer ${token}`,
        };

        const [statsRes, tracksRes, artistsRes, genresRes] = await Promise.all([
          fetch('/api/analytics/stats', { headers }),
          fetch('/api/analytics/top-tracks?limit=10', { headers }),
          fetch('/api/analytics/top-artists?limit=10', { headers }),
          fetch('/api/analytics/genre-distribution', { headers }),
        ]);

        if (!statsRes.ok || !tracksRes.ok || !artistsRes.ok || !genresRes.ok) {
          throw new Error('Failed to fetch analytics data');
        }

        const [statsData, tracksData, artistsData, genresData] = await Promise.all([
          statsRes.json(),
          tracksRes.json(),
          artistsRes.json(),
          genresRes.json(),
        ]);

        setStats(statsData.stats);
        setTopTracks(tracksData.topTracks);
        setTopArtists(artistsData.topArtists);
        setGenreDistribution(genresData.genres);
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setError('Failed to load analytics data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [user, router]);

  const handleClearHistory = async () => {
    if (!confirm('Are you sure you want to clear all listening history? This action cannot be undone.')) {
      return;
    }

    try {
      setIsClearing(true);
      const token = localStorage.getItem('token');

      const response = await fetch('/api/admin/clear-listening-history', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to clear listening history');
      }

      const data = await response.json();
      alert(`Successfully cleared ${data.deletedCount} listening events`);

      // Refresh the page data
      window.location.reload();
    } catch (err) {
      console.error('Error clearing history:', err);
      alert('Failed to clear listening history');
    } finally {
      setIsClearing(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900/20 to-pink-900/20 flex items-center justify-center">
        <div className="text-white text-xl">Loading analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900/20 to-pink-900/20 flex items-center justify-center">
        <div className="text-red-400 text-xl">{error}</div>
      </div>
    );
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const maxPlayCount = topTracks.length > 0 ? topTracks[0].playCount : 1;
  const maxArtistPlayCount = topArtists.length > 0 ? topArtists[0].playCount : 1;
  const maxGenrePlayCount = genreDistribution.length > 0 ? genreDistribution[0].playCount : 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900/20 to-pink-900/20 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-50 backdrop-blur-md bg-black/30 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-white/70 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-white">Analytics</h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleClearHistory}
              disabled={isClearing}
              className="text-red-400/70 hover:text-red-400 transition-colors px-4 py-2 rounded-lg hover:bg-red-500/10 disabled:opacity-50"
              title="Clear all listening history (for debugging)"
            >
              {isClearing ? 'Clearing...' : 'Clear History'}
            </button>
            <Link
              href="/favorites"
              className="text-white/70 hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-white/10"
            >
              Favorites
            </Link>
            <Link
              href="/settings"
              className="text-white/70 hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-white/10"
            >
              Settings
            </Link>
            <button
              onClick={logout}
              className="text-white/70 hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-white/10"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <div className="text-white/60 text-sm mb-1">Total Plays</div>
            <div className="text-white text-3xl font-bold">{stats?.totalPlays || 0}</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <div className="text-white/60 text-sm mb-1">Listening Time</div>
            <div className="text-white text-3xl font-bold">{stats?.totalDurationFormatted || '0m'}</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <div className="text-white/60 text-sm mb-1">Unique Tracks</div>
            <div className="text-white text-3xl font-bold">{stats?.uniqueTracks || 0}</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <div className="text-white/60 text-sm mb-1">Artists</div>
            <div className="text-white text-3xl font-bold">{stats?.uniqueArtists || 0}</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <div className="text-white/60 text-sm mb-1">Genres</div>
            <div className="text-white text-3xl font-bold">{stats?.uniqueGenres || 0}</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <div className="text-white/60 text-sm mb-1">Avg Per Play</div>
            <div className="text-white text-3xl font-bold">
              {stats && stats.totalPlays > 0
                ? `${Math.round(stats.totalDuration / stats.totalPlays)}s`
                : '0s'}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Top Tracks */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <h2 className="text-xl font-bold text-white mb-6">Top Tracks</h2>
            {topTracks.length === 0 ? (
              <div className="text-white/60 text-center py-8">
                No listening data yet. Start playing some music!
              </div>
            ) : (
              <div className="space-y-4">
                {topTracks.map((track, index) => (
                  <div key={track.trackId} className="flex items-center gap-4">
                    <div className="text-white/40 font-bold text-lg w-6">{index + 1}</div>
                    <div className="relative w-12 h-12 flex-shrink-0">
                      <Image
                        src={track.artworkUrl}
                        alt={track.title}
                        fill
                        className="rounded-lg object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium truncate">{track.title}</div>
                      <div className="text-white/60 text-sm truncate">{track.artist}</div>
                      <div className="w-full bg-white/10 rounded-full h-1.5 mt-2">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-pink-500 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${(track.playCount / maxPlayCount) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-white font-bold">{track.playCount}</div>
                      <div className="text-white/60 text-sm">plays</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Artists */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <h2 className="text-xl font-bold text-white mb-6">Top Artists</h2>
            {topArtists.length === 0 ? (
              <div className="text-white/60 text-center py-8">
                No listening data yet. Start playing some music!
              </div>
            ) : (
              <div className="space-y-4">
                {topArtists.map((artist, index) => (
                  <div key={artist.name} className="flex items-center gap-4">
                    <div className="text-white/40 font-bold text-lg w-6">{index + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium truncate">{artist.name}</div>
                      <div className="text-white/60 text-sm truncate">
                        {artist.genres.slice(0, 2).join(', ')}
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-1.5 mt-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-cyan-500 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${(artist.playCount / maxArtistPlayCount) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-white font-bold">{artist.playCount}</div>
                      <div className="text-white/60 text-sm">plays</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Genre Distribution */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 md:col-span-2">
            <h2 className="text-xl font-bold text-white mb-6">Genre Distribution</h2>
            {genreDistribution.length === 0 ? (
              <div className="text-white/60 text-center py-8">
                No listening data yet. Start playing some music!
              </div>
            ) : (
              <div className="space-y-3">
                {genreDistribution.map((genre) => (
                  <div key={genre.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-white font-medium">{genre.name}</div>
                      <div className="text-white/60 text-sm">
                        {genre.playCount} plays · {formatDuration(genre.totalDuration)}
                      </div>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${(genre.playCount / maxGenrePlayCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
