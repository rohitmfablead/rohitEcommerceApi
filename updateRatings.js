import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import models
import Product from './src/models/Product.js';
import Review from './src/models/Review.js';

// Import the updateProductRatings function
import { updateProductRatings } from './src/controllers/reviewController.js';

async function updateRatings() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ecommerce-api', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Connected to database');
    
    // Get the product ID that has a review
    const review = await Review.findOne({ isApproved: true });
    if (review) {
      console.log('Found review for product:', review.product);
      console.log('Calling updateProductRatings for product:', review.product);
      await updateProductRatings(review.product);
      
      // Check if the product ratings were updated
      const updatedProduct = await Product.findById(review.product);
      console.log('Updated product:', updatedProduct.name);
      console.log('Average rating:', updatedProduct.avgRating);
      console.log('Rating count:', updatedProduct.ratingCount);
    } else {
      console.log('No approved reviews found');
    }
    
    mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    mongoose.connection.close();
  }
}

updateRatings();