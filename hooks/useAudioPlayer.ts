import { useState, useEffect, useRef, useCallback } from 'react';

interface TrackInfo {
  trackId: number;
  trackTitle: string;
  trackArtist: string;
  trackGenre: string;
  albumName: string;
  artworkUrl: string;
  previewUrl: string;
}

export function useAudioPlayer(trackInfo?: TrackInfo) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const playStartTimeRef = useRef<number>(0);
  const hasTrackedPlayRef = useRef<boolean>(false);

  const trackPlayEvent = useCallback(async (durationPlayed: number, completed: boolean) => {
    if (!trackInfo) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      await fetch('/api/listening-history/track-play', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          trackId: trackInfo.trackId,
          trackTitle: trackInfo.trackTitle,
          trackArtist: trackInfo.trackArtist,
          trackGenre: trackInfo.trackGenre,
          albumName: trackInfo.albumName,
          artworkUrl: trackInfo.artworkUrl,
          previewUrl: trackInfo.previewUrl,
          durationPlayed,
          completed,
        }),
      });
    } catch (error) {
      console.error('Failed to track play event:', error);
    }
  }, [trackInfo]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio();
      audioRef.current.crossOrigin = 'anonymous';

      const handleTimeUpdate = () => {
        setCurrentTime(audioRef.current?.currentTime || 0);
      };

      const handleLoadedMetadata = () => {
        setDuration(audioRef.current?.duration || 0);
      };

      const handleEnded = () => {
        const durationPlayed = Date.now() - playStartTimeRef.current;
        if (trackInfo && durationPlayed > 0) {
          trackPlayEvent(durationPlayed / 1000, true);
        }
        setIsPlaying(false);
        setCurrentTime(0);
        hasTrackedPlayRef.current = false;
      };

      audioRef.current.addEventListener('timeupdate', handleTimeUpdate);
      audioRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
      audioRef.current.addEventListener('ended', handleEnded);

      return () => {
        audioRef.current?.pause();
        audioRef.current?.removeEventListener('timeupdate', handleTimeUpdate);
        audioRef.current?.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audioRef.current?.removeEventListener('ended', handleEnded);
      };
    }
  }, [trackInfo, trackPlayEvent]);

  const initAudioContext = useCallback(() => {
    if (audioRef.current && !audioContextRef.current) {
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 512;
      analyserRef.current.smoothingTimeConstant = 0.3;

      sourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
      sourceRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);
    }
  }, []);

  const loadTrack = useCallback((url: string) => {
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.load();
      setCurrentTime(0);
      setIsPlaying(false);
      hasTrackedPlayRef.current = false;
    }
  }, []);

  const play = useCallback(async () => {
    if (audioRef.current) {
      try {
        if (!audioRef.current.src) {
          return;
        }

        initAudioContext();

        if (audioContextRef.current?.state === 'suspended') {
          await audioContextRef.current.resume();
        }

        await audioRef.current.play();
        playStartTimeRef.current = Date.now();
        setIsPlaying(true);
      } catch (err: any) {
        if (err.name !== 'NotAllowedError' && err.name !== 'AbortError') {
          console.error('Error playing audio:', err);
        }
        setIsPlaying(false);
      }
    }
  }, [initAudioContext]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      const durationPlayed = Date.now() - playStartTimeRef.current;
      if (trackInfo && durationPlayed > 3000 && !hasTrackedPlayRef.current) {
        trackPlayEvent(durationPlayed / 1000, false);
        hasTrackedPlayRef.current = true;
      }
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [trackInfo, trackPlayEvent]);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const changeVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolume(clampedVolume);
    if (audioRef.current) {
      audioRef.current.volume = clampedVolume;
    }
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  return {
    isPlaying,
    currentTime,
    duration,
    volume,
    loadTrack,
    play,
    pause,
    togglePlayPause,
    seek,
    changeVolume,
    analyser: analyserRef.current,
    audioContext: audioContextRef.current,
  };
}
