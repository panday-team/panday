-- CreateTable
CREATE TABLE "NodeProgress" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "roadmapId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NodeProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NodeProgress_userId_roadmapId_idx" ON "NodeProgress"("userId", "roadmapId");

-- CreateIndex
CREATE UNIQUE INDEX "NodeProgress_userId_roadmapId_nodeId_key" ON "NodeProgress"("userId", "roadmapId", "nodeId");

-- AddForeignKey
ALTER TABLE "NodeProgress" ADD CONSTRAINT "NodeProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserProfile"("clerkUserId") ON DELETE CASCADE ON UPDATE CASCADE;
