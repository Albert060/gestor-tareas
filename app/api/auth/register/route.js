import { createCuid, mapUser, query } from "@/lib/db";
import { registerSchema } from "@/lib/validations";
import { createSession, hashPassword } from "@/lib/auth";
import { handleDatabaseError, handleZodError, jsonError, jsonOk } from "@/lib/api-helpers";

export async function POST(request) {
  try {
    const parsed = registerSchema.safeParse(await request.json());

    if (!parsed.success) {
      return handleZodError(parsed.error);
    }

    const [user] = await query(
      `
        INSERT INTO "User" ("id", "name", "email", "passwordHash", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING "id", "name", "email", "createdAt", "updatedAt"
      `,
      [
        createCuid(),
        parsed.data.name,
        parsed.data.email,
        hashPassword(parsed.data.password),
      ]
    );

    await createSession(user.id);

    return jsonOk({ user: mapUser(user) }, 201);
  } catch (error) {
    const databaseErr = handleDatabaseError(error);
    if (databaseErr) return databaseErr;

    console.error("[POST /api/auth/register]", error);
    return jsonError("Error interno del servidor", 500);
  }
}
