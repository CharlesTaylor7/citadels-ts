import { createFileRoute, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import {
  createUserSession,
  getUserSession,
  verifyPassword,
} from "../services/auth-service";

// Server function to handle login
const login = createServerFn({ method: "POST" })
  .validator((d: { username: string; password: string }) => d)
  .handler(async ({ data, request }) => {
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
    if (!verifyPassword(password, user.password)) {
      return { success: false, error: "Invalid username or password" };
    }

    // Create session and redirect
    const response = await createUserSession(user.id, "/lobby");
    return { success: true, headers: Object.fromEntries(response.headers) };
  });

// Check if user is already logged in
const checkAuth = createServerFn({ method: "GET" }).handler(
  async ({ request }) => {
    const user = await getUserSession(request);
    return { isLoggedIn: !!user, user };
  }
);

export const Route = createFileRoute("/login")({
  component: LoginComponent,
  loader: async ({ request }) => {
    const { isLoggedIn } = await checkAuth({ request });

    // If already logged in, redirect to lobby
    if (isLoggedIn) {
      return {
        redirect: "/lobby",
      };
    }

    return { isLoggedIn };
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
        // Set the cookie from the headers
        document.cookie = result.headers["Set-Cookie"];
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
