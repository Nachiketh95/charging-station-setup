// models/User.js - Updated to support Google authentication

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: function() {
      // Password is only required if user doesn't have googleId
      return !this.googleId;
    },
    minlength: 6
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  googleId: {
    type: String,
    sparse: true, // Allows multiple null values but unique non-null values
    unique: true
  },
  profilePicture: {
    type: String,
    default: null
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  }
}, {
  timestamps: true
});

// Hash password before saving (only if password is provided)
userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) {
    return false; // Google users don't have passwords
  }
  return bcrypt.compare(candidatePassword, this.password);
};

// Check if user signed up with Google
userSchema.methods.isGoogleUser = function() {
  return !!this.googleId;
};
// In your User model


module.exports = mongoose.model('User', userSchema);