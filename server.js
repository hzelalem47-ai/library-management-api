
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Book = require("./models/Book");
const Librarian = require("./models/Librarian");
const authenticateLibrarian = require("./authMiddleware");

const app = express();
const authRouter = express.Router();

const PORT = process.env.PORT || 3000;

// ======================================
// MIDDLEWARE
// ======================================

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  console.log("REQUEST RECEIVED:", req.method, req.originalUrl);
  console.log("REQUEST BODY:", req.body);
  next();
});

// ======================================
// HOME ROUTE
// ======================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to Bookwise Library API!"
  });
});

// ======================================
// LIBRARIAN REGISTRATION
// ======================================

authRouter.post("/register", async (req, res) => {
  try {
    const { username, password, setupKey } = req.body;

    if (!username || !password || !setupKey) {
      return res.status(400).json({
        success: false,
        message: "Username, password, and setup key are required."
      });
    }

    if (setupKey !== process.env.LIBRARIAN_SETUP_KEY) {
      return res.status(403).json({
        success: false,
        message: "Invalid librarian setup key."
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters."
      });
    }

    const normalizedUsername = username.trim().toLowerCase();

    const existingLibrarian = await Librarian.findOne({
      username: normalizedUsername
    });

    if (existingLibrarian) {
      return res.status(409).json({
        success: false,
        message: "Username already exists."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const librarian = await Librarian.create({
      username: normalizedUsername,
      password: hashedPassword
    });

    return res.status(201).json({
      success: true,
      message: "Librarian registered successfully.",
      librarian: {
        id: librarian._id,
        username: librarian.username
      }
    });

  } catch (error) {
    console.error("Registration error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Username already exists."
      });
    }

    return res.status(500).json({
      success: false,
      message: "Registration failed."
    });
  }
});

// ======================================
// LIBRARIAN LOGIN
// ======================================

authRouter.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required."
      });
    }

    const librarian = await Librarian.findOne({
      username: username.trim().toLowerCase()
    });

    if (!librarian) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password."
      });
    }

    const passwordMatch = await bcrypt.compare(
      password,
      librarian.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password."
      });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is missing from .env");
    }

    const token = jwt.sign(
      { librarianId: librarian._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      librarian: {
        id: librarian._id,
        username: librarian.username
      }
    });

  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Login failed."
    });
  }
});

// ======================================
// MOUNT AUTHENTICATION ROUTES
// ======================================

app.use("/auth", authRouter);

// ======================================
// TEST AUTHENTICATION ROUTE
// ======================================

app.get("/auth/test", (req, res) => {
  console.log("Authentication test route reached.");

  res.status(200).json({
    success: true,
    message: "Authentication routes are mounted."
  });
});

// ======================================
// GET ALL BOOKS
// ======================================

app.get("/books", async (req, res) => {
  try {
    const books = await Book.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: books.length,
      books
    });

  } catch (error) {
    console.error("Get books error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve books."
    });
  }
});

// ======================================
// GET ONE BOOK
// ======================================

app.get("/books/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
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

    return res.status(200).json({
      success: true,
      book
    });

  } catch (error) {
    console.error("Get book error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve book."
    });
  }
});

// ======================================
// ADD A BOOK (PROTECTED)
// ======================================

app.post("/books", authenticateLibrarian, async (req, res) => {
  try {
    const { title, author, year, genre, available } = req.body;

    if (!title || !author || !year || !genre) {
      return res.status(400).json({
        success: false,
        message: "Title, author, year, and genre are required."
      });
    }

    const book = await Book.create({
      title,
      author,
      year,
      genre,
      available: available === undefined ? true : available
    });

    return res.status(201).json({
      success: true,
      message: "Book added successfully.",
      book
    });

  } catch (error) {
    console.error("Add book error:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to add book."
    });
  }
});

// ======================================
// UPDATE A BOOK (PROTECTED)
// ======================================

app.put("/books/:id", authenticateLibrarian, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid book ID."
      });
    }

    const allowedFields = [
      "title",
      "author",
      "year",
      "genre",
      "available"
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one field to update."
      });
    }

    const book = await Book.findByIdAndUpdate(
      req.params.id,
      updates,
      {
        new: true,
        runValidators: true
      }
    );

    if (!book) {
      return res.status(404).json({
        success: false,
        message: "Book not found."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Book updated successfully.",
      book
    });

  } catch (error) {
    console.error("Update book error:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update book."
    });
  }
});

// ======================================
// DELETE A BOOK (PROTECTED)
// ======================================

app.delete("/books/:id", authenticateLibrarian, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
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

    return res.status(200).json({
      success: true,
      message: "Book deleted successfully."
    });

  } catch (error) {
    console.error("Delete book error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete book."
    });
  }
});

// ======================================
// 404 HANDLER - MUST BE LAST
// ======================================

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "Route not found."
  });
});

// ======================================
// GLOBAL ERROR HANDLER
// ======================================

app.use((error, req, res, next) => {
  console.error("Unexpected error:", error);

  return res.status(500).json({
    success: false,
    message: "Internal server error."
  });
});

// ======================================
// CONNECT DATABASE AND START SERVER
// ======================================

async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing from .env");
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is missing from .env");
    }

    if (!process.env.LIBRARIAN_SETUP_KEY) {
      throw new Error("LIBRARIAN_SETUP_KEY is missing from .env");
    }

    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB connected successfully.");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Bookwise API running at http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
