import type { BlogPost } from "@prisma/client";
import { Panel } from "../_lib/ui";

const CATEGORIES = ["Beginner Guide", "Product Review", "Maintenance", "Training Tips", "Competition"];

export function PostForm({
  post,
  action,
  formId,
  authorName,
}: {
  post?: BlogPost | null;
  action: (fd: FormData) => Promise<void>;
  formId: string;
  authorName: string;
}) {
  return (
    <form id={formId} action={action}>
      {post && <input type="hidden" name="id" value={post.id} />}
      <div className="adm-grid adm-grid--2">
        {/* editor */}
        <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
          <Panel>
            <div className="afield">
              <label>Post title</label>
              <input
                name="title"
                required
                defaultValue={post?.title}
                style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20 }}
              />
            </div>
            <div className="afield">
              <label>Excerpt</label>
              <textarea name="excerpt" defaultValue={post?.excerpt ?? ""} style={{ minHeight: 70 }} />
            </div>
            <div className="afield" style={{ marginBottom: 0 }}>
              <label>Content</label>
              <textarea
                name="body"
                defaultValue={post?.body ?? ""}
                style={{ minHeight: 420, fontSize: 15, lineHeight: 1.7 }}
                placeholder="Write the post body…"
              />
            </div>
          </Panel>
        </div>

        {/* sidebar */}
        <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
          <Panel title="Publish">
            <label className="switch" style={{ marginBottom: 14 }}>
              <input type="checkbox" name="published" defaultChecked={post?.published ?? false} />
              <span className="track"></span>
              <span className="sl">Published</span>
            </label>
            <div className="afield" style={{ marginBottom: 0 }}>
              <label>Author</label>
              <input value={authorName} disabled />
              <span className="hint">Set to the signed-in staff member</span>
            </div>
          </Panel>

          <Panel title="Organization">
            <div className="afield">
              <label>Category</label>
              <select name="category" defaultValue={post?.category ?? CATEGORIES[0]}>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="afield">
              <label>Slug</label>
              <input name="slug" defaultValue={post?.slug} placeholder="auto-generated from title" />
            </div>
            <div className="afield" style={{ marginBottom: 0 }}>
              <label>Read time</label>
              <input name="readTime" defaultValue={post?.readTime ?? ""} placeholder="8 min" />
            </div>
          </Panel>
        </div>
      </div>
    </form>
  );
}
