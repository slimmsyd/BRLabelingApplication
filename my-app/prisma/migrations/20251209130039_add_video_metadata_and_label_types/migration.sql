/*
  Warnings:

  - You are about to drop the column `fileUrl` on the `Video` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `Video` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[username]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[dynamoDbId]` on the table `Video` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[videoId,userId,labelType]` on the table `VideoAssignment` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `username` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `boxer1` to the `Video` table without a default value. This is not possible if the table is not empty.
  - Added the required column `boxer2` to the `Video` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dynamoDbId` to the `Video` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fightDate` to the `Video` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fps` to the `Video` table without a default value. This is not possible if the table is not empty.
  - Added the required column `numCameraViews` to the `Video` table without a default value. This is not possible if the table is not empty.
  - Added the required column `round` to the `Video` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sourceUrls` to the `Video` table without a default value. This is not possible if the table is not empty.
  - Added the required column `labelType` to the `VideoAssignment` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "LabelType" AS ENUM ('OFFENSE', 'DEFENSE', 'FOOTWORK');

-- DropIndex
DROP INDEX "VideoAssignment_videoId_userId_key";

-- AlterTable
-- Add username as nullable first to handle existing data
ALTER TABLE "User" ADD COLUMN     "username" TEXT;

-- Update existing users with a default username based on their email
UPDATE "User" SET "username" = SPLIT_PART("email", '@', 1) WHERE "username" IS NULL;

-- Now make username required
ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;

-- AlterTable
ALTER TABLE "Video" DROP COLUMN "fileUrl",
DROP COLUMN "metadata",
ADD COLUMN     "boxer1" TEXT NOT NULL,
ADD COLUMN     "boxer2" TEXT NOT NULL,
ADD COLUMN     "dynamoDbId" TEXT NOT NULL,
ADD COLUMN     "fightDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "fps" INTEGER NOT NULL,
ADD COLUMN     "numCameraViews" INTEGER NOT NULL,
ADD COLUMN     "round" INTEGER NOT NULL,
ADD COLUMN     "segment" TEXT NOT NULL DEFAULT 'Seg 1',
ADD COLUMN     "sourceUrls" JSONB NOT NULL,
ADD COLUMN     "uploadedBy" TEXT;

-- AlterTable
ALTER TABLE "VideoAssignment" ADD COLUMN     "labelType" "LabelType" NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Video_dynamoDbId_key" ON "Video"("dynamoDbId");

-- CreateIndex
CREATE INDEX "Video_dynamoDbId_idx" ON "Video"("dynamoDbId");

-- CreateIndex
CREATE INDEX "Video_uploadedBy_idx" ON "Video"("uploadedBy");

-- CreateIndex
CREATE INDEX "Video_fightDate_idx" ON "Video"("fightDate");

-- CreateIndex
CREATE INDEX "VideoAssignment_labelType_idx" ON "VideoAssignment"("labelType");

-- CreateIndex
CREATE UNIQUE INDEX "VideoAssignment_videoId_userId_labelType_key" ON "VideoAssignment"("videoId", "userId", "labelType");
