-- AlterTable
ALTER TABLE "Process" ADD COLUMN     "responsibleId" INTEGER;

-- AddForeignKey
ALTER TABLE "Process" ADD CONSTRAINT "Process_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
