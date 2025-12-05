-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "boxer" TEXT NOT NULL,
    "punchType" TEXT NOT NULL,
    "hand" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "visibilityFlags" TEXT[],
    "knockdown" BOOLEAN NOT NULL,
    "punchQuality" TEXT NOT NULL,
    "cam" TEXT,
    "stance" TEXT,
    "landed" BOOLEAN,
    "punchResult" TEXT,
    "defenseType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Event_assignmentId_idx" ON "Event"("assignmentId");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "VideoAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
