/*
  Warnings:

  - You are about to drop the `ActiveGame` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ActiveGame" DROP CONSTRAINT "ActiveGame_user_id_fkey";

-- DropTable
DROP TABLE "ActiveGame";
