/*
  Warnings:

  - You are about to drop the column `date` on the `payments` table. All the data in the column will be lost.
  - You are about to alter the column `amount` on the `payments` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to drop the column `description` on the `predictions` table. All the data in the column will be lost.
  - You are about to drop the column `matchDate` on the `predictions` table. All the data in the column will be lost.
  - You are about to drop the column `sport` on the `predictions` table. All the data in the column will be lost.
  - You are about to alter the column `odds` on the `predictions` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - Changed the type of `method` on the `payments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `categoryId` to the `predictions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pick` to the `predictions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `scheduledAt` to the `predictions` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PredictionStatus" AS ENUM ('UPCOMING', 'WON', 'LOST', 'VOID', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('stripe');

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "date",
ADD COLUMN     "periodEnd" TIMESTAMP(3),
ADD COLUMN     "periodStart" TIMESTAMP(3),
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(65,30),
DROP COLUMN "method",
ADD COLUMN     "method" "PaymentMethod" NOT NULL;

-- AlterTable
ALTER TABLE "predictions" DROP COLUMN "description",
DROP COLUMN "matchDate",
DROP COLUMN "sport",
ADD COLUMN     "awayTeam" TEXT,
ADD COLUMN     "categoryId" TEXT NOT NULL,
ADD COLUMN     "homeTeam" TEXT,
ADD COLUMN     "league" TEXT,
ADD COLUMN     "pick" TEXT NOT NULL,
ADD COLUMN     "resultNote" TEXT,
ADD COLUMN     "scheduledAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "status" "PredictionStatus" NOT NULL DEFAULT 'UPCOMING',
ALTER COLUMN "odds" SET DATA TYPE DECIMAL(65,30);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_logs" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "referredUserId" TEXT NOT NULL,
    "fromPaymentId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "rateApplied" DECIMAL(65,30) NOT NULL,
    "month" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commission_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- AddForeignKey
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_logs" ADD CONSTRAINT "commission_logs_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_logs" ADD CONSTRAINT "commission_logs_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_logs" ADD CONSTRAINT "commission_logs_fromPaymentId_fkey" FOREIGN KEY ("fromPaymentId") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
