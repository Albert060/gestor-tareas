import { createCuid, mapTask, query } from "@/lib/db";
import {
  createTaskSchema,
  taskPrioritySchema,
  taskStatusSchema,
} from "@/lib/validations";
import { jsonOk, jsonError, handleZodError, handleDatabaseError } from "@/lib/api-helpers";

// GET /api/tasks - Listar tareas con filtros opcionales
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const userId = searchParams.get("userId");
    const search = searchParams.get("q")?.trim();

    const conditions = [];
    const params = [];

    if (status) {
      const parsedStatus = taskStatusSchema.safeParse(status);
      if (!parsedStatus.success) {
        return jsonError("El filtro de estado no es valido", 400);
      }

      params.push(status);
      conditions.push(`t."status" = $${params.length}`);
    }

    if (priority) {
      const parsedPriority = taskPrioritySchema.safeParse(priority);
      if (!parsedPriority.success) {
        return jsonError("El filtro de prioridad no es valido", 400);
      }

      params.push(priority);
      conditions.push(`t."priority" = $${params.length}`);
    }

    if (userId) {
      params.push(userId);
      conditions.push(`t."userId" = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(
        `(t."title" ILIKE $${params.length} OR COALESCE(t."description", '') ILIKE $${params.length})`
      );
    }

    const rows = await query(
      `
        SELECT
          t."id",
          t."title",
          t."description",
          t."status",
          t."priority",
          t."createdAt",
          t."updatedAt",
          t."userId",
          u."id" AS "user_id",
          u."name" AS "user_name",
          u."email" AS "user_email",
          u."createdAt" AS "user_createdAt",
          u."updatedAt" AS "user_updatedAt"
        FROM "Task" t
        LEFT JOIN "User" u ON u."id" = t."userId"
        ${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""}
        ORDER BY t."createdAt" DESC
      `,
      params
    );

    return jsonOk({ tasks: rows.map(mapTask) });
  } catch (error) {
    console.error("[GET /api/tasks]", error);
    return jsonError("Error interno del servidor", 500);
  }
}

// POST /api/tasks - Crear una tarea nueva
export async function POST(request) {
  try {
    const body = await request.json();
    const parsed = createTaskSchema.safeParse(body);

    if (!parsed.success) {
      return handleZodError(parsed.error);
    }

    if (parsed.data.userId) {
      const [userExists] = await query('SELECT "id" FROM "User" WHERE "id" = $1', [
        parsed.data.userId,
      ]);

      if (!userExists) {
        return jsonError("El usuario asignado no existe", 400);
      }
    }

    const [task] = await query(
      `
        WITH inserted AS (
          INSERT INTO "Task" (
            "id",
            "title",
            "description",
            "status",
            "priority",
            "userId",
            "createdAt",
            "updatedAt"
          )
          VALUES ($1, $2, $3, $4::"TaskStatus", $5::"TaskPriority", $6, NOW(), NOW())
          RETURNING *
        )
        SELECT
          t."id",
          t."title",
          t."description",
          t."status",
          t."priority",
          t."createdAt",
          t."updatedAt",
          t."userId",
          u."id" AS "user_id",
          u."name" AS "user_name",
          u."email" AS "user_email",
          u."createdAt" AS "user_createdAt",
          u."updatedAt" AS "user_updatedAt"
        FROM inserted t
        LEFT JOIN "User" u ON u."id" = t."userId"
      `,
      [
        createCuid(),
        parsed.data.title,
        parsed.data.description ?? null,
        parsed.data.status ?? "PENDING",
        parsed.data.priority ?? "MEDIUM",
        parsed.data.userId ?? null,
      ]
    );

    return jsonOk({ task: mapTask(task) }, 201);
  } catch (error) {
    const databaseErr = handleDatabaseError(error);
    if (databaseErr) return databaseErr;

    console.error("[POST /api/tasks]", error);
    return jsonError("Error interno del servidor", 500);
  }
}
