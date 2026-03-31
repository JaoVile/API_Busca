/*
  Warnings:

  - Added the required column `provider_pass_encrypted` to the `tenant_credentials` table without a default value. This is not possible if the table is not empty.
  - Added the required column `provider_user_encrypted` to the `tenant_credentials` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "tenant_credentials" ADD COLUMN     "provider_pass_encrypted" TEXT NOT NULL,
ADD COLUMN     "provider_user_encrypted" TEXT NOT NULL;
