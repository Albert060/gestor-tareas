import { z } from "zod";

export const taskStatusSchema = z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]);
export const taskPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH"]);

export const createTaskSchema = z.object({
  title: z
    .string({ required_error: "El título es obligatorio" })
    .min(1, "El título no puede estar vacío")
    .max(200, "El título no puede tener más de 200 caracteres"),
  description: z
    .string()
    .max(1000, "La descripción no puede tener más de 1000 caracteres")
    .optional()
    .nullable(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  userId: z.string().cuid("El ID de usuario no es válido").nullable().optional(),
});

export const updateTaskSchema = createTaskSchema.partial();

export const createUserSchema = z.object({
  name: z
    .string({ required_error: "El nombre es obligatorio" })
    .min(1, "El nombre no puede estar vacío")
    .max(100, "El nombre no puede tener más de 100 caracteres"),
  email: z
    .string({ required_error: "El email es obligatorio" })
    .email("El formato del email no es válido"),
});

export const updateUserSchema = createUserSchema.partial();
