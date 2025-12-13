/*
  Warnings:

  - You are about to drop the column `expiresAt` on the `EmailToken` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."EmailToken_expiresAt_idx";

-- AlterTable
ALTER TABLE "EmailToken" DROP COLUMN "expiresAt";
