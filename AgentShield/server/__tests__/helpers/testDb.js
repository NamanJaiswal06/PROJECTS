/**
 * testDb.js — In-memory MongoDB setup for tests.
 *
 * Why mongodb-memory-server?
 *   - Tests run against a real MongoDB instance, not a mock
 *   - No need for a running MongoDB — the package downloads a MongoDB binary
 *     and starts it in-process
 *   - Each test suite gets a fresh database — no state leaks between test files
 *   - Tests are deterministic and don't pollute a development database
 *
 * Usage:
 *   In each test file:
 *     const { connect, disconnect, clearDatabase } = require('../helpers/testDb');
 *     beforeAll(connect);
 *     afterEach(clearDatabase);  // optional — clear between tests
 *     afterAll(disconnect);
 */
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongoServer;

/**
 * Start the in-memory MongoDB and connect Mongoose to it.
 */
const connect = async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
};

/**
 * Drop all collections — call between tests when you need a clean slate
 * but don't want to restart the server.
 */
const clearDatabase = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};

/**
 * Disconnect Mongoose and stop the in-memory server.
 */
const disconnect = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await mongoServer.stop();
};

module.exports = { connect, clearDatabase, disconnect };
