/**
 * =======================================================================
 * SKY & SEA — PRO-2 FULLSTACK MERN BACKEND
 * Express.js + MongoDB & Mongoose + Zero-Crash In-Memory Fallback
 * =======================================================================
 */

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/sky_and_sea_pro2';

// Middleware
app.use(cors());
app.use(express.json());

// Serve client production build if available
const clientDist = path.join(__dirname, '../client/dist');
app.use(express.static(clientDist));

// Seed Fleet Data
const SEED_FLEET = [
  {
    type: 'jet',
    name: 'Gulfstream G700',
    model: 'G700 Flagship',
    manufacturer: 'Gulfstream Aerospace',
    category: 'Ultra Long Range',
    passengers: 19,
    range: '7,500 nm (13,890 km)',
    speed: 'Mach 0.925 (710 mph)',
    priceCharter: 12000,
    priceCharterUnit: 'hour',
    priceBuy: 78000000,
    image: '/images/jet-gulfstream.jpg',
    badge: 'Flagship Edition',
    description: 'The pinnacle of private aviation, featuring the tallest, widest, and longest cabin in business aviation with up to five distinct living areas and circadian lighting.',
    specs: {
      crew: '2 Pilots + 2 Flight Attendants',
      altitude: '51,000 ft',
      cabinZones: '5 Distinct Living Zones',
      bedCount: 'Master Suite with En-suite Shower',
      baggageCapacity: '195 cu ft',
      avionics: 'Symmetry Flight Deck with Active Control Sidesticks'
    },
    features: ['Private Master Bedroom Suite', 'Ultra-High-Speed Ka-Band Wi-Fi', '20 Panoramic Oval Windows', 'Dedicated Galley & Wine Cellar']
  },
  {
    type: 'jet',
    name: 'Bombardier Global 7500',
    model: 'Global 7500',
    manufacturer: 'Bombardier Aviation',
    category: 'Ultra Long Range',
    passengers: 16,
    range: '7,770 nm (14,390 km)',
    speed: 'Mach 0.925 (709 mph)',
    priceCharter: 10500,
    priceCharterUnit: 'hour',
    priceBuy: 75000000,
    image: '/images/jet-bombardier.jpg',
    badge: 'Longest Range',
    description: 'A masterpiece of business aviation engineering, holding the world record for the longest non-stop mission flight from Sydney to Detroit.',
    specs: {
      crew: '2 Pilots + 2 Flight Attendants',
      altitude: '51,000 ft',
      cabinZones: '4 Distinct Living Zones',
      bedCount: 'Permanent Bed Suite with True Stand-up Shower',
      baggageCapacity: '195 cu ft',
      avionics: 'Bombardier Vision Flight Deck'
    },
    features: ['Nuage Ergonomic Zero-Gravity Seating', 'Soleil Circadian Lighting System', 'Full Size Kitchen with Convection Oven', 'Pur Air HEPA System']
  },
  {
    type: 'jet',
    name: 'Dassault Falcon 8X',
    model: 'Falcon 8X',
    manufacturer: 'Dassault Aviation',
    category: 'Ultra Long Range Tri-Jet',
    passengers: 14,
    range: '6,450 nm (11,945 km)',
    speed: 'Mach 0.90 (690 mph)',
    priceCharter: 8500,
    priceCharterUnit: 'hour',
    priceBuy: 62000000,
    image: '/images/jet-falcon.jpg',
    badge: 'Tri-Jet Performance',
    description: 'Renowned for exceptional steep-approach performance, allowing access to challenging alpine airfields like London City, Lugano, and Aspen.',
    specs: {
      crew: '2 Pilots + 1 Flight Attendant',
      altitude: '51,000 ft',
      cabinZones: '3 Executive Zones',
      bedCount: 'Convertible Executive Double Suites',
      baggageCapacity: '140 cu ft',
      avionics: 'EASy III Flight Deck with FalconEye HUD'
    },
    features: ['Three Pratt & Whitney Engines for Transoceanic Safety', 'FalconEye Combined Vision System', 'Whisper-Quiet Cabin (<49 dB)', 'Direct Steep Approach Certification']
  },
  {
    type: 'yacht',
    name: 'Lürssen Eclipse',
    model: 'Eclipse 162M Mega Yacht',
    manufacturer: 'Lürssen Shipyard (Germany)',
    category: 'Giga Yacht',
    passengers: 36,
    length: '162.5 m (533 ft)',
    speed: '22 knots (Max) / 18 knots (Cruise)',
    priceCharter: 1200000,
    priceCharterUnit: 'week',
    priceBuy: 500000000,
    image: '/images/yacht-eclipse.jpg',
    badge: 'Ultra Giga Yacht',
    description: 'One of the most iconic and secure private superyachts on the high seas, featuring dual helicopter pads, a three-man leisure submarine, and a 16-meter swimming pool.',
    specs: {
      crew: '70 Crew Members',
      cabins: '18 Ultra-Luxury Staterooms',
      hull: 'Steel Hull with Aluminium Superstructure',
      beam: '22.0 m (72 ft)',
      draft: '5.9 m (19 ft)',
      tenders: '6 Custom Luxury Tenders + 2 Submarines'
    },
    features: ['Two Certified Helipads with Hangar', '16-Meter Glass-Bottom Swimming Pool', 'Submarine with 50-Meter Dive Depth', 'Private Cinema & Beach Club Lounge']
  },
  {
    type: 'yacht',
    name: 'Feadship Savannah',
    model: 'Savannah 83M Hybrid',
    manufacturer: 'Feadship (Netherlands)',
    category: 'Eco-Luxury Superyacht',
    passengers: 12,
    length: '83.5 m (274 ft)',
    speed: '17 knots (Cruise)',
    priceCharter: 750000,
    priceCharterUnit: 'week',
    priceBuy: 140000000,
    image: '/images/yacht-savannah.jpg',
    badge: 'Eco-Hybrid Pioneer',
    description: 'The world’s first true hybrid superyacht, blending electric propulsion with striking sea-green metallic styling and an underwater Nemo observation lounge.',
    specs: {
      crew: '24 Crew Members',
      cabins: '6 Custom Suites with Panoramic Views',
      hull: 'Steel / Aluminium',
      beam: '12.5 m (41 ft)',
      draft: '3.95 m (13 ft)',
      range: '6,500 nm at 12 knots'
    },
    features: ['Underwater Nemo Lounge with Glass Viewports', '9-Meter Mosaic Swimming Pool', 'Hybrid Diesel-Electric Propulsion', 'Full Wellness Spa with Hammam']
  },
  {
    type: 'yacht',
    name: 'Royal Huisman Athena',
    model: 'Athena 90M Classic Masterpiece',
    manufacturer: 'Royal Huisman (Netherlands)',
    category: 'Sailing Superyacht',
    passengers: 10,
    length: '90.0 m (295 ft)',
    speed: '19 knots',
    priceCharter: 650000,
    priceCharterUnit: 'week',
    priceBuy: 95000000,
    image: '/images/yacht-athena.jpg',
    badge: 'Classic Heritage',
    description: 'An architectural triumph of modern nautical heritage, combining three towering masts and state-of-the-art push-button sailing systems with classic teak artistry.',
    specs: {
      crew: '22 Crew Members',
      cabins: '5 Custom Teak & Mahogany Staterooms',
      hull: 'Alustar Aluminium',
      beam: '12.2 m (40 ft)',
      draft: '5.8 m (19 ft)',
      sailArea: '2,623 sq meters'
    },
    features: ['Three 60-meter Carbon Fiber Masts', 'Teak-Lined Library and Master Saloon', 'Full Dive Center with Nitrox Compressor', 'Open-Air Jacuzzi on Flybridge']
  }
];

