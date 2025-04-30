import type { Route } from "./+types/home";
import { redirect } from "react-router";
import { validateSessionToken } from "@/server/auth";
import { db, games, room_members, rooms } from "@/server/db";
import { eq } from "drizzle-orm";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Citadels Game" },
    { name: "description", content: "Welcome to Citadels Game!" },
  ];
}

export default function Home() {
  // This component won't be rendered due to redirects in the fastify server
  return <div>Redirecting...</div>;
}
