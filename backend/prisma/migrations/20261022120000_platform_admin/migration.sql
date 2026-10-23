-- CreateTable
-- Dono da plataforma, fora da árvore de Company: não é um escritório, e por
-- isso não tem companyId. Nasce pelo seed de bootstrap, nunca pela API.
CREATE TABLE "PlatformAdmin" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PlatformAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformAdmin_login_key" ON "PlatformAdmin"("login");
