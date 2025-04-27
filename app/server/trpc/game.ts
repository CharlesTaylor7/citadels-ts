import { z } from "zod";
import { t } from ".";
import { db, rooms, users, room_members, games } from "@/server/db.server";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { GameConfigUtils } from "@/game/lobby";
import { createGame } from "@/game/game-state";

export const gameRouter = t.router({});
