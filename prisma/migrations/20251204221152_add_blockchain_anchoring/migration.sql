/*
  Warnings:

  - A unique constraint covering the columns `[blockchainTxId]` on the table `Document` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "anchoredAt" TIMESTAMP(3),
ADD COLUMN     "blockchainNetwork" TEXT,
ADD COLUMN     "blockchainTxId" TEXT,
ADD COLUMN     "explorerUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Document_blockchainTxId_key" ON "Document"("blockchainTxId");

-- CreateIndex
CREATE INDEX "Document_blockchainTxId_idx" ON "Document"("blockchainTxId");
