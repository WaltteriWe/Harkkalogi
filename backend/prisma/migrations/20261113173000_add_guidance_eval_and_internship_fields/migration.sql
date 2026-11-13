-- AlterTable
ALTER TABLE "Internship" ADD COLUMN "title" TEXT NOT NULL DEFAULT 'Harjoittelu 1',
ADD COLUMN "order" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "credits" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN "requiredHours" INTEGER NOT NULL DEFAULT 400;

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN "scope" TEXT NOT NULL DEFAULT 'h1',
ALTER COLUMN "plannedHours" SET DEFAULT 400;

-- CreateTable
CREATE TABLE "GuidanceEvaluation" (
    "id" SERIAL NOT NULL,
    "internshipId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "checklist" JSONB,
    "ratings" JSONB,
    "feedback" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuidanceEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuidanceEvaluation_internshipId_key" ON "GuidanceEvaluation"("internshipId");

-- CreateIndex
CREATE INDEX "GuidanceEvaluation_studentId_idx" ON "GuidanceEvaluation"("studentId");

-- AddForeignKey
ALTER TABLE "GuidanceEvaluation" ADD CONSTRAINT "GuidanceEvaluation_internshipId_fkey" FOREIGN KEY ("internshipId") REFERENCES "Internship"("id") ON DELETE CASCADE ON UPDATE CASCADE;
