const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        // await mongoose.connect(('mongodb://127.0.0.1/test'))
        console.log('MongoDB connected successfully');
    } catch (error) {   
        console.error('Error connecting to MongoDB:', error);
        process.exit(1);
    }
}

module.exports = connectDB;