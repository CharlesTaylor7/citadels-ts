import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { trpc } from "../router";
import { useMutation } from "@tanstack/react-query";

export const Route = createFileRoute("/signup")({
  component: SignupComponent,
});

function SignupComponent() {
  const [error, setError] = useState<string>();
  const signupMutation = useMutation({
    mutationFn: async (data: { username: string; password: string }) => {
      const result = await trpc.auth.signup.mutate(data);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result;
    },
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const username = formData.get("username");
    const password = formData.get("password");
    const confirmPassword = formData.get("confirmPassword");

    // Validate inputs
    if (
      typeof username !== "string" ||
      typeof password !== "string" ||
      typeof confirmPassword !== "string"
    ) {
      setError("All fields are required");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      await signupMutation.mutateAsync({ username, password });
      // Redirect to home on success
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{" "}
            <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              sign in to your account
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Username"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="sr-only">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Confirm Password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={signupMutation.isPending}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {signupMutation.isPending ? "Creating account..." : "Sign up"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
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
