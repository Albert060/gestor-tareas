import { cookies } from "next/headers";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { createCuid, mapUser, query } from "@/lib/db";
import { jsonError } from "@/lib/api-helpers";

const SESSION_COOKIE = "gestor_session";
const SESSION_DAYS = 7;
const PASSWORD_KEY_LENGTH = 64;

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const key = scryptSync(password, salt, PASSWORD_KEY_LENGTH).toString("hex");
  return `scrypt:${salt}:${key}`;
}

export function verifyPassword(password, storedHash) {
  const [algorithm, salt, key] = storedHash?.split(":") ?? [];

  if (algorithm !== "scrypt" || !salt || !key) {
    return false;
  }

  const expected = Buffer.from(key, "hex");
  const actual = scryptSync(password, salt, expected.length);

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function createSession(userId) {
  const sessionId = createCuid();
  const secret = randomBytes(32).toString("base64url");
  const token = `${sessionId}.${secret}`;
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await query(
    `
      INSERT INTO "Session" ("id", "userId", "tokenHash", "expiresAt", "createdAt")
      VALUES ($1, $2, $3, $4, NOW())
    `,
    [sessionId, userId, hashToken(token), expiresAt]
  );

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await query('DELETE FROM "Session" WHERE "tokenHash" = $1', [hashToken(token)]);
  }

  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) return null;

  const [row] = await query(
    `
      SELECT
        u."id",
        u."name",
        u."email",
        u."createdAt",
        u."updatedAt"
      FROM "Session" s
      INNER JOIN "User" u ON u."id" = s."userId"
      WHERE s."tokenHash" = $1
        AND s."expiresAt" > NOW()
    `,
    [hashToken(token)]
  );

  return mapUser(row);
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    return { response: jsonError("Debes iniciar sesion", 401), user: null };
  }

  return { response: null, user };
}

export async function requireTeamMember(teamId, userId) {
  const [member] = await query(
    `
      SELECT "id"
      FROM "TeamMember"
      WHERE "teamId" = $1 AND "userId" = $2
    `,
    [teamId, userId]
  );

  if (!member) {
    return jsonError("No perteneces a este equipo", 403);
  }

  return null;
}
