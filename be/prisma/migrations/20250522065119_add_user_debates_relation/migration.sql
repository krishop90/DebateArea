/*
  Warnings:

  - Added the required column `creatorId` to the `Debate` table without a default value. This is not possible if the table is not empty.

*/
-- First add the column as nullable
ALTER TABLE "Debate" ADD COLUMN "creatorId" INTEGER;

-- Update existing debates to set creator to the first debater
UPDATE "Debate" d
SET "creatorId" = (
    SELECT dp."userId"
    FROM "DebateParticipant" dp
    WHERE dp."debateId" = d.id
    AND dp."role" = 'DEBATER'
    LIMIT 1
);

-- Now make the column required
ALTER TABLE "Debate" ALTER COLUMN "creatorId" SET NOT NULL;

-- Add the foreign key constraint
ALTER TABLE "Debate" ADD CONSTRAINT "Debate_creatorId_fkey" 
FOREIGN KEY ("creatorId") REFERENCES "User"("id") 
ON DELETE RESTRICT ON UPDATE CASCADE;
