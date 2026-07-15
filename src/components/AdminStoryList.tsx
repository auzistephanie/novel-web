"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { deleteStory } from "@/app/actions/admin";

export type AdminStoryRow = {
  id: string;
  title: string;
  genre: string;
  story_type: string | null;
  created_at: string;
};

export default function AdminStoryList({ stories }: { stories: AdminStoryRow[] }) {
  const [list, setList] = useState(stories);
  const [target, setTarget] = useState<AdminStoryRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function confirmDelete() {
    if (!target) return;
    const story = target;
    startTransition(async () => {
      const res = await deleteStory(story.id);
      if (res.ok) {
        setList((prev) => prev.filter((s) => s.id !== story.id));
        setTarget(null);
        setError(null);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl bg-cream">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-ink text-cream text-left">
              <th className="px-4 py-3 font-medium">標題</th>
              <th className="px-4 py-3 font-medium">類別</th>
              <th className="px-4 py-3 font-medium">類型</th>
              <th className="px-4 py-3 font-medium">建立日期</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.id} className="border-b border-ink/10 last:border-0">
                <td className="px-4 py-3">
                  <Link
                    href={`/story/${s.id}`}
                    target="_blank"
                    className="underline decoration-dotted underline-offset-2 hover:text-brick"
                  >
                    {s.title}
                  </Link>
                </td>
                <td className="px-4 py-3">{s.genre}</td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-0.5 rounded-full border border-brick text-brick">
                    {s.story_type === "short" ? "短篇" : "連載"}
                  </span>
                </td>
                <td className="px-4 py-3 text-ink/60">
                  {new Date(s.created_at).toLocaleDateString("zh-HK")}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setTarget(s)}
                    className="text-sm border border-brick text-brick rounded-md px-3 py-1.5 hover:bg-brick hover:text-cream transition-colors"
                  >
                    刪除
                  </button>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-ink/50">
                  已經冇故事喇
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {target && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-brick font-bold mb-2">確定刪除呢篇故事？</h3>
            <p className="text-sm text-ink/60 mb-5 leading-relaxed">
              「{target.title}」刪除後會連帶清走所有相關鍾意記錄同讀者專屬結局，動作不可撤銷。
            </p>
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setTarget(null);
                  setError(null);
                }}
                className="px-4 py-2 rounded-md border border-ink/20 text-sm"
                disabled={isPending}
              >
                取消
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-md bg-brick text-cream text-sm font-bold disabled:opacity-60"
                disabled={isPending}
              >
                {isPending ? "刪除緊…" : "確定刪除"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
