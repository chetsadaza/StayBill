const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI)
  .then(async () => {
    const db = mongoose.connection.db;
    const billsCol = db.collection('bills');
    const roomsCol = db.collection('rooms');
    
    // Find room 106
    const room = await roomsCol.findOne({ roomNumber: '106' });
    if (!room) {
      console.log('Room 106 not found');
      process.exit(0);
    }
    
    const bill = await billsCol.findOne({ room: room._id });
    console.log('Bill for room 106:', JSON.stringify(bill, null, 2));
    
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
