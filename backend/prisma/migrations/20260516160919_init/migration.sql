-- CreateEnum
CREATE TYPE "EmpStatus" AS ENUM ('ATIVA', 'INATIVA');

-- CreateTable
CREATE TABLE "empresa" (
    "EmpId" SERIAL NOT NULL,
    "EmpNome" TEXT NOT NULL,
    "EmpCnpj" TEXT NOT NULL,
    "EmpDataCadastro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "EmpStatus" "EmpStatus" NOT NULL DEFAULT 'ATIVA',

    CONSTRAINT "empresa_pkey" PRIMARY KEY ("EmpId")
);

-- CreateTable
CREATE TABLE "usuario" (
    "UsuId" SERIAL NOT NULL,
    "UsuNome" TEXT NOT NULL,
    "UsuLogin" TEXT NOT NULL,
    "UsuSenhaHash" TEXT NOT NULL,
    "EmpId" INTEGER NOT NULL,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("UsuId")
);

-- CreateTable
CREATE TABLE "cliente" (
    "CliId" SERIAL NOT NULL,
    "CliNome" TEXT NOT NULL,
    "CliCpfCnpj" TEXT NOT NULL,
    "CliDataCadastro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cliente_pkey" PRIMARY KEY ("CliId")
);

-- CreateTable
CREATE TABLE "despesa" (
    "DesId" SERIAL NOT NULL,
    "DesNome" TEXT NOT NULL,
    "DesValor" DECIMAL(12,2) NOT NULL,
    "DesDataCadastro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "EmpId" INTEGER NOT NULL,

    CONSTRAINT "despesa_pkey" PRIMARY KEY ("DesId")
);

-- CreateTable
CREATE TABLE "status_processo" (
    "StaId" SERIAL NOT NULL,
    "StaDescricao" TEXT NOT NULL,

    CONSTRAINT "status_processo_pkey" PRIMARY KEY ("StaId")
);

-- CreateTable
CREATE TABLE "tipo_processo" (
    "TipId" SERIAL NOT NULL,
    "TipNome" TEXT NOT NULL,

    CONSTRAINT "tipo_processo_pkey" PRIMARY KEY ("TipId")
);

-- CreateTable
CREATE TABLE "subtipo_processo" (
    "SubId" SERIAL NOT NULL,
    "SubNome" TEXT NOT NULL,
    "TipId" INTEGER NOT NULL,

    CONSTRAINT "subtipo_processo_pkey" PRIMARY KEY ("SubId")
);

-- CreateTable
CREATE TABLE "processo" (
    "ProId" SERIAL NOT NULL,
    "ProNome" TEXT NOT NULL,
    "ProCodigo" TEXT NOT NULL,
    "CliId" INTEGER NOT NULL,
    "ProDataCadastro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ProDataAtualizacao" TIMESTAMP(3) NOT NULL,
    "StaId" INTEGER NOT NULL,
    "ProValorFixo" DECIMAL(12,2),
    "ProValorEsperado" DECIMAL(12,2),
    "ProValorTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "TipId" INTEGER NOT NULL,

    CONSTRAINT "processo_pkey" PRIMARY KEY ("ProId")
);

-- CreateIndex
CREATE UNIQUE INDEX "empresa_EmpCnpj_key" ON "empresa"("EmpCnpj");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_EmpId_UsuLogin_key" ON "usuario"("EmpId", "UsuLogin");

-- CreateIndex
CREATE UNIQUE INDEX "cliente_CliCpfCnpj_key" ON "cliente"("CliCpfCnpj");

-- CreateIndex
CREATE UNIQUE INDEX "status_processo_StaDescricao_key" ON "status_processo"("StaDescricao");

-- CreateIndex
CREATE UNIQUE INDEX "tipo_processo_TipNome_key" ON "tipo_processo"("TipNome");

-- CreateIndex
CREATE UNIQUE INDEX "subtipo_processo_TipId_SubNome_key" ON "subtipo_processo"("TipId", "SubNome");

-- CreateIndex
CREATE UNIQUE INDEX "processo_ProCodigo_key" ON "processo"("ProCodigo");

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_EmpId_fkey" FOREIGN KEY ("EmpId") REFERENCES "empresa"("EmpId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "despesa" ADD CONSTRAINT "despesa_EmpId_fkey" FOREIGN KEY ("EmpId") REFERENCES "empresa"("EmpId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subtipo_processo" ADD CONSTRAINT "subtipo_processo_TipId_fkey" FOREIGN KEY ("TipId") REFERENCES "tipo_processo"("TipId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processo" ADD CONSTRAINT "processo_CliId_fkey" FOREIGN KEY ("CliId") REFERENCES "cliente"("CliId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processo" ADD CONSTRAINT "processo_StaId_fkey" FOREIGN KEY ("StaId") REFERENCES "status_processo"("StaId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processo" ADD CONSTRAINT "processo_TipId_fkey" FOREIGN KEY ("TipId") REFERENCES "tipo_processo"("TipId") ON DELETE RESTRICT ON UPDATE CASCADE;
