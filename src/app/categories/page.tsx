import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getGenreColor } from "@/lib/genreColor";
import { getParentCategory } from "@/lib/genreCategories";

export const revalidate = 0;

export default async function CategoriesPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase.from("novel_stories").select("genre");

  const counts = new Map<string, { key: string; label: string; count: number }>();
  for (const r of rows ?? []) {
    const g = (r as { genre: string }).genre;
    const parent = getParentCategory(g);
    const entry = counts.get(parent.key);
    if (entry) {
      entry.count += 1;
    } else {
      counts.set(parent.key, { key: parent.key, label: parent.label, count: 1 });
    }
  }
  const genres = [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .map((c) => [c.key, c.count, c.label] as const);

  return (
    <main className="flex-1 max-w-4xl w-full mx-auto px-5 py-10">
      <header className="mb-8">
        <h1 className="font-serif font-black text-3xl mb-1">題材</h1>
        <p className="text-ink/60">
          揀一個題材，睇晒該類所有故事（短篇＋互動結局一齊）。
        </p>
      </header>

      {genres.length === 0 ? (
        <div className="border border-dashed border-ink/30 rounded-xl p-10 text-center text-ink/50">
          暫時未有故事。
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(150px,1fr))]">
          {genres.map(([key, count, label]) => {
            const color = getGenreColor(label);
            return (
              <Link
                key={key}
                href={`/browse?parent=${encodeURIComponent(key)}`}
                className="group relative border border-ink/15 rounded-xl bg-cream p-5 pl-6 shadow-[3px_3px_0_rgba(43,37,32,0.12)] hover:-translate-y-1 hover:shadow-[5px_6px_0_rgba(43,37,32,0.18)] transition-all"
              >
                <span
                  className="absolute left-0 top-3 bottom-3 w-1.5 rounded-full"
                  style={{ background: color.bar }}
                  aria-hidden="true"
                />
                <p
                  className="font-serif font-black text-lg group-hover:text-brick transition-colors"
                  style={{ color: color.text }}
                >
                  {label}
                </p>
                <p className="text-xs text-ink/50 mt-1">{count} 篇故事</p>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
