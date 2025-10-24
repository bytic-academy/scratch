/*
  Warnings:

  - You are about to drop the column `keyalias` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `keystore` on the `Project` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Project" DROP COLUMN "keyalias",
DROP COLUMN "keystore",
ADD COLUMN     "isBuilding" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "queuedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ProjectBuild" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectBuild_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ProjectBuild" ADD CONSTRAINT "ProjectBuild_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
