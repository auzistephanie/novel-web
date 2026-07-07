"use client";

import { useMemo, useState } from "react";
import StoryCard from "./StoryCard";
import type { Story } from "@/lib/stories";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function RandomPicks({
  stories,
  likedIds,
  loggedIn,
  count = 6,
}: {
  stories: Story[];
  likedIds: string[];
  loggedIn: boolean;
  count?: number;
}) {
  const likedSet = useMemo(() => new Set(likedIds), [likedIds]);
  const [seed, setSeed] = useState(0);
  const picks = useMemo(() => {
    void seed; // 每按一次「換一批」重新洗牌
    return shuffle(stories).slice(0, count);
  }, [stories, count, seed]);

  if (stories.length === 0) return null;

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif font-black text-2xl">🎲 隨機推薦</h2>
        <button
          type="button"
          onClick={() => setSeed((s) => s + 1)}
          className="text-sm font-bold text-brick hover:-translate-y-0.5 transition-transform"
        >
          換一批 ↻
        </button>
      </div>
      <div className="grid gap-5 grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
        {picks.map((s) => (
          <StoryCard
            key={s.id}
            story={s}
            liked={likedSet.has(s.id)}
            loggedIn={loggedIn}
          />
        ))}
      </div>
    </section>
  );
}
