"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { getGenreColor } from "@/lib/genreColor";
import { deleteEnding, getChoices, generateEnding } from "@/app/actions/endings";

type EndingRow = {
  id: string;
  ending_content: string;
  choice_text: string | null;
  created_at: string;
  story_id: string;
  novel_stories: { title: string; genre: string; content: string } | null;
};

type PickerStage = "closed" | "choosing" | "writing";

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

  // 就地「揀過第二個選擇」— 唔跳去故事頁，直接喺結局本入面攞新分支、生成新結局
  const [pickerStage, setPickerStage] = useState<PickerStage>("closed");
  const [pickerChoices, setPickerChoices] = useState<string[]>([]);
  const [pickerError, setPickerError] = useState<string | null>(null);

  function resetPicker() {
    setPickerStage("closed");
    setPickerChoices([]);
    setPickerError(null);
  }

  function toggleOpen(id: string) {
    setOpenId((cur) => (cur === id ? null : id));
    resetPicker();
  }

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
      resetPicker();
    });
  }

  async function startPicker(storyId: string) {
    setPickerError(null);
    setPickerChoices([]);
    setPickerStage("choosing");
    const res = await getChoices(storyId);
    if (!res.ok) {
      setPickerError(res.error);
      setPickerStage("closed");
      return;
    }
    setPickerChoices(res.choices);
  }

  async function pickChoice(e: EndingRow, choiceText: string) {
    setPickerError(null);
    setPickerStage("writing");
    const res = await generateEnding(e.story_id, choiceText);
    if (!res.ok) {
      setPickerError(res.error);
      setPickerStage("choosing");
      return;
    }
    const newRow: EndingRow = {
      id: res.id,
      ending_content: res.ending,
      choice_text: choiceText,
      created_at: res.created_at,
      story_id: e.story_id,
      novel_stories: e.novel_stories,
    };
    setItems((prev) => [newRow, ...prev]);
    setOpenId(newRow.id);
    resetPicker();
  }

  if (items.length === 0) {
    return (
      <div className="border-2 border-dashed border-ink/20 rounded-2xl p-8 text-center text-ink/50 text-sm">
        結局本已經清空喇，去每日連載再揀個故事鍾意返啦。
      </div>
    );
  }

  // 同一個故事可能有多個結局（唔同分支），書脊加個小圓角標示第幾個分支，
  // 等讀者一眼睇得出邊幾本其實係同一個故事嘅唔同結局。
  const storyTotals: Record<string, number> = {};
  for (const e of items) storyTotals[e.story_id] = (storyTotals[e.story_id] ?? 0) + 1;
  const storySeen: Record<string, number> = {};

  return (
    <div>
      <div className="spines-wrap" role="list">
        {items.map((e) => {
          const genre = e.novel_stories?.genre ?? "";
          const color = getGenreColor(genre);
          const title = e.novel_stories?.title ?? "";
          const isOpen = openId === e.id;
          storySeen[e.story_id] = (storySeen[e.story_id] ?? 0) + 1;
          const branchIndex = storySeen[e.story_id];
          const branchTotal = storyTotals[e.story_id];
          return (
            <button
              key={e.id}
              type="button"
              role="listitem"
              aria-expanded={isOpen}
              title={e.choice_text ? `分支：${e.choice_text}` : undefined}
              className={`spine${isOpen ? " active" : ""}`}
              style={{ background: color.bar }}
              onClick={() => toggleOpen(e.id)}
            >
              {branchTotal > 1 && <span className="spine-branch">{branchIndex}</span>}
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
              <div className="mb-4 pl-3 border-l-2 border-ink/10">
                <p className="text-xs font-bold text-ink/40 mb-1 tracking-wide">故事全文</p>
                <p className="whitespace-pre-wrap text-sm text-ink/70 leading-7">
                  {e.novel_stories.content}
                </p>
              </div>
            )}

            {e.choice_text && (
              <p className="text-xs text-ink/60 mb-2">
                你的選擇：
                <span className="font-bold text-ink/80">{e.choice_text}</span>
              </p>
            )}
            <p className="text-xs font-bold text-brick mb-2 tracking-wide">● 你的專屬結局</p>
            <p className="whitespace-pre-wrap text-sm text-ink/80 leading-7 mb-4">
              {e.ending_content}
            </p>

            {/* 就地揀過第二個分支，唔使跳去故事頁 */}
            {pickerStage === "closed" && (
              <button
                type="button"
                onClick={() => startPicker(e.story_id)}
                className="inline-flex items-center gap-1 text-xs font-bold text-indigo hover:text-brick transition-colors"
              >
                揀過第二個選擇，睇下另一個結局 →
              </button>
            )}

            {pickerStage === "choosing" && pickerChoices.length === 0 && (
              <p className="text-xs text-ink/50 animate-pulse">構思新分支中……</p>
            )}

            {pickerStage === "choosing" && pickerChoices.length > 0 && (
              <div>
                <p className="text-xs font-bold text-ink/70 mb-2">
                  你想故事怎樣走？選一個方向：
                </p>
                <div className="grid gap-2">
                  {pickerChoices.map((c, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => pickChoice(e, c)}
                      className="text-left border-2 border-ink/20 hover:border-brick hover:bg-brick/5 rounded-lg px-3 py-2 text-xs transition-colors"
                    >
                      <span className="font-bold text-brick mr-1">
                        {["①", "②", "③", "④"][i] ?? "•"}
                      </span>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {pickerStage === "writing" && (
              <p className="text-xs text-ink/50 animate-pulse">正在為你撰寫新結局……</p>
            )}

            {pickerError && (
              <p className="text-xs text-brick mt-2">⚠️ {pickerError}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
