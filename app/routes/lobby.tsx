import { useState, useEffect } from "react";
import {
  redirect,
  Form,
  useLoaderData,
  useNavigation,
  useSubmit,
} from "react-router";
import { db, rooms, users } from "@/db.server";
import { eq } from "drizzle-orm";
import { validateSessionToken } from "../auth.server";
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

  // Find the room the user is currently in, if any
  const userRoom = allRooms.find((room) =>
    room.players.split(",").includes(result.user.id.toString())
  );

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
    userRoom: userRoom ? userRoom.id : null,
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
      // Check if user is already in any room
      const allRooms = await db.select().from(rooms).all();
      const userRooms = allRooms.filter((r) =>
        r.players.split(",").includes(userId.toString())
      );

      // If user is already in a room, return error
      if (userRooms.length > 0) {
        return {
          success: false,
          error:
            "You are already in a room. Leave that room first before creating a new one.",
        };
      }

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
  } else if (intent === "leave-room") {
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

      // Check if user is the owner
      if (room.owner === userId.toString()) {
        return {
          success: false,
          error: "Room owner cannot leave. Please close the room instead.",
        };
      }

      // Parse the players list
      const playerIds = room.players
        .split(",")
        .filter((id) => id !== userId.toString());

      // Update the room with the user removed
      await db
        .update(rooms)
        .set({
          players: playerIds.join(","),
        })
        .where(eq(rooms.id, roomId));

      return { success: true };
    } catch (error) {
      console.error("Error leaving room:", error);
      return { success: false, error: "Failed to leave room" };
    }
  } else if (intent === "close-room") {
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

      // Check if user is the owner
      if (room.owner !== userId.toString()) {
        return {
          success: false,
          error: "Only the room owner can close a room",
        };
      }

      // Delete the room
      await db.delete(rooms).where(eq(rooms.id, roomId));

      return { success: true };
    } catch (error) {
      console.error("Error closing room:", error);
      return { success: false, error: "Failed to close room" };
    }
  } else if (intent === "join-room") {
    const roomId = formData.get("roomId") as string;

    try {
      // Check if user is already in any room
      const allRooms = await db.select().from(rooms).all();
      const userRooms = allRooms.filter((r) =>
        r.players.split(",").includes(userId.toString())
      );

      // If user is already in a different room, return error
      if (userRooms.length > 0 && !userRooms.some((r) => r.id === roomId)) {
        return {
          success: false,
          error:
            "You are already in another room. Leave that room first before joining a new one.",
        };
      }

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
  const { user, rooms, userRoom } = useLoaderData<{
    user: { id: number; username: string };
    rooms: Array<any>;
    userRoom: string | null;
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

  const handleLeaveRoom = (roomId: string) => {
    const formData = new FormData();
    formData.append("intent", "leave-room");
    formData.append("roomId", roomId);
    submit(formData, { method: "post" });
  };

  const handleCloseRoom = (roomId: string) => {
    const formData = new FormData();
    formData.append("intent", "close-room");
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
    <div className="max-w-3xl mx-auto p-5">
      <div className="flex justify-between items-center mb-5">
        <h1 className="text-2xl font-bold">Game Lobby</h1>
        <div>
          <span className="mr-3">Welcome, {user.username}!</span>
          <button
            onClick={handleLogout}
            className="px-3 py-2 bg-red-500 text-white rounded cursor-pointer"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="mb-5">
        <button
          onClick={handleCreateRoom}
          disabled={
            isCreatingRoom || navigation.state !== "idle" || userRoom !== null
          }
          className={`px-4 py-2.5 bg-green-500 text-white rounded ${isCreatingRoom || navigation.state !== "idle" || userRoom !== null ? "opacity-70 cursor-not-allowed" : "cursor-pointer"}`}
        >
          {userRoom !== null
            ? "Already in a room"
            : isCreatingRoom
              ? "Creating..."
              : "Create New Room"}
        </button>
      </div>

      <h2 className="text-xl font-semibold mb-3">Available Rooms</h2>

      {rooms.length === 0 ? (
        <p className="text-gray-600">
          No rooms available. Create one to get started!
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {rooms.map((room) => {
            const isOwner = room.owner === user.id.toString();
            const isPlayer = room.players
              .split(",")
              .includes(user.id.toString());

            return (
              <div
                key={room.id}
                className={`border border-gray-300 rounded p-4 ${isPlayer ? "bg-green-50" : "bg-white"}`}
              >
                <div className="mb-2.5 font-bold">
                  Room ID: {room.id.substring(0, 8)}...
                </div>
                <div className="mb-3">
                  <div className="flex items-center mb-1">
                    <span className="font-medium mr-2">Owner:</span>
                    <span className="bg-yellow-100 px-2 py-0.5 rounded text-sm">
                      {room.ownerUsername}
                    </span>
                  </div>
                  <div className="mb-2">
                    <div className="font-medium mb-1">
                      Players ({room.playerCount}):
                    </div>
                    <ul className="bg-gray-50 rounded border border-gray-200 p-2 max-h-24 overflow-y-auto">
                      {room.playerUsernames.map((username, index) => (
                        <li key={index} className="flex items-center py-0.5">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                          <span
                            className={
                              username === user.username ? "font-medium" : ""
                            }
                          >
                            {username} {username === user.username && "(You)"}
                          </span>
                          {username === room.ownerUsername && (
                            <span className="ml-2 text-xs bg-yellow-200 px-1 py-0.5 rounded">
                              Owner
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {!isPlayer ? (
                  <button
                    onClick={() => handleJoinRoom(room.id)}
                    disabled={
                      navigation.state !== "idle" ||
                      (userRoom !== null && userRoom !== room.id)
                    }
                    className={`w-full px-3 py-2 bg-blue-500 text-white rounded ${navigation.state !== "idle" || (userRoom !== null && userRoom !== room.id) ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                  >
                    {userRoom !== null && userRoom !== room.id
                      ? "Already in another room"
                      : "Join Room"}
                  </button>
                ) : (
                  <div className="space-y-2">
                    <button
                      className="w-full px-3 py-2 bg-gray-500 text-white rounded"
                      disabled
                    >
                      {isOwner ? "You are the owner" : "Already joined"}
                    </button>

                    {isOwner ? (
                      <button
                        onClick={() => handleCloseRoom(room.id)}
                        disabled={navigation.state !== "idle"}
                        className={`w-full px-3 py-2 bg-red-500 text-white rounded ${navigation.state !== "idle" ? "cursor-not-allowed" : "cursor-pointer"}`}
                      >
                        Close Room
                      </button>
                    ) : (
                      <button
                        onClick={() => handleLeaveRoom(room.id)}
                        disabled={navigation.state !== "idle"}
                        className={`w-full px-3 py-2 bg-yellow-500 text-white rounded ${navigation.state !== "idle" ? "cursor-not-allowed" : "cursor-pointer"}`}
                      >
                        Leave Room
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
