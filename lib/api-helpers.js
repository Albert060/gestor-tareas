import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function jsonOk(data, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(message, status, details) {
  return NextResponse.json(
    { error: message, ...(details && { details }) },
    { status }
  );
}

export function handleZodError(error) {
  const issues = error.issues ?? error.errors ?? [];

  return jsonError("Error de validacion", 400, {
    fields: issues.map((e) => ({
      field: e.path.join("."),
      message: e.message,
    })),
  });
}

export function handleDatabaseError(error) {
  switch (error?.code) {
    case "23505":
      return jsonError("Ya existe un registro con ese email", 400);
    case "23503":
      return jsonError("El usuario asignado no existe", 400);
    case "23514":
    case "22P02":
      return jsonError("Se incumplio una restriccion de la base de datos", 400);
    default:
      return null;
  }
}

export async function safeHandler(fn) {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ZodError) {
      return handleZodError(error);
    }

    const databaseResponse = handleDatabaseError(error);
    if (databaseResponse) return databaseResponse;

    console.error("[API Error]", error);
    return jsonError("Error interno del servidor", 500);
  }
}
