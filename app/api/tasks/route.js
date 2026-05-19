import { requireTeamMember, requireUser } from "@/lib/auth";
import { createCuid, mapTask, query } from "@/lib/db";
import {
  createTaskSchema,
  taskPrioritySchema,
  taskStatusSchema,
} from "@/lib/validations";
import { taskWithRelationsSelect } from "@/lib/team-queries";
import { handleDatabaseError, handleZodError, jsonError, jsonOk } from "@/lib/api-helpers";

async function resolveAssignee({ assigneeId, autoAssign, teamId, userId }) {
  if (autoAssign) {
    return userId;
  }

  if (!assigneeId) {
    return null;
  }

  const [member] = await query(
    `
      SELECT "id"
      FROM "TeamMember"
      WHERE "teamId" = $1 AND "userId" = $2
    `,
    [teamId, assigneeId]
  );

  if (!member) {
    return false;
  }

  return assigneeId;
}

export async function GET(request) {
  const { response, user } = await requireUser();
  if (response) return response;

  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const assigneeId = searchParams.get("assigneeId");
    const search = searchParams.get("q")?.trim();

    if (!teamId) {
      return jsonError("El equipo es obligatorio", 400);
    }

    const forbidden = await requireTeamMember(teamId, user.id);
    if (forbidden) return forbidden;

    const conditions = ['t."teamId" = $1'];
    const params = [teamId];

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

    if (assigneeId) {
      params.push(assigneeId);
      conditions.push(`t."assigneeId" = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(
        `(t."title" ILIKE $${params.length} OR COALESCE(t."description", '') ILIKE $${params.length})`
      );
    }

    const rows = await query(
      `
        ${taskWithRelationsSelect}
        WHERE ${conditions.join(" AND ")}
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

export async function POST(request) {
  const { response, user } = await requireUser();
  if (response) return response;

  try {
    const parsed = createTaskSchema.safeParse(await request.json());

    if (!parsed.success) {
      return handleZodError(parsed.error);
    }

    const forbidden = await requireTeamMember(parsed.data.teamId, user.id);
    if (forbidden) return forbidden;

    const assigneeId = await resolveAssignee({
      assigneeId: parsed.data.assigneeId,
      autoAssign: parsed.data.autoAssign,
      teamId: parsed.data.teamId,
      userId: user.id,
    });

    if (assigneeId === false) {
      return jsonError("El responsable debe pertenecer al equipo", 400);
    }

    const [task] = await query(
      `
        WITH inserted AS (
          INSERT INTO "Task" (
            "id",
            "teamId",
            "title",
            "description",
            "status",
            "priority",
            "assigneeId",
            "createdAt",
            "updatedAt"
          )
          VALUES ($1, $2, $3, $4, $5::"TaskStatus", $6::"TaskPriority", $7, NOW(), NOW())
          RETURNING *
        )
        ${taskWithRelationsSelect.replace('FROM "Task" t', 'FROM inserted t')}
      `,
      [
        createCuid(),
        parsed.data.teamId,
        parsed.data.title,
        parsed.data.description ?? null,
        parsed.data.status ?? "PENDING",
        parsed.data.priority ?? "MEDIUM",
        assigneeId,
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
