import StoryWall from "@/components/StoryWall";
import { loadContext, COLS, type Story } from "@/lib/stories";

export const revalidate = 0;

export default async function SerialPage({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string }>;
}) {
  const { genre } = await searchParams;
  const { supabase, user, likedIds } = await loadContext();

  // 非短篇（包含 story_type 為 null 嘅舊資料）= 可生成專屬結局
  const { data } = await supabase
    .from("novel_stories")
    .select(COLS)
    .or("story_type.neq.short,story_type.is.null")
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<Story[]>();

  const stories = data ?? [];

  return (
    <main className="flex-1 max-w-4xl w-full mx-auto px-5 py-10">
      <header className="mb-8">
        <h1 className="font-serif font-black text-3xl mb-1">互動結局</h1>
        <p className="text-ink/60">
          {user
            ? "揀一個劇情走向，AI 即場為你寫下獨一無二嘅專屬結局，存入你的結局本。"
            : "登入後即可揀劇情走向，讓 AI 為你生成專屬結局。"}
        </p>
      </header>

      {stories.length === 0 ? (
        <div className="border border-dashed border-ink/30 rounded-xl p-10 text-center text-ink/50">
          暫時未有故事，系統正在生成中，請稍候。
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
