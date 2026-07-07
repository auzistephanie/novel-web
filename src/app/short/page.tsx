import StoryWall from "@/components/StoryWall";
import { loadContext, COLS, type Story } from "@/lib/stories";

export const revalidate = 0;

export default async function ShortPage({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string }>;
}) {
  const { genre } = await searchParams;
  const { supabase, user, likedIds } = await loadContext();

  const { data } = await supabase
    .from("novel_stories")
    .select(COLS)
    .eq("story_type", "short")
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<Story[]>();

  const stories = data ?? [];

  return (
    <main className="flex-1 max-w-4xl w-full mx-auto px-5 py-10">
      <header className="mb-8">
        <h1 className="font-serif font-black text-3xl mb-1">短篇故事</h1>
        <p className="text-ink/60">
          有頭有尾、一次睇晒，已有結局，唔使追更，適合想即刻睇到結局嘅您。
        </p>
      </header>

      {stories.length === 0 ? (
        <div className="border border-dashed border-ink/30 rounded-xl p-10 text-center text-ink/50">
          暫時未有短篇故事，系統正在生成中，請稍候。
        </div>
      ) : (
        <StoryWall
          stories={stories}
          likedIds={likedIds}
          loggedIn={!!user}
          initialGenre={genre}
        />
      )}
    </main>
  );
}
