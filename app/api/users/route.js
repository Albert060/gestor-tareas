import { createCuid, mapUser, query } from "@/lib/db";
import { createUserSchema } from "@/lib/validations";
import { jsonOk, jsonError, handleZodError, handleDatabaseError } from "@/lib/api-helpers";

// GET /api/users - Listar todos los usuarios
export async function GET() {
  try {
    const rows = await query(`
      SELECT
        u."id",
        u."name",
        u."email",
        u."createdAt",
        u."updatedAt",
        COUNT(t."id") AS "tasksCount"
      FROM "User" u
      LEFT JOIN "Task" t ON t."userId" = u."id"
      GROUP BY u."id"
      ORDER BY u."name" ASC
    `);

    return jsonOk({ users: rows.map(mapUser) });
  } catch (error) {
    console.error("[GET /api/users]", error);
    return jsonError("Error interno del servidor", 500);
  }
}

// POST /api/users - Crear un usuario nuevo
export async function POST(request) {
  try {
    const body = await request.json();
    const parsed = createUserSchema.safeParse(body);

    if (!parsed.success) {
      return handleZodError(parsed.error);
    }

    const [user] = await query(
      `
        INSERT INTO "User" ("id", "name", "email", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, NOW(), NOW())
        RETURNING "id", "name", "email", "createdAt", "updatedAt"
      `,
      [createCuid(), parsed.data.name, parsed.data.email]
    );

    return jsonOk({ user: mapUser(user) }, 201);
  } catch (error) {
    const databaseErr = handleDatabaseError(error);
    if (databaseErr) return databaseErr;

    console.error("[POST /api/users]", error);
    return jsonError("Error interno del servidor", 500);
  }
}
