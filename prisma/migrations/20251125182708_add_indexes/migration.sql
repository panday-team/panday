-- CreateIndex
CREATE INDEX "ChatSession_userId_endedAt_idx" ON "ChatSession"("userId", "endedAt");

-- CreateIndex
CREATE INDEX "ChatThread_userId_deletedAt_idx" ON "ChatThread"("userId", "deletedAt");
