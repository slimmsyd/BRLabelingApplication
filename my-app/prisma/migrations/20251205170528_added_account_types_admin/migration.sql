-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('LABELER', 'QUALITY_CONTROL', 'ADMIN');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "accountType" "AccountType" NOT NULL DEFAULT 'LABELER';
