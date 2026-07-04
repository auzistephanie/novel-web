import { createClient } from "@/lib/supabase/server";
import StoryCard from "@/components/StoryCard";
import Hero from "@/components/Hero";
import TileDivider from "@/components/TileDivider";

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

  const { count: storyCount } = await supabase
    .from("novel_stories")
    .select("id", { count: "exact", head: true });

  let likedIds = new Set<string>();
  if (user) {
    const { data: likes } = await supabase
      .from("novel_likes")
      .select("story_id")
      .eq("user_id", user.id);
    likedIds = new Set((likes ?? []).map((l) => l.story_id as string));
  }

  return (
    <>
      <Hero loggedIn={!!user} storyCount={storyCount ?? 0} />
      <TileDivider />

      <main id="stories" className="flex-1 max-w-4xl w-full mx-auto px-5 py-10">
        <h1 className="font-serif font-black text-3xl mb-1">每日連載</h1>
        <p className="text-ink/60 mb-8">
          {user
            ? "點擊喜歡記錄您的偏好，系統將為您生成專屬結局。"
            : "登入後即可記錄喜歡，並獲得專屬結局。"}
        </p>

        {(!stories || stories.length === 0) && (
          <div className="border border-dashed border-ink/30 rounded-xl p-10 text-center text-ink/50">
            尚未有故事，系統正在生成中，請稍候。
          </div>
        )}

        <div className="grid gap-5 grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
          {stories?.map((s) => (
            <StoryCard key={s.id} story={s} liked={likedIds.has(s.id)} loggedIn={!!user} />
          ))}
        </div>
      </main>
    </>
  );
}
