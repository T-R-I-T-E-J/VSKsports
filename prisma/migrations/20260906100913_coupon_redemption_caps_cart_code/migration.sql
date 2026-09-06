-- AlterTable
ALTER TABLE "Cart" ADD COLUMN     "couponCode" TEXT;

-- AlterTable
ALTER TABLE "Coupon" ADD COLUMN     "maxRedemptions" INTEGER,
ADD COLUMN     "perUserLimit" INTEGER,
ADD COLUMN     "timesUsed" INTEGER NOT NULL DEFAULT 0;
