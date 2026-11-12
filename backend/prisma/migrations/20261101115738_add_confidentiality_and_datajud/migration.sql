-- CreateEnum
CREATE TYPE "Confidentiality" AS ENUM ('PUBLIC', 'CONFIDENTIAL');

-- CreateEnum
CREATE TYPE "DatajudSyncStatus" AS ENUM ('NEVER_SYNCED', 'SYNCED', 'NOT_FOUND', 'ERROR');

-- AlterTable
ALTER TABLE "ProcessType" ADD COLUMN     "defaultConfidential" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Process" ADD COLUMN     "confidentiality" "Confidentiality" NOT NULL DEFAULT 'PUBLIC',
ADD COLUMN     "datajudNextSyncAt" TIMESTAMP(3),
ADD COLUMN     "datajudSyncStatus" "DatajudSyncStatus" NOT NULL DEFAULT 'NEVER_SYNCED',
ADD COLUMN     "datajudSyncedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ProcessMovement" (
    "id" SERIAL NOT NULL,
    "processId" INTEGER NOT NULL,
    "code" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "complements" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProcessMovement_processId_code_occurredAt_key" ON "ProcessMovement"("processId", "code", "occurredAt");

-- AddForeignKey
ALTER TABLE "ProcessMovement" ADD CONSTRAINT "ProcessMovement_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Valor inicial de sigilo para direito de família (segredo de justiça). Roda
-- uma vez, aqui, para installs que já tinham o tipo criado. O root ajusta
-- depois pela rota de catálogo; o seed não sobrescreve em re-seed.
UPDATE "ProcessType" SET "defaultConfidential" = true WHERE "name" = 'Família e Sucessões';
