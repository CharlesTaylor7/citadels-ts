import { useState, useEffect } from "react";
import {
  redirect,
  Form,
  useLoaderData,
  useNavigation,
  useSubmit,
} from "react-router";
import { db } from "../db";
import { rooms, users } from "../db/schema";
import { eq } from "drizzle-orm";
import { validateSessionToken } from "../services/auth-service";
import crypto from "node:crypto";

export async function loader({ request }: { request: Request }) {
  // Get token from cookie
  const cookieHeader = request.headers.get("Cookie") || "";
  const cookies = cookieHeader.split("; ");
  const sessionCookie = cookies.find((cookie) => cookie.startsWith("session="));
  const token = sessionCookie ? sessionCookie.split("=")[1] : undefined;

  if (!token) {
    return redirect("/login");
  }

  const result = await validateSessionToken(token);

  if (!result.user) {
    // Clear the invalid session cookie
    const headers = new Headers();
    headers.append(
      "Set-Cookie",
      "session=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax"
    );
    headers.append("Location", "/login");

    return new Response(null, {
      status: 302,
      headers,
    });
  }

  // Get available rooms
  const allRooms = await db.select().from(rooms).all();

  // Fetch owner usernames for each room
  const roomsWithOwners = await Promise.all(
    allRooms.map(async (room) => {
      const owner = await db
        .select()
        .from(users)
        .where(eq(users.id, Number(room.owner)))
        .get();

      // Parse the players list from CSV
      const playerIds = room.players
        .split(",")
        .filter((id) => id.trim() !== "");

      // Get player usernames
      const players = await Promise.all(
        playerIds.map(async (id) => {
          const player = await db
            .select()
            .from(users)
            .where(eq(users.id, Number(id)))
            .get();
          return player ? player.username : "Unknown";
        })
      );

      return {
        ...room,
        ownerUsername: owner ? owner.username : "Unknown",
        playerUsernames: players,
        playerCount: playerIds.length,
      };
    })
  );

  return {
    user: result.user,
    rooms: roomsWithOwners,
  };
}

export async function action({ request }: { request: Request }) {
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  // Get token from cookie
  const cookieHeader = request.headers.get("Cookie") || "";
  const cookies = cookieHeader.split("; ");
  const sessionCookie = cookies.find((cookie) => cookie.startsWith("session="));
  const token = sessionCookie ? sessionCookie.split("=")[1] : undefined;

  if (!token) {
    return redirect("/login");
  }

  const result = await validateSessionToken(token);

  if (!result.user) {
    return redirect("/login");
  }

  const userId = result.user.id;

  if (intent === "create-room") {
    try {
      // Generate a random room ID
      const roomId = crypto.randomUUID();

      // Create the room
      await db.insert(rooms).values({
        id: roomId,
        owner: userId.toString(),
        players: userId.toString(), // Owner is the first player
        options: "{}",
      });

      return { success: true };
    } catch (error) {
      console.error("Error creating room:", error);
      return { success: false, error: "Failed to create room" };
    }
  } else if (intent === "join-room") {
    const roomId = formData.get("roomId") as string;

    try {
      // Get the room
      const room = await db
        .select()
        .from(rooms)
        .where(eq(rooms.id, roomId))
        .get();

      if (!room) {
        return { success: false, error: "Room not found" };
      }

      // Parse the current players
      const playerIds = room.players.split(",");

      // Check if user is already in the room
      if (playerIds.includes(userId.toString())) {
        return { success: true };
      }

      // Add the user to the players list
      playerIds.push(userId.toString());

      // Update the room
      await db
        .update(rooms)
        .set({
          players: playerIds.join(","),
        })
        .where(eq(rooms.id, roomId));

      return { success: true };
    } catch (error) {
      console.error("Error joining room:", error);
      return { success: false, error: "Failed to join room" };
    }
  } else if (intent === "logout") {
    // Clear the session cookie
    const headers = new Headers();
    headers.append(
      "Set-Cookie",
      "session=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax"
    );
    headers.append("Location", "/login");

    return new Response(null, {
      status: 302,
      headers,
    });
  }

  return { success: false, error: "Invalid action" };
}

export default function Lobby() {
  const { user, rooms } = useLoaderData<{
    user: { id: number; username: string };
    rooms: Array<any>;
  }>();
  const navigation = useNavigation();
  const submit = useSubmit();
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);

  const handleCreateRoom = () => {
    setIsCreatingRoom(true);
    const formData = new FormData();
    formData.append("intent", "create-room");
    submit(formData, { method: "post" });
  };

  const handleJoinRoom = (roomId: string) => {
    const formData = new FormData();
    formData.append("intent", "join-room");
    formData.append("roomId", roomId);
    submit(formData, { method: "post" });
  };

  const handleLogout = () => {
    const formData = new FormData();
    formData.append("intent", "logout");
    submit(formData, { method: "post" });
  };

  // Reset creating state when navigation completes
  useEffect(() => {
    if (navigation.state === "idle" && isCreatingRoom) {
      setIsCreatingRoom(false);
    }
  }, [navigation.state, isCreatingRoom]);

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h1>Game Lobby</h1>
        <div>
          <span style={{ marginRight: "10px" }}>Welcome, {user.username}!</span>
          <button
            onClick={handleLogout}
            style={{
              padding: "8px 12px",
              backgroundColor: "#f44336",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <button
          onClick={handleCreateRoom}
          disabled={isCreatingRoom || navigation.state !== "idle"}
          style={{
            padding: "10px 15px",
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor:
              isCreatingRoom || navigation.state !== "idle"
                ? "not-allowed"
                : "pointer",
            opacity: isCreatingRoom || navigation.state !== "idle" ? 0.7 : 1,
          }}
        >
          {isCreatingRoom ? "Creating..." : "Create New Room"}
        </button>
      </div>

      <h2>Available Rooms</h2>

      {rooms.length === 0 ? (
        <p>No rooms available. Create one to get started!</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "15px",
          }}
        >
          {rooms.map((room) => {
            const isOwner = room.owner === user.id.toString();
            const isPlayer = room.players
              .split(",")
              .includes(user.id.toString());

            return (
              <div
                key={room.id}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  padding: "15px",
                  backgroundColor: isPlayer ? "#e8f5e9" : "white",
                }}
              >
                <div style={{ marginBottom: "10px", fontWeight: "bold" }}>
                  Room ID: {room.id.substring(0, 8)}...
                </div>
                <div style={{ marginBottom: "5px" }}>
                  Owner: {room.ownerUsername}
                </div>
                <div style={{ marginBottom: "5px" }}>
                  Players: {room.playerCount}
                </div>
                <div style={{ marginBottom: "10px" }}>
                  {room.playerUsernames.join(", ")}
                </div>

                {!isPlayer ? (
                  <button
                    onClick={() => handleJoinRoom(room.id)}
                    disabled={navigation.state !== "idle"}
                    style={{
                      padding: "8px 12px",
                      backgroundColor: "#2196F3",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor:
                        navigation.state !== "idle" ? "not-allowed" : "pointer",
                      width: "100%",
                    }}
                  >
                    Join Room
                  </button>
                ) : (
                  <button
                    style={{
                      padding: "8px 12px",
                      backgroundColor: "#9E9E9E",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      width: "100%",
                    }}
                    disabled
                  >
                    {isOwner ? "You are the owner" : "Already joined"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
