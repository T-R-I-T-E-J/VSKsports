import type { Brand, Category, Product } from "@prisma/client";
import { Panel } from "../_lib/ui";

/* Server-rendered product form per Admin-Product-Edit.html. */
export function ProductForm({
  product,
  brands,
  categories,
  action,
  formId,
}: {
  product?: Product | null;
  brands: Brand[];
  categories: Category[];
  action: (fd: FormData) => Promise<void>;
  formId: string;
}) {
  const p = product;
  return (
    <form id={formId} action={action}>
      {p && <input type="hidden" name="id" value={p.id} />}
      <div className="adm-grid adm-grid--2">
        {/* LEFT */}
        <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
          <Panel title="General">
            <div className="afield">
              <label>
                Product name <span className="req">*</span>
              </label>
              <input name="name" required defaultValue={p?.name} />
            </div>
            <div className="afield">
              <label>Slug</label>
              <input name="slug" defaultValue={p?.slug} placeholder="auto-generated from name" />
              <span className="hint">Used in the storefront URL — /product/&lt;slug&gt;</span>
            </div>
            <div className="afield">
              <label>Short description</label>
              <textarea name="shortDescription" defaultValue={p?.shortDescription ?? ""} />
            </div>
            <div className="afield">
              <label>Full description</label>
              <textarea
                name="description"
                style={{ minHeight: 150 }}
                defaultValue={p?.description ?? ""}
              />
            </div>
          </Panel>

          <Panel title="Specifications">
            <div className="aform-grid">
              <div className="afield">
                <label>Calibre</label>
                <input name="caliber" defaultValue={p?.caliber ?? ""} placeholder='e.g. ".177"' />
              </div>
              <div className="afield">
                <label>Badge</label>
                <select name="badge" defaultValue={p?.badge ?? ""}>
                  <option value="">None</option>
                  <option value="sale">Sale</option>
                  <option value="new">New</option>
                  <option value="vsk">VSK</option>
                </select>
              </div>
              <div className="afield full">
                <label>Tags</label>
                <input
                  name="tags"
                  defaultValue={p?.tags.join(", ") ?? ""}
                  placeholder="comma separated, e.g. PCP, 10M"
                />
              </div>
            </div>
          </Panel>
        </div>

        {/* RIGHT */}
        <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
          <Panel title="Status">
            <label className="switch" style={{ marginBottom: 14 }}>
              <input type="checkbox" name="isActive" defaultChecked={p ? p.isActive : true} />
              <span className="track"></span>
              <span className="sl">Active (visible in store)</span>
            </label>
            <br />
            <label className="switch" style={{ marginBottom: 14 }}>
              <input type="checkbox" name="restricted" defaultChecked={p?.restricted ?? false} />
              <span className="track"></span>
              <span className="sl">Restricted — quote only</span>
            </label>
            <br />
            <label className="switch">
              <input
                type="checkbox"
                name="requiresLicence"
                defaultChecked={p?.requiresLicence ?? false}
              />
              <span className="track"></span>
              <span className="sl">Requires licence</span>
            </label>
          </Panel>

          <Panel title="Pricing">
            <div className="afield">
              <label>
                Price (₹) <span className="req">*</span>
              </label>
              <div className="input-prefix">
                <span>₹</span>
                <input name="priceInr" required defaultValue={p?.priceInr ?? ""} />
              </div>
            </div>
            <div className="afield">
              <label>Compare-at price (₹)</label>
              <div className="input-prefix">
                <span>₹</span>
                <input name="mrpInr" defaultValue={p?.mrpInr ?? ""} />
              </div>
              <span className="hint">Shows as a struck-through &quot;was&quot; price</span>
            </div>
            <div className="afield">
              <label>Dealer price (₹)</label>
              <div className="input-prefix">
                <span>₹</span>
                <input name="dealerPriceInr" defaultValue={p?.dealerPriceInr ?? ""} />
              </div>
              <span className="hint">Wholesale price for approved dealers</span>
            </div>
          </Panel>

          <Panel title="Organization">
            <div className="afield">
              <label>Category</label>
              <select name="categoryId" defaultValue={p?.categoryId ?? ""}>
                <option value="">— None —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="afield">
              <label>Brand</label>
              <select name="brandId" defaultValue={p?.brandId ?? ""}>
                <option value="">— None —</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </Panel>
        </div>
      </div>
    </form>
  );
}
