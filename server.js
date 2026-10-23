
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const Book = require("./models/Book");

const app = express();

app.use(express.json());

// Librarian authorization
function librarianOnly(req, res, next) {
  if (req.query.role !== "librarian") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Librarian permission required."
    });
  }

  next();
}

// Welcome route
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Welcome to the Library Management API"
  });
});

// GET: Retrieve all books, with optional search
app.get("/books", async (req, res) => {
  try {
    const filter = {};

    if (req.query.search) {
      const search = req.query.search;

      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { author: { $regex: search, $options: "i" } }
      ];
    }

    const books = await Book.find(filter);

    res.status(200).json({
      success: true,
      count: books.length,
      books
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// GET: Retrieve one book by MongoDB ID
app.get("/books/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid book ID."
      });
    }

    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found."
      });
    }

    res.status(200).json({
      success: true,
      book
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// POST: Create a book
app.post("/books", librarianOnly, async (req, res) => {
  try {
    const { title, author, year, genre, available } = req.body;

    if (
      typeof title !== "string" ||
      !title.trim() ||
      typeof author !== "string" ||
      !author.trim() ||
      !Number.isInteger(year) ||
      year < 1 ||
      typeof genre !== "string" ||
      !genre.trim() ||
      (available !== undefined && typeof available !== "boolean")
    ) {
      return res.status(400).json({
        success: false,
        message: "Provide a valid title, author, year, genre, and optional boolean availability."
      });
    }

    const book = await Book.create({
      title,
      author,
      year,
      genre,
      available
    });

    res.status(201).json({
      success: true,
      message: "Book created successfully.",
      book
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// PUT: Update a book
app.put("/books/:id", librarianOnly, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid book ID."
      });
    }

    const { title, author, year, genre, available } = req.body;

    if (
      typeof title !== "string" ||
      !title.trim() ||
      typeof author !== "string" ||
      !author.trim() ||
      !Number.isInteger(year) ||
      year < 1 ||
      typeof genre !== "string" ||
      !genre.trim() ||
      (available !== undefined && typeof available !== "boolean")
    ) {
      return res.status(400).json({
        success: false,
        message: "Provide valid title, author, year, genre, and optional boolean availability."
      });
    }

    const book = await Book.findByIdAndUpdate(
      req.params.id,
      { title, author, year, genre, available },
      { new: true, runValidators: true }
    );

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found."
      });
    }

    res.status(200).json({
      success: true,
      message: "Book updated successfully.",
      book
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// DELETE: Delete a book
app.delete("/books/:id", librarianOnly, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid book ID."
      });
    }

    const book = await Book.findByIdAndDelete(req.params.id);

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found."
      });
    }

    res.status(200).json({
      success: true,
      message: "Book deleted successfully.",
      book
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Handle unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found."
  });
});

// General error handler
app.use((err, req, res, next) => {
  console.error(err.stack);

  res.status(500).json({
    success: false,
    message: "Internal server error."
  });
});

// Connect to MongoDB and start server
const PORT = process.env.PORT || 3000;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB Atlas");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
  });
