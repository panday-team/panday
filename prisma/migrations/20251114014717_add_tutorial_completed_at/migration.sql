-- DropIndex (IF EXISTS to prevent errors)
DROP INDEX IF EXISTS "public"."embedding_documents_embedding_idx";

-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN IF NOT EXISTS "tutorialCompletedAt" TIMESTAMP(3);
