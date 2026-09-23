-- CreateTable
CREATE TABLE "BusinessTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "rawDraft" TEXT NOT NULL,
    "context" TEXT,
    "dataMaterials" TEXT,
    "expectedResult" TEXT,
    "successCriteria" TEXT,
    "constraints" TEXT,
    "users" TEXT,
    "contact" TEXT,
    "score" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "teamName" TEXT NOT NULL,
    "idea" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "deadline" TEXT,
    "link" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Proposal_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "BusinessTask" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
