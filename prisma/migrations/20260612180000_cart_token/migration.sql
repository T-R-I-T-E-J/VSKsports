-- Make Cart.userId nullable (carts can be guest/anonymous) and add a unique cookie token.
ALTER TABLE "Cart" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "Cart" ADD COLUMN "token" TEXT NOT NULL;
CREATE UNIQUE INDEX "Cart_token_key" ON "Cart"("token");
