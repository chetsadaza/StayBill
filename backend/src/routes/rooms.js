const express = require('express');
const router = express.Router();
const { getRooms, getRoom, createRoom, updateRoom, deleteRoom } = require('../controllers/roomController');
const { validateRoom } = require('../middleware/validation');

router.route('/')
  .get(getRooms)
  .post(validateRoom, createRoom);

router.route('/:id')
  .get(getRoom)
  .put(validateRoom, updateRoom)
  .delete(deleteRoom);

module.exports = router;
