import { requireUser } from "@/lib/auth";
import { mapUser, query } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api-helpers";

export async function GET() {
  const { response, user } = await requireUser();
  if (response) return response;

  try {
    const rows = await query(
      `
        SELECT DISTINCT
          u."id",
          u."name",
          u."email",
          u."createdAt",
          u."updatedAt",
          COUNT(DISTINCT t."id") AS "tasksCount",
          COUNT(DISTINCT tm."teamId") AS "teamsCount"
        FROM "TeamMember" own
        INNER JOIN "TeamMember" tm ON tm."teamId" = own."teamId"
        INNER JOIN "User" u ON u."id" = tm."userId"
        LEFT JOIN "Task" t ON t."assigneeId" = u."id" AND t."teamId" = tm."teamId"
        WHERE own."userId" = $1
        GROUP BY u."id"
        ORDER BY u."name" ASC
      `,
      [user.id]
    );

    return jsonOk({ users: rows.map(mapUser) });
  } catch (error) {
    console.error("[GET /api/users]", error);
    return jsonError("Error interno del servidor", 500);
  }
}
