-- Model labeler accounts.
-- Sydney: apply this migration before anyone uses model-label import.
-- This change is not applied to production by the pull request.
ALTER TYPE "AccountType" ADD VALUE 'MODEL';
