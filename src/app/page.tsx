import Link from "next/link";
import Hero from "@/components/Hero";
import BookEntrance from "@/components/BookEntrance";
import RecommendedStories from "@/components/RecommendedStories";
import RandomPicks from "@/components/RandomPicks";
import { loadContext, COLS, type Story } from "@/lib/stories";
import { getGenreColor } from "@/lib/genreColor";

export const revalidate = 0;

// 判斷某個 created_at（UTC ISO string）係咪屬於「今日」嘅香港時間（cron 12:30 HKT 出街）
function isTodayHKT(iso: string): boolean {
  const HKT_OFFSET_MS = 8 * 60 * 60 * 1000;
  const now = new Date();
  const nowHkt = new Date(now.getTime() + HKT_OFFSET_MS);
  const d = new Date(iso);
  const dHkt = new Date(d.getTime() + HKT_OFFSET_MS);
  return (
    nowHkt.getUTCFullYear() === dHkt.getUTCFullYear() &&
    nowHkt.getUTCMonth() === dHkt.getUTCMonth() &&
    nowHkt.getUTCDate() === dHkt.getUTCDate()
  );
}

export default async function HomePage() {
  const { supabase, user, likedIds } = await loadContext();

  const { data: stories } = await supabase
    .from("novel_stories")
    .select(COLS)
    .order("created_at", { ascending: false })
    .limit(60)
    .returns<Story[]>();

  const list = stories ?? [];
  const todayCount = list.filter((s) => isTodayHKT(s.created_at)).length;

  // 熱門題材（依故事數 top 8）
  const genreCounts = new Map<string, number>();
  for (const s of list) genreCounts.set(s.genre, (genreCounts.get(s.genre) ?? 0) + 1);
  const hotGenres = [...genreCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map((e) => e[0]);

  return (
    <>
      <BookEntrance />
      <Hero loggedIn={!!user} todayCount={todayCount} />

      <main id="stories" className="flex-1 max-w-4xl w-full mx-auto px-5 py-10">
        <RecommendedStories />

        {/* 兩個入口卡 */}
        <section className="grid sm:grid-cols-2 gap-5 mb-12">
          <Link
            href="/short"
            className="group border-2 border-ink rounded-xl p-6 bg-cream shadow-[4px_4px_0_rgba(43,37,32,0.15)] hover:-translate-y-1 hover:shadow-[6px_7px_0_rgba(43,37,32,0.2)] transition-all"
          >
            <h2 className="font-serif font-black text-2xl mb-1 group-hover:text-brick transition-colors">
              短篇故事 →
            </h2>
            <p className="text-ink/60 text-sm">
              有頭有尾，一次讀完，結局已寫好，無須追更。
            </p>
          </Link>
          <Link
            href="/serial"
            className="group border-2 rounded-xl p-6 bg-cream shadow-[4px_4px_0_rgba(58,95,138,0.18)] hover:-translate-y-1 hover:shadow-[6px_7px_0_rgba(58,95,138,0.25)] transition-all"
            style={{ borderColor: "#3a5f8a" }}
          >
            <h2 className="font-serif font-black text-2xl mb-1" style={{ color: "#3a5f8a" }}>
              互動結局 →
            </h2>
            <p className="text-ink/60 text-sm">
              由你選擇劇情走向，即時寫出獨一無二的專屬結局。
            </p>
          </Link>
        </section>

        {list.length === 0 && (
          <div className="border border-dashed border-ink/30 rounded-xl p-10 text-center text-ink/50">
            尚未有故事，系統正在生成中，請稍候。
          </div>
        )}

        {/* 隨機推薦 */}
        <RandomPicks stories={list} likedIds={likedIds} loggedIn={!!user} />

        {/* 熱門題材 */}
        {hotGenres.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-serif font-black text-2xl">熱門題材</h2>
              <Link href="/categories" className="text-sm font-bold text-brick">
                查看全部 →
              </Link>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {hotGenres.map((genre) => {
                const color = getGenreColor(genre);
                return (
                  <Link
                    key={genre}
                    href={`/browse?genre=${encodeURIComponent(genre)}`}
                    className="text-sm font-bold px-4 py-2 rounded-full transition-transform hover:-translate-y-0.5"
                    style={{ color: color.text, background: color.bg }}
                  >
                    {genre}
                    <span className="opacity-50 font-normal ml-1.5">
                      {genreCounts.get(genre)}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </>
  );
}

