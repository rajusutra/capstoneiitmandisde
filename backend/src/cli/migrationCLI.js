// Small command line tool for migrations.
// Usage:
//   npm run migrate:status          -> list migrations and whether they ran
//   npm run migrate:run             -> run all pending migrations
//   npm run migrate:rollback <name> -> undo one migration by name
require('dotenv').config();
const mongoose = require('mongoose');
const migrationService = require('../services/migrations/migrationService');

async function main() {
  const command = process.argv[2];
  const arg = process.argv[3];

  await mongoose.connect(process.env.MONGO_URI);

  if (command === 'status') {
    const list = await migrationService.status();
    for (const m of list) {
      console.log(`${m.executed ? '[done]   ' : '[pending]'} ${m.name} - ${m.description}`);
    }
  } else if (command === 'run') {
    await migrationService.runPending();
    console.log('All pending migrations executed.');
  } else if (command === 'rollback') {
    if (!arg) throw new Error('Usage: npm run migrate:rollback <migration-name>');
    await migrationService.rollback(arg);
    console.log(`Rolled back: ${arg}`);
  } else {
    console.log('Unknown command. Use: status | run | rollback <name>');
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
