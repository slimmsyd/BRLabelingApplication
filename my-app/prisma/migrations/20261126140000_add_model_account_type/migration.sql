-- AlterEnum
-- Apply with prisma migrate deploy from my-app.
-- The check makes a second apply, or a deploy after the value already exists, a no-op.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'AccountType'
      AND e.enumlabel = 'MODEL'
  ) THEN
    ALTER TYPE "AccountType" ADD VALUE 'MODEL';
  END IF;
END $$;
