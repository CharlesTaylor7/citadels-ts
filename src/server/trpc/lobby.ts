import { z } from "zod";
import { t as trpc } from ".";
import { db, rooms, users, room_members, games } from "@/server/db";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { GameConfigUtils } from "@/server/game/lobby";
import { createGame } from "@/server/game/game-state";
import { newSeed } from "@/server/game/random";
import { Action } from "@/server/game/actions";

function action(action: Action): Action {
  return action;
}

export const lobbyRouter = trpc.router({
  createRoom: trpc.procedure.mutation(async ({ ctx }) => {
    if (!ctx.session.user)
      return { success: false, error: "User not authenticated" };

    // Check if user is already in any room
    const userRoomMembership = await db
      .select()
      .from(room_members)
      .where(eq(room_members.playerId, ctx.session.user.id))
      .get();

    // If user is already in a room, return error
    if (userRoomMembership) {
      return {
        success: false,
        error:
          "You are already in a room. Leave that room first before creating a new one.",
      };
    }

    // Generate a random room ID
    const roomId = randomUUID();

    // Create the room
    await db.insert(rooms).values({
      id: roomId,
      options: "{}",
    });

    // Add the owner as a room member
    await db.insert(room_members).values({
      playerId: ctx.session.user.id,
      roomId: roomId,
      owner: true,
    });

    return { success: true };
  }),

  leaveRoom: trpc.procedure
    .input(z.object({ roomId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user)
        return { success: false, error: "User not authenticated" };

      // Get the room
      const room = await db
        .select()
        .from(rooms)
        .where(eq(rooms.id, input.roomId))
        .get();

      if (!room) {
        return { success: false, error: "Room not found" };
      }

      // Remove the user from the room_members table
      await db
        .delete(room_members)
        .where(eq(room_members.playerId, ctx.session.user.id))
        .run();

      return { success: true };
    }),

  startGame: trpc.procedure.mutation(async ({ ctx, input }) => {
    if (!ctx.session.user) {
      return { success: false, error: "User not authenticated" };
    }
    // Check if in room and owner
    const room_member = await db
      .select()
      .from(room_members)
      .where(eq(users.id, ctx.session.user.id))
      .get();

    if (!room_member) {
      return { success: false, error: "Room not found" };
    }

    if (!room_member.owner) {
      return {
        success: false,
        error: "Only the room owner can start the game",
      };
    }

    // Check if there are enough players (at least 2)
    const roomMembers = await db
      .select({ id: room_members.playerId, name: users.username })
      .from(room_members)
      .innerJoin(users, eq(room_members.playerId, users.id))
      .where(eq(room_members.roomId, room_member.roomId))
      .all();

    if (roomMembers.length < 2) {
      return {
        success: false,
        error: "At least 2 players are required to start the game",
      };
    }

    // Create initial game state

    const config = GameConfigUtils.default();
    const players = roomMembers.map((member) => ({
      id: member.id.toString(),
      name: member.name,
    }));

    // Create a new game record

    const gameStartAction = action({
      type: "GAME_START",
      players,
      config,
      rngSeed: rngSeed,
    });

    const rngSeed = newSeed();
    const initialState = createGame({ config, players, rngSeed });
    const [game] = await db
      .insert(games)
      .values({
        state: JSON.stringify(initialState),
        actions: JSON.stringify([gameStartAction]),
      })
      .returning({ id: games.id });

    await db
      .update(rooms)
      .set({ gameId: game.id })
      .where(eq(rooms.id, room_member.roomId));

    return { success: true, gameId: game.id };
  }),

  closeRoom: trpc.procedure
    .input(z.object({ roomId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session.user) {
        return { success: false, error: "User not authenticated" };
      }
      // Get the room
      const room = await db
        .select()
        .from(rooms)
        .where(eq(rooms.id, input.roomId))
        .get();

      if (!room) {
        return { success: false, error: "Room not found" };
      }

      // Check if user is the owner
      if (room.ownerId !== ctx.session.user.id) {
        return {
          success: false,
          error: "Only the room owner can close a room",
        };
      }

      await db.delete(rooms).where(eq(rooms.id, input.roomId)).run();

      return { success: true };
    }),

  joinRoom: trpc.procedure
    .input(z.object({ roomId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user) {
        return { success: false, error: "User not authenticated" };
      }
      // Check if user is already in any room
      const userRoomMembership = await db
        .select()
        .from(room_members)
        .where(eq(room_members.playerId, ctx.session.user?.id))
        .get();

      // If user is already in a different room, return error
      if (userRoomMembership && userRoomMembership.roomId !== input.roomId) {
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
        .where(eq(rooms.id, input.roomId))
        .get();

      if (!room) {
        return { success: false, error: "Room not found" };
      }

      // Check if user is already in this room
      const isAlreadyInRoom = await db
        .select()
        .from(room_members)
        .where(
          and(
            eq(room_members.playerId, ctx.session.user?.id),
            eq(room_members.roomId, input.roomId),
          ),
        )
        .get();

      if (isAlreadyInRoom) {
        return { success: false, error: "You are already in this room" };
      }

      // Add user to the room_members table
      await db
        .insert(room_members)
        .values({
          playerId: ctx.session.user?.id,
          roomId: input.roomId,
        })
        .run();

      return { success: true };
    }),
});
