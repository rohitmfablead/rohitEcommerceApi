import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import models
import Product from './src/models/Product.js';
import Review from './src/models/Review.js';

async function checkDatabase() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ecommerce-api', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Connected to database');
    
    // Check products
    const products = await Product.find({}, { name: 1, avgRating: 1, ratingCount: 1 });
    console.log('Products:', products);
    
    // Check reviews
    const reviews = await Review.find({});
    console.log('Reviews:', reviews);
    
    // Check approved reviews
    const approvedReviews = await Review.find({ isApproved: true });
    console.log('Approved reviews:', approvedReviews);
    
    mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    mongoose.connection.close();
  }
}

checkDatabase();