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
  } else if (intent === "start-game") {
    try {
      const roomId = formData.get("roomId") as string;

      // Check if room exists
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
        return { success: false, error: "Only the room owner can start the game" };
      }

      // Check if there are enough players (at least 2)
      const playerIds = room.players.split(",").filter((id) => id.trim() !== "");
      if (playerIds.length < 2) {
        return { 
          success: false, 
          error: "At least 2 players are required to start the game" 
        };
      }

      // Redirect to the game page
      return redirect(`/game/${roomId}`);
    } catch (error) {
      console.error("Error starting game:", error);
      return { success: false, error: "Failed to start game" };
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
    submit(
      { intent: "close-room", roomId },
      { method: "post", replace: true }
    );
  };

  const handleStartGame = (roomId: string) => {
    submit(
      { intent: "start-game", roomId },
      { method: "post", replace: true }
    );
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
    <div className="container mx-auto p-4">
      <div className="navbar bg-base-100 rounded-box shadow-sm mb-6">
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Game Lobby</h1>
        </div>
        <div className="flex-none gap-2">
          <div className="mr-2">Welcome, {user.username}!</div>
          <button
            onClick={handleLogout}
            className="btn btn-error btn-sm"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="mb-6">
        <button
          onClick={handleCreateRoom}
          disabled={
            isCreatingRoom || navigation.state !== "idle" || userRoom !== null
          }
          className={`btn ${userRoom !== null ? "btn-disabled" : "btn-primary"}`}
        >
          {userRoom !== null
            ? "Already in a room"
            : isCreatingRoom
              ? "Creating..."
              : "Create New Room"}
        </button>
      </div>

      <h2 className="text-xl font-semibold mb-4">Available Rooms</h2>

      {rooms.length === 0 ? (
        <div className="alert alert-info">
          <div>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span>No rooms available. Create one to get started!</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rooms.map((room) => {
            const isOwner = room.owner === user.id.toString();
            const isPlayer = room.players
              .split(",")
              .includes(user.id.toString());

            return (
              <div
                key={room.id}
                className={`card ${isPlayer ? "bg-base-200" : "bg-base-100"} shadow-md relative`}
              >
                <div className="card-body">
                  {isPlayer && (
                    <div className="absolute top-2 right-2 flex gap-2">
                      {isOwner ? (
                        <>
                          <button
                            onClick={() => handleStartGame(room.id)}
                            disabled={navigation.state !== "idle" || room.playerCount < 2}
                            className="btn btn-success btn-sm"
                            title={room.playerCount < 2 ? "Need at least 2 players" : "Start the game"}
                          >
                            Start Game
                          </button>
                          <button
                            onClick={() => handleCloseRoom(room.id)}
                            disabled={navigation.state !== "idle"}
                            className="btn btn-error btn-sm"
                          >
                            Close
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleLeaveRoom(room.id)}
                          disabled={navigation.state !== "idle"}
                          className="btn btn-warning btn-sm"
                        >
                          Leave
                        </button>
                      )}
                    </div>
                  )}
                  
                  <div className="mb-2">
                    <div className="flex items-center mb-2">
                      <span className="font-medium mr-2">Owner:</span>
                      <div className="badge badge-warning">
                        {room.ownerUsername}
                      </div>
                    </div>
                    
                    <div>
                      <div className="font-medium mb-1">
                        Players ({room.playerCount}):
                      </div>
                      <div className="max-h-32 overflow-y-auto bg-base-100 rounded-box p-2 border border-base-300">
                        {room.playerUsernames.map((username, index) => (
                          <div key={index} className="flex items-center py-1">
                            <span className="badge badge-sm badge-success mr-2"></span>
                            <span
                              className={username === user.username ? "font-medium" : ""}
                            >
                              {username} {username === user.username && "(You)"}
                            </span>
                            {username === room.ownerUsername && (
                              <div className="badge badge-warning badge-sm ml-2">
                                Owner
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {!isPlayer && (
                    <div className="card-actions justify-end">
                      <button
                        onClick={() => handleJoinRoom(room.id)}
                        disabled={
                          navigation.state !== "idle" ||
                          (userRoom !== null && userRoom !== room.id)
                        }
                        className={`btn ${userRoom !== null && userRoom !== room.id ? "btn-disabled" : "btn-primary"} w-full`}
                      >
                        {userRoom !== null && userRoom !== room.id
                          ? "Already in another room"
                          : "Join Room"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
