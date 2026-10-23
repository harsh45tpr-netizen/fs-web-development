/**
 * Database seeder for sky_and_sea_pro2
 *
 *   npm run seed           → insert seed data only into empty collections
 *   npm run seed -- --reset → wipe crafts/destinations/inquiries and re-seed
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('./config/db');
const Craft = require('./models/Craft');
const Destination = require('./models/Destination');
const Inquiry = require('./models/Inquiry');
const { SEED_FLEET, SEED_DESTINATIONS, SEED_INQUIRIES } = require('./data/seedData');

const COLLECTIONS = [
  { Model: Craft, data: SEED_FLEET, label: 'crafts' },
  { Model: Destination, data: SEED_DESTINATIONS, label: 'destinations' },
  { Model: Inquiry, data: SEED_INQUIRIES, label: 'inquiries' }
];

/** Seeds empty collections (or all collections when reset = true). */
async function seedDatabase({ reset = false } = {}) {
  for (const { Model, data, label } of COLLECTIONS) {
    await Model.syncIndexes(); // creates the collection + its indexes
    if (reset) await Model.deleteMany({});
    const count = await Model.countDocuments();
    if (count === 0) {
      await Model.insertMany(data);
      console.log(`🌱 Seeded ${data.length} documents into "${label}"`);
    } else {
      console.log(`✔  "${label}" already has ${count} documents (skipped)`);
    }
  }
}

module.exports = { seedDatabase };

// Run directly: node seed.js [--reset]
if (require.main === module) {
  (async () => {
    try {
      await connectDB();
      await seedDatabase({ reset: process.argv.includes('--reset') });
      console.log('✅ Database ready');
    } catch (err) {
      console.error('❌ Seeding failed:', err.message);
      process.exitCode = 1;
    } finally {
      await mongoose.disconnect();
    }
  })();
}
