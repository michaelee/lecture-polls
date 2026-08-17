-- Backfill any existing NULL labels before making the column required
UPDATE "Poll" SET "label" = 'Poll ' || "number" WHERE "label" IS NULL;
ALTER TABLE "Poll" ALTER COLUMN "label" SET NOT NULL;

-- Add sortOrder, defaulting existing rows to their current creation order
ALTER TABLE "Poll" ADD COLUMN "sortOrder" INTEGER;
UPDATE "Poll" SET "sortOrder" = "number";
ALTER TABLE "Poll" ALTER COLUMN "sortOrder" SET NOT NULL;