// Luxury Destinations
const SEED_DESTINATIONS = [
  {
    id: 'dest-1',
    name: 'Maldives',
    tagline: 'Tropical Bliss',
    country: 'Indian Ocean',
    image: '/images/dest-maldives.jpg',
    flightTime: '9h 15m from London / 4h 30m from Dubai'
  },
  {
    id: 'dest-2',
    name: 'Santorini',
    tagline: 'Timeless Beauty',
    country: 'Greece (Aegean Sea)',
    image: '/images/dest-santorini.jpg',
    flightTime: '3h 40m from London / 2h 50m from Paris'
  },
  {
    id: 'dest-3',
    name: 'Monaco',
    tagline: 'Luxury & Culture',
    country: 'French Riviera',
    image: '/images/dest-monaco.jpg',
    flightTime: '1h 50m from London / 8h 20m from New York'
  },
  {
    id: 'dest-4',
    name: 'New York',
    tagline: 'Skyline Majesty',
    country: 'United States',
    image: '/images/dest-newyork.jpg',
    flightTime: '7h 10m from London / 5h 25m from LA'
  }
];

// In-Memory store fallback
let isMongoConnected = false;
let memoryFleet = SEED_FLEET.map((item, idx) => ({
  _id: 'mem-' + (100 + idx),
  ...item,
  createdAt: new Date().toISOString()
}));
let memoryInquiries = [
  {
    _id: 'inq-101',
    name: 'Lord Alistair Sterling',
    email: 'sterling@mayfairholding.com',
    phone: '+44 20 7946 0912',
    craftType: 'jet',
    craftName: 'Gulfstream G700',
    travelType: 'charter',
    departure: 'London Luton (EGGW)',
    destination: 'Nice Côte d’Azur (LFMN)',
    date: '2026-10-24',
    passengers: 8,
    status: 'Confirmed',
    notes: 'Requires Dom Pérignon P2 2004 on board and VIP tarmac helicopter transfer to Monaco.',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString()
  },
  {
    _id: 'inq-102',
    name: 'Elena Rostova',
    email: 'elena@vanguardcapital.ch',
    phone: '+41 22 819 4400',
    craftType: 'yacht',
    craftName: 'Lürssen Eclipse',
    travelType: 'charter',
    departure: 'Port Hercules, Monaco',
    destination: 'Saint-Tropez & Corsica',
    date: '2026-11-02',
    passengers: 14,
    status: 'Pending',
    notes: 'Guest list includes high-profile founders. Full privacy protocol required.',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
  }
];

