// Simple migration system (docs section 5).
// Migration files live in src/migrations/ and export { name, description, up, down }.
// Executed migrations are recorded in the "migrations" collection so they only run once.
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'migrations');

// Load all migration files sorted by filename (001_, 002_, ...)
function loadMigrationFiles() {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.js'))
    .sort()
    .map((file) => require(path.join(MIGRATIONS_DIR, file)));
}

function migrationsCollection() {
  return mongoose.connection.db.collection('migrations');
}

// Returns each migration with an "executed" flag
async function status() {
  const executed = await migrationsCollection().find().toArray();
  const executedNames = executed.map((m) => m.name);
  return loadMigrationFiles().map((m, i) => ({
    name: m.name,
    version: i + 1,
    description: m.description,
    executed: executedNames.includes(m.name),
  }));
}

// Runs every migration that has not been executed yet, in order
async function runPending() {
  const list = await status();
  for (const item of list) {
    if (item.executed) continue;
    const migration = loadMigrationFiles().find((m) => m.name === item.name);
    console.log(`Running migration: ${migration.name}`);
    await migration.up(mongoose.connection.db);
    await migrationsCollection().insertOne({
      name: migration.name,
      version: item.version,
      description: migration.description,
      executedAt: new Date(),
      status: 'completed',
    });
  }
}

// Undoes one migration by name and removes its record
async function rollback(name) {
  const migration = loadMigrationFiles().find((m) => m.name === name);
  if (!migration) throw new Error(`Migration not found: ${name}`);
  console.log(`Rolling back migration: ${name}`);
  await migration.down(mongoose.connection.db);
  await migrationsCollection().deleteOne({ name });
}

module.exports = { status, runPending, rollback };
