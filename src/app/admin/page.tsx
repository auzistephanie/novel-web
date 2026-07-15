import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import AdminStoryList, { type AdminStoryRow } from "@/components/AdminStoryList";

export const revalidate = 0;

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.email)) redirect("/");

  const { data: stories } = await supabase
    .from("novel_stories")
    .select("id, title, genre, story_type, created_at")
    .order("created_at", { ascending: false })
    .returns<AdminStoryRow[]>();

  return (
    <main className="flex-1 max-w-4xl w-full mx-auto px-5 py-10">
      <h1 className="font-serif font-black text-3xl mb-1">Admin · 故事管理</h1>
      <p className="text-ink/60 mb-8">
        共 {stories?.length ?? 0} 篇故事。撳標題可以開新分頁睇全文，睇完先決定刪唔刪。刪除會一併清走相關鍾意記錄同讀者結局，動作不可撤銷。
      </p>
      <AdminStoryList stories={stories ?? []} />
    </main>
  );
}
