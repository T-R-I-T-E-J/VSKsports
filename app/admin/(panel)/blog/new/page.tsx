import Link from "next/link";
import { auth } from "@/lib/auth";
import { PageHead, Crumb } from "../../_lib/ui";
import { PostForm } from "../PostForm";
import { createPost } from "../actions";

export const metadata = { title: "Write Post — VSK Admin" };

export default async function NewPostPage() {
  const session = await auth();
  return (
    <div>
      <Crumb items={[["Blog", "/admin/blog"], ["Write Post"]]} />
      <PageHead
        title="Write Post"
        sub="New article for the VSK journal"
        actions={
          <>
            <Link href="/admin/blog" className="btn btn--ghost btn--sm">Cancel</Link>
            <button form="post-form" className="btn btn--primary btn--sm">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
              Save Post
            </button>
          </>
        }
      />
      <PostForm action={createPost} formId="post-form" authorName={session?.user?.name ?? "Staff"} />
    </div>
  );
}
