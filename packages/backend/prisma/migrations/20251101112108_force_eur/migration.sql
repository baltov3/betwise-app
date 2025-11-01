-- AlterTable
ALTER TABLE "payments" ALTER COLUMN "currency" SET DEFAULT 'eur';

-- AlterTable
ALTER TABLE "payout_requests" ALTER COLUMN "currency" SET DEFAULT 'eur';
