-- AlterTable
ALTER TABLE "Process" ADD COLUMN     "subtypeId" INTEGER;

-- AddForeignKey
ALTER TABLE "Process" ADD CONSTRAINT "Process_subtypeId_fkey" FOREIGN KEY ("subtypeId") REFERENCES "ProcessSubtype"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
