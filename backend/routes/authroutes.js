const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (userId, email, name) => {
  return jwt.sign(
    { userId, email, name, iat: Math.floor(Date.now() / 1000) },
    process.env.JWT_SECRET || 'your-fallback-secret',
    { expiresIn: '7d' }
  );
};

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }
    
    console.log(`🔑 Login attempt: ${email}`);
    
    let user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      const hashedPassword = await bcrypt.hash(password, 10);
      user = new User({
        name: email.split('@')[0],
        email: email.toLowerCase(),
        password: hashedPassword
      });
      await user.save();
      console.log(`👤 Created new user: ${email}`);
    } else {
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        });
      }
    }
    
    const token = generateToken(user._id, user.email, user.name);
    
    console.log(`✅ Login successful: ${email}`);
    
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      },
      message: 'Login successful'
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({   
      success: false,   
      error: 'Login failed: ' + error.message   
    });
  }
});

// Signup route
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, and password are required'
      });
    }
    
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters'
      });
    }
    
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User already exists'
      });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword
    });
    
    await user.save();
    const token = generateToken(user._id, user.email, user.name);
    
    console.log(`✅ New user registered: ${email}`);
    
    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      },
      message: 'Account created successfully'
    });
  } catch (error) {
    console.error('❌ Signup error:', error);
    res.status(500).json({   
      success: false,   
      error: 'Signup failed: ' + error.message   
    });
  }
});

module.exports = router;
