import mongoose from 'mongoose';
import { env } from './env.js';

/**
 * Connects to MongoDB using Mongoose.
 * Registers connection lifecycle listeners and exits on failure.
 */
export async function connectDB(): Promise<typeof mongoose> {
  try {
    mongoose.set('strictQuery', true);

    const conn = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });

    // The User model used to carry a unique `email` field (since removed
    // in favour of `username`). Mongoose never drops indexes for removed
    // schema fields, and the orphaned unique index makes every new user
    // collide on `email: undefined` (DUPLICATE_KEY). Drop it if present.
    try {
      const db = conn.connection.db;
      if (db) {
        const indexes = await db.collection('users').indexes();
        if (indexes.some((i) => i.name === 'email_1')) {
          await db.collection('users').dropIndex('email_1');
          console.log('🧹 Dropped stale users.email_1 index (legacy email field).');
        }
      }
    } catch (err) {
      console.warn('⚠️  Could not check users indexes:', (err as Error).message);
    }

    console.log(`✅ MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected');
    });

    return conn;
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err);
    process.exit(1);
  }
}

/**
 * Gracefully closes the MongoDB connection (used on shutdown).
 */
export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  console.log('🛑 MongoDB disconnected');
}
