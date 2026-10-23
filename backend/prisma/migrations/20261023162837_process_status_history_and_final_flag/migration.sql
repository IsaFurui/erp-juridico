-- AlterTable
ALTER TABLE "ProcessStatus" ADD COLUMN     "isFinal" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ProcessStatusHistory" (
    "id" SERIAL NOT NULL,
    "processId" INTEGER NOT NULL,
    "statusId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "ProcessStatusHistory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ProcessStatusHistory" ADD CONSTRAINT "ProcessStatusHistory_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessStatusHistory" ADD CONSTRAINT "ProcessStatusHistory_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "ProcessStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessStatusHistory" ADD CONSTRAINT "ProcessStatusHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
