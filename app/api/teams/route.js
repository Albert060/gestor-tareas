import { requireUser } from "@/lib/auth";
import { createCuid, mapTeam, query } from "@/lib/db";
import { createTeamSchema } from "@/lib/validations";
import { handleDatabaseError, handleZodError, jsonError, jsonOk } from "@/lib/api-helpers";

export async function GET() {
  const { response, user } = await requireUser();
  if (response) return response;

  try {
    const rows = await query(
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
    );

    return jsonOk({ teams: rows.map(mapTeam) });
  } catch (error) {
    console.error("[GET /api/teams]", error);
    return jsonError("Error interno del servidor", 500);
  }
}

export async function POST(request) {
  const { response, user } = await requireUser();
  if (response) return response;

  try {
    const parsed = createTeamSchema.safeParse(await request.json());

    if (!parsed.success) {
      return handleZodError(parsed.error);
    }

    const teamId = createCuid();
    const memberId = createCuid();

    const [team] = await query(
      `
        WITH inserted_team AS (
          INSERT INTO "Team" ("id", "name", "description", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, NOW(), NOW())
          RETURNING *
        ),
        inserted_member AS (
          INSERT INTO "TeamMember" ("id", "teamId", "userId", "createdAt")
          VALUES ($4, $1, $5, NOW())
          RETURNING "id"
        )
        SELECT
          inserted_team."id",
          inserted_team."name",
          inserted_team."description",
          inserted_team."createdAt",
          inserted_team."updatedAt",
          1 AS "membersCount",
          0 AS "tasksCount"
        FROM inserted_team
      `,
      [teamId, parsed.data.name, parsed.data.description ?? null, memberId, user.id]
    );

    return jsonOk({ team: mapTeam(team) }, 201);
  } catch (error) {
    const databaseErr = handleDatabaseError(error);
    if (databaseErr) return databaseErr;

    console.error("[POST /api/teams]", error);
    return jsonError("Error interno del servidor", 500);
  }
}
