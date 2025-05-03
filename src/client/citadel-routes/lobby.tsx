import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/client/router";

export default function Lobby() {
  const [isLoading, setIsLoading] = useState(false);
  const userQuery = useQuery(['auth.me'], () => trpc.auth.me.query());
  const lobbyQuery = useQuery(['lobby.rooms'], () => trpc.lobby.rooms.query());
  
  const user = userQuery.data;
  const rooms = lobbyQuery.data || [];
  const userRoom = rooms.find(r => r.members.some(m => m.id === user?.id));

  const handleStartGame = async (roomId: string) => {
    setIsLoading(true);
    try {
      await trpc.lobby.startGame.mutate();
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseRoom = async (roomId: string) => {
    setIsLoading(true);
    try {
      await trpc.lobby.closeRoom.mutate({ roomId });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveRoom = async (roomId: string) => {
    setIsLoading(true);
    try {
      await trpc.lobby.leaveRoom.mutate({ roomId });
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="container mx-auto p-4">
      <div className="navbar bg-base-100 rounded-box shadow-sm mb-6">
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Game Lobby</h1>
        </div>
        <div className="flex-none gap-2">
          <button onClick={placeholder} className="btn btn-error btn-sm">
            Logout
          </button>
        </div>
      </div>

      <div className="mb-6">
        <button
          onClick={placeholder}
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
            return (
              <div
                key={room.id}
                className={`card ${room.members.some(m => m.id === user?.id) ? "bg-base-200" : "bg-base-100"} shadow-md relative`}
              >
                <div className="card-body">
                  {room.members.some(m => m.id === user?.id) && (
                    <div className="absolute top-2 right-2 flex gap-2">
                      {room.gameStarted ? (
                        <Link
                          to={`/game/${room.id}`}
                          className="btn btn-primary btn-sm"
                        >
                          Continue Game
                        </Link>
                      ) : room.members.find(m => m.id === user?.id)?.owner ? (
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
                        Players ({room.members.length}):
                      </div>
                      <div className="max-h-32 overflow-y-auto bg-base-100 rounded-box p-2 border border-base-300">
                        {room.members.map((member, index) => (
                          <div key={index} className="flex items-center py-1">
                            <span className="badge badge-sm badge-success mr-2"></span>
                            <span>{member.name}</span>
                            {member.owner && (
                              <div className="badge badge-warning badge-sm ml-2">
                                Owner
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="card-actions justify-end">
                    {room.gameStarted ? (
                      <div className="w-full text-center text-sm text-gray-500">
                        Game already in progress
                      </div>
                    ) : (
                      <button
                        onClick={placeholder}
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
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
