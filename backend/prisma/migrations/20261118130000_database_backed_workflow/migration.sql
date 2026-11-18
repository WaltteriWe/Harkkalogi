-- CreateEnum
CREATE TYPE "InternshipStage" AS ENUM ('PLAN_DRAFT', 'PLAN_SUBMITTED', 'IN_PROGRESS', 'REPORT_READY', 'REPORT_SUBMITTED', 'EVALUATION_PENDING', 'COMPLETED');

-- AlterTable
ALTER TABLE "Internship" ADD COLUMN "loggedHours" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "stage" "InternshipStage" NOT NULL DEFAULT 'PLAN_DRAFT',
ADD COLUMN "creditsPutToOma" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "creditsPutToOmaAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Report" ADD COLUMN "totalHours" INTEGER NOT NULL DEFAULT 400;

-- CreateIndex
CREATE INDEX "Internship_stage_idx" ON "Internship"("stage");

-- CreateIndex
CREATE INDEX "Internship_status_idx" ON "Internship"("status");

-- CreateIndex
CREATE INDEX "Internship_creditsPutToOma_idx" ON "Internship"("creditsPutToOma");
