"use client";

import { useState, useTransition } from "react";
import { approveStory, rejectStory } from "@/app/actions/admin";

export type PendingStoryRow = {
  id: string;
  title: string;
  genre: string;
  story_type: string | null;
  protagonist: string | null;
  content: string;
  created_at: string;
  gen_meta: {
    skeleton?: string;
    validateNote?: string;
    retries?: number;
  } | null;
};

const SKELETON_LABEL: Record<string, string> = {
  identity_reveal: "身份反差揭穿",
  contract_marriage: "契約婚姻/先婚後愛",
  power_clash: "雙強對峙",
};

export default function PendingStoryReview({ stories }: { stories: PendingStoryRow[] }) {
  const [list, setList] = useState(stories);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function act(storyId: string, action: "approve" | "reject") {
    setPendingId(storyId);
    setError(null);
    startTransition(async () => {
      const res = action === "approve" ? await approveStory(storyId) : await rejectStory(storyId);
      if (res.ok) {
        setList((prev) => prev.filter((s) => s.id !== storyId));
      } else {
        setError(res.error);
      }
      setPendingId(null);
    });
  }

  if (list.length === 0) {
    return (
      <div className="border border-dashed border-ink/30 rounded-xl p-8 text-center text-ink/50">
        而家冇待審故事。
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {list.map((s) => {
        const skeleton = s.gen_meta?.skeleton ? SKELETON_LABEL[s.gen_meta.skeleton] ?? s.gen_meta.skeleton : null;
        const isBusy = isPending && pendingId === s.id;
        return (
          <div
            key={s.id}
            className="border border-mustard/40 bg-mustard/5 rounded-xl p-5 sm:p-6"
          >
            <div className="flex items-center gap-2 flex-wrap text-xs mb-2">
              <span className="px-2 py-0.5 rounded-full border border-brick text-brick">
                {s.story_type === "short" ? "短篇" : "連載"}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-ink/10 text-ink/70">{s.genre}</span>
              {skeleton && (
                <span className="px-2 py-0.5 rounded-full bg-indigo/10 text-indigo">
                  骨架：{skeleton}
                </span>
              )}
              <span className="text-ink/40">
                {new Date(s.created_at).toLocaleString("zh-HK")}
              </span>
            </div>

            <h3 className="font-serif font-black text-xl mb-1">{s.title}</h3>
            {s.protagonist && (
              <p className="text-xs text-ink/50 mb-3">主角：{s.protagonist}</p>
            )}

            {s.gen_meta?.validateNote && s.gen_meta.validateNote !== "PASS" && (
              <p className="text-xs text-red-600/80 mb-3">
                ⚠️ code validate 未一次過：{s.gen_meta.validateNote}
                {typeof s.gen_meta.retries === "number" ? `（retry ${s.gen_meta.retries} 次）` : ""}
              </p>
            )}

            <article className="whitespace-pre-wrap leading-7 text-ink/85 text-sm max-h-96 overflow-y-auto border-t border-mustard/30 pt-3">
              {s.content}
            </article>

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => act(s.id, "reject")}
                disabled={isPending}
                className="px-4 py-2 rounded-md border border-ink/20 text-sm disabled:opacity-60"
              >
                {isBusy ? "處理緊…" : "唔要"}
              </button>
              <button
                onClick={() => act(s.id, "approve")}
                disabled={isPending}
                className="px-4 py-2 rounded-md bg-brick text-cream text-sm font-bold disabled:opacity-60"
              >
                {isBusy ? "處理緊…" : "批准上架"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
