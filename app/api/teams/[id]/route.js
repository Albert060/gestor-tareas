import { requireTeamMember, requireUser } from "@/lib/auth";
import { getTeamForUser } from "@/lib/team-queries";
import { mapTeam, query } from "@/lib/db";
import { updateTeamSchema } from "@/lib/validations";
import { handleDatabaseError, handleZodError, jsonError, jsonOk } from "@/lib/api-helpers";

export async function GET(request, { params }) {
  const { response, user } = await requireUser();
  if (response) return response;

  const { id } = await params;
  const team = await getTeamForUser(id, user.id);

  if (!team) {
    return jsonError("Equipo no encontrado", 404);
  }

  return jsonOk({ team });
}

export async function PUT(request, { params }) {
  const { response, user } = await requireUser();
  if (response) return response;

  try {
    const { id } = await params;
    const forbidden = await requireTeamMember(id, user.id);
    if (forbidden) return forbidden;

    const parsed = updateTeamSchema.safeParse(await request.json());

    if (!parsed.success) {
      return handleZodError(parsed.error);
    }

    const updates = [];
    const values = [];

    if (parsed.data.name !== undefined) {
      values.push(parsed.data.name);
      updates.push(`"name" = $${values.length}`);
    }

    if (parsed.data.description !== undefined) {
      values.push(parsed.data.description);
      updates.push(`"description" = $${values.length}`);
    }

    if (!updates.length) {
      return jsonOk({ team: await getTeamForUser(id, user.id) });
    }

    values.push(id);
    const [team] = await query(
      `
        UPDATE "Team"
        SET ${updates.join(", ")}, "updatedAt" = NOW()
        WHERE "id" = $${values.length}
        RETURNING "id", "name", "description", "createdAt", "updatedAt"
      `,
      values
    );

    return jsonOk({ team: mapTeam(team) });
  } catch (error) {
    const databaseErr = handleDatabaseError(error);
    if (databaseErr) return databaseErr;

    console.error("[PUT /api/teams/:id]", error);
    return jsonError("Error interno del servidor", 500);
  }
}

export async function DELETE(request, { params }) {
  const { response, user } = await requireUser();
  if (response) return response;

  try {
    const { id } = await params;
    const forbidden = await requireTeamMember(id, user.id);
    if (forbidden) return forbidden;

    const [deleted] = await query(
      `
        DELETE FROM "Team"
        WHERE "id" = $1
        RETURNING "id"
      `,
      [id]
    );

    if (!deleted) {
      return jsonError("Equipo no encontrado", 404);
    }

    return jsonOk({ message: "Equipo eliminado correctamente" });
  } catch (error) {
    const databaseErr = handleDatabaseError(error);
    if (databaseErr) return databaseErr;

    console.error("[DELETE /api/teams/:id]", error);
    return jsonError("Error interno del servidor", 500);
  }
}
