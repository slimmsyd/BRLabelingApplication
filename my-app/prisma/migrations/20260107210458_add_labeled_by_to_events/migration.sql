-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "labeledBy" TEXT,
ADD COLUMN     "labeledByEmail" TEXT;

-- CreateIndex
CREATE INDEX "Event_labeledBy_idx" ON "Event"("labeledBy");
