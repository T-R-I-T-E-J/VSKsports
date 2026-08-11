// Nonce-based CSP requires per-request rendering: a prerendered page would ship
// HTML baked at build time, whose scripts carry no nonce matching the CSP header
// issued for the request — the browser would block every script on the page.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHead, Crumb } from "../../_lib/ui";
import { ProductForm } from "../ProductForm";
import { createProduct } from "../actions";

export const metadata = { title: "Add Product — VSK Admin" };

export default async function NewProductPage() {
  const [brands, categories] = await Promise.all([
    prisma.brand.findMany({ orderBy: { name: "asc" } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <Crumb items={[["Products", "/admin/products"], ["Add Product"]]} />
      <PageHead
        title="Add Product"
        sub="Create a new catalog entry"
        actions={
          <>
            <Link href="/admin/products" className="btn btn--ghost btn--sm">Cancel</Link>
            <button form="product-form" className="btn btn--primary btn--sm">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 13l4 4L19 7" /></svg>
              Save Product
            </button>
          </>
        }
      />
      <ProductForm brands={brands} categories={categories} action={createProduct} formId="product-form" />
    </div>
  );
}
