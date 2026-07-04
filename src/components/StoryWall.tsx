"use client";

import { useMemo, useState } from "react";
import StoryCard from "./StoryCard";
import { getGenreColor } from "@/lib/genreColor";

type Story = {
  id: string;
  genre: string;
  title: string;
  protagonist: string | null;
  content: string;
  created_at: string;
  story_type?: string;
};

export default function StoryWall({
  stories,
  likedIds,
  loggedIn,
  initialGenre,
}: {
  stories: Story[];
  likedIds: string[];
  loggedIn: boolean;
  initialGenre?: string;
}) {
  const hasInitialGenre =
    !!initialGenre && stories.some((s) => s.genre === initialGenre);
  const [selected, setSelected] = useState<string | null>(
    hasInitialGenre ? initialGenre! : null
  );
  const likedSet = useMemo(() => new Set(likedIds), [likedIds]);

  const genres = useMemo(() => {
    const seen = new Map<string, number>();
    for (const s of stories) {
      seen.set(s.genre, (seen.get(s.genre) ?? 0) + 1);
    }
    return Array.from(seen.entries());
  }, [stories]);

  const filtered = selected ? stories.filter((s) => s.genre === selected) : stories;

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          type="button"
          onClick={() => setSelected(null)}
          className={`text-xs font-bold px-3 py-1.5 rounded-full border-2 transition-colors ${
            selected === null
              ? "bg-ink text-cream border-ink"
              : "border-ink/20 text-ink/60 hover:border-ink/50"
          }`}
        >
          全部（{stories.length}）
        </button>
        {genres.map(([genre, count]) => {
          const color = getGenreColor(genre);
          const active = selected === genre;
          return (
            <button
              key={genre}
              type="button"
              onClick={() => setSelected(genre)}
              className="tile-pattern-bg text-xs font-bold px-3 py-1.5 rounded-full border-2 transition-colors"
              style={
                active
                  ? {
                      backgroundColor: color.bar,
                      backgroundBlendMode: "overlay",
                      borderColor: color.bar,
                      color: "#f6efe0",
                    }
                  : {
                      backgroundColor: color.bg,
                      backgroundBlendMode: "multiply",
                      borderColor: color.bar + "55",
                      color: color.text,
                    }
              }
            >
              {genre}（{count}）
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="border border-dashed border-ink/30 rounded-xl p-10 text-center text-ink/50">
          呢個類別暫時未有故事，請留意下一批更新。
        </div>
      )}

      <div className="grid gap-5 grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
        {filtered.map((s) => (
          <StoryCard key={s.id} story={s} liked={likedSet.has(s.id)} loggedIn={loggedIn} />
        ))}
      </div>
    </div>
  );
}
