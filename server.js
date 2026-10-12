
const express = require("express");

const app = express();
const PORT = 3000;

// Middleware: allows Express to read JSON request bodies
app.use(express.json());

// Temporary book storage
let books = [
  {
    id: 1,
    title: "Atomic Habits",
    author: "James Clear",
    year: 2018
  },
  {
    id: 2,
    title: "Rich Dad Poor Dad",
    author: "Robert Kiyosaki",
    year: 1997
  },
  {
    id: 3,
    title: "The Alchemist",
    author: "Paulo Coelho",
    year: 1988
  }
];

let nextId = 4;

// Authentication middleware
function librarianOnly(req, res, next) {
  if (req.query.role !== "librarian") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Librarian permission required."
    });
  }

  next();
}

// Home route
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Welcome to the Library Management API"
  });
});

// GET: Read all books, with optional search
app.get("/books", (req, res) => {
  const { search } = req.query;

  let result = books;

  if (search) {
    result = books.filter(
      book =>
        book.title.toLowerCase().includes(search.toLowerCase()) ||
        book.author.toLowerCase().includes(search.toLowerCase())
    );
  }

  res.status(200).json({
    success: true,
    count: result.length,
    books: result
  });
});

// GET: Read one book by ID
app.get("/books/:id", (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({
      success: false,
      message: "Book ID must be a positive integer."
    });
  }

  const book = books.find(book => book.id === id);

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
});

// POST: Create a book (librarian only)
app.post("/books", librarianOnly, (req, res) => {
  const { title, author, year } = req.body;

  if (
    typeof title !== "string" ||
    !title.trim() ||
    typeof author !== "string" ||
    !author.trim() ||
    !Number.isInteger(year) ||
    year < 1
  ) {
    return res.status(400).json({
      success: false,
      message: "Provide a valid title, author, and positive integer year."
    });
  }

  const newBook = {
    id: nextId++,
    title: title.trim(),
    author: author.trim(),
    year
  };

  books.push(newBook);

  res.status(201).json({
    success: true,
    message: "Book created successfully.",
    book: newBook
  });
});

// PUT: Update a book (librarian only)
app.put("/books/:id", librarianOnly, (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({
      success: false,
      message: "Book ID must be a positive integer."
    });
  }

  const book = books.find(book => book.id === id);

  if (!book) {
    return res.status(404).json({
      success: false,
      message: "Book not found."
    });
  }

  const { title, author, year } = req.body;

  if (
    typeof title !== "string" ||
    !title.trim() ||
    typeof author !== "string" ||
    !author.trim() ||
    !Number.isInteger(year) ||
    year < 1
  ) {
    return res.status(400).json({
      success: false,
      message: "Provide a valid title, author, and positive integer year."
    });
  }

  book.title = title.trim();
  book.author = author.trim();
  book.year = year;

  res.status(200).json({
    success: true,
    message: "Book updated successfully.",
    book
  });
});

// DELETE: Delete a book (librarian only)
app.delete("/books/:id", librarianOnly, (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({
      success: false,
      message: "Book ID must be a positive integer."
    });
  }

  const index = books.findIndex(book => book.id === id);

  if (index === -1) {
    return res.status(404).json({
      success: false,
      message: "Book not found."
    });
  }

  const deletedBook = books.splice(index, 1)[0];

  res.status(200).json({
    success: true,
    message: "Book deleted successfully.",
    book: deletedBook
  });
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

// Start the server
app.listen(PORT, () => {
  console.log(`Library API running at http://localhost:${PORT}`);
});
