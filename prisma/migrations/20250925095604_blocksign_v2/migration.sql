/*
  Warnings:

  - The values [DRAFT] on the enum `DocStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."DocStatus_new" AS ENUM ('PENDING', 'SIGNED', 'REJECTED');
ALTER TABLE "public"."Document" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."Document" ALTER COLUMN "status" TYPE "public"."DocStatus_new" USING ("status"::text::"public"."DocStatus_new");
ALTER TYPE "public"."DocStatus" RENAME TO "DocStatus_old";
ALTER TYPE "public"."DocStatus_new" RENAME TO "DocStatus";
DROP TYPE "public"."DocStatus_old";
COMMIT;

-- AlterTable
ALTER TABLE "public"."Document" ALTER COLUMN "status" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "Document_ownerId_idx" ON "public"."Document"("ownerId");

-- CreateIndex
CREATE INDEX "Document_status_createdAt_idx" ON "public"."Document"("status", "createdAt");

-- CreateIndex
CREATE INDEX "DocumentParticipant_userId_documentId_idx" ON "public"."DocumentParticipant"("userId", "documentId");

-- CreateIndex
CREATE INDEX "DocumentParticipant_documentId_idx" ON "public"."DocumentParticipant"("documentId");
