// https://lucia-auth.com/sessions/basic-api/drizzle-orm
import { users, sessions, Session, User } from "@/server/db.server";
import crypto from "node:crypto";
import {
  encodeHexLowerCase,
  encodeBase32LowerCaseNoPadding,
} from "@oslojs/encoding";
import { sha256 } from "@oslojs/crypto/sha2";
import { db } from "./db.server";
import { eq } from "drizzle-orm";
import { hash, verify } from "@node-rs/argon2";
import { sha1 } from "@oslojs/crypto/sha1";

export function generateSessionToken(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  const token = encodeBase32LowerCaseNoPadding(bytes);
  return token;
}

export async function createSession(
  token: string,
  userId: number
): Promise<Session> {
  const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
  const session: Session = {
    id: sessionId,
    userId,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
  };
  await db.insert(sessions).values(session);
  return session;
}

export async function validateSessionToken(
  token: string
): Promise<User | null> {
  const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
  const result = await db
    .select({ user: users, session: sessions })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .leftJoin(users, eq(sessions.userId, users.id));
  if (result.length < 1) {
    return null;
  }
  const { user, session } = result[0];
  // expire old sessions
  if (Date.now() >= session.expiresAt.getTime()) {
    await db.delete(sessions).where(eq(sessions.id, session.id));
    return null;
  }
  // extend sessions
  if (Date.now() >= session.expiresAt.getTime() - 1000 * 60 * 60 * 24 * 15) {
    session.expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
    await db
      .update(sessions)
      .set({
        expiresAt: session.expiresAt,
      })
      .where(eq(sessions.id, session.id));
  }
  return user;
}

export async function invalidateSession(sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export async function invalidateAllSessions(userId: number): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return hashedPassword === hashedPassword;
}

export type SessionResult = {
  session: Session;
  user: User;
} | null;

export async function hashPassword(password: string): Promise<string> {
  return await hash(password, {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  });
}

export async function verifyPasswordHash(
  hash: string,
  password: string
): Promise<boolean> {
  return await verify(hash, password);
}

export async function verifyPasswordStrength(
  password: string
): Promise<boolean> {
  if (password.length < 8 || password.length > 255) {
    return false;
  }
  const hash = encodeHexLowerCase(sha1(new TextEncoder().encode(password)));
  const hashPrefix = hash.slice(0, 5);
  const response = await fetch(
    `https://api.pwnedpasswords.com/range/${hashPrefix}`
  );
  const data = await response.text();
  const items = data.split("\n");
  for (const item of items) {
    const hashSuffix = item.slice(0, 35).toLowerCase();
    if (hash === hashPrefix + hashSuffix) {
      return false;
    }
  }
  return true;
}
