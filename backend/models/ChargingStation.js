const mongoose = require('mongoose');

const ChargingStationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  },
  powerOutput: { type: Number, required: true }, // in kW
  connectorType: { type: String, required: true } // e.g., Type1, Type2, CCS
}, { timestamps: true });

module.exports = mongoose.model('ChargingStation', ChargingStationSchema);
