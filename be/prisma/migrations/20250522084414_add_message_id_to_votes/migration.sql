/*
  Warnings:

  - A unique constraint covering the columns `[voterId,participantId,messageId]` on the table `Vote` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `messageId` to the `Vote` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Vote_voterId_participantId_key";

-- AlterTable
ALTER TABLE "Vote" ADD COLUMN     "messageId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Vote_voterId_participantId_messageId_key" ON "Vote"("voterId", "participantId", "messageId");

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Comment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
