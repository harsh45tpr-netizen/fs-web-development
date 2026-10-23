const mongoose = require('mongoose');

// Exclusive destinations  →  collection: "destinations"
const DestinationSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  tagline: String,
  country: String,
  image: String,
  flightTime: String,
  order: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Destination', DestinationSchema);
