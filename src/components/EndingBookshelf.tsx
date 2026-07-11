"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { getGenreColor } from "@/lib/genreColor";
import StoryExcerptToggle from "@/components/StoryExcerptToggle";
import { deleteEnding } from "@/app/actions/endings";

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
  const [items, setItems] = useState(endings);
  const [openId, setOpenId] = useState<string | null>(endings[0]?.id ?? null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete(id: string) {
    if (confirmingId !== id) {
      setConfirmingId(id);
      setErrorId(null);
      return;
    }
    startTransition(async () => {
      const res = await deleteEnding(id);
      if (!res.ok) {
        setErrorId(id);
        setConfirmingId(null);
        return;
      }
      setItems((prev) => {
        const next = prev.filter((e) => e.id !== id);
        setOpenId((cur) => (cur === id ? next[0]?.id ?? null : cur));
        return next;
      });
      setConfirmingId(null);
    });
  }

  if (items.length === 0) {
    return (
      <div className="border-2 border-dashed border-ink/20 rounded-2xl p-8 text-center text-ink/50 text-sm">
        結局本已經清空喇，去每日連載再揀個故事鍾意返啦。
      </div>
    );
  }

  return (
    <div>
      <div className="spines-wrap" role="list">
        {items.map((e) => {
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

      {items.map((e) => {
        if (openId !== e.id) return null;
        const genre = e.novel_stories?.genre ?? "";
        const color = getGenreColor(genre);
        const isConfirming = confirmingId === e.id;
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
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className="text-xs font-bold px-2 py-1 rounded-full"
                  style={{ color: color.text, background: color.bg }}
                >
                  {genre}
                </span>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleDelete(e.id)}
                  onBlur={() => setConfirmingId((cur) => (cur === e.id ? null : cur))}
                  className={`text-xs font-bold px-2 py-1 rounded-full border transition-colors ${
                    isConfirming
                      ? "bg-brick text-cream border-brick"
                      : "border-ink/20 text-ink/40 hover:border-brick hover:text-brick"
                  } ${isPending ? "opacity-50" : ""}`}
                >
                  {isPending && isConfirming ? "刪緊…" : isConfirming ? "確定刪除？" : "刪除"}
                </button>
              </div>
            </div>
            {errorId === e.id && (
              <p className="text-xs text-brick mb-2">刪除失敗，請再試一次。</p>
            )}
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
