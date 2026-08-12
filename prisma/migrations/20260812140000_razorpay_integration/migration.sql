-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "failureReason" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_razorpayOrderId_key" ON "Order"("razorpayOrderId");
