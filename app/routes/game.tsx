import { useState, useEffect } from "react";
import { redirect, useLoaderData, useParams, Link } from "react-router";

import { db, games, rooms, users, room_members } from "@/db.server";
import { and, eq } from "drizzle-orm";
import { getSession } from "@/auth.server";
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

  const result = await getSession(request);

  if (!result) {
    return redirect("/login");
  }

  // Get the room
  const room = await db.select().from(rooms).where(eq(rooms.id, roomId)).get();

  if (!room) {
    return redirect("/lobby?error=Room not found");
  }

  // Check if user is in the room
  const userRoomMembership = await db
    .select()
    .from(room_members)
    .where(
      and(
        eq(room_members.player_id, result.user.id.toString()),
        eq(room_members.room_id, roomId)
      )
    )
    .get();

  if (!userRoomMembership) {
    return redirect(`/lobby?error=You are not a player in this room`);
  }

  // Get the game
  const game = await db.select().from(games).where(eq(games.id, roomId)).get();

  // If no game exists, redirect back to lobby
  if (!game) {
    return redirect(`/lobby?error=Game not found for this room`);
  }

  // Parse game state and actions
  let gameState = {};
  let gameActions = [];
  
  try {
    gameState = JSON.parse(game.state);
    gameActions = JSON.parse(game.actions);
  } catch (error) {
    console.error("Error parsing game data:", error);
  }

  // Get all players in this room
  const roomMembers = await db
    .select()
    .from(room_members)
    .where(eq(room_members.room_id, roomId))
    .all();

  // Get player usernames
  const players = await Promise.all(
    roomMembers.map(async (member) => {
      const player = await db
        .select()
        .from(users)
        .where(eq(users.id, Number(member.player_id)))
        .get();
      return {
        id: member.player_id,
        username: player ? player.username : "Unknown",
      };
    })
  );

  return {
    roomId,
    user: result.user,
    room,
    game: {
      ...game,
      state: gameState,
      actions: gameActions
    },
    players,
  };
}

export default function Game() {
  const { roomId } = useParams();
  const { user, room, game, players } = useLoaderData<{
    roomId: string;
    user: { id: number; username: string };
    room: { id: string; owner_id: string; options: string };
    game: { id: string; state: any; actions: any[] };
    players: { id: string; username: string }[];
  }>();

  return (
    <div className="max-w-4xl mx-auto p-5 bg-gray-900 min-h-screen text-white">
      <div className="flex justify-end mb-6">
        <Link to="/lobby" className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded">
          Back to Lobby
        </Link>
      </div>

      <div className="mb-6 p-4 bg-gray-800 rounded text-white">
        <h2 className="text-xl font-semibold mb-3">Players</h2>
        <div className="grid grid-cols-2 gap-2">
          {players.map((player) => (
            <div
              key={player.id}
              className={`p-3 rounded ${game.state.players && game.state.players[game.state.currentTurn] === player.id ? "bg-green-800 border border-green-600" : "bg-gray-700 border border-gray-600"}`}
            >
              <span className="font-medium">{player.username}</span>
              {player.id === room.owner_id && (
                <span className="ml-2 text-xs bg-yellow-600 text-white px-1 py-0.5 rounded">
                  Owner
                </span>
              )}
              {player.id === user.id.toString() && (
                <span className="ml-2 text-xs bg-blue-600 text-white px-1 py-0.5 rounded">
                  You
                </span>
              )}
              {game.state.players && game.state.players[game.state.currentTurn] === player.id && (
                <span className="ml-2 text-xs bg-green-600 text-white px-1 py-0.5 rounded">
                  Current Turn
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded p-4 text-white">
        <h2 className="text-xl font-semibold mb-4">Game In Progress</h2>

        {/* Game board would go here */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-gray-700 rounded">
            <h3 className="font-medium mb-2 text-white">Your Hand</h3>
            <div className="flex flex-wrap gap-2">
              {/* Cards would go here */}
              <div className="w-20 h-28 bg-blue-800 rounded flex items-center justify-center text-white">
                Card 1
              </div>
              <div className="w-20 h-28 bg-blue-800 rounded flex items-center justify-center text-white">
                Card 2
              </div>
            </div>
          </div>

          <div className="p-4 bg-gray-700 rounded">
            <h3 className="font-medium mb-2 text-white">Characters</h3>
            <div className="flex flex-wrap gap-2">
              {/* Character cards would go here */}
              <div className="w-20 h-28 bg-purple-800 rounded flex items-center justify-center text-white">
                Character
              </div>
            </div>
          </div>

          <div className="p-4 bg-gray-700 rounded">
            <h3 className="font-medium mb-2 text-white">Game Info</h3>
            <p className="text-gray-200">Current Turn: {game.state.players && players.find(p => p.id === game.state.players[game.state.currentTurn])?.username || 'Unknown'}</p>
            <p className="text-gray-200">Phase: {game.state.phase || 'Unknown'}</p>
            <p className="text-gray-200">Round: {game.state.round || 1}</p>
          </div>
        </div>

        <div className="p-4 bg-gray-700 rounded">
          <h3 className="font-medium mb-2 text-white">Game Log</h3>
          <div className="h-40 overflow-y-auto bg-gray-900 p-2 border border-gray-600 rounded">
            <p className="text-sm text-gray-300">Game started</p>
            <p className="text-sm text-gray-300">Player 1 chose the King</p>
            <p className="text-sm text-gray-300">Player 2 chose the Thief</p>
          </div>
        </div>
      </div>
    </div>
  );
}
