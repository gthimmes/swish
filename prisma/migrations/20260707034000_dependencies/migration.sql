-- CreateTable
CREATE TABLE "Dependency" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    CONSTRAINT "Dependency_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "WorkItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Dependency_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "WorkItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Dependency_blockerId_idx" ON "Dependency"("blockerId");

-- CreateIndex
CREATE INDEX "Dependency_blockedId_idx" ON "Dependency"("blockedId");

-- CreateIndex
CREATE UNIQUE INDEX "Dependency_blockerId_blockedId_key" ON "Dependency"("blockerId", "blockedId");
