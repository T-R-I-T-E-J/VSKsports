-- AlterTable
ALTER TABLE "User" ADD COLUMN     "eventInvitesOptIn" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "personalisedRecsOptIn" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sessionsValidFrom" TIMESTAMP(3),
ADD COLUMN     "trainingRemindersOptIn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "whatsappOptIn" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE INDEX "Address_userId_idx" ON "Address"("userId");

-- CreateIndex
CREATE INDEX "BlogPost_authorId_idx" ON "BlogPost"("authorId");

-- CreateIndex
CREATE INDEX "CartItem_productId_idx" ON "CartItem"("productId");

-- CreateIndex
CREATE INDEX "CustomerNote_userId_idx" ON "CustomerNote"("userId");

-- CreateIndex
CREATE INDEX "CustomerNote_authorId_idx" ON "CustomerNote"("authorId");

-- CreateIndex
CREATE INDEX "DealerApplication_reviewedById_idx" ON "DealerApplication"("reviewedById");

-- CreateIndex
CREATE INDEX "DealerDocument_applicationId_idx" ON "DealerDocument"("applicationId");

-- CreateIndex
CREATE INDEX "EmailLog_orderId_idx" ON "EmailLog"("orderId");

-- CreateIndex
CREATE INDEX "EventRegistration_eventId_idx" ON "EventRegistration"("eventId");

-- CreateIndex
CREATE INDEX "EventRegistration_userId_idx" ON "EventRegistration"("userId");

-- CreateIndex
CREATE INDEX "File_uploadedById_idx" ON "File"("uploadedById");

-- CreateIndex
CREATE INDEX "InventoryAdjustment_inventoryItemId_idx" ON "InventoryAdjustment"("inventoryItemId");

-- CreateIndex
CREATE INDEX "InventoryAdjustment_staffId_idx" ON "InventoryAdjustment"("staffId");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_userId_createdAt_idx" ON "Order"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_addressId_idx" ON "Order"("addressId");

-- CreateIndex
CREATE INDEX "Order_couponId_idx" ON "Order"("couponId");

-- CreateIndex
CREATE INDEX "OrderDocument_orderId_idx" ON "OrderDocument"("orderId");

-- CreateIndex
CREATE INDEX "OrderEvent_orderId_idx" ON "OrderEvent"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE INDEX "Product_brandId_idx" ON "Product"("brandId");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE INDEX "ProductImage_productId_idx" ON "ProductImage"("productId");

-- CreateIndex
CREATE INDEX "ProductVariant_productId_idx" ON "ProductVariant"("productId");

-- CreateIndex
CREATE INDEX "Return_orderId_idx" ON "Return"("orderId");

-- CreateIndex
CREATE INDEX "Return_userId_idx" ON "Return"("userId");

-- CreateIndex
CREATE INDEX "ReturnItem_returnId_idx" ON "ReturnItem"("returnId");

-- CreateIndex
CREATE INDEX "ReturnItem_orderItemId_idx" ON "ReturnItem"("orderItemId");

-- CreateIndex
CREATE INDEX "ReturnPhoto_returnId_idx" ON "ReturnPhoto"("returnId");

-- CreateIndex
CREATE INDEX "Review_productId_status_idx" ON "Review"("productId", "status");

-- CreateIndex
CREATE INDEX "Review_userId_idx" ON "Review"("userId");

-- CreateIndex
CREATE INDEX "ReviewPhoto_reviewId_idx" ON "ReviewPhoto"("reviewId");

-- CreateIndex
CREATE INDEX "RewardLedger_userId_idx" ON "RewardLedger"("userId");

-- CreateIndex
CREATE INDEX "RewardRedemption_userId_idx" ON "RewardRedemption"("userId");

-- CreateIndex
CREATE INDEX "RewardRedemption_rewardItemId_idx" ON "RewardRedemption"("rewardItemId");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "StaffAction_staffId_idx" ON "StaffAction"("staffId");

-- CreateIndex
CREATE INDEX "TrainingRegistration_batchId_idx" ON "TrainingRegistration"("batchId");

-- CreateIndex
CREATE INDEX "TrainingRegistration_userId_idx" ON "TrainingRegistration"("userId");

-- CreateIndex
CREATE INDEX "WishlistItem_productId_idx" ON "WishlistItem"("productId");

-- ============================================================
-- Data-integrity CHECK constraints.
--
-- Prisma does not model CHECK constraints, so they are written here by hand and
-- preserved across migrations. Every one of these invariants was previously
-- enforced only by application code — and three of those guards raced, which is
-- how a negative loyalty balance became reachable. These are the backstop that
-- turns silent corruption into a loud, immediate error.
--
-- Existing rows were verified to satisfy all ten before this migration was
-- written, so it applies without a data fix.
-- ============================================================

ALTER TABLE "User" ADD CONSTRAINT "User_loyaltyPoints_non_negative" CHECK ("loyaltyPoints" >= 0);
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_stock_non_negative" CHECK ("stock" >= 0);
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_stock_non_negative" CHECK ("stock" >= 0);
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_quantity_positive" CHECK ("quantity" >= 1);
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_quantity_positive" CHECK ("quantity" >= 1);
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_unitPrice_non_negative" CHECK ("unitPriceInr" >= 0);
ALTER TABLE "Product" ADD CONSTRAINT "Product_price_positive" CHECK ("priceInr" > 0);
ALTER TABLE "Order" ADD CONSTRAINT "Order_total_non_negative" CHECK ("totalInr" >= 0);
ALTER TABLE "Order" ADD CONSTRAINT "Order_subtotal_non_negative" CHECK ("subtotalInr" >= 0);
ALTER TABLE "ReturnItem" ADD CONSTRAINT "ReturnItem_quantity_positive" CHECK ("quantity" >= 1);
