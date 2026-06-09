const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const MONGODB_URI = process.env.MONGODB_URI;
console.log('Connecting to:', MONGODB_URI);

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('Connected to DB');
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
    
    const billsCol = db.collection('bills');
    const bills = await billsCol.find({}).sort({ updatedAt: -1 }).limit(5).toArray();
    console.log('Recent Bills:');
    bills.forEach(b => {
      console.log(`ID: ${b._id}, Month: ${b.billingMonth}, Room: ${b.room}, Total: ${b.totalAmount}`);
    });
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Error connecting to DB:', err);
    process.exit(1);
  });
