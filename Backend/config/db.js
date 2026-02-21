const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
    try {
        if (!process.env.MONGO_URI) {
            const errorMsg = "MONGO_URI not found in environment variables";
            logger.error(errorMsg);
            if (process.env.NODE_ENV === 'production') {
                throw new Error(errorMsg);
            }
            logger.warn("Server will start but database operations will fail");
            return;
        }

        const conn = await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        });
        logger.info(`MongoDB connected successfully: ${conn.connection.host}`);
    } catch (error) {
        logger.error("Error connecting to MongoDB:", error.message);
        logger.error("Please check:");
        logger.error("   1) MongoDB URI is correct in .env file");
        logger.error("   2) IP address is whitelisted in MongoDB Atlas");
        logger.error("   3) Network connection is working");
        logger.error("   4) MongoDB Atlas cluster is running (not paused)");
        
        // In production, throw error to prevent server start
        if (process.env.NODE_ENV === 'production') {
            throw error;
        }
        
        logger.warn("Server will continue but database operations will fail");
    }
}

module.exports = connectDB;