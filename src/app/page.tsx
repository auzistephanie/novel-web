import { createClient } from "@/lib/supabase/server";
import StoryWall from "@/components/StoryWall";
import Hero from "@/components/Hero";
import BookEntrance from "@/components/BookEntrance";

export const revalidate = 0;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string }>;
}) {
  const params = await searchParams;
  const initialGenre = params.genre;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: stories } = await supabase
    .from("novel_stories")
    .select("id, genre, title, protagonist, content, created_at, story_type")
    .order("created_at", { ascending: false })
    .limit(60);

  const { count: storyCount } = await supabase
    .from("novel_stories")
    .select("id", { count: "exact", head: true });

  let likedIds: string[] = [];
  if (user) {
    const { data: likes } = await supabase
      .from("novel_likes")
      .select("story_id")
      .eq("user_id", user.id);
    likedIds = (likes ?? []).map((l) => l.story_id as string);
  }

  const shortStories = (stories ?? []).filter((s) => s.story_type === "short");
  const serialStories = (stories ?? []).filter((s) => s.story_type !== "short");

  return (
    <>
      <BookEntrance />
      <Hero loggedIn={!!user} storyCount={storyCount ?? 0} />

      <main id="stories" className="flex-1 max-w-4xl w-full mx-auto px-5 py-10">
        {(!stories || stories.length === 0) && (
          <div className="border border-dashed border-ink/30 rounded-xl p-10 text-center text-ink/50">
            尚未有故事，系統正在生成中，請稍候。
          </div>
        )}

        {shortStories.length > 0 && (
          <section id="short-stories" className="mb-10">
            <h1 className="font-serif font-black text-3xl mb-1">短篇故事</h1>
            <p className="text-ink/60 mb-8">
              有頭有尾、一次睇晒，唔使追更，適合想即刻睇到結局嘅您。
            </p>
            <StoryWall
              stories={shortStories}
              likedIds={likedIds}
              loggedIn={!!user}
              initialGenre={initialGenre}
            />
          </section>
        )}

        {serialStories.length > 0 && (
          <section id="serial-stories">
            <h2 className="font-serif font-black text-3xl mb-1">每日連載</h2>
            <p className="text-ink/60 mb-8">
              {user
                ? "點擊喜歡記錄您的偏好，系統將為您生成專屬結局。"
                : "登入後即可記錄喜歡，並獲得專屬結局。"}
            </p>
            <StoryWall
              stories={serialStories}
              likedIds={likedIds}
              loggedIn={!!user}
              initialGenre={initialGenre}
            />
          </section>
        )}
      </main>
    </>
  );
}
