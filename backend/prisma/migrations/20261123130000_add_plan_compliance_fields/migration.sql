-- CreateEnum
CREATE TYPE "WorkloadType" AS ENUM ('FULL_TIME', 'PART_TIME');

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "companyAddress" TEXT,
ADD COLUMN     "companyWebsite" TEXT,
ADD COLUMN     "isInternational" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPaid" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "supervisorEmail" TEXT,
ADD COLUMN     "supervisorPhone" TEXT,
ADD COLUMN     "supervisorTitle" TEXT,
ADD COLUMN     "workloadType" "WorkloadType" NOT NULL DEFAULT 'FULL_TIME';
