
import { useState } from "react";

function Register({ onSwitchToLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [setupKey, setSetupKey] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:3000"}/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username,
            password,
            setupKey,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed.");
      }

      setMessage("Librarian registered successfully!");

      setUsername("");
      setPassword("");
      setConfirmPassword("");
      setSetupKey("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <form className="auth-card" onSubmit={handleRegister}>
        <h1>Bookwise</h1>
        <p>Create a librarian account</p>

        {error && <p className="auth-error">{error}</p>}
        {message && <p className="auth-success">{message}</p>}

        <label>Username</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Choose a username"
          required
        />

        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Create a password"
          required
        />

        <label>Confirm Password</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm your password"
          required
        />

        <label>Registration Setup Key</label>
        <input
          type="password"
          value={setupKey}
          onChange={(e) => setSetupKey(e.target.value)}
          placeholder="Enter your setup key"
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Creating account..." : "Create Account"}
        </button>

        <p>
          Already have an account?{" "}
          <button
            type="button"
            className="auth-link"
            onClick={onSwitchToLogin}
          >
            Login
          </button>
        </p>
      </form>
    </div>
  );
}

export default Register;
