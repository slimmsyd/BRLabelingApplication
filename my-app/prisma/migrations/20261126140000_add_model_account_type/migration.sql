-- AlterEnum
-- Model labeler accounts. Apply with prisma migrate deploy from my-app.
-- IF NOT EXISTS lets that deploy record the migration even if the value
-- was added earlier. Do not paste this statement into the SQL editor by itself.
ALTER TYPE "AccountType" ADD VALUE IF NOT EXISTS 'MODEL';
