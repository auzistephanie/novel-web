import { createClient } from "@/lib/supabase/server";
import StoryCard from "@/components/StoryCard";

export const revalidate = 0;

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: stories } = await supabase
    .from("novel_stories")
    .select("id, genre, title, protagonist, content, created_at")
    .order("created_at", { ascending: false })
    .limit(30);

  let likedIds = new Set<string>();
  if (user) {
    const { data: likes } = await supabase
      .from("novel_likes")
      .select("story_id")
      .eq("user_id", user.id);
    likedIds = new Set((likes ?? []).map((l) => l.story_id as string));
  }

  return (
    <main className="flex-1 max-w-4xl w-full mx-auto px-5 py-10">
      <h1 className="font-black text-3xl mb-1">故事牆</h1>
      <p className="text-ink/60 mb-8">
        {user
          ? "㩒鍾意記低你嘅口味，之後幫你生成專屬結局。"
          : "登入先可以記錄鍾意同攞專屬結局。"}
      </p>

      {(!stories || stories.length === 0) && (
        <div className="border border-dashed border-ink/30 rounded-xl p-10 text-center text-ink/50">
          仲未有故事——等 scheduled task 生成緊，或者手動觸發一次。
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        {stories?.map((s) => (
          <StoryCard key={s.id} story={s} liked={likedIds.has(s.id)} loggedIn={!!user} />
        ))}
      </div>
    </main>
  );
}
