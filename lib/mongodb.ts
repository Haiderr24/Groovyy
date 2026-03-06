import { MongoClient, Db } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your MongoDB URI to .env.local');
}

const uri = process.env.MONGODB_URI;
const options = {
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of hanging
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  // Always reset in dev to avoid stale connections
  globalWithMongo._mongoClientPromise = undefined;
  client = new MongoClient(uri, options);
  globalWithMongo._mongoClientPromise = client.connect();
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise;

export async function getDatabase(): Promise<Db> {
  const client = await clientPromise;
  return client.db(process.env.MONGODB_DB || 'music-swipe');
}

// Helper to reset connection in development (call this if you suspect stale connection)
export function resetConnection() {
  if (process.env.NODE_ENV === 'development') {
    let globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };
    delete globalWithMongo._mongoClientPromise;
    console.log('MongoDB connection cache cleared. Restart your dev server.');
  }
}
