import { z } from "zod";

export const taskStatusSchema = z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]);
export const taskPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH"]);
export const invitationStatusSchema = z.enum(["PENDING", "ACCEPTED", "DECLINED"]);

export const idSchema = z.string().min(1, "El identificador no es valido");

export const emailSchema = z
  .string({ required_error: "El email es obligatorio" })
  .trim()
  .toLowerCase()
  .email("El formato del email no es valido");

export const createTaskSchema = z.object({
  teamId: idSchema,
  title: z
    .string({ required_error: "El titulo es obligatorio" })
    .trim()
    .min(1, "El titulo no puede estar vacio")
    .max(200, "El titulo no puede tener mas de 200 caracteres"),
  description: z
    .string()
    .trim()
    .max(1000, "La descripcion no puede tener mas de 1000 caracteres")
    .optional()
    .nullable(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  assigneeId: idSchema.nullable().optional(),
  autoAssign: z.boolean().optional(),
});

export const updateTaskSchema = createTaskSchema.omit({ teamId: true }).partial();

export const createUserSchema = z.object({
  name: z
    .string({ required_error: "El nombre es obligatorio" })
    .trim()
    .min(1, "El nombre no puede estar vacio")
    .max(100, "El nombre no puede tener mas de 100 caracteres"),
  email: emailSchema,
});

export const updateUserSchema = createUserSchema.partial();

export const registerSchema = createUserSchema.extend({
  password: z
    .string({ required_error: "La contrasena es obligatoria" })
    .min(8, "La contrasena debe tener al menos 8 caracteres")
    .max(128, "La contrasena no puede tener mas de 128 caracteres"),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string({ required_error: "La contrasena es obligatoria" }).min(1),
});

export const createTeamSchema = z.object({
  name: z
    .string({ required_error: "El nombre del equipo es obligatorio" })
    .trim()
    .min(1, "El nombre del equipo no puede estar vacio")
    .max(120, "El nombre del equipo no puede tener mas de 120 caracteres"),
  description: z
    .string()
    .trim()
    .max(500, "La descripcion no puede tener mas de 500 caracteres")
    .optional()
    .nullable(),
});

export const updateTeamSchema = createTeamSchema.partial();

export const inviteTeamMemberSchema = z.object({
  email: emailSchema,
});
