import { requireTeamMember, requireUser } from "@/lib/auth";
import { createCuid, mapInvitation, query } from "@/lib/db";
import { inviteTeamMemberSchema } from "@/lib/validations";
import { handleDatabaseError, handleZodError, jsonError, jsonOk } from "@/lib/api-helpers";

export async function GET(request, { params }) {
  const { response, user } = await requireUser();
  if (response) return response;

  try {
    const { id } = await params;
    const forbidden = await requireTeamMember(id, user.id);
    if (forbidden) return forbidden;

    const rows = await query(
      `
        SELECT "id", "teamId", "email", "status", "createdAt", "updatedAt"
        FROM "TeamInvitation"
        WHERE "teamId" = $1
        ORDER BY "createdAt" DESC
      `,
      [id]
    );

    return jsonOk({ invitations: rows.map(mapInvitation) });
  } catch (error) {
    console.error("[GET /api/teams/:id/invitations]", error);
    return jsonError("Error interno del servidor", 500);
  }
}

export async function POST(request, { params }) {
  const { response, user } = await requireUser();
  if (response) return response;

  try {
    const { id } = await params;
    const forbidden = await requireTeamMember(id, user.id);
    if (forbidden) return forbidden;

    const parsed = inviteTeamMemberSchema.safeParse(await request.json());

    if (!parsed.success) {
      return handleZodError(parsed.error);
    }

    const [existingMember] = await query(
      `
        SELECT tm."id"
        FROM "TeamMember" tm
        INNER JOIN "User" u ON u."id" = tm."userId"
        WHERE tm."teamId" = $1 AND lower(u."email") = lower($2)
      `,
      [id, parsed.data.email]
    );

    if (existingMember) {
      return jsonError("Ese usuario ya pertenece al equipo", 400);
    }

    const [invitation] = await query(
      `
        INSERT INTO "TeamInvitation" ("id", "teamId", "email", "status", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, 'PENDING', NOW(), NOW())
        RETURNING "id", "teamId", "email", "status", "createdAt", "updatedAt"
      `,
      [createCuid(), id, parsed.data.email]
    );

    return jsonOk({ invitation: mapInvitation(invitation) }, 201);
  } catch (error) {
    const databaseErr = handleDatabaseError(error);
    if (databaseErr) return databaseErr;

    console.error("[POST /api/teams/:id/invitations]", error);
    return jsonError("Error interno del servidor", 500);
  }
}
