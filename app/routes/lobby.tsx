import { createFileRoute, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { db } from "../db";
import { rooms, users, User, Room } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { validateSessionToken } from "../services/auth-service";
import crypto from "node:crypto";

// Server function to get current user
const getCurrentUser = createServerFn({ method: "GET" })
  .validator((d: { token?: string }) => d)
  .handler(async ({ data }) => {
    const { token } = data;
    
    if (!token) {
      return { user: null };
    }
    
    const result = await validateSessionToken(token);
    return { user: result.user };
  });

// Server function to get available rooms
const getAvailableRooms = createServerFn({ method: "GET" })
  .handler(async () => {
    // Get rooms that don't have an associated game yet
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
        const playerIds = room.players.split(',').filter(id => id.trim() !== '');
        
        // Get player usernames
        const players = await Promise.all(
          playerIds.map(async (id) => {
            const player = await db
              .select()
              .from(users)
              .where(eq(users.id, Number(id)))
              .get();
            return player ? player.username : 'Unknown';
          })
        );
        
        return {
          ...room,
          ownerUsername: owner ? owner.username : 'Unknown',
          playerUsernames: players,
          playerCount: playerIds.length
        };
      })
    );
    
    return { rooms: roomsWithOwners };
  });

// Server function to create a new room
const createRoom = createServerFn({ method: "POST" })
  .validator((d: { userId: number; options?: string }) => d)
  .handler(async ({ data }) => {
    const { userId, options = '{}' } = data;
    
    // Generate a random room ID
    const roomId = crypto.randomUUID();
    
    // Create the room
    const [room] = await db
      .insert(rooms)
      .values({
        id: roomId,
        owner: userId.toString(),
        players: userId.toString(), // Owner is the first player
        options: options,
      })
      .returning();
    
    return { success: true, room };
  });

// Server function to join a room
const joinRoom = createServerFn({ method: "POST" })
  .validator((d: { roomId: string; userId: number }) => d)
  .handler(async ({ data }) => {
    const { roomId, userId } = data;
    
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
    const playerIds = room.players.split(',');
    
    // Check if user is already in the room
    if (playerIds.includes(userId.toString())) {
      return { success: true, room };
    }
    
    // Add the user to the players list
    playerIds.push(userId.toString());
    
    // Update the room
    const [updatedRoom] = await db
      .update(rooms)
      .set({
        players: playerIds.join(','),
      })
      .where(eq(rooms.id, roomId))
      .returning();
    
    return { success: true, room: updatedRoom };
  });

export const Route = createFileRoute("/lobby")({
  component: LobbyComponent,
  loader: async () => {
    // Get token from cookie
    const cookies = document.cookie.split('; ');
    const tokenCookie = cookies.find(cookie => cookie.startsWith('session='));
    const token = tokenCookie ? tokenCookie.split('=')[1] : undefined;
    
    if (!token) {
      return {
        redirect: "/login",
      };
    }
    
    const { user } = await getCurrentUser({ data: { token } });
    
    if (!user) {
      // Clear the invalid cookie
      document.cookie = "session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      return {
        redirect: "/login",
      };
    }
    
    const { rooms } = await getAvailableRooms({});
    
    return { user, rooms, token };
  },
});

function LobbyComponent() {
  const router = useRouter();
  const { user, rooms, token } = Route.useLoaderData();
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  
  const handleCreateRoom = async () => {
    setIsCreatingRoom(true);
    try {
      const result = await createRoom({ data: { userId: user.id } });
      if (result.success) {
        // Refresh the page to show the new room
        router.invalidate();
      }
    } catch (error) {
      console.error("Error creating room:", error);
    } finally {
      setIsCreatingRoom(false);
    }
  };
  
  const handleJoinRoom = async (roomId: string) => {
    try {
      const result = await joinRoom({ data: { roomId, userId: user.id } });
      if (result.success) {
        // Refresh the page to update the room
        router.invalidate();
      }
    } catch (error) {
      console.error("Error joining room:", error);
    }
  };
  
  const handleLogout = () => {
    // Clear the session cookie
    document.cookie = "session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    // Redirect to login page
    router.navigate({ to: "/login" });
  };
  
  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
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
              cursor: "pointer"
            }}
          >
            Logout
          </button>
        </div>
      </div>
      
      <div style={{ marginBottom: "20px" }}>
        <button 
          onClick={handleCreateRoom}
          disabled={isCreatingRoom}
          style={{
            padding: "10px 15px",
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: isCreatingRoom ? "not-allowed" : "pointer",
            opacity: isCreatingRoom ? 0.7 : 1
          }}
        >
          {isCreatingRoom ? "Creating..." : "Create New Room"}
        </button>
      </div>
      
      <h2>Available Rooms</h2>
      
      {rooms.length === 0 ? (
        <p>No rooms available. Create one to get started!</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
          {rooms.map((room) => {
            const isOwner = room.owner === user.id.toString();
            const isPlayer = room.players.split(',').includes(user.id.toString());
            
            return (
              <div 
                key={room.id} 
                style={{
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  padding: "15px",
                  backgroundColor: isPlayer ? "#e8f5e9" : "white"
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
                  {room.playerUsernames.join(', ')}
                </div>
                
                {!isPlayer ? (
                  <button
                    onClick={() => handleJoinRoom(room.id)}
                    style={{
                      padding: "8px 12px",
                      backgroundColor: "#2196F3",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      width: "100%"
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
                      width: "100%"
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
