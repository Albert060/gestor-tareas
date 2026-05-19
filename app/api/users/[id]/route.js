import { mapUser, query } from "@/lib/db";
import { jsonOk, jsonError, handleDatabaseError } from "@/lib/api-helpers";

// GET /api/users/[id] - Detalle de un usuario con sus tareas
export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const [userRow] = await query(
      `
        SELECT "id", "name", "email", "createdAt", "updatedAt"
        FROM "User"
        WHERE "id" = $1
      `,
      [id]
    );

    if (!userRow) {
      return jsonError("Usuario no encontrado", 404);
    }

    const taskRows = await query(
      `
        SELECT "id", "title", "status", "priority", "createdAt"
        FROM "Task"
        WHERE "userId" = $1
        ORDER BY "createdAt" DESC
      `,
      [id]
    );

    return jsonOk({
      user: {
        ...mapUser(userRow),
        tasks: taskRows,
      },
    });
  } catch (error) {
    console.error("[GET /api/users/:id]", error);
    return jsonError("Error interno del servidor", 500);
  }
}

// DELETE /api/users/[id] - Eliminar un usuario
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const [deleted] = await query(
      `
        DELETE FROM "User"
        WHERE "id" = $1
        RETURNING "id"
      `,
      [id]
    );

    if (!deleted) {
      return jsonError("Usuario no encontrado", 404);
    }

    return jsonOk({ message: "Usuario eliminado correctamente" });
  } catch (error) {
    const databaseErr = handleDatabaseError(error);
    if (databaseErr) return databaseErr;

    console.error("[DELETE /api/users/:id]", error);
    return jsonError("Error interno del servidor", 500);
  }
}
