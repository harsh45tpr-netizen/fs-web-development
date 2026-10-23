/**
 * MongoDB connection helper (Mongoose)
 */
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/sky_and_sea_pro2';

async function connectDB() {
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 2500 });
  console.log(`✅ Connected to MongoDB: ${mongoose.connection.host}:${mongoose.connection.port}/${mongoose.connection.name}`);
  return mongoose.connection;
}

module.exports = { connectDB, MONGO_URI };
