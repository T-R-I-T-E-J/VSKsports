import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHead, Crumb } from "../../../_lib/ui";
import { ProductForm } from "../../ProductForm";
import { updateProduct } from "../../actions";

export const metadata = { title: "Edit Product — VSK Admin" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, brands, categories] = await Promise.all([
    prisma.product.findUnique({ where: { id }, include: { inventory: true } }),
    prisma.brand.findMany({ orderBy: { name: "asc" } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!product) notFound();

  return (
    <div>
      <Crumb items={[["Products", "/admin/products"], ["Edit Product"]]} />
      <PageHead
        title="Edit Product"
        sub={`${product.name}${product.inventory ? ` · ${product.inventory.sku}` : ""}`}
        actions={
          <>
            <Link href="/admin/products" className="btn btn--ghost btn--sm">Cancel</Link>
            <button form="product-form" className="btn btn--primary btn--sm">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 13l4 4L19 7" /></svg>
              Save Changes
            </button>
          </>
        }
      />
      <ProductForm
        product={product}
        brands={brands}
        categories={categories}
        action={updateProduct}
        formId="product-form"
      />
    </div>
  );
}
