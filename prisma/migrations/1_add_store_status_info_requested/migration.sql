-- Add INFO_REQUESTED to StoreStatus (used for store + driver application workflows)
DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'StoreStatus' AND e.enumlabel = 'INFO_REQUESTED'
  ) THEN
    ALTER TYPE "StoreStatus" ADD VALUE 'INFO_REQUESTED';
  END IF;
END
$migration$;
