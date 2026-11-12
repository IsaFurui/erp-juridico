-- CreateTable
CREATE TABLE "DatajudSyncLog" (
    "id" SERIAL NOT NULL,
    "processId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "outcome" "DatajudSyncStatus" NOT NULL,
    "httpStatus" INTEGER,
    "method" TEXT,
    "durationMs" INTEGER,
    "movementCount" INTEGER,
    "request" JSONB,
    "response" JSONB,
    "error" TEXT,

    CONSTRAINT "DatajudSyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DatajudSyncLog_processId_createdAt_idx" ON "DatajudSyncLog"("processId", "createdAt");

-- AddForeignKey
ALTER TABLE "DatajudSyncLog" ADD CONSTRAINT "DatajudSyncLog_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
