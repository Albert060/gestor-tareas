import { neon } from "@neondatabase/serverless";

const globalForDb = globalThis;

function createSqlClient() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
  }

  return neon(databaseUrl);
}

export const sql = globalForDb.sql ?? createSqlClient();

if (process.env.NODE_ENV !== "production") {
  globalForDb.sql = sql;
}

let cuidCounter = 0;

export function createCuid() {
  const timestamp = Date.now().toString(36);
  const counter = (cuidCounter++ % 46656).toString(36).padStart(3, "0");
  const random = Array.from(crypto.getRandomValues(new Uint8Array(12)))
    .map((byte) => (byte % 36).toString(36))
    .join("");

  return `c${timestamp}${counter}${random}`.slice(0, 25);
}

export async function query(text, params = []) {
  return sql.query(text, params);
}

export function mapUser(row) {
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    ...(row.tasksCount !== undefined && {
      _count: { tasks: Number(row.tasksCount) },
    }),
  };
}

export function mapTask(row) {
  if (!row) return null;

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    userId: row.userId,
    ...(row.userId !== undefined && {
      user: row.user_id
        ? {
            id: row.user_id,
            name: row.user_name,
            email: row.user_email,
            createdAt: row.user_createdAt,
            updatedAt: row.user_updatedAt,
          }
        : null,
    }),
  };
}
