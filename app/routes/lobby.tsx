import { useState, useEffect } from "react";
import { redirect, Link, useLoaderData, useNavigate } from "react-router";
import { toast } from "react-hot-toast";
import { db, rooms, users, room_members, games } from "@/server/db.server";
import { eq } from "drizzle-orm";
import { trpc } from "@/trpc.client";

export async function loader() {
  // Get available rooms directly from the database
  const allRooms = await db.select().from(rooms).all();

  // Fetch owner usernames for each room
  const roomsWithOwners = await Promise.all(
    allRooms.map(async (room) => {
      const owner = await db
        .select()
        .from(users)
        .where(eq(users.id, Number(room.owner_id)))
        .get();

      // Get all players in this room from room_members table
      const roomMembers = await db
        .select()
        .from(room_members)
        .where(eq(room_members.room_id, room.id))
        .all();

      const playerIds = roomMembers.map((member) => member.player_id);

      // Get usernames for all players
      const players = await Promise.all(
        playerIds.map(async (playerId) => {
          const player = await db
            .select()
            .from(users)
            .where(eq(users.id, Number(playerId)))
            .get();
          return player ? player.username : "Unknown";
        })
      );

      // Check if a game exists for this room
      const game = await db
        .select()
        .from(games)
        .where(eq(games.id, room.id))
        .get();

      return {
        ...room,
        ownerUsername: owner ? owner.username : "Unknown",
        playerUsernames: players,
        playerCount: playerIds.length,
        gameStarted: !!game,
      };
    })
  );

  // Get user's current room if any
  const userRoomMembership = null; // You'll need to get the current user ID from the request context

  return {
    rooms: roomsWithOwners,
    userRoom: userRoomMembership ? userRoomMembership.room_id : null,
  };
}

export default function Lobby() {
  const {
    rooms,
    userRoom,
    error: loaderError,
  } = useLoaderData<{
    rooms: Array<any>;
    userRoom: string | null;
    error?: string;
    pingResult: any;
  }>();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(loaderError || null);

  // Display error message if present
  useEffect(() => {
    if (error) {
      toast.error(error);
      setError(null);
    }
  }, [error]);

  const handleCreateRoom = async () => {
    setIsLoading(true);
    try {
      const result = await trpc.createRoom.mutate({ userId: user?.id });
      if (!result.success) {
        setError(result.error || "Failed to create room");
      } else {
        // Refresh the page to show the new room
        window.location.reload();
      }
    } catch (err) {
      setError("Error creating room");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async (roomId: string) => {
    setIsLoading(true);
    try {
      const result = await trpc.joinRoom.mutate({
        roomId,
      });
      if (!result.success) {
        setError(result.error || "Failed to join room");
      } else {
        // Refresh the page to show updated room status
        window.location.reload();
      }
    } catch (err) {
      setError("Error joining room");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveRoom = async (roomId: string) => {
    setIsLoading(true);
    try {
      const result = await trpc.leaveRoom.mutate({
        roomId,
      });
      if (!result.success) {
        setError(result.error || "Failed to leave room");
      } else {
        // Refresh the page to show updated room status
        window.location.reload();
      }
    } catch (err) {
      setError("Error leaving room");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseRoom = async (roomId: string) => {
    setIsLoading(true);
    try {
      const result = await trpc.closeRoom.mutate({
        roomId,
      });
      if (!result.success) {
        setError(result.error || "Failed to close room");
      } else {
        // Refresh the page to show updated room list
        window.location.reload();
      }
    } catch (err) {
      setError("Error closing room");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartGame = async (roomId: string) => {
    setIsLoading(true);
    try {
      const result = await trpc.startGame.mutate({
        roomId,
      });
      if (!result.success) {
        setError(result.error || "Failed to start game");
      } else {
        // Navigate to the game page
        navigate(`/game/${result.gameId}`);
      }
    } catch (err) {
      setError("Error starting game");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await trpc.logout.mutate();
      // Redirect to login page
      navigate("/login");
    } catch (err) {
      setError("Error logging out");
      console.error(err);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="navbar bg-base-100 rounded-box shadow-sm mb-6">
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Game Lobby</h1>
        </div>
        <div className="flex-none gap-2">
          <div className="mr-2">Welcome, {user?.username || "Guest"}!</div>
          <button onClick={handleLogout} className="btn btn-error btn-sm">
            Logout
          </button>
        </div>
      </div>

      <div className="mb-6">
        <button
          onClick={handleCreateRoom}
          disabled={isLoading || userRoom !== null}
          className="btn btn-primary"
        >
          {isLoading ? "Creating..." : "Create Room"}
        </button>
      </div>

      <h2 className="text-xl font-semibold mb-4">Available Rooms</h2>

      {rooms.length === 0 ? (
        <div className="alert alert-info">
          <div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              className="stroke-current shrink-0 w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            <span>No rooms available. Create one to get started!</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rooms.map((room) => {
            const isOwner = room.owner_id === user.id.toString();
            const isPlayer = room.playerUsernames.some(
              (username) => username === user.username
            );

            return (
              <div
                key={room.id}
                className={`card ${isPlayer ? "bg-base-200" : "bg-base-100"} shadow-md relative`}
              >
                <div className="card-body">
                  {isPlayer && (
                    <div className="absolute top-2 right-2 flex gap-2">
                      {room.gameStarted ? (
                        <Link
                          to={`/game/${room.id}`}
                          className="btn btn-primary btn-sm"
                        >
                          Continue Game
                        </Link>
                      ) : isOwner ? (
                        <>
                          <button
                            onClick={() => handleStartGame(room.id)}
                            disabled={isLoading || room.playerCount < 2}
                            className="btn btn-success btn-sm"
                            title={
                              room.playerCount < 2
                                ? "Need at least 2 players"
                                : "Start the game"
                            }
                          >
                            Start Game
                          </button>
                          <button
                            onClick={() => handleCloseRoom(room.id)}
                            disabled={isLoading}
                            className="btn btn-error btn-sm"
                          >
                            Close
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleLeaveRoom(room.id)}
                          disabled={isLoading}
                          className="btn btn-warning btn-sm"
                        >
                          Leave
                        </button>
                      )}
                    </div>
                  )}

                  <div className="mb-2">
                    {room.gameStarted && (
                      <div className="mb-2">
                        <div className="badge badge-lg badge-primary">
                          Game in progress
                        </div>
                      </div>
                    )}
                    <div>
                      <div className="font-medium mb-1">
                        Players ({room.playerCount}):
                      </div>
                      <div className="max-h-32 overflow-y-auto bg-base-100 rounded-box p-2 border border-base-300">
                        {room.playerUsernames.map((username, index) => (
                          <div key={index} className="flex items-center py-1">
                            <span className="badge badge-sm badge-success mr-2"></span>
                            <span
                              className={
                                username === user.username ? "font-medium" : ""
                              }
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
                      {room.gameStarted ? (
                        <div className="w-full text-center text-sm text-gray-500">
                          Game already in progress
                        </div>
                      ) : (
                        <button
                          onClick={() => handleJoinRoom(room.id)}
                          disabled={
                            isLoading ||
                            (userRoom !== null && userRoom !== room.id)
                          }
                          className={`btn ${userRoom !== null && userRoom !== room.id ? "btn-disabled" : "btn-primary"} w-full`}
                        >
                          {userRoom !== null && userRoom !== room.id
                            ? "Already in another room"
                            : "Join Room"}
                        </button>
                      )}
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
