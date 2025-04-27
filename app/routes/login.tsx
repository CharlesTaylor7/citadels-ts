import { useState } from "react";
import {
  Form,
  Link,
  redirect,
  useActionData,
  useNavigation,
} from "react-router";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import {
  generateSessionToken,
  createSession,
  validateSessionToken,
  verifyPasswordHash,
  verifyPasswordStrength,
} from "../services/auth-service";

export async function loader({ request }: { request: Request }) {
  // Get token from cookie
  const cookieHeader = request.headers.get("Cookie") || "";
  const cookies = cookieHeader.split("; ");
  const sessionCookie = cookies.find((cookie) => cookie.startsWith("session="));
  const token = sessionCookie ? sessionCookie.split("=")[1] : undefined;

  if (token) {
    const result = await validateSessionToken(token);

    // If already logged in, redirect to lobby
    if (result.user) {
      return redirect("/lobby");
    }
  }

  return { isLoggedIn: false };
}

export async function action({ request }: { request: Request }) {
  const formData = await request.formData();
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  // Validate inputs
  if (!username || !password) {
    throw new Error("Username and password are required");
  }

  try {
    // Find user by username
    const user = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .get();

    if (!user) {
      throw new Error("Invalid username or password");
    }

    // Verify password
    const passwordValid = await verifyPasswordHash(
      user.hashed_password,
      password
    );
    if (!passwordValid) {
      throw new Error("Invalid username or password");
    }

    // Create session
    const token = generateSessionToken();
    await createSession(token, user.id);

    // Create response with redirect and cookie
    const headers = new Headers();
    headers.append(
      "Set-Cookie",
      `session=${token}; Path=/; HttpOnly; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax`
    );
    headers.append("Location", "/lobby");

    return new Response(null, {
      status: 302,
      headers,
    });
  } catch (error) {
    console.error("Login error:", error);
    throw new Error("An error occurred during login");
  }
}

export default function Login() {
  const actionData = useActionData<{ error?: string }>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [password, setPassword] = useState("");

  return (
    <div style={{ maxWidth: "400px", margin: "0 auto", padding: "20px" }}>
      <h1>Login to Citadels</h1>

      {actionData?.error && (
        <div style={{ color: "red", marginBottom: "10px" }}>
          {actionData.error}
        </div>
      )}

      <Form method="post">
        <div style={{ marginBottom: "15px" }}>
          <label
            htmlFor="username"
            style={{ display: "block", marginBottom: "5px" }}
          >
            Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
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
            name="password"
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
          disabled={isSubmitting}
          style={{
            width: "100%",
            padding: "10px",
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: isSubmitting ? "not-allowed" : "pointer",
            opacity: isSubmitting ? 0.7 : 1,
          }}
        >
          {isSubmitting ? "Logging in..." : "Login"}
        </button>
      </Form>

      <div style={{ marginTop: "15px", textAlign: "center" }}>
        <p>
          Don't have an account?{" "}
          <Link to="/signup" style={{ color: "#4CAF50" }}>
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
