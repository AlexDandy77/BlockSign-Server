-- CreateEnum
CREATE TYPE "public"."OtpPurpose" AS ENUM ('REGISTER_EMAIL');

-- CreateTable
CREATE TABLE "public"."EmailOtp" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "purpose" "public"."OtpPurpose" NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailOtp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailOtp_email_purpose_idx" ON "public"."EmailOtp"("email", "purpose");
