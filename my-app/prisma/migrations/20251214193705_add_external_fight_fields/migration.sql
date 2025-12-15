-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "externalCamera" TEXT,
ADD COLUMN     "externalFightTitle" TEXT,
ADD COLUMN     "externalRoundId" TEXT,
ADD COLUMN     "externalSyncedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Video_externalFightTitle_idx" ON "Video"("externalFightTitle");
