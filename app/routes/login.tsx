import { useState } from "react";
import {
  Form,
  Link,
  redirect,
  useActionData,
  useNavigation,
} from "react-router";
import { users, db } from "@/server/db.server";
import { eq } from "drizzle-orm";
import {
  generateSessionToken,
  createSession,
  verifyPasswordHash,
  getSession,
} from "@/server/auth.server";

export async function loader({ request }: { request: Request }) {
  const result = await getSession(request);

  // If already logged in, redirect to lobby
  if (result) {
    return redirect("/lobby");
  }
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
    <div className="max-w-md mx-auto p-5">
      <h1 className="text-2xl font-bold mb-4">Login to Citadels</h1>

      {actionData?.error && (
        <div className="text-red-500 mb-3">{actionData.error}</div>
      )}

      <Form method="post">
        <div className="mb-4">
          <label htmlFor="username" className="block mb-1">
            Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
            className="w-full p-2 border border-gray-300 rounded"
            required
          />
        </div>

        <div className="mb-4">
          <label htmlFor="password" className="block mb-1">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-2.5 bg-green-500 text-white rounded ${isSubmitting ? "opacity-70 cursor-not-allowed" : "cursor-pointer"}`}
        >
          {isSubmitting ? "Logging in..." : "Login"}
        </button>
      </Form>

      <div className="mt-4 text-center">
        <p>
          Don't have an account?{" "}
          <Link to="/signup" className="text-green-500">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
