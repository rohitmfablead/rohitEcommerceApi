# E-Commerce API Setup Guide

This guide will help you set up and run the E-Commerce API project on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v14 or higher)
- npm (comes with Node.js)
- MongoDB database (local or cloud instance)

## Project Structure

```
ecommerce-api/
├── src/
│   ├── config/          # Database configuration
│   ├── controllers/     # Request handlers
│   ├── middlewares/     # Custom middleware functions
│   ├── models/          # Database models
│   ├── routes/          # API route definitions
│   ├── utils/           # Utility functions
│   └── server.js        # Main application entry point
├── uploads/             # Uploaded files storage
├── .env                 # Environment variables
├── package.json         # Project dependencies and scripts
└── README.md            # This file
```

## Installation Steps

1. **Clone the repository** (if not already done):
   ```bash
   git clone <repository-url>
   cd ecommerce-api
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   Create a `.env` file in the root directory with the following variables:
   ```
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   RAZORPAY_KEY_ID=your_razorpay_key_id
   RAZORPAY_KEY_SECRET=your_razorpay_key_secret
   BASE_URL=http://localhost:5000
   ```

4. **Run the application**:
   - For development:
     ```bash
     npm run dev
     ```
   - For production:
     ```bash
     npm start
     ```

5. **Access the API**:
   The server will start on `http://localhost:5000` (or your specified PORT).

## Available Scripts

- `npm start`: Runs the app in production mode
- `npm run dev`: Runs the app in development mode with nodemon for auto-restart on changes

## API Endpoints

The API is organized into the following routes:
- `/api/auth` - Authentication endpoints
- `/api/products` - Product management
- `/api/cart` - Shopping cart functionality
- `/api/orders` - Order processing
- `/api/admin` - Admin panel features
- `/api/categories` - Product categories
- `/api/addresses` - User addresses
- `/api/payments` - Payment processing
- `/api/uploads` - File upload endpoints

## File Upload Functionality

The API supports multipart form data uploads with Multer:

### Single File Upload
- Endpoint: `POST /api/uploads/single`
- Field name: `image`
- Accepts: Image files only
- Max file size: 5MB

### Multiple Files Upload
- Endpoint: `POST /api/uploads/multiple`
- Field name: `images`
- Accepts: Up to 5 image files
- Max file size: 5MB per file

### Form Data with Files Upload
- Endpoint: `POST /api/uploads/form-data`
- Field name: `images`
- Accepts: Up to 5 image files along with form data
- Max file size: 5MB per file

### Multiple Fields Upload
- Endpoint: `POST /api/uploads/fields`
- Field names: `images` (up to 5), `thumbnail` (1)
- Accepts: Image files only
- Max file size: 5MB per file

## Dependencies

Main dependencies include:
- Express.js - Web framework
- Mongoose - MongoDB object modeling
- JSON Web Token - Authentication
- Bcrypt.js - Password hashing
- Multer - File uploading
- Razorpay - Payment processing
- Cors - Cross-origin resource sharing
- Morgan - HTTP request logging

## Troubleshooting

1. **Database Connection Issues**:
   - Ensure your `MONGO_URI` in `.env` is correct
   - Check your internet connection if using a cloud MongoDB instance

2. **Port Conflicts**:
   - Change the `PORT` variable in `.env` to an available port

3. **Missing Environment Variables**:
   - Make sure all required variables are defined in `.env`

## Development

To contribute to this project:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request