-- AlterTable
ALTER TABLE "Process" ADD COLUMN     "datajudAlias" TEXT,
ADD COLUMN     "datajudNotFoundStreak" INTEGER NOT NULL DEFAULT 0;
