import { neon } from "@neondatabase/serverless";

let cuidCounter = 0;

function createCuid() {
  const timestamp = Date.now().toString(36);
  const counter = (cuidCounter++ % 46656).toString(36).padStart(3, "0");
  const random = Array.from(crypto.getRandomValues(new Uint8Array(12)))
    .map((byte) => (byte % 36).toString(36))
    .join("");

  return `c${timestamp}${counter}${random}`.slice(0, 25);
}

const sql = neon(process.env.DATABASE_URL);

async function main() {
  console.log("Seeding database...");

  const users = [
    { id: createCuid(), name: "Alice Garcia", email: "alice@example.com" },
    { id: createCuid(), name: "Bob Lopez", email: "bob@example.com" },
    { id: createCuid(), name: "Charlie Martin", email: "charlie@example.com" },
  ];

  await sql.transaction(
    users.map((user) => sql`
      INSERT INTO "User" ("id", "name", "email", "createdAt", "updatedAt")
      VALUES (${user.id}, ${user.name}, ${user.email}, NOW(), NOW())
      ON CONFLICT ("email") DO UPDATE
      SET "name" = EXCLUDED."name", "updatedAt" = NOW()
    `)
  );

  const tasks = [
    {
      title: "Disenar landing page",
      description: "Crear el diseno de la pagina principal con Figma",
      status: "COMPLETED",
      priority: "HIGH",
      userId: users[0].id,
    },
    {
      title: "Implementar autenticacion",
      description: "Configurar login con OAuth2 y JWT",
      status: "IN_PROGRESS",
      priority: "HIGH",
      userId: users[1].id,
    },
    {
      title: "Escribir tests de integracion",
      description: "Cubrir las rutas de la API con tests automatizados",
      status: "PENDING",
      priority: "MEDIUM",
      userId: users[1].id,
    },
    {
      title: "Actualizar dependencias",
      description: "Revisar y actualizar paquetes npm a sus ultimas versiones",
      status: "PENDING",
      priority: "LOW",
      userId: users[2].id,
    },
    {
      title: "Configurar CI/CD",
      description: "Pipeline de GitHub Actions para build + test + deploy",
      status: "IN_PROGRESS",
      priority: "MEDIUM",
      userId: users[2].id,
    },
    {
      title: "Documentar API REST",
      description: null,
      status: "PENDING",
      priority: "MEDIUM",
      userId: null,
    },
  ];

  await sql.transaction(
    tasks.map((task) => sql`
      INSERT INTO "Task" (
        "id",
        "title",
        "description",
        "status",
        "priority",
        "userId",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${createCuid()},
        ${task.title},
        ${task.description},
        ${task.status}::"TaskStatus",
        ${task.priority}::"TaskPriority",
        ${task.userId},
        NOW(),
        NOW()
      )
    `)
  );

  console.log(`Seed complete: ${users.length} users, ${tasks.length} tasks.`);
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
