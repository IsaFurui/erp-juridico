-- AlterTable
ALTER TABLE "Process" ADD COLUMN     "datajudMetadata" JSONB;

-- AlterTable
ALTER TABLE "ProcessMovement" ADD COLUMN     "court" TEXT;
