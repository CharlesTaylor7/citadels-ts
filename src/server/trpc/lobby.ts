import { z } from "zod";
import { t as trpc } from ".";
import { rooms, users, room_members, games } from "@/server/schema";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { GameConfigUtils } from "@/server/game/lobby";
import { createGame } from "@/server/game/game-state";
import { newSeed } from "@/server/game/random";
import { TRPCError } from "@trpc/server";

// import { initTRPC, TRPCError } from '@trpc/server';
// const t = initTRPC.create();
// const appRouter = t.router({
//   hello: t.procedure.query(() => {
//     throw new TRPCError({
//       code: 'INTERNAL_SERVER_ERROR',
//       message: 'An unexpected error occurred, please try again later.',
//       // optional: pass the original error to retain stack trace
//       cause: theError,
//     });
//   }),
// });
// // [...]

type Player = { id: number; name: string; owner: boolean };
type Room = {
  id: string;
  name: string;
  members: Player[];
  gameId: number | null;
};
export const lobbyRouter = trpc.router({
  rooms: trpc.procedure.query<Room[]>(async ({ ctx: { db } }) => {
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
          members: [],
        };
        roomMap.set(row.roomId, record);
      }
      record.members.push({
        id: row.playerId.toString(),
        name: row.playerName,
        owner: row.owner,
      });
    }
    return Array.from(roomMap.values());
  }),
  createRoom: trpc.procedure.mutation(async ({ ctx: { session, db } }) => {
    if (!session.user)
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User not authenticated",
      });

    // Check if user is already in any room
    const userRoomMembership = await db
      .select()
      .from(room_members)
      .where(eq(room_members.playerId, session.user.id))
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
      playerId: session.user.id,
      roomId: roomId,
      owner: true,
    });

    return { roomId };
  }),

  leaveRoom: trpc.procedure
    .input(z.object({ roomId: z.string() }))
    .mutation(async ({ input, ctx: { session, db } }) => {
      if (!session.user)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });

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
        .where(eq(room_members.playerId, session.user.id))
        .run();

      return { roomId: input.roomId };
    }),

  startGame: trpc.procedure.mutation(async ({ ctx: { session, db } }) => {
    if (!session.user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User not authenticated",
      });
    }
    // Check if in room and owner
    const room_member = await db
      .select()
      .from(room_members)
      .where(eq(users.id, session.user.id))
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
    const roomMembers = await db
      .select({ id: room_members.playerId, name: users.username })
      .from(room_members)
      .innerJoin(users, eq(room_members.playerId, users.id))
      .where(eq(room_members.roomId, room_member.roomId))
      .all();

    if (roomMembers.length < 2) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "At least 2 players are required to start the game",
      });
    }

    // Create initial game state

    const config = GameConfigUtils.default();
    const players = roomMembers.map((member) => ({
      id: member.id.toString(),
      name: member.name,
    }));

    // Create a new game record

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

  closeRoom: trpc.procedure
    .input(z.object({ roomId: z.string() }))
    .mutation(async ({ input, ctx: { session, db } }) => {
      if (!session.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }
      // Get the room
      const room_member = await db
        .select()
        .from(room_members)
        .where(
          and(
            eq(room_members.roomId, input.roomId),
            eq(room_members.playerId, session.user.id)
          )
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

  joinRoom: trpc.procedure
    .input(z.object({ roomId: z.string() }))
    .mutation(async ({ ctx: { session, db }, input }) => {
      if (!session.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }
      // Check if user is already in any room
      const userRoomMembership = await db
        .select()
        .from(room_members)
        .where(eq(room_members.playerId, session.user?.id))
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
            eq(room_members.playerId, session.user?.id),
            eq(room_members.roomId, input.roomId)
          )
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
          playerId: session.user?.id,
          roomId: input.roomId,
        })
        .run();

      return { roomId: input.roomId };
    }),
});
