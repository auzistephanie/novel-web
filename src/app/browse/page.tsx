import Link from "next/link";
import { redirect } from "next/navigation";
import StoryCard from "@/components/StoryCard";
import { loadContext, COLS, type Story } from "@/lib/stories";
import { getGenreColor } from "@/lib/genreColor";
import { getParentByKey } from "@/lib/genreCategories";

export const revalidate = 0;

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string; parent?: string }>;
}) {
  const { genre: legacyGenre, parent: parentKey } = await searchParams;

  // 新：大類瀏覽（categories 頁連過嚟）
  const parent = parentKey ? getParentByKey(parentKey) : undefined;
  // 舊：單一細類直連（首頁「熱門題材」等仍用呢個，保留兼容）
  const genre = legacyGenre ?? "";

  if (!parent && !genre) redirect("/categories");

  const { supabase, user, likedIds } = await loadContext();
  const likedSet = new Set(likedIds);

  const displayLabel = parent ? parent.label : genre;
  const color = getGenreColor(displayLabel);

  let query = supabase
    .from("novel_stories")
    .select(COLS)
    .order("created_at", { ascending: false })
    .limit(200);

  query = parent ? query.in("genre", parent.genres) : query.eq("genre", genre);

  const { data } = await query.returns<Story[]>();

  const stories = data ?? [];

  return (
    <main className="flex-1 max-w-4xl w-full mx-auto px-5 py-10">
      <Link href="/categories" className="text-sm font-bold text-brick">
        ← 全部題材
      </Link>
      <header className="mt-3 mb-8 flex items-center gap-3 flex-wrap">
        <span
          className="font-serif font-black text-3xl px-3 py-1 rounded-lg"
          style={{ color: color.text, background: color.bg }}
        >
          {displayLabel}
        </span>
        <span className="text-ink/50 text-sm">{stories.length} 篇故事</span>
      </header>

      {stories.length === 0 ? (
        <div className="border border-dashed border-ink/30 rounded-xl p-10 text-center text-ink/50">
          呢個題材暫時未有故事，請留意下一批更新。
        </div>
      ) : (
        <div className="grid gap-5 grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
          {stories.map((s) => (
            <StoryCard
              key={s.id}
              story={s}
              liked={likedSet.has(s.id)}
              loggedIn={!!user}
            />
          ))}
        </div>
      )}
    </main>
  );
}
