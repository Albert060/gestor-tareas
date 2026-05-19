import { getCurrentUser } from "@/lib/auth";
import { mapInvitation, mapTeam, query } from "@/lib/db";
import { jsonOk } from "@/lib/api-helpers";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return jsonOk({ user: null, teams: [], invitations: [] });
  }

  const [teams, invitations] = await Promise.all([
    query(
      `
        SELECT
          tm."id",
          tm."name",
          tm."description",
          tm."createdAt",
          tm."updatedAt",
          COUNT(DISTINCT mb."id") AS "membersCount",
          COUNT(DISTINCT t."id") AS "tasksCount"
        FROM "TeamMember" own
        INNER JOIN "Team" tm ON tm."id" = own."teamId"
        LEFT JOIN "TeamMember" mb ON mb."teamId" = tm."id"
        LEFT JOIN "Task" t ON t."teamId" = tm."id"
        WHERE own."userId" = $1
        GROUP BY tm."id"
        ORDER BY tm."name" ASC
      `,
      [user.id]
    ),
    query(
      `
        SELECT
          i."id",
          i."teamId",
          i."email",
          i."status",
          i."createdAt",
          i."updatedAt",
          tm."id" AS "team_id",
          tm."name" AS "team_name",
          tm."description" AS "team_description"
        FROM "TeamInvitation" i
        INNER JOIN "Team" tm ON tm."id" = i."teamId"
        WHERE lower(i."email") = lower($1)
          AND i."status" = 'PENDING'
        ORDER BY i."createdAt" DESC
      `,
      [user.email]
    ),
  ]);

  return jsonOk({
    user,
    teams: teams.map(mapTeam),
    invitations: invitations.map(mapInvitation),
  });
}
