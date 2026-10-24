-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('ALUGUEL', 'CONTAS', 'PESSOAL', 'SOFTWARE', 'IMPOSTOS', 'MARKETING', 'MATERIAL', 'CUSTAS', 'OUTROS');

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "category" "ExpenseCategory" NOT NULL DEFAULT 'OUTROS',
ADD COLUMN     "date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "Expense_companyId_date_idx" ON "Expense"("companyId", "date");
