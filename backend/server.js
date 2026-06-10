const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const connectDB = require('./src/config/db');
const errorHandler = require('./src/middleware/errorHandler');

// Load env vars
dotenv.config();

// Connect to database & seed default admin
connectDB().then(() => {
  const User = require('./src/models/User');
  User.countDocuments().then(count => {
    if (count === 0) {
      User.create({
        name: 'เจษฎา มาตเรียง',
        email: 'jed667788@gmail.com',
        password: 'password123',
        role: 'admin',
        isActive: true
      }).then(() => {
        console.log('🌱 Default admin account seeded successfully (เจษฎา มาตเรียง / password123)');
      });
    }
  });
});

const app = express();

// Body parser
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

// Enable CORS
app.use(cors());

// Serve static files
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Dev logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Mount routers
app.use('/api/rooms', require('./src/routes/rooms'));
app.use('/api/tenants', require('./src/routes/tenants'));
app.use('/api/bills', require('./src/routes/bills'));
app.use('/api/reports', require('./src/routes/reports'));
app.use('/api/settings', require('./src/routes/settings'));
app.use('/api/line', require('./src/routes/line'));
app.use('/api/users', require('./src/routes/users'));
app.use('/api/auth', require('./src/routes/auth'));

// Root path handler
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to StayBill API' });
});

// Error handler middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`❌ Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
