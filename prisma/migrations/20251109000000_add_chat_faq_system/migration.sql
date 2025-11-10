-- CreateTable
CREATE TABLE "ChatSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roadmapId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "ChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FAQCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "roadmapId" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FAQCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QAPair" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "messageIds" TEXT[],
    "categoryId" TEXT,
    "clusterId" TEXT,
    "embedding" JSONB,
    "frequency" INTEGER NOT NULL DEFAULT 1,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QAPair_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FAQEntry" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "variations" TEXT[],
    "sourceQAPairIds" TEXT[],
    "frequency" INTEGER NOT NULL DEFAULT 1,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FAQEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatSession_userId_startedAt_idx" ON "ChatSession"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "ChatSession_endedAt_idx" ON "ChatSession"("endedAt");

-- CreateIndex
CREATE INDEX "ChatMessage_sessionId_createdAt_idx" ON "ChatMessage"("sessionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FAQCategory_name_key" ON "FAQCategory"("name");

-- CreateIndex
CREATE INDEX "FAQCategory_roadmapId_idx" ON "FAQCategory"("roadmapId");

-- CreateIndex
CREATE INDEX "FAQCategory_displayOrder_idx" ON "FAQCategory"("displayOrder");

-- CreateIndex
CREATE INDEX "QAPair_sessionId_idx" ON "QAPair"("sessionId");

-- CreateIndex
CREATE INDEX "QAPair_categoryId_idx" ON "QAPair"("categoryId");

-- CreateIndex
CREATE INDEX "QAPair_clusterId_idx" ON "QAPair"("clusterId");

-- CreateIndex
CREATE INDEX "FAQEntry_categoryId_idx" ON "FAQEntry"("categoryId");

-- CreateIndex
CREATE INDEX "FAQEntry_isGlobal_idx" ON "FAQEntry"("isGlobal");

-- CreateIndex
CREATE INDEX "FAQEntry_displayOrder_idx" ON "FAQEntry"("displayOrder");

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QAPair" ADD CONSTRAINT "QAPair_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QAPair" ADD CONSTRAINT "QAPair_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FAQCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FAQEntry" ADD CONSTRAINT "FAQEntry_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FAQCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

