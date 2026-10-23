const mongoose = require('mongoose');

// Concierge / charter enquiries  →  collection: "inquiries"
const InquirySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
  },
  phone: String,
  craftType: { type: String, enum: ['jet', 'yacht'], default: 'jet' },
  craftName: String,
  travelType: { type: String, enum: ['charter', 'buy'], default: 'charter' },
  departure: String,
  destination: String,
  date: String,
  passengers: { type: Number, default: 2, min: 1 },
  notes: String,
  status: { type: String, enum: ['Pending', 'Confirmed', 'Cancelled'], default: 'Pending' }
}, { timestamps: true });

module.exports = mongoose.model('Inquiry', InquirySchema);
