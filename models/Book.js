
const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  author: {
  type: String,
  required: true,
  trim: true
},
  year: {
    type: Number,
    required: true,
    min: 1
  },
  genre: {
    type: String,
    required: true,
    trim: true
  },
  available: {
    type: Boolean,
    default: true
  }
});

module.exports = mongoose.model("Book", bookSchema);
