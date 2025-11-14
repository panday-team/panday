-- DropIndex
DROP INDEX "public"."embedding_documents_embedding_idx";

-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN     "tutorialCompletedAt" TIMESTAMP(3);
