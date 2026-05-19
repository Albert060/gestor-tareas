import { requireUser } from "@/lib/auth";
import { createCuid, query } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api-helpers";

export async function POST(request, { params }) {
  const { response, user } = await requireUser();
  if (response) return response;

  try {
    const { id } = await params;
    const [invitation] = await query(
      `
        SELECT "id", "teamId", "email", "status"
        FROM "TeamInvitation"
        WHERE "id" = $1
          AND lower("email") = lower($2)
          AND "status" = 'PENDING'
      `,
      [id, user.email]
    );

    if (!invitation) {
      return jsonError("Invitacion no encontrada", 404);
    }

    await query(
      `
        WITH accepted_invitation AS (
          UPDATE "TeamInvitation"
          SET "status" = 'ACCEPTED', "updatedAt" = NOW()
          WHERE "id" = $1
            AND "status" = 'PENDING'
          RETURNING "teamId"
        )
        INSERT INTO "TeamMember" ("id", "teamId", "userId", "createdAt")
        SELECT $2, "teamId", $3, NOW()
        FROM accepted_invitation
        ON CONFLICT ("teamId", "userId") DO NOTHING
      `,
      [id, createCuid(), user.id]
    );

    return jsonOk({ message: "Invitacion aceptada correctamente" });
  } catch (error) {
    console.error("[POST /api/invitations/:id/accept]", error);
    return jsonError("Error interno del servidor", 500);
  }
}
