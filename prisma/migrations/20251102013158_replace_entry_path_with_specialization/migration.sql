/*
  Warnings:

  - You are about to drop the column `entryPath` on the `UserProfile` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "UserProfile" DROP COLUMN "entryPath",
ADD COLUMN     "specialization" TEXT NOT NULL DEFAULT 'undecided';
