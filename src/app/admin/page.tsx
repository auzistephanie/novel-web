import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import AdminStoryList, { type AdminStoryRow } from "@/components/AdminStoryList";
import PendingStoryReview, { type PendingStoryRow } from "@/components/PendingStoryReview";

export const revalidate = 0;

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.email)) redirect("/");

  const { data: pending } = await supabase
    .from("novel_stories")
    .select("id, title, genre, story_type, protagonist, content, created_at, gen_meta")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .returns<PendingStoryRow[]>();

  const { data: published } = await supabase
    .from("novel_stories")
    .select("id, title, genre, story_type, created_at")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .returns<AdminStoryRow[]>();

  const { data: rejected } = await supabase
    .from("novel_stories")
    .select("id, title, genre, story_type, created_at")
    .eq("status", "rejected")
    .order("created_at", { ascending: false })
    .returns<AdminStoryRow[]>();

  return (
    <main className="flex-1 max-w-4xl w-full mx-auto px-5 py-10">
      <h1 className="font-serif font-black text-3xl mb-1">Admin · 故事管理</h1>
      <p className="text-ink/60 mb-8">
        新生成嘅故事會先落呢度待審，批准先會上公開頁；「唔要」唔會刪走，留低做診斷樣本。
      </p>

      <section className="mb-12">
        <h2 className="font-serif font-black text-xl mb-1">
          待審（{pending?.length ?? 0}）
        </h2>
        <p className="text-ink/50 text-sm mb-4">睇晒全文先揀，未批准嘅讀者見唔到。</p>
        <PendingStoryReview stories={pending ?? []} />
      </section>

      <section className="mb-12">
        <h2 className="font-serif font-black text-xl mb-1">
          已發布（{published?.length ?? 0}）
        </h2>
        <p className="text-ink/50 text-sm mb-4">
          撳標題可以開新分頁睇全文，睇完先決定刪唔刪。刪除會一併清走相關鍾意記錄同讀者結局，動作不可撤銷。
        </p>
        <AdminStoryList stories={published ?? []} />
      </section>

      <section>
        <h2 className="font-serif font-black text-xl mb-1">
          已拒絕・診斷用（{rejected?.length ?? 0}）
        </h2>
        <p className="text-ink/50 text-sm mb-4">
          未刪走嘅唔要故事，留低俾之後翻查「唔夠好」實際係邊度差；睇完想永久清走先撳刪除。
        </p>
        <AdminStoryList stories={rejected ?? []} />
      </section>
    </main>
  );
}
