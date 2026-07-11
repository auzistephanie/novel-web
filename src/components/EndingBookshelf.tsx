"use client";

import { useState } from "react";
import Link from "next/link";
import { getGenreColor } from "@/lib/genreColor";
import StoryExcerptToggle from "@/components/StoryExcerptToggle";

type EndingRow = {
  id: string;
  ending_content: string;
  choice_text: string | null;
  created_at: string;
  story_id: string;
  novel_stories: { title: string; genre: string; content: string } | null;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function shortDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default function EndingBookshelf({ endings }: { endings: EndingRow[] }) {
  const [openId, setOpenId] = useState<string | null>(endings[0]?.id ?? null);

  return (
    <div>
      <div className="spines-wrap" role="list">
        {endings.map((e) => {
          const genre = e.novel_stories?.genre ?? "";
          const color = getGenreColor(genre);
          const title = e.novel_stories?.title ?? "";
          const isOpen = openId === e.id;
          return (
            <button
              key={e.id}
              type="button"
              role="listitem"
              aria-expanded={isOpen}
              className={`spine${isOpen ? " active" : ""}`}
              style={{ background: color.bar }}
              onClick={() => setOpenId(isOpen ? null : e.id)}
            >
              <span>{title}</span>
              <span className="spine-date">{shortDate(e.created_at)}</span>
            </button>
          );
        })}
      </div>

      {endings.map((e) => {
        if (openId !== e.id) return null;
        const genre = e.novel_stories?.genre ?? "";
        const color = getGenreColor(genre);
        return (
          <div
            key={e.id}
            className="border border-ink/15 rounded-xl p-5 bg-cream shadow-[3px_3px_0_rgba(43,37,32,0.12)] mt-4"
          >
            <div className="flex items-center justify-between mb-1 gap-3">
              <Link
                href={`/story/${e.story_id}`}
                className="font-serif font-bold hover:text-brick transition-colors"
              >
                {e.novel_stories?.title}
              </Link>
              <span
                className="shrink-0 text-xs font-bold px-2 py-1 rounded-full"
                style={{ color: color.text, background: color.bg }}
              >
                {genre}
              </span>
            </div>
            <p className="text-xs text-ink/40 mb-3">{formatDate(e.created_at)} 生成</p>
            {e.novel_stories?.content && (
              <StoryExcerptToggle content={e.novel_stories.content} />
            )}
            {e.choice_text && (
              <p className="text-xs text-ink/60 mb-2">
                你的選擇：
                <span className="font-bold text-ink/80">{e.choice_text}</span>
              </p>
            )}
            <p className="text-xs font-bold text-brick mb-2 tracking-wide">● 專屬結局</p>
            <p className="whitespace-pre-wrap text-sm text-ink/80 leading-7">
              {e.ending_content}
            </p>
          </div>
        );
      })}
    </div>
  );
}
