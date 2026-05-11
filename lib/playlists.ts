import { ObjectId } from 'mongodb';
import { getDatabase } from './mongodb';
import { Track } from './itunes';

export interface Playlist {
  _id?: ObjectId;
  userId: ObjectId;
  name: string;
  prompt: string;
  tracks: Track[];
  aiGenerated: boolean;
  createdAt: Date;
}

/**
 * Save a playlist to MongoDB
 */
export async function savePlaylist(
  userId: ObjectId,
  name: string,
  prompt: string,
  tracks: Track[],
  aiGenerated: boolean = true
): Promise<ObjectId> {
  const db = await getDatabase();

  const playlist: Playlist = {
    userId,
    name,
    prompt,
    tracks,
    aiGenerated,
    createdAt: new Date(),
  };

  const result = await db.collection<Playlist>('playlists').insertOne(playlist);
  return result.insertedId;
}

/**
 * Get all playlists for a user
 */
export async function getUserPlaylists(userId: ObjectId): Promise<Playlist[]> {
  const db = await getDatabase();

  return db
    .collection<Playlist>('playlists')
    .find({ userId })
    .sort({ createdAt: -1 })
    .toArray();
}

/**
 * Get a single playlist by ID
 */
export async function getPlaylistById(
  playlistId: ObjectId,
  userId: ObjectId
): Promise<Playlist | null> {
  const db = await getDatabase();

  return db.collection<Playlist>('playlists').findOne({
    _id: playlistId,
    userId, // Ensure user owns this playlist
  });
}

/**
 * Delete a playlist
 */
export async function deletePlaylist(
  playlistId: ObjectId,
  userId: ObjectId
): Promise<boolean> {
  const db = await getDatabase();

  const result = await db.collection<Playlist>('playlists').deleteOne({
    _id: playlistId,
    userId, // Ensure user owns this playlist
  });

  return result.deletedCount === 1;
}

/**
 * Update playlist name
 */
export async function updatePlaylistName(
  playlistId: ObjectId,
  userId: ObjectId,
  newName: string
): Promise<boolean> {
  const db = await getDatabase();

  const result = await db.collection<Playlist>('playlists').updateOne(
    {
      _id: playlistId,
      userId,
    },
    {
      $set: { name: newName },
    }
  );

  return result.modifiedCount === 1;
}
