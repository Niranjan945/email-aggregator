const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            ssl: true,
            tls: true,
        });
        
        console.log('Connected to database:', mongoose.connection.name);
        
        return true; 
    } catch (error) {
        console.error("MongoDB Connection Error:", error.message);
        throw error; // Re-throw error to be caught by caller
    }
};

module.exports = connectDB;
