import { mapTask, mapTeam, mapUser, query } from "@/lib/db";

export const taskWithRelationsSelect = `
  SELECT
    t."id",
    t."teamId",
    t."title",
    t."description",
    t."status",
    t."priority",
    t."createdAt",
    t."updatedAt",
    t."assigneeId",
    u."id" AS "assignee_id",
    u."name" AS "assignee_name",
    u."email" AS "assignee_email",
    u."createdAt" AS "assignee_createdAt",
    u."updatedAt" AS "assignee_updatedAt",
    tm."id" AS "team_id",
    tm."name" AS "team_name",
    tm."description" AS "team_description"
  FROM "Task" t
  INNER JOIN "Team" tm ON tm."id" = t."teamId"
  LEFT JOIN "User" u ON u."id" = t."assigneeId"
`;

export async function getTeamForUser(teamId, userId) {
  const [team] = await query(
    `
      SELECT
        tm."id",
        tm."name",
        tm."description",
        tm."createdAt",
        tm."updatedAt",
        COUNT(DISTINCT mb."id") AS "membersCount",
        COUNT(DISTINCT t."id") AS "tasksCount"
      FROM "Team" tm
      INNER JOIN "TeamMember" current_member
        ON current_member."teamId" = tm."id" AND current_member."userId" = $2
      LEFT JOIN "TeamMember" mb ON mb."teamId" = tm."id"
      LEFT JOIN "Task" t ON t."teamId" = tm."id"
      WHERE tm."id" = $1
      GROUP BY tm."id"
    `,
    [teamId, userId]
  );

  return mapTeam(team);
}

export async function listTeamMembers(teamId) {
  const rows = await query(
    `
      SELECT
        u."id",
        u."name",
        u."email",
        u."createdAt",
        u."updatedAt"
      FROM "TeamMember" tm
      INNER JOIN "User" u ON u."id" = tm."userId"
      WHERE tm."teamId" = $1
      ORDER BY u."name" ASC
    `,
    [teamId]
  );

  return rows.map(mapUser);
}

export async function getTaskForTeam(taskId, teamId) {
  const [task] = await query(
    `${taskWithRelationsSelect} WHERE t."id" = $1 AND t."teamId" = $2`,
    [taskId, teamId]
  );

  return mapTask(task);
}
