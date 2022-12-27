const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const roomSchema = new Schema({
  name: String,
  users: [mongoose.ObjectId],
  state: {
    type: String,
    enum: ['¡Oops! Aún no hay ningún jugador en esta sala...', 'En curso'],
  },
  game: mongoose.ObjectId,
});

const RoomModel = mongoose.model('room', roomSchema);

module.exports = RoomModel;
