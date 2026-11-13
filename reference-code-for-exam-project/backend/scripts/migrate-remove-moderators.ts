/**
 * One-off migration: hard delete moderators + verification data.
 * Run with: npx tsx scripts/migrate-remove-moderators.ts
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/exam_db';
  await mongoose.connect(uri);
  console.log('connected');
  // Drop moderator users (role == moderator)
  const delMod = await mongoose.connection.collection('users').deleteMany({ role: 'moderator' } as never);
  console.log(`deleted moderator users: ${delMod.deletedCount}`);
  // Drop verification requests collection (hard delete, no QR audit kept)
  try {
    await mongoose.connection.collection('verificationrequests').drop();
    console.log('dropped verificationrequests');
  } catch { console.log('verificationrequests already gone'); }
  // Remove moderatorIds field from exams
  const upd = await mongoose.connection.collection('exams').updateMany(
    { moderatorIds: { $exists: true } },
    { $unset: { moderatorIds: '' } } as never,
  );
  console.log(`exams cleaned: ${upd.modifiedCount}`);
  await mongoose.disconnect();
  console.log('migration done');
}
main().catch((e) => { console.error(e); process.exit(1); });
