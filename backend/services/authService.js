const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

class AuthService {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'your-fallback-secret';
    this.saltRounds = 10;
  }

  async hashPassword(password) {
    try {
      const salt = await bcrypt.genSalt(this.saltRounds);
      return await bcrypt.hash(password, salt);
    } catch (error) {
      throw new Error('Password hashing failed: ' + error.message);
    }
  }

  async comparePassword(password, hashedPassword) {
    try {
      return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
      throw new Error('Password comparison failed: ' + error.message);
    }
  }

  generateToken(userId, email, name) {
    try {
      return jwt.sign(
        { userId, email, name, iat: Math.floor(Date.now() / 1000) },
        this.jwtSecret,
        { expiresIn: '7d' }
      );
    } catch (error) {
      throw new Error('Token generation failed: ' + error.message);
    }
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      throw new Error('Token verification failed: ' + error.message);
    }
  }
}

module.exports = new AuthService();
