-- CreateEnum
CREATE TYPE "VideoStatus" AS ENUM ('ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'REVIEWED', 'COMPLETED');

-- CreateTable
CREATE TABLE "Video" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT NOT NULL,
    "duration" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoAssignment" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "VideoStatus" NOT NULL DEFAULT 'ASSIGNED',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pickedUpAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VideoAssignment_userId_idx" ON "VideoAssignment"("userId");

-- CreateIndex
CREATE INDEX "VideoAssignment_videoId_idx" ON "VideoAssignment"("videoId");

-- CreateIndex
CREATE INDEX "VideoAssignment_status_idx" ON "VideoAssignment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "VideoAssignment_videoId_userId_key" ON "VideoAssignment"("videoId", "userId");

-- AddForeignKey
ALTER TABLE "VideoAssignment" ADD CONSTRAINT "VideoAssignment_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoAssignment" ADD CONSTRAINT "VideoAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
