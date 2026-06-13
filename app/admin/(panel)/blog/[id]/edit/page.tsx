import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHead, Crumb } from "../../../_lib/ui";
import { PostForm } from "../../PostForm";
import { updatePost } from "../../actions";

export const metadata = { title: "Edit Post — VSK Admin" };

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await prisma.blogPost.findUnique({ where: { id }, include: { author: true } });
  if (!post) notFound();

  return (
    <div>
      <Crumb items={[["Blog", "/admin/blog"], ["Edit Post"]]} />
      <PageHead
        title="Edit Post"
        sub={post.title}
        actions={
          <>
            <Link href="/admin/blog" className="btn btn--ghost btn--sm">Cancel</Link>
            <button form="post-form" className="btn btn--primary btn--sm">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 13l4 4L19 7" /></svg>
              Save Changes
            </button>
          </>
        }
      />
      <PostForm
        post={post}
        action={updatePost}
        formId="post-form"
        authorName={post.author?.name ?? "VSK Editorial"}
      />
    </div>
  );
}
