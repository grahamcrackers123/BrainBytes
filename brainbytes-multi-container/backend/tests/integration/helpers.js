const mongoose = require('mongoose');

let mongoAvailable = false;

async function connectMongo(suiteName) {
  const mongoUrl = process.env.MONGO_URL || 'mongodb://mongo:27017/brainbytes_test';
  try {
    await mongoose.connect(mongoUrl, { serverSelectionTimeoutMS: 5000 });
    mongoAvailable = true;
    await mongoose.connection.dropDatabase();
  } catch {
    console.warn(`MongoDB not reachable at ${mongoUrl} — skipping ${suiteName}`);
  }
}

function requireMongo(fn) {
  return async () => {
    if (!mongoAvailable) {
      return;
    }
    await fn();
  };
}

async function disconnectMongo() {
  if (mongoAvailable) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
}

module.exports = { connectMongo, requireMongo, disconnectMongo };
