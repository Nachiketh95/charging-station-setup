const router = require('express').Router();
const ChargingStation = require('../models/ChargingStation');
const auth = require('../middleware/auth');

// GET /api/chargers - Public: List all
router.get('/', async (req, res) => {
  try {
    const stations = await ChargingStation.find();
    res.json(stations);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/chargers - Protected: Create
router.post('/', auth, async (req, res) => {
  try {
    const charger = new ChargingStation(req.body);
    await charger.save();
    res.status(201).json(charger);
  } catch {
    res.status(400).json({ message: 'Invalid data' });
  }
});

// PUT /api/chargers/:id - Protected: Update
router.put('/:id', auth, async (req, res) => {
  try {
    const updated = await ChargingStation.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updated);
  } catch {
    res.status(400).json({ message: 'Invalid update' });
  }
});

// DELETE /api/chargers/:id - Protected: Delete
router.delete('/:id', auth, async (req, res) => {
  try {
    await ChargingStation.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted successfully' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
