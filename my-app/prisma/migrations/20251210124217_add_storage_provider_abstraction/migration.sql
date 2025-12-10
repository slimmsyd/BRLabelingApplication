/*
  Warnings:

  - You are about to drop the column `dynamoDbId` on the `Video` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[storagePath]` on the table `Video` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `storagePath` to the `Video` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "StorageProvider" AS ENUM ('SUPABASE', 'S3', 'HYBRID');

-- DropIndex
DROP INDEX "Video_dynamoDbId_idx";

-- DropIndex
DROP INDEX "Video_dynamoDbId_key";

-- AlterTable
ALTER TABLE "Video" DROP COLUMN "dynamoDbId",
ADD COLUMN     "storagePath" TEXT NOT NULL,
ADD COLUMN     "storageProvider" "StorageProvider" NOT NULL DEFAULT 'SUPABASE',
ADD COLUMN     "weightClass" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Video_storagePath_key" ON "Video"("storagePath");

-- CreateIndex
CREATE INDEX "Video_storagePath_idx" ON "Video"("storagePath");

-- CreateIndex
CREATE INDEX "Video_storageProvider_idx" ON "Video"("storageProvider");
