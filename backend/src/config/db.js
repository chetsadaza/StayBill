const mongoose = require('mongoose');
const dns = require('dns');

// Force DNS resolution to prioritize IPv4 (fixes MongoDB Atlas SRV querySrv errors on Node 18+)
dns.setDefaultResultOrder('ipv4first');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
