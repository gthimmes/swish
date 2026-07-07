-- CreateTable
CREATE TABLE "Cycle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Cycle_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_WorkItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'STORY',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "estimate" INTEGER,
    "rank" REAL NOT NULL DEFAULT 1000,
    "description" TEXT,
    "startDate" DATETIME,
    "dueDate" DATETIME,
    "projectId" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "assigneeId" TEXT,
    "epicId" TEXT,
    "cycleId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkItem_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "Stage" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WorkItem_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WorkItem_epicId_fkey" FOREIGN KEY ("epicId") REFERENCES "WorkItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WorkItem_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "Cycle" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_WorkItem" ("assigneeId", "createdAt", "description", "dueDate", "epicId", "estimate", "id", "key", "priority", "projectId", "rank", "stageId", "startDate", "title", "type", "updatedAt") SELECT "assigneeId", "createdAt", "description", "dueDate", "epicId", "estimate", "id", "key", "priority", "projectId", "rank", "stageId", "startDate", "title", "type", "updatedAt" FROM "WorkItem";
DROP TABLE "WorkItem";
ALTER TABLE "new_WorkItem" RENAME TO "WorkItem";
CREATE UNIQUE INDEX "WorkItem_key_key" ON "WorkItem"("key");
CREATE INDEX "WorkItem_projectId_idx" ON "WorkItem"("projectId");
CREATE INDEX "WorkItem_stageId_idx" ON "WorkItem"("stageId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Cycle_projectId_idx" ON "Cycle"("projectId");
