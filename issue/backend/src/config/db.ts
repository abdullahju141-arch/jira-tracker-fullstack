// src/config/db.ts
import mongoose from 'mongoose';

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI not set in environment variables');

  try {
    await mongoose.connect(uri);
    console.log(`✅  MongoDB connected: ${mongoose.connection.host}`);

    mongoose.connection.on('disconnected', () =>
      console.warn('⚠️   MongoDB disconnected — attempting reconnect…')
    );
    mongoose.connection.on('error', (err) =>
      console.error('❌  MongoDB error:', err.message)
    );
  } catch (err) {
    console.error('❌  MongoDB connection failed:', (err as Error).message);
    process.exit(1);
  }
}
