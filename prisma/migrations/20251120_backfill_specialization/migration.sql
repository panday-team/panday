-- Backfill any NULL specialization values with 'undecided'
-- This handles existing production profiles that were created before the specialization field was added
UPDATE "UserProfile" 
SET "specialization" = 'undecided' 
WHERE "specialization" IS NULL;
