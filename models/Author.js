
const mongoose = require("mongoose");

const authorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  nationality: {
    type: String,
    required: true,
    trim: true
  },
  birthYear: {
    type: Number,
    min: 1
  }
});

module.exports = mongoose.model("Author", authorSchema);
