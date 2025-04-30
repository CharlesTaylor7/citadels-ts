import { useState } from "react";
import { Form, Link, useActionData, useNavigation } from "react-router";
import { users, db } from "@/server/db";
import { eq } from "drizzle-orm";
import {
  generateSessionToken,
  createSession,
  hashPassword,
  verifyPasswordStrength,
} from "@/server/auth";

export async function action({ request }: { request: Request }) {
  const formData = await request.formData();
  const username = formData.get("username");
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");

  // Validate inputs
  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    typeof confirmPassword !== "string"
  ) {
    throw new Error("All fields are required");
  }

  if (password !== confirmPassword) {
    throw new Error("Passwords do not match");
  }

  // Check if username already exists
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .get();

  if (existingUser) {
    throw new Error("Username already exists");
  }

  // Hash the password with argon2
  const hashedPassword = await hashPassword(password);

  // Create the user
  const [user] = await db
    .insert(users)
    .values({ username, hashedPassword })
    .returning();

  // Create session
  const token = generateSessionToken();
  await createSession(token, user.id);

  // Create response with redirect and cookie
  const headers = new Headers();
  headers.append(
    "Set-Cookie",
    `session=${token}; Path=/; HttpOnly; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax`,
  );
  headers.append("Location", "/lobby");

  return new Response(null, {
    status: 302,
    headers,
  });
}

export default function Signup() {
  const actionData = useActionData<{ error?: string }>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");

  const handlePasswordChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const newPassword = e.target.value;
    setPassword(newPassword);

    // Check password match
    if (confirmPassword && newPassword !== confirmPassword) {
      setConfirmError("Passwords do not match");
    } else {
      setConfirmError("");
    }

    // Check password strength
    if (newPassword.length >= 8) {
      try {
        const isStrongPassword = await verifyPasswordStrength(newPassword);
        if (!isStrongPassword) {
          setPasswordError(
            "Password is too weak or has been compromised. Please use a stronger password.",
          );
        } else {
          setPasswordError("");
        }
      } catch (err) {
        // If the password strength check fails, continue anyway
        console.warn("Password strength check failed", err);
        setPasswordError("");
      }
    } else {
      setPasswordError("");
    }
  };

  const handleConfirmPasswordChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const newConfirmPassword = e.target.value;
    setConfirmPassword(newConfirmPassword);

    if (password !== newConfirmPassword) {
      setConfirmError("Passwords do not match");
    } else {
      setConfirmError("");
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "0 auto", padding: "20px" }}>
      <h1>Sign Up for Citadels</h1>

      {actionData?.error && (
        <div style={{ color: "red", marginBottom: "10px" }}>
          {actionData.error}
        </div>
      )}

      {passwordError && (
        <div style={{ color: "red", marginBottom: "10px" }}>
          {passwordError}
        </div>
      )}

      {confirmError && (
        <div style={{ color: "red", marginBottom: "10px" }}>{confirmError}</div>
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
            onChange={handlePasswordChange}
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
            name="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={handleConfirmPasswordChange}
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
          disabled={isSubmitting || !!passwordError || !!confirmError}
          style={{
            width: "100%",
            padding: "10px",
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor:
              isSubmitting || !!passwordError || !!confirmError
                ? "not-allowed"
                : "pointer",
            opacity:
              isSubmitting || !!passwordError || !!confirmError ? 0.7 : 1,
          }}
        >
          {isSubmitting ? "Signing up..." : "Sign Up"}
        </button>
      </Form>

      <div style={{ marginTop: "15px", textAlign: "center" }}>
        <p>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "#4CAF50" }}>
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
