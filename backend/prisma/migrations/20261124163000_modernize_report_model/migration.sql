-- AlterTable
ALTER TABLE "Report" 
  ALTER COLUMN "title" SET DEFAULT 'Harjoitteluraportti ja työtodistus',
  DROP COLUMN IF EXISTS "content",
  DROP COLUMN IF EXISTS "totalHours",
  ADD COLUMN "realizedHours" INTEGER NOT NULL DEFAULT 400,
  ADD COLUMN "generalSummary" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "goalReflections" JSONB,
  ADD COLUMN "attachments" JSONB,
  ADD COLUMN "approvedAt" TIMESTAMP(3);
