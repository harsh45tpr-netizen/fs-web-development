/**
 * =======================================================================
 * SKY & SEA — PRO-2 FULLSTACK MERN BACKEND
 * Express.js + MongoDB & Mongoose + Zero-Crash In-Memory Fallback
 * =======================================================================
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const { connectDB, MONGO_URI } = require('./config/db');
const Craft = require('./models/Craft');
const Inquiry = require('./models/Inquiry');
const Destination = require('./models/Destination');
const { seedDatabase } = require('./seed');
const { SEED_FLEET, SEED_DESTINATIONS, SEED_INQUIRIES } = require('./data/seedData');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve client production build if available
const clientDist = path.join(__dirname, '../client/dist');
app.use(express.static(clientDist));

// In-Memory store fallback (used only when MongoDB is unreachable)
let isMongoConnected = false;
let memoryFleet = SEED_FLEET.map((item, idx) => ({
  _id: 'mem-' + (100 + idx),
  ...item,
  createdAt: new Date().toISOString()
}));
let memoryInquiries = SEED_INQUIRIES.map((item, idx) => ({
  _id: 'inq-' + (101 + idx),
  ...item,
  createdAt: new Date(Date.now() - 3600000 * (5 - idx * 3)).toISOString()
}));

// Connect to MongoDB and seed empty collections
connectDB()
  .then(async () => {
    isMongoConnected = true;
    await seedDatabase();
  })
  .catch(() => {
    isMongoConnected = false;
    console.log(`⚠️  MongoDB not reachable at ${MONGO_URI}. Running in In-Memory Auto-Fallback Mode.`);
  });

// REST API ROUTES
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    project: 'PRO-2 Fullstack MERN',
    database: isMongoConnected ? 'MongoDB (Connected)' : 'In-Memory Fallback Active',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/fleet', async (req, res) => {
  try {
    const { type, search } = req.query;

    if (isMongoConnected) {
      let query = {};
      if (type && type !== 'all') query.type = type;
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { manufacturer: { $regex: search, $options: 'i' } }
        ];
      }
      const data = await Craft.find(query).sort({ priceBuy: -1 });
      return res.json({ success: true, count: data.length, source: 'MongoDB', data });
    }

    let data = [...memoryFleet];
    if (type && type !== 'all') data = data.filter(c => c.type === type);
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(c => c.name.toLowerCase().includes(q) || c.manufacturer.toLowerCase().includes(q));
    }
    return res.json({ success: true, count: data.length, source: 'In-Memory', data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/destinations', async (req, res) => {
  try {
    if (isMongoConnected) {
      const data = await Destination.find().sort({ order: 1 });
      return res.json({ success: true, count: data.length, source: 'MongoDB', data });
    }
    return res.json({ success: true, count: SEED_DESTINATIONS.length, source: 'In-Memory', data: SEED_DESTINATIONS });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/inquiries', async (req, res) => {
  try {
    const body = req.body;
    if (!body.name || !body.email) {
      return res.status(400).json({ success: false, message: 'Name and email are required' });
    }

    if (isMongoConnected) {
      const created = await Inquiry.create(body);
      return res.status(201).json({ success: true, message: 'Inquiry registered in MongoDB', data: created });
    }

    const newInq = {
      _id: 'inq-' + Date.now(),
      ...body,
      status: 'Confirmed',
      createdAt: new Date().toISOString()
    };
    memoryInquiries.unshift(newInq);
    return res.status(201).json({ success: true, message: 'Inquiry registered in Memory DB', data: newInq });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/api/inquiries', async (req, res) => {
  try {
    if (isMongoConnected) {
      const list = await Inquiry.find().sort({ createdAt: -1 });
      return res.json({ success: true, count: list.length, data: list });
    }
    return res.json({ success: true, count: memoryInquiries.length, data: memoryInquiries });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/inquiries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (isMongoConnected) {
      await Inquiry.findByIdAndDelete(id);
      return res.json({ success: true, message: 'Inquiry deleted from MongoDB' });
    }
    memoryInquiries = memoryInquiries.filter(i => String(i._id) !== String(id));
    return res.json({ success: true, message: 'Inquiry deleted' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/seed', async (req, res) => {
  try {
    if (isMongoConnected) {
      await Craft.deleteMany({});
      await Destination.deleteMany({});
      await Destination.insertMany(SEED_DESTINATIONS);
      const result = await Craft.insertMany(SEED_FLEET);
      return res.json({ success: true, message: 'Database reset to default', count: result.length });
    }
    memoryFleet = SEED_FLEET.map((item, idx) => ({
      _id: 'mem-' + (100 + idx),
      ...item,
      createdAt: new Date().toISOString()
    }));
    return res.json({ success: true, message: 'Memory fleet reset to default', count: memoryFleet.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(` 🚀 PRO-2 Fullstack Server running on port ${PORT}`);
  console.log(` 📡 REST API: http://localhost:${PORT}/api/fleet`);
  console.log(` 💎 Database: ${isMongoConnected ? 'MongoDB' : 'In-Memory Auto-Fallback'}`);
  console.log(`======================================================\n`);
});
