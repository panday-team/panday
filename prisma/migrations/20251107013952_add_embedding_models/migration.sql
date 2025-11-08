-- CreateTable
CREATE TABLE "embedding_documents" (
    "id" TEXT NOT NULL,
    "roadmapId" TEXT NOT NULL,
    "nodeId" TEXT,
    "userId" TEXT,
    "content" TEXT NOT NULL,
    "embedding" vector(1536) NOT NULL,
    "metadata" JSONB,
    "hash" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "indexId" TEXT NOT NULL,

    CONSTRAINT "embedding_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "embedding_indexes" (
    "id" TEXT NOT NULL,
    "roadmapId" TEXT NOT NULL,
    "userId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "modelName" TEXT NOT NULL DEFAULT 'text-embedding-3-small',
    "dimensions" INTEGER NOT NULL DEFAULT 1536,
    "documentCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "embedding_indexes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "embedding_documents_roadmapId_userId_idx" ON "embedding_documents"("roadmapId", "userId");

-- CreateIndex
CREATE INDEX "embedding_documents_nodeId_idx" ON "embedding_documents"("nodeId");

-- CreateIndex
CREATE INDEX "embedding_documents_indexId_idx" ON "embedding_documents"("indexId");

-- CreateIndex
CREATE INDEX "embedding_documents_hash_idx" ON "embedding_documents"("hash");

-- CreateIndex
CREATE INDEX "embedding_indexes_roadmapId_isActive_idx" ON "embedding_indexes"("roadmapId", "isActive");

-- CreateIndex
CREATE INDEX "embedding_indexes_userId_idx" ON "embedding_indexes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "embedding_indexes_roadmapId_userId_version_key" ON "embedding_indexes"("roadmapId", "userId", "version");

-- AddForeignKey
ALTER TABLE "embedding_documents" ADD CONSTRAINT "embedding_documents_indexId_fkey" FOREIGN KEY ("indexId") REFERENCES "embedding_indexes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
