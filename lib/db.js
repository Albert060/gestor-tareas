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
    ...(row.teamsCount !== undefined && {
      teamsCount: Number(row.teamsCount),
    }),
  };
}

export function mapTeam(row) {
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    ...(row.membersCount !== undefined && {
      membersCount: Number(row.membersCount),
    }),
    ...(row.tasksCount !== undefined && {
      tasksCount: Number(row.tasksCount),
    }),
  };
}

export function mapTask(row) {
  if (!row) return null;

  return {
    id: row.id,
    teamId: row.teamId,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    assigneeId: row.assigneeId,
    assignee:
      row.assignee_id !== undefined && row.assignee_id !== null
        ? {
            id: row.assignee_id,
            name: row.assignee_name,
            email: row.assignee_email,
            createdAt: row.assignee_createdAt,
            updatedAt: row.assignee_updatedAt,
          }
        : null,
    ...(row.team_id !== undefined && {
      team: row.team_id
        ? {
            id: row.team_id,
            name: row.team_name,
            description: row.team_description,
          }
        : null,
    }),
  };
}

export function mapInvitation(row) {
  if (!row) return null;

  return {
    id: row.id,
    teamId: row.teamId,
    email: row.email,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    team: row.team_id
      ? {
          id: row.team_id,
          name: row.team_name,
          description: row.team_description,
        }
      : undefined,
  };
}
