import { validateSessionToken } from "@/auth.server";
import { Session, User } from "@/db.server";

export async function getSession(
  request: Request
): Promise<{ session: Session; user: User } | null> {
  // Get token from cookie
  const cookieHeader = request.headers.get("Cookie") || "";
  const cookies = cookieHeader.split("; ");
  const sessionCookie = cookies.find((cookie) => cookie.startsWith("session="));
  const token = sessionCookie ? sessionCookie.split("=")[1] : undefined;

  // If token exists, validate it
  if (!token) return null;
  return await validateSessionToken(token);
}
