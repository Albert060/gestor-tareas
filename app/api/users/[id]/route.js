import { requireUser } from "@/lib/auth";
import { mapTask, mapUser, query } from "@/lib/db";
import { taskWithRelationsSelect } from "@/lib/team-queries";
import { jsonError, jsonOk } from "@/lib/api-helpers";

export async function GET(request, { params }) {
  const { response, user } = await requireUser();
  if (response) return response;

  try {
    const { id } = await params;

    const [userRow] = await query(
      `
        SELECT DISTINCT
          u."id",
          u."name",
          u."email",
          u."createdAt",
          u."updatedAt"
        FROM "TeamMember" own
        INNER JOIN "TeamMember" visible_member ON visible_member."teamId" = own."teamId"
        INNER JOIN "User" u ON u."id" = visible_member."userId"
        WHERE own."userId" = $1 AND u."id" = $2
      `,
      [user.id, id]
    );

    if (!userRow) {
      return jsonError("Usuario no encontrado", 404);
    }

    const taskRows = await query(
      `
        ${taskWithRelationsSelect}
        INNER JOIN "TeamMember" own ON own."teamId" = t."teamId" AND own."userId" = $2
        WHERE t."assigneeId" = $1
        ORDER BY t."createdAt" DESC
      `,
      [id, user.id]
    );

    return jsonOk({
      user: {
        ...mapUser(userRow),
        tasks: taskRows.map(mapTask),
      },
    });
  } catch (error) {
    console.error("[GET /api/users/:id]", error);
    return jsonError("Error interno del servidor", 500);
  }
}
