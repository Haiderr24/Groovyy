'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import SwipeCard from '@/components/SwipeCard';
import { getTopChartsByGenre, getPopularClassics, getTrendingGenres, type Track } from '@/lib/itunes';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useFavorites } from '@/hooks/useFavorites';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const THEMES: Record<string, { from: string; to: string }> = {
  default: { from: "from-purple-900/20", to: "to-pink-900/20" },
  ocean: { from: "from-blue-900/20", to: "to-cyan-900/20" },
  sunset: { from: "from-orange-900/20", to: "to-red-900/20" },
  forest: { from: "from-green-900/20", to: "to-emerald-900/20" },
  midnight: { from: "from-slate-900/20", to: "to-indigo-900/20" },
  abyss: { from: "from-neutral-950/30", to: "to-stone-950/30" },
};

export default function Home() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const userId = user?.id || '';
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showHint, setShowHint] = useState(true);
  const [direction, setDirection] = useState<'up' | 'down'>('down');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const fetchOffsetRef = useRef(0);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tracksRef = useRef<Track[]>([]);

  const { favorites, addFavorite, removeFavorite, isFavorite } = useFavorites(userId);

  const trackInfo = useMemo(() => {
    return tracks[currentIndex] ? {
      trackId: tracks[currentIndex].id,
      trackTitle: tracks[currentIndex].title,
      trackArtist: tracks[currentIndex].artist,
      trackGenre: tracks[currentIndex].genre,
      albumName: tracks[currentIndex].albumName,
      artworkUrl: tracks[currentIndex].artworkUrl,
      previewUrl: tracks[currentIndex].previewUrl,
    } : undefined;
  }, [tracks, currentIndex]);

  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);

  const goToNext = useCallback(() => {
    setDirection('down');
    setCurrentIndex((prev) => {
      const next = prev < tracksRef.current.length - 1 ? prev + 1 : 0;
      console.log('⬇️ Index:', prev, '→', next, '| Total tracks:', tracksRef.current.length);
      return next;
    });
    setShowHint(false);
  }, []);

  const goToPrevious = useCallback(() => {
    setDirection('up');
    setCurrentIndex((prev) => {
      if (prev > 0) {
        return prev - 1;
      }
      return Math.max(0, tracksRef.current.length - 1);
    });
    setShowHint(false);
  }, []);

  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    loadTrack,
    togglePlayPause,
    seek,
    changeVolume,
    analyser,
    pause,
    play
  } = useAudioPlayer(trackInfo, goToNext);

  const fetchMoreTracks = useCallback(async () => {
  if (isFetchingMore || !user) return;

  console.log('🔄 Fetching more tracks...');
  setIsFetchingMore(true);

  fetchOffsetRef.current += 1;
  const currentOffset = fetchOffsetRef.current;

  const userGenres = user.favoriteGenres?.length > 0
    ? user.favoriteGenres
    : getTrendingGenres();

  const genresToFetch = userGenres.length > 3
    ? [...userGenres].sort(() => Math.random() - 0.5).slice(0, 3)
    : userGenres;

  console.log(`🎵 Fetch more - Genres: ${genresToFetch}, Offset: ${currentOffset}`);

  const allTracks: Track[] = [];

  for (const genre of genresToFetch) {
    const trendingOffset = currentOffset * 27;
    const classicsOffset = currentOffset * 23;

    const [classics, trending] = await Promise.all([
      getPopularClassics(genre, 23, true, classicsOffset),
      getTopChartsByGenre(genre, 27, trendingOffset),
    ]);

    console.log(`📀 ${genre}: ${classics.length} classics + ${trending.length} trending = ${classics.length + trending.length} total (offset: ${currentOffset})`);
    allTracks.push(...classics, ...trending);
  }

  setTracks(prev => {
    const existingIds = new Set(prev.map(t => t.id));
    const uniqueNewTracks = allTracks.filter(track => !existingIds.has(track.id));
    const seenIds = new Set();
    const deduplicatedTracks = uniqueNewTracks.filter(track => {
      if (seenIds.has(track.id)) return false;
      seenIds.add(track.id);
      return true;
    });
    const shuffled = deduplicatedTracks.sort(() => Math.random() - 0.5);
    console.log(`➕ Adding ${shuffled.length} new unique tracks (had ${prev.length}, now ${prev.length + shuffled.length})`);
    return [...prev, ...shuffled];
  });
  setIsFetchingMore(false);
}, [isFetchingMore, user]);

  useEffect(() => {
  async function fetchMusic() {
    if (!user) return;

    setIsLoading(true);
    fetchOffsetRef.current = 0;

    const userGenres = user.favoriteGenres?.length > 0
      ? user.favoriteGenres
      : getTrendingGenres();

    const genresToFetch = userGenres.length > 3
      ? [...userGenres].sort(() => Math.random() - 0.5).slice(0, 3)
      : userGenres;

    console.log('🎵 Initial fetch - Genres:', genresToFetch);

    const allTracks: Track[] = [];

    for (const genre of genresToFetch) {
      const [classics, trending] = await Promise.all([
        getPopularClassics(genre, 23, true, 0),
        getTopChartsByGenre(genre, 27, 0),
      ]);

      console.log(`📀 ${genre}: ${classics.length} classics + ${trending.length} trending = ${classics.length + trending.length} total`);
      allTracks.push(...classics, ...trending);
    }

    const seenIds = new Set();
    const uniqueTracks = allTracks.filter(track => {
      if (seenIds.has(track.id)) return false;
      seenIds.add(track.id);
      return true;
    });

    console.log(`✅ Total tracks fetched: ${allTracks.length}, Unique: ${uniqueTracks.length}`);

    const shuffled = uniqueTracks.sort(() => Math.random() - 0.5);
    setTracks(shuffled);
    setIsLoading(false);
  }

  fetchMusic();
}, [user]);

  useEffect(() => {
    if (tracks.length > 0 && currentIndex >= tracks.length - 10 && !isFetchingMore) {
      console.log(`🎯 Near end: currentIndex=${currentIndex}, tracks.length=${tracks.length}, triggering fetch`);
      fetchMoreTracks();
    }
  }, [currentIndex, tracks.length, isFetchingMore, fetchMoreTracks]);

  useEffect(() => {
    if (tracks.length > 0 && tracks[currentIndex]) {
      const loadAndPlay = async () => {
        // Pause current track
        pause();
        // Load new track
        loadTrack(tracks[currentIndex].previewUrl);
        // Wait a bit for track to load
        await new Promise(resolve => setTimeout(resolve, 150));
        // Auto-play (will be blocked on first load until user interacts, then works)
        await play();
      };
      loadAndPlay();
    }
  }, [currentIndex, tracks, loadTrack, pause, play]);

  // Cleanup: pause audio when navigating away from the page
  useEffect(() => {
    return () => {
      pause();
    };
  }, [pause]);

  const handleSave = async () => {
    const currentTrack = tracks[currentIndex];
    if (!currentTrack) return;

    if (isFavorite(currentTrack.id)) {
      await removeFavorite(currentTrack.id);
    } else {
      await addFavorite(currentTrack);
    }
  };

  useEffect(() => {
    if (isLoading) return;

    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      if (isScrollingRef.current) return;

      const threshold = 30;
      if (Math.abs(e.deltaY) < threshold) return;

      isScrollingRef.current = true;

      if (e.deltaY > 0) {
        goToNext();
      } else if (e.deltaY < 0) {
        goToPrevious();
      }

      scrollTimeoutRef.current = setTimeout(() => {
        isScrollingRef.current = false;
      }, 600);
    };

    console.log('🔧 Setting up wheel listener');
    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      console.log('🧹 Cleaning up wheel listener');
      container.removeEventListener('wheel', handleWheel);
      if (scrollTimeoutRef.current !== null) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [isLoading, goToNext, goToPrevious]);

  const touchStartY = useRef(0);
  const touchEndY = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndY.current = e.changedTouches[0].clientY;
    const deltaY = touchStartY.current - touchEndY.current;
    const threshold = 50;

    if (Math.abs(deltaY) > threshold && !isScrollingRef.current) {
      isScrollingRef.current = true;

      if (deltaY > 0) {
        goToNext();
      } else {
        goToPrevious();
      }

      setTimeout(() => {
        isScrollingRef.current = false;
      }, 800);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        togglePlayPause();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlayPause]);

  const currentTrack = tracks[currentIndex];

  if (authLoading || isLoading) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-white/60 text-sm tracking-wider uppercase">
            {authLoading ? 'Loading...' : 'Loading music...'}
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="h-screen w-screen bg-black overflow-hidden relative"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${THEMES[user.theme || 'default'].from} via-black ${THEMES[user.theme || 'default'].to}`} />
      
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/50 pointer-events-none z-10" />

      <div className="absolute top-0 left-0 right-0 z-20 p-6 flex items-center justify-between backdrop-blur-sm bg-black/20">
        <div className="flex items-center gap-4">
          <h1 className="text-white/90 text-xs font-light tracking-widest uppercase">
            Discover
          </h1>
          <span className="text-white/40 text-xs">
            {user.fullName}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/favorites"
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all"
          >
            <span className="text-white/60 text-sm font-light">My Saves</span>
            <span className="text-white/80 text-sm font-medium">{favorites.length}</span>
          </Link>

          <button
            onClick={handleSave}
            className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all"
          >
            <svg className="w-5 h-5" fill={isFavorite(currentTrack?.id) ? "#ef4444" : "none"} stroke={isFavorite(currentTrack?.id) ? "#ef4444" : "currentColor"} strokeWidth={2} viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </button>
          <Link
            href="/playlists"
            className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all"
            title="AI Playlists"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </Link>
          <Link
            href="/analytics"
            className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all"
            title="Analytics"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </Link>
          <Link
            href="/settings"
            className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all"
            >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
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

      {showHint && currentIndex === 0 && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-pulse">
          <div className="text-center space-y-3">
            <p className="text-xs uppercase tracking-widest text-white/50">Scroll to explore</p>
            <svg className="w-8 h-8 text-white/40 mx-auto animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      )}

      {currentTrack && (
        <SwipeCard
          track={currentTrack}
          isSaved={isFavorite(currentTrack.id)}
          direction={direction}
          isPlaying={isPlaying}
          onPlayPause={togglePlayPause}
          currentTime={currentTime}
          duration={duration}
          onSeek={seek}
          analyser={analyser}
          theme={user.theme || 'default'}
          volume={volume}
          onVolumeChange={changeVolume}
        />
      )}

      <div className="absolute right-8 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2 max-h-[60vh] overflow-hidden">
        {Array.from({ length: Math.min(20, tracks.length) }, (_, i) => {
          let startIndex;
          const maxDots = 20;
          
          if (tracks.length <= maxDots) {
            startIndex = 0;
          } else if (currentIndex < maxDots) {
            startIndex = 0;
          } else {
            startIndex = currentIndex - maxDots + 1;
          }
          
          const index = startIndex + i;
          if (index >= tracks.length) return null;
          
          return (
            <div
              key={index}
              className={`w-1 rounded-full transition-all ${
                index === currentIndex
                  ? 'h-8 bg-white/80'
                  : index < currentIndex
                  ? 'h-2 bg-white/30'
                  : 'h-2 bg-white/10'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}

