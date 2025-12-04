import nodemailer from 'nodemailer';

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Send email
export const sendEmail = async (to, subject, htmlContent) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: ' + info.response);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

// Email templates
export const emailTemplates = {
  orderConfirmation: (order) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Order Confirmation</h2>
      <p>Thank you for your order! Here are the details:</p>
      
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px;">
        <h3>Order #${order._id}</h3>
        <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
        <p><strong>Total Amount:</strong> ₹${order.totalPrice.toFixed(2)}</p>
        <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
        <p><strong>Status:</strong> ${order.status}</p>
      </div>
      
      <h3>Items Ordered:</h3>
      <ul>
        ${order.items.map(item => `
          <li>${item.product.name} x ${item.quantity} - ₹${(item.price * item.quantity).toFixed(2)}</li>
        `).join('')}
      </ul>
      
      <p>We'll notify you when your order is shipped.</p>
      
      <p>Best regards,<br>Your E-commerce Team</p>
    </div>
  `,
  
  orderStatusUpdate: (order, previousStatus) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Order Status Update</h2>
      <p>Your order status has been updated:</p>
      
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px;">
        <h3>Order #${order._id}</h3>
        <p><strong>Previous Status:</strong> ${previousStatus}</p>
        <p><strong>New Status:</strong> ${order.status}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
      </div>
      
      <p>If you have any questions, please contact our support team.</p>
      
      <p>Best regards,<br>Your E-commerce Team</p>
    </div>
  `,
  
  paymentConfirmation: (order) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Payment Confirmation</h2>
      <p>Your payment has been successfully processed:</p>
      
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px;">
        <h3>Order #${order._id}</h3>
        <p><strong>Amount Paid:</strong> ₹${order.totalPrice.toFixed(2)}</p>
        <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
        <p><strong>Payment Status:</strong> ${order.paymentStatus}</p>
        <p><strong>Date:</strong> ${new Date(order.paidAt).toLocaleDateString()}</p>
      </div>
      
      <p>Thank you for your purchase!</p>
      
      <p>Best regards,<br>Your E-commerce Team</p>
    </div>
  `,
  
  orderCancellation: (order) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Order Cancellation</h2>
      <p>Your order has been cancelled:</p>
      
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px;">
        <h3>Order #${order._id}</h3>
        <p><strong>Cancellation Date:</strong> ${new Date().toLocaleDateString()}</p>
        <p><strong>Refund Status:</strong> Processing</p>
      </div>
      
      <p>If you have any questions, please contact our support team.</p>
      
      <p>Best regards,<br>Your E-commerce Team</p>
    </div>
  `,
  
  generalNotification: (title, message) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>${title}</h2>
      <p>${message}</p>
      <p>Date: ${new Date().toLocaleDateString()}</p>
      <p>Best regards,<br>Your E-commerce Team</p>
    </div>
  `,
  
  productLowStock: (product) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Low Stock Alert</h2>
      <p>Product stock is running low:</p>
      
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px;">
        <h3>${product.name}</h3>
        <p><strong>SKU:</strong> ${product._id}</p>
        <p><strong>Current Stock:</strong> ${product.stock}</p>
        <p><strong>Category:</strong> ${product.category?.name || 'N/A'}</p>
      </div>
      
      <p>Please restock this product soon to avoid running out of stock.</p>
      
      <p>Best regards,<br>Your E-commerce Team</p>
    </div>
  `,
  
  newUserRegistration: (user) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>New User Registration</h2>
      <p>A new user has registered on your platform:</p>
      
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px;">
        <h3>User Details</h3>
        <p><strong>Name:</strong> ${user.name}</p>
        <p><strong>Email:</strong> ${user.email}</p>
        <p><strong>Registration Date:</strong> ${new Date(user.createdAt).toLocaleDateString()}</p>
      </div>
      
      <p>Welcome them to your platform!</p>
      
      <p>Best regards,<br>Your E-commerce Team</p>
    </div>
  `,
  
  productAddedToWishlist: (user, product) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Product Added to Wishlist</h2>
      <p>You've added a product to your wishlist:</p>
      
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px;">
        <h3>${product.name}</h3>
        <p><strong>Price:</strong> ₹${product.price.toFixed(2)}</p>
        <p><strong>Category:</strong> ${product.category?.name || 'N/A'}</p>
      </div>
      
      <p>Visit your wishlist to view all your favorite products.</p>
      
      <p>Best regards,<br>Your E-commerce Team</p>
    </div>
  `,
  
  productAddedToCart: (user, product, quantity) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Product Added to Cart</h2>
      <p>You've added a product to your cart:</p>
      
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px;">
        <h3>${product.name}</h3>
        <p><strong>Quantity:</strong> ${quantity}</p>
        <p><strong>Price:</strong> ₹${product.price.toFixed(2)} each</p>
        <p><strong>Total:</strong> ₹${(product.price * quantity).toFixed(2)}</p>
      </div>
      
      <p>Complete your purchase now to secure your items!</p>
      
      <p>Best regards,<br>Your E-commerce Team</p>
    </div>
  `,
  
  newReviewReceived: (product, review) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>New Review Received</h2>
      <p>A new review has been submitted for your product:</p>
      
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px;">
        <h3>${product.name}</h3>
        <p><strong>Rating:</strong> ${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</p>
        <p><strong>Review:</strong> ${review.comment}</p>
        <p><strong>Date:</strong> ${new Date(review.createdAt).toLocaleDateString()}</p>
      </div>
      
      <p>Reviews help improve your product offerings and build trust with customers.</p>
      
      <p>Best regards,<br>Your E-commerce Team</p>
    </div>
  `,
  
  returnRefundRequest: (order) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Return/Refund Request</h2>
      <p>A customer has requested a return/refund for their order:</p>
      
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px;">
        <h3>Order #${order._id}</h3>
        <p><strong>Customer:</strong> ${order.user?.name || 'N/A'}</p>
        <p><strong>Email:</strong> ${order.user?.email || 'N/A'}</p>
        <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
        <p><strong>Total Amount:</strong> ₹${order.totalPrice.toFixed(2)}</p>
      </div>
      
      <p>Please review this request and take appropriate action.</p>
      
      <p>Best regards,<br>Your E-commerce Team</p>
    </div>
  `
};