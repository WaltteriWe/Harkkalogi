ALTER TABLE "User"
ADD COLUMN "supervisingTeacherId" INTEGER;

CREATE INDEX "User_supervisingTeacherId_idx"
ON "User"("supervisingTeacherId");

ALTER TABLE "User"
ADD CONSTRAINT "User_supervisingTeacherId_fkey"
FOREIGN KEY ("supervisingTeacherId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
