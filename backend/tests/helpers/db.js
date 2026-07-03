// Test database helper: starts an in-memory MongoDB (mongodb-memory-server)
// so tests are fully isolated and never touch the real database.
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongod;

async function connect() {
  process.env.JWT_SECRET = 'test-secret'; // tests need a secret to sign tokens
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}

async function close() {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
}

module.exports = { connect, close };
