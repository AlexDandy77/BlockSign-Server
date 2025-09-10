/*
  Warnings:

  - You are about to drop the column `mfaSecret` on the `User` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."DocStatus" AS ENUM ('DRAFT', 'PENDING', 'FINALIZED', 'REJECTED');

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "mfaSecret",
ADD COLUMN     "keyCreatedAt" TIMESTAMP(3),
ADD COLUMN     "publicKeyEd25519" TEXT,
ALTER COLUMN "passwordHash" DROP NOT NULL;

-- CreateTable
CREATE TABLE "public"."WebAuthnCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "publicKeyPem" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebAuthnCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Document" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256Hex" VARCHAR(64) NOT NULL,
    "status" "public"."DocStatus" NOT NULL DEFAULT 'DRAFT',
    "storageKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DocumentParticipant" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decision" TEXT,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "DocumentParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Signature" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "alg" TEXT NOT NULL,
    "signatureB64" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Signature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ChainAnchor" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "chain" TEXT NOT NULL,
    "txId" TEXT NOT NULL,
    "blockNumber" INTEGER,
    "anchoredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "anchorHash" TEXT NOT NULL,

    CONSTRAINT "ChainAnchor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WebAuthnCredential_credentialId_key" ON "public"."WebAuthnCredential"("credentialId");

-- CreateIndex
CREATE INDEX "Document_sha256Hex_idx" ON "public"."Document"("sha256Hex");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentParticipant_documentId_userId_key" ON "public"."DocumentParticipant"("documentId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Signature_documentId_userId_key" ON "public"."Signature"("documentId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ChainAnchor_documentId_key" ON "public"."ChainAnchor"("documentId");

-- AddForeignKey
ALTER TABLE "public"."WebAuthnCredential" ADD CONSTRAINT "WebAuthnCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DocumentParticipant" ADD CONSTRAINT "DocumentParticipant_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DocumentParticipant" ADD CONSTRAINT "DocumentParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Signature" ADD CONSTRAINT "Signature_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Signature" ADD CONSTRAINT "Signature_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChainAnchor" ADD CONSTRAINT "ChainAnchor_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
