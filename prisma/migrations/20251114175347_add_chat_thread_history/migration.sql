-- CreateTable
CREATE TABLE "ChatThread" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roadmapId" TEXT,
    "selectedNodeId" TEXT,
    "title" TEXT NOT NULL,
    "messagePreview" TEXT,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ChatThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatThreadMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sources" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatThreadMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatThread_userId_lastMessageAt_idx" ON "ChatThread"("userId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "ChatThread_roadmapId_idx" ON "ChatThread"("roadmapId");

-- CreateIndex
CREATE INDEX "ChatThread_deletedAt_idx" ON "ChatThread"("deletedAt");

-- CreateIndex
CREATE INDEX "ChatThreadMessage_threadId_createdAt_idx" ON "ChatThreadMessage"("threadId", "createdAt");

-- AddForeignKey
ALTER TABLE "ChatThreadMessage" ADD CONSTRAINT "ChatThreadMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ChatThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
