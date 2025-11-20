-- CreateTable
CREATE TABLE "CustomNode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roadmapId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'checklist',
    "status" TEXT NOT NULL DEFAULT 'in-progress',
    "content" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomNode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomNode_userId_roadmapId_idx" ON "CustomNode"("userId", "roadmapId");

-- AddForeignKey
ALTER TABLE "CustomNode" ADD CONSTRAINT "CustomNode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserProfile"("clerkUserId") ON DELETE CASCADE ON UPDATE CASCADE;