// Mongoose Schemas
const CraftSchema = new mongoose.Schema({
  type: { type: String, enum: ['jet', 'yacht'], required: true },
  name: { type: String, required: true },
  model: String,
  manufacturer: String,
  category: String,
  passengers: Number,
  range: String,
  length: String,
  speed: String,
  priceCharter: Number,
  priceCharterUnit: { type: String, default: 'hour' },
  priceBuy: Number,
  image: String,
  badge: String,
  description: String,
  specs: mongoose.Schema.Types.Mixed,
  features: [String]
}, { timestamps: true });

const InquirySchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: String,
  craftType: { type: String, default: 'jet' },
  craftName: String,
  travelType: { type: String, default: 'charter' },
  departure: String,
  destination: String,
  date: String,
  passengers: { type: Number, default: 2 },
  notes: String,
  status: { type: String, default: 'Pending' }
}, { timestamps: true });

const Craft = mongoose.model('Craft', CraftSchema);
const Inquiry = mongoose.model('Inquiry', InquirySchema);

// Connect to MongoDB with timeout
mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 2500 })
  .then(async () => {
    isMongoConnected = true;
    console.log('✅ PRO-2 Server connected to MongoDB at:', MONGO_URI);
    const count = await Craft.countDocuments();
    if (count === 0) {
      await Craft.insertMany(SEED_FLEET);
      console.log('🌱 Seeded fleet into MongoDB');
    }
  })
  .catch(() => {
    isMongoConnected = false;
    console.log('⚠️  MongoDB not running. Running in In-Memory Auto-Fallback Mode.');
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

app.get('/api/destinations', (req, res) => {
  res.json({ success: true, data: SEED_DESTINATIONS });
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
