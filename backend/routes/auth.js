const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save user
    const user = new User({ email, password: hashedPassword });
    await user.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    // Generate token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '1h'
    });

    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});
router.post('/google-signup', async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ message: 'Google credential is required' });
    }

    // Verify the Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture, email_verified } = payload;

    if (!email_verified) {
      return res.status(400).json({ message: 'Google email not verified' });
    }

    // Check if user already exists
    let user = await User.findOne({ email });

    if (user) {
      // User exists, sign them in
      if (!user.googleId) {
        // Link Google account to existing user
        user.googleId = payload.sub;
        user.profilePicture = picture;
        await user.save();
      }
    } else {
      // Create new user
      user = new User({
        email,
        name: name || email.split('@')[0], // Use name or email prefix
        googleId: payload.sub,
        profilePicture: picture,
        isEmailVerified: true, // Google emails are pre-verified
        // Don't set password for Google users
      });
      await user.save();
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: user.isNew ? 'Account created successfully!' : 'Signed in successfully!',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        profilePicture: user.profilePicture
      }
    });

  } catch (error) {
    console.error('Google authentication error:', error);
    
    if (error.message.includes('Token used too early')) {
      return res.status(400).json({ message: 'Invalid token timing. Please try again.' });
    }
    
    if (error.message.includes('Invalid token')) {
      return res.status(400).json({ message: 'Invalid Google token. Please try again.' });
    }

    res.status(500).json({ 
      message: 'Google authentication failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Add this to your auth.js after the existing routes
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ message: 'Google credential is required' });
    }

    // Verify the Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture, email_verified } = payload;

    if (!email_verified) {
      return res.status(400).json({ message: 'Google email not verified' });
    }

    // Check if user exists
    let user = await User.findOne({ email });

    if (!user) {
      // Create new user if doesn't exist
      user = new User({
        email,
        name: name || email.split('@')[0],
        googleId: payload.sub,
        profilePicture: picture,
        isEmailVerified: true,
      });
      await user.save();
    } // Example backend response for unregistered email
else if (!user) {
  return res.status(404).json({ 
    message: 'User not found. Please register first.' 
  });
}
    else if (!user.googleId) {
      // Link Google account to existing user
      user.googleId = payload.sub;
      user.profilePicture = picture;
      await user.save();
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Signed in successfully!',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        profilePicture: user.profilePicture
      }
    });

  } catch (error) {
    console.error('Google authentication error:', error);
    res.status(500).json({ 
      message: 'Google authentication failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});
module.exports = router;
