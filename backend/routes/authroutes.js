const express = require('express');
const User = require('../models/User');
const { hashPassword, comparePassword, generateToken } = require('../services/authService');

const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Basic validation
    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'Registration failed',
        error: 'Name, email, and password are required'
      });
    }

    // Password length check
    if (password.length < 8) {
      return res.status(400).json({
        message: 'Registration failed',
        error: 'Password must be at least 8 characters long'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        message: 'Registration failed',
        error: 'User with this email already exists'
      });
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(password);
    const user = new User({
      name,
      email,
      password: hashedPassword
    });

    await user.save();
    const token = generateToken(user._id, user.email);

    console.log(`✅ New user registered: ${user.email}`);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      },
      token
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    
    // Handle MongoDB validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Registration failed',
        error: error.message
      });
    }

    res.status(500).json({
      message: 'Registration failed',
      error: 'Internal server error'
    });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({
        message: 'Login failed',
        error: 'Email and password are required'
      });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        message: 'Login failed',
        error: 'Invalid email or password'
      });
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        message: 'Login failed',
        error: 'Invalid email or password'
      });
    }

    // Generate token
    const token = generateToken(user._id, user.email);

    console.log(`✅ User logged in: ${user.email}`);

    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      },
      token
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      message: 'Login failed',
      error: 'Internal server error'
    });
  }
});

// Verify token (optional - for frontend to check if user is still logged in)
router.get('/verify', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'Token is valid',
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({
      message: 'Token verification failed',
      error: error.message
    });
  }
});

// Simple middleware to protect routes
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      message: 'Access denied',
      error: 'No token provided'
    });
  }

  try {
    const { verifyToken } = require('../services/authService');
    const decoded = verifyToken(token);
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    next();
  } catch (error) {
    return res.status(403).json({
      message: 'Access denied',
      error: 'Invalid or expired token'
    });
  }
}

// Export middleware for use in other routes
router.authenticateToken = authenticateToken;

module.exports = router;
