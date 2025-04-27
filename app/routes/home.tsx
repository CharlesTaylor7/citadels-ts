import type { Route } from "./+types/home";
import { redirect } from "react-router";
import { getSession } from "@/server/auth.server";
import { db, games, room_members, rooms } from "@/server/db.server";
import { eq } from "drizzle-orm";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Citadels Game" },
    { name: "description", content: "Welcome to Citadels Game!" },
  ];
}

export async function loader({ request }: { request: Request }) {
  const result = await getSession(request);
  if (!result) return redirect("/login");
  const { user } = result;
  // check if user is in a room and the game has started, then redirect to the game.
  const room = await db
    .select({ id: room_members.room_id })
    .from(room_members)
    .innerJoin(games, eq(room_members.room_id, games.id))
    .where(eq(room_members.player_id, user.id.toString()))
    .get();
  if (room) {
    return redirect(`/game/${room.id}`);
  }
  return redirect("/lobby");
}

export default function Home() {
  // This component won't be rendered due to redirects in the loader
  return <div>Redirecting...</div>;
}
