import { mapUser, query } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";
import { handleZodError, jsonError, jsonOk } from "@/lib/api-helpers";
import { loginSchema } from "@/lib/validations";

export async function POST(request) {
  try {
    const parsed = loginSchema.safeParse(await request.json());

    if (!parsed.success) {
      return handleZodError(parsed.error);
    }

    const [user] = await query(
      `
        SELECT "id", "name", "email", "passwordHash", "createdAt", "updatedAt"
        FROM "User"
        WHERE "email" = $1
      `,
      [parsed.data.email]
    );

    if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
      return jsonError("Credenciales invalidas", 401);
    }

    await createSession(user.id);

    return jsonOk({ user: mapUser(user) });
  } catch (error) {
    console.error("[POST /api/auth/login]", error);
    return jsonError("Error interno del servidor", 500);
  }
}
