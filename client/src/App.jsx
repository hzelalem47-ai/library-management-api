
import { useEffect, useState } from "react";
import Login from "./login";
import Register from "./Register";
import "./App.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000";

const emptyBook = {
  title: "",
  author: "",
  year: "",
  genre: "",
  available: "true",
};

function App() {
  const [books, setBooks] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyBook);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Authentication
  const [isAuthenticated, setIsAuthenticated] = useState(
    Boolean(localStorage.getItem("bookwise-token"))
  );

  // Login and registration navigation
  const [showRegister, setShowRegister] = useState(false);

  // Navigation
  const [activePage, setActivePage] = useState("Dashboard");

  // Favorite book IDs
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("bookwise-favorites")
      ) || [];
    } catch {
      return [];
    }
  });

  // Handle successful login
  function handleLogin(token) {
    localStorage.setItem("bookwise-token", token);
    setIsAuthenticated(true);
    setShowRegister(false);
    setError("");
    setMessage("Welcome back!");
  }

  // Logout
  function handleLogout() {
    localStorage.removeItem("bookwise-token");
    setIsAuthenticated(false);
    setShowRegister(false);
    setActivePage("Dashboard");
    setEditingId(null);
    setForm({ ...emptyBook });
    setMessage("");
    setError("");
  }

  // Load books from backend
  async function loadBooks() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/books`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not load books.");
      }

      setBooks(Array.isArray(data) ? data : data.books || []);
    } catch (err) {
      setError(`${err.message} Make sure your backend is running.`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBooks();
  }, []);

  // Save favorites in browser storage
  useEffect(() => {
    localStorage.setItem(
      "bookwise-favorites",
      JSON.stringify(favorites)
    );
  }, [favorites]);

  // Navigation handler
  function navigateTo(page) {
    setActivePage(page);
    setSearch("");
    setError("");
    setMessage("");
  }

  // Get a book ID
  function getBookId(book) {
    return String(book._id ?? book.id);
  }

  // Add or remove favorite
  function toggleFavorite(book) {
    const id = getBookId(book);

    setFavorites((previous) =>
      previous.includes(id)
        ? previous.filter((favoriteId) => favoriteId !== id)
        : [...previous, id]
    );
  }

  function isFavorite(book) {
    return favorites.includes(getBookId(book));
  }

  // Form input handler
  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  // Add or update book
  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    const bookData = {
      title: form.title.trim(),
      author: form.author.trim(),
      year: Number(form.year),
      genre: form.genre.trim(),
      available: form.available === "true",
    };

    if (
      !bookData.title ||
      !bookData.author ||
      !form.year ||
      !Number.isInteger(bookData.year) ||
      bookData.year < 1 ||
      bookData.year > new Date().getFullYear() + 1 ||
      !bookData.genre
    ) {
      setError("Please enter valid details in all fields.");
      return;
    }

    const isEditing = editingId !== null;

    const url = isEditing
      ? `${API_URL}/books/${editingId}`
      : `${API_URL}/books`;

    try {
      const token = localStorage.getItem("bookwise-token");

      if (!token) {
        throw new Error(
          "Please log in first. Your librarian login token is missing."
        );
      }

      const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bookData),
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Could not save the book.");
      }

      setForm({ ...emptyBook });
      setEditingId(null);

      setMessage(
        isEditing
          ? "Book updated successfully!"
          : "Book added successfully!"
      );

      await loadBooks();
    } catch (err) {
      setError(err.message);
    }
  }

  // Edit book
  function startEditing(book) {
    setEditingId(getBookId(book));

    setForm({
      title: book.title || "",
      author: book.author || "",
      year: String(book.year ?? ""),
      genre: book.genre || "",
      available: book.available === false ? "false" : "true",
    });

    navigateTo("Dashboard");
    setMessage("");
    setError("");

    setTimeout(() => {
      document.getElementById("book-title")?.focus();
    }, 0);
  }

  // Delete book
  async function deleteBook(book) {
    const id = getBookId(book);

    if (!window.confirm(`Delete "${book.title}"?`)) return;

    setError("");
    setMessage("");

    try {
      const token = localStorage.getItem("bookwise-token");

      if (!token) {
        throw new Error("Please log in first.");
      }

      const response = await fetch(`${API_URL}/books/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Could not delete the book.");
      }

      setFavorites((previous) =>
        previous.filter((favoriteId) => favoriteId !== id)
      );

      if (editingId === id) {
        setEditingId(null);
        setForm({ ...emptyBook });
      }

      setMessage("Book deleted successfully!");
      await loadBooks();
    } catch (err) {
      setError(err.message);
    }
  }

  // Cancel editing
  function cancelEditing() {
    setEditingId(null);
    setForm({ ...emptyBook });
    setError("");
    setMessage("");
  }

  // Search
  const filteredBooks = books.filter((book) => {
    const searchText = search.trim().toLowerCase();

    const bookText = [
      book.title,
      book.author,
      book.year,
      book.genre,
    ]
      .join(" ")
      .toLowerCase();

    return bookText.includes(searchText);
  });

  // Favorites page
  const favoriteBooks = filteredBooks.filter((book) =>
    isFavorite(book)
  );

  // Statistics
  const availableBooks = books.filter(
    (book) => book.available !== false
  ).length;

  const unavailableBooks = books.filter(
    (book) => book.available === false
  ).length;

  // Book table
  function renderBookTable(bookList) {
    if (loading) {
      return <p className="empty-state">Loading books...</p>;
    }

    if (bookList.length === 0) {
      return (
        <p className="empty-state">
          {error
            ? "Books could not be loaded. Check your backend."
            : activePage === "Favorites"
              ? "You haven't added any favorite books yet."
              : search
                ? "No books match your search."
                : "No books found. Add your first book."}
        </p>
      );
    }

    return (
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>BOOK TITLE</th>
              <th>AUTHOR</th>
              <th>YEAR</th>
              <th>GENRE</th>
              <th>AVAILABILITY</th>
              <th>FAVORITE</th>
              <th>ACTIONS</th>
            </tr>
          </thead>

          <tbody>
            {bookList.map((book) => (
              <tr key={getBookId(book)}>
                <td><strong>{book.title}</strong></td>
                <td>{book.author}</td>
                <td>{book.year}</td>
                <td>{book.genre || "—"}</td>

                <td>
                  {book.available === false
                    ? "Unavailable"
                    : "Available"}
                </td>

                <td>
                  <button
                    type="button"
                    className="edit-button"
                    onClick={() => toggleFavorite(book)}
                  >
                    {isFavorite(book) ? "♥ Saved" : "♡ Add"}
                  </button>
                </td>

                <td className="actions">
                  <button
                    type="button"
                    className="edit-button"
                    onClick={() => startEditing(book)}
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    className="delete-button"
                    onClick={() => deleteBook(book)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Show Login or Registration when not authenticated
  if (!isAuthenticated) {
    if (showRegister) {
      return (
        <Register
          onSwitchToLogin={() => setShowRegister(false)}
        />
      );
    }

    return (
      <Login
        onLogin={handleLogin}
        onSwitchToRegister={() => setShowRegister(true)}
      />
    );
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon">B</span>
          <span>Bookwise</span>
        </div>

        <p className="nav-label">WORKSPACE</p>

        <button
          className={`nav-item ${activePage === "Dashboard" ? "active" : ""}`}
          onClick={() => navigateTo("Dashboard")}
        >
          ▦ &nbsp; Dashboard
        </button>

        <button
          className={`nav-item ${activePage === "All Books" ? "active" : ""}`}
          onClick={() => navigateTo("All Books")}
        >
          ▤ &nbsp; All Books
        </button>

        <button
          className={`nav-item ${activePage === "Favorites" ? "active" : ""}`}
          onClick={() => navigateTo("Favorites")}
        >
          ♡ &nbsp; Favorites
        </button>

        <div
          className="sidebar-bottom"
          onClick={() => navigateTo("Librarian")}
          style={{ cursor: "pointer" }}
        >
          <div className="avatar">L</div>

          <div>
            <strong>Librarian</strong>
            <small>Library Manager</small>
          </div>
        </div>

        <button
          type="button"
          className="nav-item logout-button"
          onClick={handleLogout}
        >
          ↪ &nbsp; Logout
        </button>
      </aside>

      <main className="main">
        <header className="topbar">
          <span>Library / {activePage}</span>

          <span className="status">
            <i /> Library workspace
          </span>
        </header>

        <section className="content">
          {/* DASHBOARD */}
          {activePage === "Dashboard" && (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">OVERVIEW</p>
                  <h1>Library Dashboard</h1>
                  <p className="subtitle">
                    Manage your collection in one place.
                  </p>
                </div>

                <button
                  type="button"
                  className="primary-button"
                  onClick={() => {
                    cancelEditing();
                    document.getElementById("book-title")?.focus();
                  }}
                >
                  + Add a book
                </button>
              </div>

              <section className="stats">
                <article className="stat-card">
                  <span className="stat-icon purple">▤</span>
                  <p>Total Books</p>
                  <h2>{books.length}</h2>
                  <small>All books in your collection</small>
                </article>

                <article className="stat-card">
                  <span className="stat-icon green">✓</span>
                  <p>Available Books</p>
                  <h2>{availableBooks}</h2>
                  <small>Books ready to borrow</small>
                </article>

                <article className="stat-card">
                  <span className="stat-icon orange">▤</span>
                  <p>Unavailable Books</p>
                  <h2>{unavailableBooks}</h2>
                  <small>Books currently unavailable</small>
                </article>
              </section>

              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>
                      {editingId !== null ? "Edit book" : "Add a book"}
                    </h2>
                    <p>Enter the details for your book.</p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="book-form">
                  <label>
                    Book title
                    <input
                      id="book-title"
                      name="title"
                      value={form.title}
                      onChange={handleChange}
                      placeholder="e.g. Atomic Habits"
                      required
                    />
                  </label>

                  <label>
                    Author
                    <input
                      name="author"
                      value={form.author}
                      onChange={handleChange}
                      placeholder="e.g. James Clear"
                      required
                    />
                  </label>

                  <label>
                    Publication year
                    <input
                      name="year"
                      type="number"
                      min="1"
                      max={new Date().getFullYear() + 1}
                      value={form.year}
                      onChange={handleChange}
                      placeholder="e.g. 2018"
                      required
                    />
                  </label>

                  <label>
                    Genre
                    <input
                      name="genre"
                      value={form.genre}
                      onChange={handleChange}
                      placeholder="e.g. Self-help"
                      required
                    />
                  </label>

                  <label>
                    Availability
                    <select
                      name="available"
                      value={form.available}
                      onChange={handleChange}
                    >
                      <option value="true">Available</option>
                      <option value="false">Unavailable</option>
                    </select>
                  </label>

                  <div className="form-actions">
                    {editingId !== null && (
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={cancelEditing}
                      >
                        Cancel
                      </button>
                    )}

                    <button type="submit" className="primary-button">
                      {editingId !== null ? "Save changes" : "Add book"}
                    </button>
                  </div>
                </form>
              </section>

              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Your book collection</h2>
                    <p>Browse and manage your library records.</p>
                  </div>

                  <input
                    className="search-input"
                    type="search"
                    placeholder="Search books..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>

                {renderBookTable(filteredBooks)}
              </section>
            </>
          )}

          {/* ALL BOOKS */}
          {activePage === "All Books" && (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">COLLECTION</p>
                  <h1>All Books</h1>
                  <p className="subtitle">
                    Browse every book in your library.
                  </p>
                </div>

                <button
                  className="primary-button"
                  onClick={() => navigateTo("Dashboard")}
                >
                  + Add a book
                </button>
              </div>

              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Book collection ({books.length})</h2>
                    <p>Search, edit, delete, or save your books.</p>
                  </div>

                  <input
                    className="search-input"
                    type="search"
                    placeholder="Search books..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>

                {renderBookTable(filteredBooks)}
              </section>
            </>
          )}

          {/* FAVORITES */}
          {activePage === "Favorites" && (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">SAVED COLLECTION</p>
                  <h1>Favorite Books</h1>
                  <p className="subtitle">
                    Your personally selected books.
                  </p>
                </div>
              </div>

              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Your favorites ({favoriteBooks.length})</h2>
                    <p>Books you have saved for later.</p>
                  </div>

                  <input
                    className="search-input"
                    type="search"
                    placeholder="Search favorites..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>

                {renderBookTable(favoriteBooks)}
              </section>
            </>
          )}

          {/* LIBRARIAN PROFILE */}
          {activePage === "Librarian" && (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">ACCOUNT</p>
                  <h1>Librarian Profile</h1>
                  <p className="subtitle">
                    Your library manager information.
                  </p>
                </div>
              </div>

              <section className="panel">
                <div className="panel-heading">
                  <h2>Profile information</h2>
                </div>

                <div className="profile-details">
                  <div className="avatar profile-avatar">L</div>

                  <h2>Librarian</h2>
                  <p>Library Manager</p>

                  <hr />

                  <p>
                    <strong>Role:</strong> Librarian
                  </p>

                  <p>
                    <strong>Library:</strong> Bookwise
                  </p>

                  <p>
                    <strong>Total books managed:</strong> {books.length}
                  </p>

                  <p>
                    <strong>Favorite books:</strong> {favorites.length}
                  </p>
                </div>
              </section>
            </>
          )}

          {message && (
            <p className="success-message">{message}</p>
          )}

          {error && (
            <div className="error-message">
              <p>{error}</p>

              <button
                type="button"
                onClick={loadBooks}
                className="retry-button"
              >
                Retry loading books
              </button>
            </div>
          )}
        </section>

        <footer className="copyright">
          <p>
            © {new Date().getFullYear()} Bookwise. All rights reserved.
          </p>
          <p>Designed with Heri for book lovers.</p>
        </footer>
      </main>
    </div>
  );
}

export default App;
