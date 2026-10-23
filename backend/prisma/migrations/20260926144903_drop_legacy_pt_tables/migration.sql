-- Remove tabelas legadas em português.
-- Sobraram da migration 20260804210538_changing_table_names, que criou as
-- novas tabelas em inglês mas não dropou as antigas. Estão vazias e não são
-- referenciadas pelo schema atual.
DROP TABLE IF EXISTS "subtipo_processo" CASCADE;
DROP TABLE IF EXISTS "processo" CASCADE;
DROP TABLE IF EXISTS "tipo_processo" CASCADE;
DROP TABLE IF EXISTS "status_processo" CASCADE;
DROP TABLE IF EXISTS "despesa" CASCADE;
DROP TABLE IF EXISTS "cliente" CASCADE;
DROP TABLE IF EXISTS "usuario" CASCADE;
DROP TABLE IF EXISTS "empresa" CASCADE;
