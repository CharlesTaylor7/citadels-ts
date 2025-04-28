import { z } from "zod";
import { t, t as trpc } from ".";
import { db, rooms, users, room_members, games } from "@/server/db.server";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { GameConfigUtils } from "@/game/lobby";
import { createGame } from "@/game/game-state";

export const lobbyRouter = trpc.router({
  createRoom: trpc.procedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input }) => {
      try {
        // Check if user is already in any room
        const userRoomMembership = await db
          .select()
          .from(room_members)
          .where(eq(room_members.player_id, input.userId.toString()))
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
          owner_id: input.userId.toString(),
          options: "{}",
        });

        // Add the owner as a room member
        await db.insert(room_members).values({
          player_id: input.userId.toString(),
          room_id: roomId,
        });

        return { success: true };
      } catch (error) {
        console.error("Error creating room:", error);
        return { success: false, error: "Failed to create room" };
      }
    }),

  leaveRoom: trpc.procedure
    .input(z.object({ userId: z.number(), roomId: z.string() }))
    .mutation(async ({ input }) => {
      try {
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
        if (room.owner_id === input.userId.toString()) {
          return {
            success: false,
            error: "Room owner cannot leave. Please close the room instead.",
          };
        }

        // Remove the user from the room_members table
        await db
          .delete(room_members)
          .where(eq(room_members.player_id, input.userId.toString()))
          .run();

        return { success: true };
      } catch (error) {
        console.error("Error leaving room:", error);
        return { success: false, error: "Failed to leave room" };
      }
    }),

  startGame: trpc.procedure
    .input(z.object({ userId: z.number(), roomId: z.string() }))
    .mutation(async ({ input }) => {
      // Check if room exists
      const room = await db
        .select()
        .from(rooms)
        .where(eq(rooms.id, input.roomId))
        .get();

      if (!room) {
        return { success: false, error: "Room not found" };
      }

      // Check if user is the owner
      if (room.owner_id !== input.userId.toString()) {
        return {
          success: false,
          error: "Only the room owner can start the game",
        };
      }

      // Check if there are enough players (at least 2)
      const roomMembers = await db
        .select({ id: room_members.player_id, name: users.username })
        .from(room_members)
        .innerJoin(users, eq(room_members.player_id, users.id))
        .where(eq(room_members.room_id, input.roomId))
        .all();

      if (roomMembers.length < 2) {
        return {
          success: false,
          error: "At least 2 players are required to start the game",
        };
      }

      // Create initial game state
      const initialState = createGame({
        players: roomMembers,
        config: GameConfigUtils.default(),
      });

      // Create a new game record
      await db.insert(games).values({
        id: input.roomId,
        state: JSON.stringify(initialState),
        actions: JSON.stringify([
          {
            type: "GAME_CREATED",
            timestamp: Date.now(),
            playerId: input.userId.toString(),
          },
        ]),
      });

      return { success: true, gameId: input.roomId };
    }),

  closeRoom: trpc.procedure
    .input(z.object({ userId: z.number(), roomId: z.string() }))
    .mutation(async ({ input }) => {
      try {
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
        if (room.owner_id !== input.userId.toString()) {
          return {
            success: false,
            error: "Only the room owner can close a room",
          };
        }

        // Delete all room members first
        await db
          .delete(room_members)
          .where(eq(room_members.room_id, input.roomId))
          .run();

        // Then delete the room
        await db.delete(rooms).where(eq(rooms.id, input.roomId)).run();

        return { success: true };
      } catch (error) {
        console.error("Error closing room:", error);
        return { success: false, error: "Failed to close room" };
      }
    }),

  joinRoom: trpc.procedure
    .input(z.object({ userId: z.number(), roomId: z.string() }))
    .mutation(async ({ input }) => {
      try {
        // Check if user is already in any room
        const userRoomMembership = await db
          .select()
          .from(room_members)
          .where(eq(room_members.player_id, input.userId.toString()))
          .get();

        // If user is already in a different room, return error
        if (userRoomMembership && userRoomMembership.room_id !== input.roomId) {
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
              eq(room_members.player_id, input.userId.toString()),
              eq(room_members.room_id, input.roomId)
            )
          )
          .get();

        if (isAlreadyInRoom) {
          return { success: false, error: "You are already in this room" };
        }

        // Add user to the room_members table
        await db
          .insert(room_members)
          .values({
            player_id: input.userId.toString(),
            room_id: input.roomId,
          })
          .run();

        return { success: true };
      } catch (error) {
        console.error("Error joining room:", error);
        return { success: false, error: "Failed to join room" };
      }
    }),

  getRooms: trpc.procedure.query(async () => {
    // Get available rooms
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

    return roomsWithOwners;
  }),

  getUserRoom: trpc.procedure.query(async ({ context }) => {
    const userRoomMembership = await db
      .select()
      .from(room_members)
      .where(eq(room_members.player_id, context.user.id.toString()))
      .get();

    return userRoomMembership ? userRoomMembership.room_id : null;
  }),
});
