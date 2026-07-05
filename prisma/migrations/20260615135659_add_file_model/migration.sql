-- CreateEnum
CREATE TYPE "FileKind" AS ENUM ('PRODUCT_IMAGE', 'AVATAR', 'BLOG_MEDIA', 'EVENT_MEDIA', 'REVIEW_PHOTO', 'RETURN_PHOTO', 'DEALER_DOC', 'ORDER_DOC', 'OTHER');

-- CreateEnum
CREATE TYPE "FileVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "FileStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'ATTACHED', 'FLAGGED', 'ORPHAN');

-- AlterTable
ALTER TABLE "ProductImage" ADD COLUMN     "fileId" TEXT;

-- CreateTable
CREATE TABLE "File" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "url" TEXT,
    "mime" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "kind" "FileKind" NOT NULL DEFAULT 'OTHER',
    "visibility" "FileVisibility" NOT NULL DEFAULT 'PUBLIC',
    "status" "FileStatus" NOT NULL DEFAULT 'UPLOADED',
    "sanitized" BOOLEAN NOT NULL DEFAULT false,
    "scanStatus" TEXT,
    "alt" TEXT,
    "variants" JSONB,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "File_key_key" ON "File"("key");

-- CreateIndex
CREATE INDEX "File_kind_createdAt_idx" ON "File"("kind", "createdAt");

-- CreateIndex
CREATE INDEX "File_status_idx" ON "File"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ProductImage_fileId_key" ON "ProductImage"("fileId");

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

