import { ObjectId } from 'mongodb';
import { getDatabase } from './mongodb';

export interface ListeningEvent {
  _id?: ObjectId;
  userId: ObjectId;
  trackId: number; // iTunes track ID
  trackTitle: string;
  trackArtist: string;
  trackGenre: string;
  albumName: string;
  artworkUrl: string;
  previewUrl: string;
  playedAt: Date;
  durationPlayed: number; // in seconds
  completed: boolean; // did they listen to the full preview?
}

export async function recordPlayEvent(event: Omit<ListeningEvent, '_id'>) {
  const db = await getDatabase();
  const result = await db.collection<ListeningEvent>('listening_history').insertOne({
    ...event,
    playedAt: new Date(),
  });
  return result.insertedId;
}

export async function getUserListeningHistory(
  userId: ObjectId,
  limit: number = 50,
  skip: number = 0
) {
  const db = await getDatabase();
  return db
    .collection<ListeningEvent>('listening_history')
    .find({ userId })
    .sort({ playedAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();
}

export async function getTopTracks(userId: ObjectId, limit: number = 10) {
  const db = await getDatabase();
  return db
    .collection<ListeningEvent>('listening_history')
    .aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$trackId',
          playCount: { $sum: 1 },
          totalDuration: { $sum: '$durationPlayed' },
          trackTitle: { $first: '$trackTitle' },
          trackArtist: { $first: '$trackArtist' },
          trackGenre: { $first: '$trackGenre' },
          artworkUrl: { $first: '$artworkUrl' },
          lastPlayed: { $max: '$playedAt' },
        },
      },
      { $sort: { playCount: -1 } },
      { $limit: limit },
    ])
    .toArray();
}

export async function getTopArtists(userId: ObjectId, limit: number = 10) {
  const db = await getDatabase();
  return db
    .collection<ListeningEvent>('listening_history')
    .aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$trackArtist',
          playCount: { $sum: 1 },
          totalDuration: { $sum: '$durationPlayed' },
          genres: { $addToSet: '$trackGenre' },
          lastPlayed: { $max: '$playedAt' },
        },
      },
      { $sort: { playCount: -1 } },
      { $limit: limit },
    ])
    .toArray();
}

export async function getGenreDistribution(userId: ObjectId) {
  const db = await getDatabase();
  return db
    .collection<ListeningEvent>('listening_history')
    .aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$trackGenre',
          playCount: { $sum: 1 },
          totalDuration: { $sum: '$durationPlayed' },
        },
      },
      { $sort: { playCount: -1 } },
    ])
    .toArray();
}

export async function getListeningStats(userId: ObjectId) {
  const db = await getDatabase();
  const stats = await db
    .collection<ListeningEvent>('listening_history')
    .aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          totalPlays: { $sum: 1 },
          totalDuration: { $sum: '$durationPlayed' },
          uniqueTracks: { $addToSet: '$trackId' },
          uniqueArtists: { $addToSet: '$trackArtist' },
          uniqueGenres: { $addToSet: '$trackGenre' },
        },
      },
    ])
    .toArray();

  if (stats.length === 0) {
    return {
      totalPlays: 0,
      totalDuration: 0,
      uniqueTracks: 0,
      uniqueArtists: 0,
      uniqueGenres: 0,
    };
  }

  const result = stats[0];
  return {
    totalPlays: result.totalPlays,
    totalDuration: result.totalDuration,
    uniqueTracks: result.uniqueTracks.length,
    uniqueArtists: result.uniqueArtists.length,
    uniqueGenres: result.uniqueGenres.length,
  };
}
