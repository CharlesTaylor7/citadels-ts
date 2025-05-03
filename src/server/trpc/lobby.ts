import { z } from "zod";
import { router, loggedInProcedure } from ".";
import { rooms, users, room_members, games } from "@/server/schema";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { GameConfigUtils } from "@/server/game/lobby";
import { createGame } from "@/server/game/game-state";
import { newSeed } from "@/server/game/random";
import { TRPCError } from "@trpc/server";

const playerSchema = z.object({
  id: z.number(),
  name: z.string(),
  owner: z.boolean(),
});

const roomSchema = z.object({
  id: z.string(),
  name: z.string(),
  gameId: z.number().nullable(),
  owner: playerSchema,
  members: z.array(playerSchema),
});

export type Player = z.infer<typeof playerSchema>;
export type Room = z.infer<typeof roomSchema>;

export const lobbyRouter = router({
  rooms: loggedInProcedure
    .output(roomSchema.array())
    .query(async ({ ctx: { db } }) => {
      const roomsWithMembers = await db
        .select({
          roomId: rooms.id,
          gameId: rooms.gameId,
          roomName: rooms.name,
          playerId: room_members.playerId,
          owner: room_members.owner,
          playerName: users.username,
        })
        .from(room_members)
        .innerJoin(rooms, eq(room_members.roomId, rooms.id))
        .innerJoin(users, eq(room_members.playerId, users.id))
        .all();

      const roomMap = new Map<string, Room>();
      for (const row of roomsWithMembers) {
        let record = roomMap.get(row.roomId);
        if (!record) {
          record = {
            id: row.roomId,
            gameId: row.gameId,
            name: row.roomName,
            // eslint-disable-next-line
            owner: null as any,
            members: [],
          };
          roomMap.set(row.roomId, record);
        }
        if (row.owner) {
          record.owner = {
            id: row.playerId,
            name: row.playerName,
            owner: row.owner,
          };
        }
        record.members.push({
          id: row.playerId,
          name: row.playerName,
          owner: row.owner,
        });
      }
      return Array.from(roomMap.values());
    }),
  createRoom: loggedInProcedure.mutation(async ({ ctx: { userId, db } }) => {
    // Check if user is already in any room
    const userRoomMembership = await db
      .select()
      .from(room_members)
      .where(eq(room_members.playerId, userId))
      .get();

    // If user is already in a room, return error
    if (userRoomMembership) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "You are already in a room. Leave that room first before creating a new one.",
      });
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
      playerId: userId,
      roomId: roomId,
      owner: true,
    });

    return { roomId };
  }),

  leaveRoom: loggedInProcedure
    .input(z.object({ roomId: z.string() }))
    .mutation(async ({ input, ctx: { userId, db } }) => {
      // Get the room
      const room = await db
        .select()
        .from(rooms)
        .where(eq(rooms.id, input.roomId))
        .get();

      if (!room) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Room not found",
        });
      }

      // Remove the user from the room_members table
      await db
        .delete(room_members)
        .where(eq(room_members.playerId, userId))
        .run();

      return { roomId: input.roomId };
    }),

  startGame: loggedInProcedure.mutation(async ({ ctx: { db, userId } }) => {
    // Check if in room and owner
    const room_member = await db
      .select()
      .from(room_members)
      .where(eq(users.id, userId))
      .get();

    if (!room_member) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Room not found",
      });
    }

    if (!room_member.owner) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only the room owner can start the game",
      });
    }

    // Check if there are enough players (at least 2)
    const players = await db
      .select({ id: room_members.playerId, name: users.username })
      .from(room_members)
      .innerJoin(users, eq(room_members.playerId, users.id))
      .where(eq(room_members.roomId, room_member.roomId))
      .all();

    if (players.length < 2) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "At least 2 players are required to start the game",
      });
    }

    const config = GameConfigUtils.default();
    const rngSeed = newSeed();
    const gameStartAction = {
      action: "GameStart",
      players,
      config,
      rngSeed,
    };

    const initialState = createGame(gameStartAction);
    const game = await db
      .insert(games)
      .values({
        state: JSON.stringify(initialState),
        actions: JSON.stringify([gameStartAction]),
      })
      .returning({ id: games.id })
      .get();

    await db
      .update(rooms)
      .set({ gameId: game.id })
      .where(eq(rooms.id, room_member.roomId));

    return { gameId: game.id };
  }),

  closeRoom: loggedInProcedure
    .input(z.object({ roomId: z.string() }))
    .mutation(async ({ input, ctx: { db, userId } }) => {
      // Get the room
      const room_member = await db
        .select()
        .from(room_members)
        .where(
          and(
            eq(room_members.roomId, input.roomId),
            eq(room_members.playerId, userId),
          ),
        )
        .get();

      if (!room_member) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Room not found",
        });
      }

      // Check if user is the owner
      if (!room_member.owner) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the room owner can close a room",
        });
      }

      await db.delete(rooms).where(eq(rooms.id, input.roomId)).run();

      return { roomId: input.roomId };
    }),

  joinRoom: loggedInProcedure
    .input(z.object({ roomId: z.string() }))
    .mutation(async ({ ctx: { db, userId }, input }) => {
      // Check if user is already in any room
      const userRoomMembership = await db
        .select()
        .from(room_members)
        .where(eq(room_members.playerId, userId))
        .get();

      // If user is already in a different room, return error
      if (userRoomMembership && userRoomMembership.roomId !== input.roomId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "You are already in another room. Leave that room first before joining a new one.",
        });
      }

      // Get the room
      const room = await db
        .select()
        .from(rooms)
        .where(eq(rooms.id, input.roomId))
        .get();

      if (!room) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Room not found",
        });
      }

      // Check if user is already in this room
      const isAlreadyInRoom = await db
        .select()
        .from(room_members)
        .where(
          and(
            eq(room_members.playerId, userId),
            eq(room_members.roomId, input.roomId),
          ),
        )
        .get();

      if (isAlreadyInRoom) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You are already in this room",
        });
      }

      // Add user to the room_members table
      await db
        .insert(room_members)
        .values({
          playerId: userId,
          roomId: input.roomId,
        })
        .run();

      return { roomId: input.roomId };
    }),
});
