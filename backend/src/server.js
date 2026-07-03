// Entry point: connects to MongoDB, runs pending migrations, starts the server.
require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');
const migrationService = require('./services/migrations/migrationService');

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

async function start() {
  if (!MONGO_URI) {
    console.error('MONGO_URI is missing. Copy .env.example to .env and set it.');
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // Auto-run any migrations that have not been executed yet (see docs section 5)
  await migrationService.runPending();

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
