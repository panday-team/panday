-- AlterTable: add tutorial completion timestamp to user profile
ALTER TABLE "UserProfile" ADD COLUMN "tutorialCompletedAt" TIMESTAMP(3);
