// AUTH ROUTES - routes/auth.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    let user = await User.findOne({ email });
    if (!user) {
      // Create new user for demo purposes
      user = new User({
        name: email.split('@')[0],
        email,
        password // In production, hash this
      });
      await user.save();
      console.log('👤 New user created:', email);
    }
    
    // Generate simple token
    const token = `token_${user._id}_${Date.now()}`;
    
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Signup route
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'User already exists' });
    }
    
    const user = new User({ name, email, password });
    await user.save();
    
    const token = `token_${user._id}_${Date.now()}`;
    
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
    
    console.log('👤 User registered:', email);
    
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;