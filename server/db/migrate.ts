import { getDb, closeDb } from './database';
import { runMigrations, seedDatabase, verifyDatabaseIntegrity } from './migrations';

export async function initDb(): Promise<void> {
  const db = getDb();
  console.log('Running migrations...');
  const migrationResult = runMigrations(db);
  console.log(`Migrations complete. Applied: ${migrationResult.applied.length}, Total: ${migrationResult.total}`);

  console.log('Verifying database integrity and foreign key constraints...');
  const integrity = verifyDatabaseIntegrity(db);
  if (!integrity.integrity || !integrity.foreignKeys) {
    console.error('Integrity check failed!', integrity.details);
    throw new Error('Database integrity check failed');
  }
  console.log('Database integrity verified successfully.');

  console.log('Seeding initial data (roles, permissions, admin & demo users)...');
  await seedDatabase(db);
  console.log('Seeding completed.');
}

if (process.argv[1] && process.argv[1].endsWith('migrate.ts')) {
  initDb()
    .then(() => {
      console.log('Database migration & seed complete.');
      closeDb();
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration error:', err);
      closeDb();
      process.exit(1);
    });
}
