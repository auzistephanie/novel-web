import { createClient } from "@/lib/supabase/server";
import StoryCard from "./StoryCard";

type Story = {
  id: string;
  genre: string;
  title: string;
  protagonist: string | null;
  content: string;
  created_at: string;
  story_type?: string;
};

// 規則式推薦：統計用戶收藏的類別 → 推薦同類、未收藏過的故事
export default async function RecommendedStories({
  limit = 6,
}: {
  limit?: number;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: likes } = await supabase
    .from("novel_likes")
    .select("story_id")
    .eq("user_id", user.id);
  const likedIds = (likes ?? []).map((l) => l.story_id as string);
  if (likedIds.length === 0) return null;

  const { data: likedStories } = await supabase
    .from("novel_stories")
    .select("genre")
    .in("id", likedIds);

  const counts = new Map<string, number>();
  for (const s of likedStories ?? []) {
    const g = (s as { genre: string }).genre;
    counts.set(g, (counts.get(g) ?? 0) + 1);
  }
  const topGenres = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map((e) => e[0]);
  if (topGenres.length === 0) return null;

  const { data: recs } = await supabase
    .from("novel_stories")
    .select("id, genre, title, protagonist, content, created_at, story_type")
    .in("genre", topGenres)
    .not("id", "in", `(${likedIds.join(",")})`)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<Story[]>();

  const stories = recs ?? [];
  if (stories.length === 0) return null;

  const shown = topGenres.slice(0, 2).join("、");
  const summary = `根據你收藏的「${shown}」${
    topGenres.length > 2 ? "等" : ""
  }類，我們猜你也會喜歡這些故事`;

  return (
    <section className="mb-12 border-2 border-brick/25 bg-brick/[0.04] rounded-2xl p-6 sm:p-7">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-brick">✦</span>
        <h2 className="font-serif font-black text-2xl">為你推薦</h2>
      </div>
      <p className="text-ink/60 mb-6 text-sm">{summary}</p>
      <div className="grid gap-5 sm:grid-cols-2">
        {stories.map((s) => (
          <StoryCard key={s.id} story={s} liked={false} loggedIn={true} />
        ))}
      </div>
    </section>
  );
}
