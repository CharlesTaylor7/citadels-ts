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

  // Find the current player's game state
  const currentPlayerIndex = game.state.players?.findIndex(
    (player: any) => player.id === user.id.toString()
  );
  const currentPlayer = currentPlayerIndex >= 0 ? game.state.players[currentPlayerIndex] : null;

  // Determine the active player and turn type
  const activePlayerIndex = game.state.activeTurn?.type === "Call" && 
    game.state.characters?.characters[game.state.activeTurn.call.index]?.player ? 
    game.state.characters.characters[game.state.activeTurn.call.index].player[0] : null;
  
  const activePlayerId = activePlayerIndex !== null && game.state.players ? 
    game.state.players[activePlayerIndex]?.id : null;
  
  const activePlayerName = activePlayerId ? 
    players.find(p => p.id === activePlayerId)?.username : 'Unknown';

  // Get the current turn phase
  const turnPhase = game.state.activeTurn?.type || 'Unknown';
  
  // Get the active character if in Call phase
  const activeCharacter = game.state.activeTurn?.type === "Call" ? 
    game.state.characters?.characters[game.state.activeTurn.call.index]?.role : null;

  return (
    <div className="max-w-4xl mx-auto p-5 bg-gray-900 min-h-screen text-white">
      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-bold">Citadels Game</h1>
        <Link to="/lobby" className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded">
          Back to Lobby
        </Link>
      </div>

      <div className="mb-6 p-4 bg-gray-800 rounded text-white">
        <h2 className="text-xl font-semibold mb-3">Players</h2>
        <div className="grid grid-cols-2 gap-2">
          {players.map((player) => {
            // Find this player in the game state
            const playerIndex = game.state.players?.findIndex(
              (p: any) => p.id === player.id
            );
            const playerState = playerIndex >= 0 ? game.state.players[playerIndex] : null;
            
            // Check if this is the active player
            const isActivePlayer = player.id === activePlayerId;
            
            return (
              <div
                key={player.id}
                className={`p-3 rounded ${isActivePlayer ? "bg-green-800 border border-green-600" : "bg-gray-700 border border-gray-600"}`}
              >
                <div className="flex justify-between">
                  <span className="font-medium">{player.username}</span>
                  <div className="flex gap-1">
                    {playerState && (
                      <span className="text-yellow-400 font-medium">
                        {playerState.gold} 🪙
                      </span>
                    )}
                    {playerState && (
                      <span className="text-blue-400 font-medium">
                        {playerState.hand?.length || 0} 🃏
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-1 mt-1">
                  {player.id === room.owner_id && (
                    <span className="text-xs bg-yellow-600 text-white px-1 py-0.5 rounded">
                      Owner
                    </span>
                  )}
                  {player.id === user.id.toString() && (
                    <span className="text-xs bg-blue-600 text-white px-1 py-0.5 rounded">
                      You
                    </span>
                  )}
                  {isActivePlayer && (
                    <span className="text-xs bg-green-600 text-white px-1 py-0.5 rounded">
                      Current Turn
                    </span>
                  )}
                  {playerState?.roles?.map((role: string) => (
                    <span key={role} className="text-xs bg-purple-600 text-white px-1 py-0.5 rounded">
                      {role}
                    </span>
                  ))}
                </div>
                
                {playerState?.city?.length > 0 && (
                  <div className="mt-2">
                    <span className="text-xs text-gray-400">City ({playerState.city.length}):</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {playerState.city.map((district: any, idx: number) => (
                        <span key={idx} className="text-xs bg-gray-600 text-white px-1 py-0.5 rounded">
                          {district.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded p-4 text-white">
        <h2 className="text-xl font-semibold mb-4">Game Status</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {currentPlayer && (
            <div className="p-4 bg-gray-700 rounded">
              <h3 className="font-medium mb-2 text-white">Your Hand</h3>
              {currentPlayer.hand?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {currentPlayer.hand.map((card: string, idx: number) => (
                    <div key={idx} className="w-20 h-28 bg-blue-800 rounded flex items-center justify-center text-white text-center p-1">
                      {card}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">No cards in hand</p>
              )}
            </div>
          )}

          <div className="p-4 bg-gray-700 rounded">
            <h3 className="font-medium mb-2 text-white">Characters</h3>
            {game.state.characters?.characters ? (
              <div className="flex flex-wrap gap-2">
                {game.state.characters.characters.map((char: any, idx: number) => {
                  const hasPlayer = char.player !== null;
                  const playerName = hasPlayer ? 
                    players.find(p => game.state.players[char.player[0]]?.id === p.id)?.username : null;
                  
                  return (
                    <div 
                      key={idx} 
                      className={`w-full p-2 rounded ${hasPlayer ? 'bg-purple-800' : 'bg-gray-600'} flex justify-between`}
                    >
                      <span>{char.role}</span>
                      {playerName && <span>{playerName}</span>}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-400">No characters assigned yet</p>
            )}
          </div>

          <div className="p-4 bg-gray-700 rounded">
            <h3 className="font-medium mb-2 text-white">Game Info</h3>
            <p className="text-gray-200">Current Turn: {activePlayerName}</p>
            <p className="text-gray-200">Phase: {turnPhase}</p>
            {activeCharacter && (
              <p className="text-gray-200">Active Character: {activeCharacter}</p>
            )}
            <p className="text-gray-200">Crowned Player: {game.state.crowned ? 
              players.find(p => game.state.players[game.state.crowned[0]]?.id === p.id)?.username : 'Unknown'}</p>
            <p className="text-gray-200">Deck Size: {game.state.deck?.deck?.length || 0} cards</p>
          </div>
        </div>

        <div className="p-4 bg-gray-700 rounded">
          <h3 className="font-medium mb-2 text-white">Game Log</h3>
          <div className="h-40 overflow-y-auto bg-gray-900 p-2 border border-gray-600 rounded">
            {game.state.logs?.length > 0 ? (
              game.state.logs.map((log: string, idx: number) => (
                <p key={idx} className="text-sm text-gray-300">{log}</p>
              ))
            ) : (
              <p className="text-sm text-gray-300">Game started</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
