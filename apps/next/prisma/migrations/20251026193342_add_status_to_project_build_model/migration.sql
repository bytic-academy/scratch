/*
  Warnings:

  - You are about to drop the column `isBuilding` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `queuedAt` on the `Project` table. All the data in the column will be lost.
  - Added the required column `status` to the `ProjectBuild` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ProjectBuildStatus" AS ENUM ('Building', 'Failed', 'Success');

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "isBuilding",
DROP COLUMN "queuedAt";

-- AlterTable
ALTER TABLE "ProjectBuild" ADD COLUMN     "status" "ProjectBuildStatus" NOT NULL;
