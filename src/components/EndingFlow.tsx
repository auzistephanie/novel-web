"use client";

import { useEffect, useRef, useState } from "react";
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
  autoPick = false,
}: {
  storyId: string;
  loggedIn: boolean;
  liked: boolean;
  initialEnding: string | null;
  initialChoice: string | null;
  /** 由「我的結局本」嘅「揀過第二個選擇」連結帶 ?pick=1 過嚟時，一開頁即刻跳去揀分支，
   *  唔好再顯示返上次已經有嘅結局。 */
  autoPick?: boolean;
}) {
  const hasInitial = !!initialEnding;
  const [stage, setStage] = useState<Stage>(
    autoPick ? "choosing" : hasInitial ? "done" : "idle"
  );
  const [choices, setChoices] = useState<string[]>([]);
  const [choice, setChoice] = useState<string | null>(initialChoice);
  const [ending, setEnding] = useState<string | null>(initialEnding);
  const [error, setError] = useState<string | null>(null);
  const [slow, setSlow] = useState(false);
  const lastChoiceRef = useRef<string | null>(null);
  const autoPickedRef = useRef(false);

  // 等太耐（>20s）就俾個重試按鈕，唔好成個 spinner 轉到永遠
  useEffect(() => {
    const isLoading =
      (stage === "choosing" && choices.length === 0) || stage === "writing";
    if (!isLoading) return;
    const t = setTimeout(() => setSlow(true), 20_000);
    return () => clearTimeout(t);
  }, [stage, choices.length]);

  // autoPick：一入頁即刻攞新分支，唔使等用家再撳一次
  useEffect(() => {
    if (!autoPick || !loggedIn || autoPickedRef.current) return;
    autoPickedRef.current = true;
    startChoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPick, loggedIn]);

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
    setSlow(false);
    setChoices([]);
    setStage("choosing");
    const res = await getChoices(storyId);
    if (!res.ok) {
      setError(res.error);
      setStage(ending ? "done" : "idle");
      return;
    }
    setChoices(res.choices);
  }

  async function pick(c: string) {
    setError(null);
    setSlow(false);
    setChoice(c);
    lastChoiceRef.current = c;
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
        <div>
          <p className="text-sm text-ink/60 animate-pulse">構思劇情分支中……</p>
          {slow && (
            <div className="mt-2 flex items-center gap-3">
              <p className="text-xs text-ink/50">等咗有點耐，AI 可能忙緊。</p>
              <button
                type="button"
                onClick={startChoices}
                className="text-xs font-bold text-brick underline underline-offset-2"
              >
                重試
              </button>
            </div>
          )}
        </div>
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
          {slow && (
            <div className="mt-2 flex items-center gap-3">
              <p className="text-xs text-ink/50">等咗有點耐，AI 可能忙緊。</p>
              <button
                type="button"
                onClick={() =>
                  lastChoiceRef.current && pick(lastChoiceRef.current)
                }
                className="text-xs font-bold text-brick underline underline-offset-2"
              >
                重試
              </button>
            </div>
          )}
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

          <div className="mt-5 flex items-center justify-between gap-4 flex-wrap">
            <p className="text-xs text-ink/50">
              呢個結局已經存入你嘅
              <Link href="/my-endings" className="font-bold text-indigo hover:text-brick mx-1">
                結局本
              </Link>
              。想睇下揀第二個分支會點？
            </p>
            <button
              type="button"
              onClick={startChoices}
              className="text-xs font-bold text-indigo hover:text-brick underline underline-offset-2 shrink-0"
            >
              換個選擇再生成一個結局 →
            </button>
          </div>

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
