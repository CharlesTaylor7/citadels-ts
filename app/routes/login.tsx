import { createFileRoute, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { db } from "../db";
import { users, User } from "../db/schema";
import { eq } from "drizzle-orm";
import {
  generateSessionToken,
  createSession,
  validateSessionToken,
  verifyPassword,
} from "../services/auth-service";
import { getCookie } from "vinxi/server";

// Server function to handle login
const login = createServerFn({ method: "POST" })
  .validator((d: { username: string; password: string }) => d)
  .handler(async ({ data }) => {
    const { username, password } = data;

    // Find user by username
    const user = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .get();

    if (!user) {
      return { success: false, error: "Invalid username or password" };
    }

    // Verify password
    if (!verifyPassword(password, user.hashed_password)) {
      return { success: false, error: "Invalid username or password" };
    }

    // Create session
    const token = generateSessionToken();
    await createSession(token, user.id);

    // Return success with session token
    return {
      success: true,
      token,
      user: { id: user.id, username: user.username },
    };
  });

// Check if user is already logged in
const checkAuth = createServerFn({ method: "GET" })
  .validator((d: { token?: string }) => d)
  .handler(async ({ data }) => {
    const { token } = data;

    if (!token) {
      return { isLoggedIn: false, user: null };
    }

    const result = await validateSessionToken(token);
    return {
      isLoggedIn: !!result.user,
      user: result.user,
    };
  });

export const Route = createFileRoute("/login")({
  component: LoginComponent,
  loader: async () => {
    // Get token from cookie
    const session = getCookie("session");

    if (session) {
      const { isLoggedIn, user } = await checkAuth({
        data: { token: session },
      });

      // If already logged in, redirect to lobby
      if (isLoggedIn) {
        return {
          redirect: "/lobby",
        };
      }
    }

    return { isLoggedIn: false };
  },
});

function LoginComponent() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await login({ data: { username, password } });

      if (result.success) {
        // Set the session token in a cookie
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30); // 30 days
        document.cookie = `session=${result.token}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;

        // Navigate to lobby
        router.navigate({ to: "/lobby" });
      } else {
        setError(result.error || "Login failed");
      }
    } catch (err) {
      setError("An error occurred during login");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "0 auto", padding: "20px" }}>
      <h1>Login to Citadels</h1>

      {error && (
        <div style={{ color: "red", marginBottom: "10px" }}>{error}</div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "15px" }}>
          <label
            htmlFor="username"
            style={{ display: "block", marginBottom: "5px" }}
          >
            Username
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #ccc",
            }}
            required
          />
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label
            htmlFor="password"
            style={{ display: "block", marginBottom: "5px" }}
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: "4px",
              border: "1px solid #ccc",
            }}
            required
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          style={{
            width: "100%",
            padding: "10px",
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: isLoading ? "not-allowed" : "pointer",
            opacity: isLoading ? 0.7 : 1,
          }}
        >
          {isLoading ? "Logging in..." : "Login"}
        </button>
      </form>

      <div style={{ marginTop: "15px", textAlign: "center" }}>
        <p>
          Don't have an account?{" "}
          <a href="/signup" style={{ color: "#4CAF50" }}>
            Sign Up
          </a>
        </p>
      </div>
    </div>
  );
}
