ALTER TABLE "Report"
ADD COLUMN "clientId" VARCHAR(80),
ADD COLUMN "period" VARCHAR(160) NOT NULL DEFAULT '',
ADD COLUMN "totalHours" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX "Report_internshipId_clientId_key"
ON "Report"("internshipId", "clientId");
