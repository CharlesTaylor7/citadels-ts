import { createFileRoute, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { db } from "../../app/db";
import { users } from "../../app/db/schema";
import { eq } from "drizzle-orm";
import {
  generateSessionToken,
  createSession,
  hashPassword,
  verifyPasswordStrength,
} from "../../app/services/auth-service";
import { getCookie } from "vinxi/server";

// Server function to handle signup
const signup = createServerFn({ method: "POST" })
  .validator((d: { username: string; password: string }) => d)
  .handler(async ({ data }) => {
    try {
      console.log('[Server] Signup request received for username:', data.username);
      const { username, password } = data;

      // Check if username already exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .get();

      if (existingUser) {
        console.log('[Server] Signup failed: Username already exists');
        return { success: false, error: "Username already exists" };
      }

      console.log('[Server] Hashing password...');
      // Hash the password with argon2
      const hashedPassword = await hashPassword(password);
      console.log('[Server] Password hashed successfully');

      console.log('[Server] Creating user in database...');
      // Create the user
      const [user] = await db
        .insert(users)
        .values({
          username,
          hashed_password: hashedPassword,
        })
        .returning();
      console.log('[Server] User created with ID:', user?.id);

      // Create session
      console.log('[Server] Generating session token...');
      const token = generateSessionToken();
      console.log('[Server] Creating session...');
      await createSession(token, user.id);
      console.log('[Server] Session created successfully');

      // Return success with session token
      console.log('[Server] Signup completed successfully');
      return {
        success: true,
        token,
        user: { id: user.id, username: user.username },
      };
    } catch (error: any) {
      console.error('[Server] Signup error:', error);
      return { 
        success: false, 
        error: error.message || 'An unexpected error occurred during signup' 
      };
    }
  });

export const Route = createFileRoute("/signup")({
  component: SignupComponent,
});

function SignupComponent() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate inputs
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Check password strength
    try {
      const isStrongPassword = await verifyPasswordStrength(password);
      if (!isStrongPassword) {
        setError(
          "Password is too weak or has been compromised. Please use a stronger password."
        );
        return;
      }
    } catch (err) {
      // If the password strength check fails, continue with signup anyway
      console.warn("Password strength check failed", err);
    }

    setIsLoading(true);

    try {
      console.log('Attempting signup with:', { username, passwordLength: password.length });
      const result = await signup({ data: { username, password } });
      console.log('Signup result:', result);

      if (result.success) {
        // Set the session token in a cookie
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30); // 30 days
        document.cookie = `session=${result.token}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;

        // Navigate to lobby
        router.navigate({ to: "/lobby" });
      } else {
        setError(result.error || "Signup failed");
      }
    } catch (err: any) {
      console.error('Signup error details:', err);
      // Show more detailed error information
      if (err.message) {
        setError(`Error: ${err.message}`);
      } else if (typeof err === 'string') {
        setError(`Error: ${err}`);
      } else {
        setError("An error occurred during signup. Check console for details.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "0 auto", padding: "20px" }}>
      <h1>Sign Up for Citadels</h1>

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

        <div style={{ marginBottom: "15px" }}>
          <label
            htmlFor="confirmPassword"
            style={{ display: "block", marginBottom: "5px" }}
          >
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
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
          {isLoading ? "Signing up..." : "Sign Up"}
        </button>
      </form>

      <div style={{ marginTop: "15px", textAlign: "center" }}>
        <p>
          Already have an account?{" "}
          <a href="/login" style={{ color: "#4CAF50" }}>
            Login
          </a>
        </p>
      </div>
    </div>
  );
}
