-- CreateTable
CREATE TABLE "conversation_threads" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roadmapId" TEXT NOT NULL,
    "currentTopic" TEXT,
    "topicDepth" TEXT NOT NULL DEFAULT 'beginner',
    "questionCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_messages" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "topics" JSONB,
    "intent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_knowledge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "understoodTopics" JSONB,
    "strugglingTopics" JSONB,
    "preferredStyle" TEXT NOT NULL DEFAULT 'step_by_step',
    "expertiseLevel" TEXT NOT NULL DEFAULT 'apprentice',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_knowledge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_projects" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectType" TEXT NOT NULL DEFAULT 'residential',
    "buildingType" TEXT,
    "codeJurisdiction" TEXT NOT NULL DEFAULT 'NEC',
    "pastTopics" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_projects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "conversation_threads_userId_idx" ON "conversation_threads"("userId");

-- CreateIndex
CREATE INDEX "conversation_threads_isActive_idx" ON "conversation_threads"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_threads_userId_roadmapId_key" ON "conversation_threads"("userId", "roadmapId");

-- CreateIndex
CREATE INDEX "conversation_messages_threadId_idx" ON "conversation_messages"("threadId");

-- CreateIndex
CREATE INDEX "conversation_messages_createdAt_idx" ON "conversation_messages"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_knowledge_userId_key" ON "user_knowledge"("userId");

-- CreateIndex
CREATE INDEX "user_knowledge_userId_idx" ON "user_knowledge"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_projects_userId_key" ON "user_projects"("userId");

-- CreateIndex
CREATE INDEX "user_projects_userId_idx" ON "user_projects"("userId");

-- AddForeignKey
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "conversation_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
