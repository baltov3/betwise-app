-- CreateEnum
CREATE TYPE "PredictionStatus" AS ENUM ('SCHEDULED', 'LIVE', 'FINISHED', 'POSTPONED', 'CANCELED');

-- CreateEnum
CREATE TYPE "PredictionResult" AS ENUM ('PENDING', 'WIN', 'LOSS', 'VOID', 'PUSH');

-- AlterTable
ALTER TABLE "predictions" ADD COLUMN     "result" "PredictionResult" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "settledAt" TIMESTAMP(3),
ADD COLUMN     "status" "PredictionStatus" NOT NULL DEFAULT 'SCHEDULED';
