import { neon } from "@neondatabase/serverless";
import { randomBytes, scryptSync } from "crypto";

let cuidCounter = 0;

function createCuid() {
  const timestamp = Date.now().toString(36);
  const counter = (cuidCounter++ % 46656).toString(36).padStart(3, "0");
  const random = Array.from(crypto.getRandomValues(new Uint8Array(12)))
    .map((byte) => (byte % 36).toString(36))
    .join("");

  return `c${timestamp}${counter}${random}`.slice(0, 25);
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const key = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${key}`;
}

const sql = neon(process.env.DATABASE_URL);

async function main() {
  console.log("Seeding database...");

  const passwordHash = hashPassword("password123");
  const users = [
    { id: createCuid(), name: "Alice Garcia", email: "alice@example.com" },
    { id: createCuid(), name: "Bob Lopez", email: "bob@example.com" },
    { id: createCuid(), name: "Charlie Martin", email: "charlie@example.com" },
  ];

  await sql.transaction(
    users.map((user) => sql`
      INSERT INTO "User" ("id", "name", "email", "passwordHash", "createdAt", "updatedAt")
      VALUES (${user.id}, ${user.name}, ${user.email}, ${passwordHash}, NOW(), NOW())
      ON CONFLICT ("email") DO UPDATE
      SET "name" = EXCLUDED."name",
          "passwordHash" = EXCLUDED."passwordHash",
          "updatedAt" = NOW()
    `)
  );

  const productTeam = { id: createCuid(), name: "Producto", description: "Roadmap y entrega" };
  const opsTeam = { id: createCuid(), name: "Operaciones", description: "Calidad y despliegue" };
  const teams = [productTeam, opsTeam];

  await sql.transaction(
    teams.map((team) => sql`
      INSERT INTO "Team" ("id", "name", "description", "createdAt", "updatedAt")
      VALUES (${team.id}, ${team.name}, ${team.description}, NOW(), NOW())
    `)
  );

  const memberships = [
    { teamId: productTeam.id, userId: users[0].id },
    { teamId: productTeam.id, userId: users[1].id },
    { teamId: opsTeam.id, userId: users[1].id },
    { teamId: opsTeam.id, userId: users[2].id },
  ];

  await sql.transaction(
    memberships.map((membership) => sql`
      INSERT INTO "TeamMember" ("id", "teamId", "userId", "createdAt")
      VALUES (${createCuid()}, ${membership.teamId}, ${membership.userId}, NOW())
      ON CONFLICT ("teamId", "userId") DO NOTHING
    `)
  );

  const tasks = [
    {
      teamId: productTeam.id,
      title: "Disenar landing page",
      description: "Crear el diseno de la pagina principal con Figma",
      status: "COMPLETED",
      priority: "HIGH",
      assigneeId: users[0].id,
    },
    {
      teamId: productTeam.id,
      title: "Preparar demo de tablero",
      description: "Validar filtros por equipo y responsable",
      status: "IN_PROGRESS",
      priority: "HIGH",
      assigneeId: users[1].id,
    },
    {
      teamId: productTeam.id,
      title: "Documentar API REST",
      description: null,
      status: "PENDING",
      priority: "MEDIUM",
      assigneeId: null,
    },
    {
      teamId: opsTeam.id,
      title: "Escribir tests de integracion",
      description: "Cubrir rutas principales de API",
      status: "PENDING",
      priority: "MEDIUM",
      assigneeId: users[1].id,
    },
    {
      teamId: opsTeam.id,
      title: "Configurar CI/CD",
      description: "Pipeline para lint y build",
      status: "IN_PROGRESS",
      priority: "MEDIUM",
      assigneeId: users[2].id,
    },
  ];

  await sql.transaction(
    tasks.map((task) => sql`
      INSERT INTO "Task" (
        "id",
        "teamId",
        "title",
        "description",
        "status",
        "priority",
        "assigneeId",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${createCuid()},
        ${task.teamId},
        ${task.title},
        ${task.description},
        ${task.status}::"TaskStatus",
        ${task.priority}::"TaskPriority",
        ${task.assigneeId},
        NOW(),
        NOW()
      )
    `)
  );

  await sql`
    INSERT INTO "TeamInvitation" ("id", "teamId", "email", "status", "createdAt", "updatedAt")
    VALUES (${createCuid()}, ${productTeam.id}, ${users[2].email}, 'PENDING', NOW(), NOW())
    ON CONFLICT DO NOTHING
  `;

  console.log(`Seed complete: ${users.length} users, ${teams.length} teams, ${tasks.length} tasks.`);
  console.log("Demo password for all users: password123");
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
