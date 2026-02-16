/*
  Warnings:

  - You are about to drop the column `date` on the `JournalEntry` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `JournalEntry` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `JournalEntry` table. All the data in the column will be lost.
  - Added the required column `ciphertext` to the `JournalEntry` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "JournalEntry" DROP COLUMN "date",
DROP COLUMN "description",
DROP COLUMN "title",
ADD COLUMN     "ciphertext" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "SharedQuote" (
    "id" TEXT NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "sourceEntryId" TEXT,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "SharedQuote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SharedQuote_status_idx" ON "SharedQuote"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SharedQuote_userId_sourceEntryId_key" ON "SharedQuote"("userId", "sourceEntryId");

-- AddForeignKey
ALTER TABLE "SharedQuote" ADD CONSTRAINT "SharedQuote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
