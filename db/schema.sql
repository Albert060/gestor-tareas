CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TeamInvitation" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeamInvitation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigneeId" TEXT,
    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE UNIQUE INDEX "TeamMember_teamId_userId_key" ON "TeamMember"("teamId", "userId");
CREATE UNIQUE INDEX "TeamInvitation_teamId_email_pending_key"
ON "TeamInvitation"("teamId", lower("email"))
WHERE "status" = 'PENDING';

ALTER TABLE "Session"
ADD CONSTRAINT "Session_userId_fkey"
FOREIGN KEY ("userId")
REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "TeamMember"
ADD CONSTRAINT "TeamMember_teamId_fkey"
FOREIGN KEY ("teamId")
REFERENCES "Team"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "TeamMember"
ADD CONSTRAINT "TeamMember_userId_fkey"
FOREIGN KEY ("userId")
REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "TeamInvitation"
ADD CONSTRAINT "TeamInvitation_teamId_fkey"
FOREIGN KEY ("teamId")
REFERENCES "Team"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "Task"
ADD CONSTRAINT "Task_teamId_fkey"
FOREIGN KEY ("teamId")
REFERENCES "Team"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "Task"
ADD CONSTRAINT "Task_assigneeId_fkey"
FOREIGN KEY ("assigneeId")
REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
