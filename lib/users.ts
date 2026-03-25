import { getDatabase } from './mongodb';
import { User } from './auth';

const USERS_COLLECTION = 'users';

export async function createUser(userData: Omit<User, '_id' | 'createdAt' | 'surveyCompleted' | 'favoriteGenres' | 'theme'>): Promise<User> {
  const db = await getDatabase();
  const usersCollection = db.collection<User>(USERS_COLLECTION);

  const existingUser = await usersCollection.findOne({ email: userData.email });
  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Default to all genres (Any Genre - Surprise me!)
  const ALL_GENRES = ["Pop", "Hip-Hop/Rap", "Rock", "Electronic", "R&B/Soul", "Alternative", "Dance", "Indie", "Latin", "Country"];

  const newUser: User = {
    ...userData,
    surveyCompleted: false,
    favoriteGenres: ALL_GENRES,
    theme: 'default',
    createdAt: new Date(),
  };

  const result = await usersCollection.insertOne(newUser as any);
  return { ...newUser, _id: result.insertedId.toString() };
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const db = await getDatabase();
  const usersCollection = db.collection<User>(USERS_COLLECTION);
  const user = await usersCollection.findOne({ email });

  if (!user) return null;

  return {
    ...user,
    _id: user._id?.toString(),
  };
}

export async function findUserById(userId: string): Promise<User | null> {
  const db = await getDatabase();
  const usersCollection = db.collection<User>(USERS_COLLECTION);
  const { ObjectId } = require('mongodb');

  const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

  if (!user) return null;

  return {
    ...user,
    _id: user._id?.toString(),
  };
}

export async function updateUserSurvey(userId: string, genres: string[]): Promise<void> {
  const db = await getDatabase();
  const usersCollection = db.collection<User>(USERS_COLLECTION);
  const { ObjectId } = require('mongodb');

  await usersCollection.updateOne(
    { _id: new ObjectId(userId) },
    { 
      $set: { 
        surveyCompleted: true, 
        favoriteGenres: genres 
      } 
    }
  );
}

export async function updateUserSettings(userId: string, genres: string[], theme: string): Promise<void> {
  const db = await getDatabase();
  const usersCollection = db.collection<User>(USERS_COLLECTION);
  const { ObjectId } = require('mongodb');

  await usersCollection.updateOne(
    { _id: new ObjectId(userId) },
    { 
      $set: { 
        favoriteGenres: genres,
        theme: theme
      } 
    }
  );
}