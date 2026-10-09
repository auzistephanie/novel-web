import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getGenreColor } from "@/lib/genreColor";

type Item = {
  id: string;
  genre: string;
  title: string;
  story_type?: string;
  content: string;
  gen_meta?: { teaser?: string } | null;
};

// 讀完一篇之後：推薦下一篇（先揀同類，再揀其他類，保持多樣）
export default async function NextReads({
  currentId,
  genre,
}: {
  currentId: string;
  genre: string;
}) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("novel_stories")
    .select("id, genre, title, story_type, content, gen_meta")
    .neq("id", currentId)
    .order("created_at", { ascending: false })
    .limit(20)
    .returns<Item[]>();

  const all = data ?? [];
  if (all.length === 0) return null;
  const sameGenre = all.filter((s) => s.genre === genre).slice(0, 1);
  const others = all.filter((s) => s.genre !== genre);
  const picks = [...sameGenre, ...others].slice(0, 3);

  return (
    <section className="mt-10">
      <h2 className="font-serif font-black text-xl mb-4">下一篇想看這個</h2>
      <div className="flex flex-col gap-3">
        {picks.map((s) => {
          const color = getGenreColor(s.genre);
          const blurb = s.gen_meta?.teaser?.trim() || `${s.content.slice(0, 60).trim()}...`;
          return (
            <Link
              key={s.id}
              href={`/story/${s.id}`}
              className="group block border border-ink/15 rounded-xl bg-cream p-4 pl-5 relative shadow-[3px_3px_0_rgba(43,37,32,0.12)] hover:-translate-y-0.5 transition-transform"
            >
              <span
                className="absolute left-0 top-3 bottom-3 w-1.5 rounded-full"
                style={{ background: color.bar }}
                aria-hidden="true"
              />
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ color: color.text, background: color.bg }}
              >
                {s.genre}
              </span>
              <p className="font-serif font-bold text-base mt-2 group-hover:text-brick transition-colors">
                {s.title}
              </p>
              <p className="text-sm text-ink/65 mt-1 line-clamp-2">{blurb}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
