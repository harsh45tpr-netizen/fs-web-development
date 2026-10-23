const mongoose = require('mongoose');

// Jets & Yachts fleet  →  collection: "crafts"
const CraftSchema = new mongoose.Schema({
  type: { type: String, enum: ['jet', 'yacht'], required: true, index: true },
  name: { type: String, required: true, unique: true, trim: true },
  model: String,
  manufacturer: String,
  category: String,
  passengers: { type: Number, min: 1 },
  range: String,
  length: String,
  speed: String,
  priceCharter: { type: Number, min: 0 },
  priceCharterUnit: { type: String, enum: ['hour', 'day', 'week'], default: 'hour' },
  priceBuy: { type: Number, min: 0 },
  image: String,
  badge: String,
  description: String,
  specs: mongoose.Schema.Types.Mixed,
  features: [String]
}, { timestamps: true });

module.exports = mongoose.model('Craft', CraftSchema);
