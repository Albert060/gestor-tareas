import { requireTeamMember, requireUser } from "@/lib/auth";
import { mapTask, query } from "@/lib/db";
import { updateTaskSchema } from "@/lib/validations";
import { getTaskForTeam, taskWithRelationsSelect } from "@/lib/team-queries";
import { handleDatabaseError, handleZodError, jsonError, jsonOk } from "@/lib/api-helpers";

async function getTaskScope(taskId, userId) {
  const [task] = await query(
    `
      SELECT t."id", t."teamId"
      FROM "Task" t
      INNER JOIN "TeamMember" tm ON tm."teamId" = t."teamId" AND tm."userId" = $2
      WHERE t."id" = $1
    `,
    [taskId, userId]
  );

  return task;
}

export async function GET(request, { params }) {
  const { response, user } = await requireUser();
  if (response) return response;

  try {
    const { id } = await params;
    const scope = await getTaskScope(id, user.id);

    if (!scope) {
      return jsonError("Tarea no encontrada", 404);
    }

    const task = await getTaskForTeam(id, scope.teamId);

    return jsonOk({ task });
  } catch (error) {
    console.error("[GET /api/tasks/:id]", error);
    return jsonError("Error interno del servidor", 500);
  }
}

export async function PUT(request, { params }) {
  const { response, user } = await requireUser();
  if (response) return response;

  try {
    const { id } = await params;
    const scope = await getTaskScope(id, user.id);

    if (!scope) {
      return jsonError("Tarea no encontrada", 404);
    }

    const parsed = updateTaskSchema.safeParse(await request.json());

    if (!parsed.success) {
      return handleZodError(parsed.error);
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

    if (parsed.data.autoAssign) {
      values.push(user.id);
      updates.push(`"assigneeId" = $${values.length}`);
    } else if (parsed.data.assigneeId !== undefined) {
      if (parsed.data.assigneeId !== null) {
        const forbidden = await requireTeamMember(scope.teamId, parsed.data.assigneeId);
        if (forbidden) {
          return jsonError("El responsable debe pertenecer al equipo", 400);
        }
      }

      values.push(parsed.data.assigneeId);
      updates.push(`"assigneeId" = $${values.length}`);
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

    const [task] = await query(`${taskWithRelationsSelect} WHERE t."id" = $1`, [id]);

    return jsonOk({ task: mapTask(task) });
  } catch (error) {
    const databaseErr = handleDatabaseError(error);
    if (databaseErr) return databaseErr;

    console.error("[PUT /api/tasks/:id]", error);
    return jsonError("Error interno del servidor", 500);
  }
}

export async function DELETE(request, { params }) {
  const { response, user } = await requireUser();
  if (response) return response;

  try {
    const { id } = await params;
    const scope = await getTaskScope(id, user.id);

    if (!scope) {
      return jsonError("Tarea no encontrada", 404);
    }

    await query('DELETE FROM "Task" WHERE "id" = $1', [id]);

    return jsonOk({ message: "Tarea eliminada correctamente" });
  } catch (error) {
    const databaseErr = handleDatabaseError(error);
    if (databaseErr) return databaseErr;

    console.error("[DELETE /api/tasks/:id]", error);
    return jsonError("Error interno del servidor", 500);
  }
}
