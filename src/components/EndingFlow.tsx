"use client";

import { useState } from "react";
import Link from "next/link";
import { getChoices, generateEnding } from "@/app/actions/endings";
import LikeButton from "@/components/LikeButton";

type Stage = "idle" | "choosing" | "writing" | "done";

export default function EndingFlow({
  storyId,
  loggedIn,
  liked,
  initialEnding,
  initialChoice,
}: {
  storyId: string;
  loggedIn: boolean;
  liked: boolean;
  initialEnding: string | null;
  initialChoice: string | null;
}) {
  const hasInitial = !!initialEnding;
  const [stage, setStage] = useState<Stage>(hasInitial ? "done" : "idle");
  const [choices, setChoices] = useState<string[]>([]);
  const [choice, setChoice] = useState<string | null>(initialChoice);
  const [ending, setEnding] = useState<string | null>(initialEnding);
  const [error, setError] = useState<string | null>(null);

  if (!loggedIn) {
    return (
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-ink/60">
          登入後即可選擇劇情走向，讓 AI 為您生成專屬結局。
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 bg-brick text-cream font-bold rounded-md px-5 py-2.5 shadow-[3px_3px_0_rgba(43,37,32,0.7)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-transform"
        >
          前往登入 →
        </Link>
      </div>
    );
  }

  async function startChoices() {
    setError(null);
    setStage("choosing");
    const res = await getChoices(storyId);
    if (!res.ok) {
      setError(res.error);
      setStage("idle");
      return;
    }
    setChoices(res.choices);
  }

  async function pick(c: string) {
    setError(null);
    setChoice(c);
    setStage("writing");
    const res = await generateEnding(storyId, c);
    if (!res.ok) {
      setError(res.error);
      setStage("choosing");
      return;
    }
    setEnding(res.ending);
    setStage("done");
  }

  return (
    <div>
      {/* 起點 */}
      {stage === "idle" && (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <p className="text-sm text-ink/60">
            由您決定劇情走向，AI 即時為您撰寫獨一無二的結局。
          </p>
          <button
            type="button"
            onClick={startChoices}
            className="inline-flex items-center gap-2 bg-brick text-cream font-bold rounded-md px-5 py-2.5 shadow-[3px_3px_0_rgba(43,37,32,0.7)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-transform"
          >
            ✍️ 生成你的專屬結局
          </button>
        </div>
      )}

      {/* 構思分支中 */}
      {stage === "choosing" && choices.length === 0 && (
        <p className="text-sm text-ink/60 animate-pulse">構思劇情分支中……</p>
      )}

      {/* 揀分支 */}
      {stage === "choosing" && choices.length > 0 && (
        <div>
          <p className="text-sm font-bold text-ink/70 mb-3">
            你想故事怎樣走？選一個方向：
          </p>
          <div className="grid gap-3">
            {choices.map((c, i) => (
              <button
                key={i}
                type="button"
                onClick={() => pick(c)}
                className="text-left border-2 border-ink/20 hover:border-brick hover:bg-brick/5 rounded-xl px-4 py-3 transition-colors"
              >
                <span className="font-bold text-brick mr-2">
                  {["①", "②", "③", "④"][i] ?? "•"}
                </span>
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 撰寫結局中 */}
      {stage === "writing" && (
        <div>
          {choice && (
            <p className="text-sm text-ink/60 mb-2">
              你的選擇：<span className="font-bold text-ink/80">{choice}</span>
            </p>
          )}
          <p className="text-sm text-ink/60 animate-pulse">
            正在為你撰寫專屬結局……
          </p>
        </div>
      )}

      {/* 結局 + like 掣 */}
      {stage === "done" && ending && (
        <div>
          {choice && (
            <p className="text-xs font-bold text-brick mb-3 tracking-wide">
              ● 你的選擇：{choice}
            </p>
          )}
          <p className="whitespace-pre-wrap leading-8 text-ink/85">{ending}</p>

          <div className="mt-6 pt-5 border-t border-ink/10 flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-ink/60">
              喜歡這個故事嗎？收藏它，我們會為你推薦更多同類作品。
            </p>
            <LikeButton
              storyId={storyId}
              liked={liked}
              loggedIn={loggedIn}
              size="lg"
            />
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-brick">⚠️ {error}</p>}
    </div>
  );
}
