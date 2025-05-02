import { useState, useEffect } from "react";
import { Link, useLoaderData, useNavigate } from "react-router";
import { db, rooms, users, room_members, games, Room } from "@/server/db";
import { useTRPC } from "@/server/trpc";
import { useQuery } from "@tanstack/react-query";

export default function Lobby() {
  const trpc = useTRPC();
  const userQuery = useQuery(trpc.auth.me.query());
  const lobbyQuery = useQuery(trpc.lobby.rooms.query());
  const placeholder = (e: unknown) => console.log(e);
  const isLoading = false;
  const userRoom = null;
  const rooms: Room[] = [];
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
