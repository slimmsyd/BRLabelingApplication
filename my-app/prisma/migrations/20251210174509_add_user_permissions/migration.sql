-- AlterTable
ALTER TABLE "User" ADD COLUMN     "permissions" JSONB,
ADD COLUMN     "permissionsUpdatedAt" TIMESTAMP(3);
