import type { Route } from "./+types/home";
import { redirect } from 'react-router'
import { validateSessionToken } from '@/auth.server';

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Citadels Game" },
    { name: "description", content: "Welcome to Citadels Game!" },
  ];
}

export async function loader({ request }: { request: Request }) {
  // Get token from cookie
  const cookieHeader = request.headers.get("Cookie") || "";
  const cookies = cookieHeader.split("; ");
  const sessionCookie = cookies.find((cookie) => cookie.startsWith("session="));
  const token = sessionCookie ? sessionCookie.split("=")[1] : undefined;

  // If token exists, validate it
  if (token) {
    const result = await validateSessionToken(token);
    
    // If user is authenticated, redirect to lobby
    if (result.user) {
      return redirect("/lobby");
    }
  }
  
  // Otherwise redirect to login
  return redirect("/login");
}

export default function Home() {
  // This component won't be rendered due to redirects in the loader
  return <div>Redirecting...</div>;
}
