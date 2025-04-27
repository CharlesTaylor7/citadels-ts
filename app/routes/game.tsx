import { useState, useEffect } from "react";
import { redirect, useLoaderData, useParams, Link } from "react-router";

import { db, games, rooms, users } from "@/db.server";
import { eq } from "drizzle-orm";
import { validateSessionToken } from "../auth.server";

export async function loader({
  request,
  params,
}: {
  request: Request;
  params: { roomId: string };
}) {
  const roomId = params.roomId;

  if (!roomId) {
    return redirect("/lobby");
  }

  // Get the room
  const room = await db.select().from(rooms).where(eq(rooms.id, roomId)).get();

  if (!room) {
    return redirect("/lobby?error=Room not found");
  }

  // Check if user is in the room
  const playerIds = room.players.split(",");
  if (!playerIds.includes(result.user.id.toString())) {
    return redirect(`/lobby?error=You are not a player in this room`);
  }

  // Get the game
  const game = await db.select().from(games).where(eq(games.id, roomId)).get();

  // If game doesn't exist yet, create it
  let gameState = {};
  let gameActions = [];

  if (game) {
    try {
      gameState = JSON.parse(game.state);
      gameActions = JSON.parse(game.actions);
    } catch (error) {
      console.error("Error parsing game data:", error);
    }
  }

  // Get player usernames
  const players = await Promise.all(
    playerIds.map(async (id) => {
      const player = await db
        .select()
        .from(users)
        .where(eq(users.id, Number(id)))
        .get();
      return {
        id: id,
        username: player ? player.username : "Unknown",
      };
    })
  );

  return {
    roomId,
    user: result.user,
    room,
    game: {
      exists: !!game,
      state: gameState,
      actions: gameActions,
    },
    players,
  };
}

export default function Game() {
  const { roomId } = useParams();
  const { user, room, game, players } = useLoaderData<{
    roomId: string;
    user: { id: number; username: string };
    room: { id: string; owner: string; players: string; options: string };
    game: { exists: boolean; state: any; actions: any[] };
    players: { id: string; username: string }[];
  }>();

  return (
    <div className="max-w-4xl mx-auto p-5">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          Game Room: {roomId?.substring(0, 8)}...
        </h1>
        <Link to="/lobby" className="px-3 py-2 bg-blue-500 text-white rounded">
          Back to Lobby
        </Link>
      </div>

      <div className="mb-6 p-4 bg-gray-100 rounded">
        <h2 className="text-xl font-semibold mb-3">Players</h2>
        <div className="grid grid-cols-2 gap-2">
          {players.map((player) => (
            <div
              key={player.id}
              className={`p-3 rounded ${player.id === user.id.toString() ? "bg-green-100 border border-green-300" : "bg-white border border-gray-300"}`}
            >
              <span className="font-medium">{player.username}</span>
              {player.id === room.owner && (
                <span className="ml-2 text-xs bg-yellow-200 px-1 py-0.5 rounded">
                  Owner
                </span>
              )}
              {player.id === user.id.toString() && (
                <span className="ml-2 text-xs bg-blue-200 px-1 py-0.5 rounded">
                  You
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {!game.exists ? (
        <div className="text-center p-8 bg-yellow-50 rounded border border-yellow-200">
          <h2 className="text-xl font-semibold mb-3">Game Not Started</h2>
          <p className="mb-4">
            The game for this room hasn't been started yet.
          </p>
          {room.owner === user.id.toString() && (
            <button className="px-4 py-2 bg-green-500 text-white rounded">
              Start Game
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-300 rounded p-4">
          <h2 className="text-xl font-semibold mb-4">Game In Progress</h2>

          {/* Game board would go here */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-gray-100 rounded">
              <h3 className="font-medium mb-2">Your Hand</h3>
              <div className="flex flex-wrap gap-2">
                {/* Cards would go here */}
                <div className="w-20 h-28 bg-blue-100 rounded flex items-center justify-center">
                  Card 1
                </div>
                <div className="w-20 h-28 bg-blue-100 rounded flex items-center justify-center">
                  Card 2
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-100 rounded">
              <h3 className="font-medium mb-2">Characters</h3>
              <div className="flex flex-wrap gap-2">
                {/* Character cards would go here */}
                <div className="w-20 h-28 bg-purple-100 rounded flex items-center justify-center">
                  Character
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-100 rounded">
              <h3 className="font-medium mb-2">Game Info</h3>
              <p>Current Turn: Player 1</p>
              <p>Phase: Character Selection</p>
            </div>
          </div>

          <div className="p-4 bg-gray-100 rounded">
            <h3 className="font-medium mb-2">Game Log</h3>
            <div className="h-40 overflow-y-auto bg-white p-2 border border-gray-200 rounded">
              <p className="text-sm">Game started</p>
              <p className="text-sm">Player 1 chose the King</p>
              <p className="text-sm">Player 2 chose the Thief</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
