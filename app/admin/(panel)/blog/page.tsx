import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { one, type SP } from "../_lib/admin";
import { PageHead, Panel, Badge, SegLinks, SearchBox, fmtDate } from "../_lib/ui";
import { deletePost } from "./actions";

export const metadata = { title: "Blog — VSK Admin" };

export default async function AdminBlog({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = one(sp.q).trim();
  const seg = one(sp.f) || "all";

  const where: Prisma.BlogPostWhereInput = {};
  if (q) where.title = { contains: q, mode: "insensitive" };
  if (seg === "published") where.published = true;
  if (seg === "drafts") where.published = false;

  const [posts, publishedCount, draftCount] = await Promise.all([
    prisma.blogPost.findMany({ where, include: { author: true }, orderBy: { createdAt: "desc" } }),
    prisma.blogPost.count({ where: { published: true } }),
    prisma.blogPost.count({ where: { published: false } }),
  ]);

  const segHref = (s: string) => `/admin/blog?f=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <div>
      <PageHead
        title="Blog"
        sub={`${publishedCount} published · ${draftCount} draft${draftCount === 1 ? "" : "s"}`}
        actions={
          <Link href="/admin/blog/new" className="btn btn--primary btn--sm">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
            Write Post
          </Link>
        }
      />

      <Panel>
        <div className="tbl-tools">
          <SegLinks
            active={seg}
            options={[
              { label: "All", value: "all", href: segHref("all") },
              { label: "Published", value: "published", href: segHref("published") },
              { label: "Drafts", value: "drafts", href: segHref("drafts") },
            ]}
          />
          <SearchBox placeholder="Search posts" defaultValue={q} hidden={{ f: seg }} />
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="dtbl">
            <thead>
              <tr><th>Title</th><th>Category</th><th>Author</th><th>Status</th><th>Date</th><th style={{ textAlign: "right" }}>Actions</th></tr>
            </thead>
            <tbody>
              {posts.length === 0 && (
                <tr><td colSpan={6} className="muted">No posts match.</td></tr>
              )}
              {posts.map((p) => (
                <tr key={p.id}>
                  <td><b style={{ fontWeight: 600, fontSize: 14.5 }}>{p.title}</b></td>
                  <td><Badge tone="b-gray">{p.category ?? "—"}</Badge></td>
                  <td style={{ color: "var(--ink-2)" }}>{p.author?.name ?? "VSK Editorial"}</td>
                  <td>
                    <Badge tone={p.published ? "b-green" : "b-amber"}>
                      {p.published ? "Published" : "Draft"}
                    </Badge>
                  </td>
                  <td className="muted" style={{ color: "var(--ink-2)" }}>
                    {p.published ? (p.publishedAt ?? fmtDate(p.createdAt)) : "—"}
                  </td>
                  <td>
                    <div className="row-act">
                      <Link href={`/admin/blog/${p.id}/edit`} title="Edit">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                      </Link>
                      <Link href={`/blog/${p.slug}`} target="_blank" title="View">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" /><circle cx="12" cy="12" r="3" /></svg>
                      </Link>
                      <form action={deletePost}>
                        <input type="hidden" name="id" value={p.id} />
                        <button className="del" title="Delete">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
