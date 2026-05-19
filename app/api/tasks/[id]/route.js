import { mapTask, query } from "@/lib/db";
import { updateTaskSchema } from "@/lib/validations";
import { jsonOk, jsonError, handleZodError, handleDatabaseError } from "@/lib/api-helpers";

const taskWithUserSelect = `
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
`;

// GET /api/tasks/[id] - Detalle de una tarea
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const [task] = await query(`${taskWithUserSelect} WHERE t."id" = $1`, [id]);

    if (!task) {
      return jsonError("Tarea no encontrada", 404);
    }

    return jsonOk({ task: mapTask(task) });
  } catch (error) {
    console.error("[GET /api/tasks/:id]", error);
    return jsonError("Error interno del servidor", 500);
  }
}

// PUT /api/tasks/[id] - Actualizar una tarea
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateTaskSchema.safeParse(body);

    if (!parsed.success) {
      return handleZodError(parsed.error);
    }

    const [existing] = await query('SELECT "id" FROM "Task" WHERE "id" = $1', [id]);
    if (!existing) {
      return jsonError("Tarea no encontrada", 404);
    }

    if (parsed.data.userId !== undefined && parsed.data.userId !== null) {
      const [userExists] = await query('SELECT "id" FROM "User" WHERE "id" = $1', [
        parsed.data.userId,
      ]);

      if (!userExists) {
        return jsonError("El usuario asignado no existe", 400);
      }
    }

    const updates = [];
    const values = [];

    if (parsed.data.title !== undefined) {
      values.push(parsed.data.title);
      updates.push(`"title" = $${values.length}`);
    }

    if (parsed.data.description !== undefined) {
      values.push(parsed.data.description);
      updates.push(`"description" = $${values.length}`);
    }

    if (parsed.data.status !== undefined) {
      values.push(parsed.data.status);
      updates.push(`"status" = $${values.length}::"TaskStatus"`);
    }

    if (parsed.data.priority !== undefined) {
      values.push(parsed.data.priority);
      updates.push(`"priority" = $${values.length}::"TaskPriority"`);
    }

    if (parsed.data.userId !== undefined) {
      values.push(parsed.data.userId);
      updates.push(`"userId" = $${values.length}`);
    }

    if (updates.length) {
      values.push(id);
      await query(
        `
          UPDATE "Task"
          SET ${updates.join(", ")}, "updatedAt" = NOW()
          WHERE "id" = $${values.length}
        `,
        values
      );
    }

    const [task] = await query(`${taskWithUserSelect} WHERE t."id" = $1`, [id]);

    return jsonOk({ task: mapTask(task) });
  } catch (error) {
    const databaseErr = handleDatabaseError(error);
    if (databaseErr) return databaseErr;

    console.error("[PUT /api/tasks/:id]", error);
    return jsonError("Error interno del servidor", 500);
  }
}

// DELETE /api/tasks/[id] - Eliminar una tarea
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const [deleted] = await query(
      `
        DELETE FROM "Task"
        WHERE "id" = $1
        RETURNING "id"
      `,
      [id]
    );

    if (!deleted) {
      return jsonError("Tarea no encontrada", 404);
    }

    return jsonOk({ message: "Tarea eliminada correctamente" });
  } catch (error) {
    const databaseErr = handleDatabaseError(error);
    if (databaseErr) return databaseErr;

    console.error("[DELETE /api/tasks/:id]", error);
    return jsonError("Error interno del servidor", 500);
  }
}
